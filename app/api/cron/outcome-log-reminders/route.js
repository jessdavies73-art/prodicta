import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

// Sibling to /api/cron/outcome-reminders (which handles 3/6/12-month probation
// check-ins). This route nudges users who have CANDIDATES whose assessment was
// completed more than 14 days ago but where the hirer never logged an outcome
// on that candidate at all. Runs weekly.
//
// Migration needed:
//   ALTER TABLE users
//     ADD COLUMN IF NOT EXISTS last_outcome_log_reminder_sent TIMESTAMPTZ;

const STALE_DAYS = 14
const THROTTLE_DAYS = 30

export const maxDuration = 120

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
  const now = new Date()
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const throttleCutoff = new Date(now.getTime() - THROTTLE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // 1. Find completed candidates older than STALE_DAYS.
  const { data: staleCands, error: candErr } = await admin
    .from('candidates')
    .select('id, user_id, completed_at')
    .eq('status', 'completed')
    .lt('completed_at', staleCutoff)
  if (candErr) {
    console.error('[outcome-log-reminders] candidates query failed', candErr.message)
    return NextResponse.json({ error: candErr.message }, { status: 500 })
  }
  if (!staleCands || staleCands.length === 0) {
    return NextResponse.json({ checked: 0, sent: 0 })
  }

  // 2. Remove candidates that already have an outcome logged.
  const candIds = staleCands.map(c => c.id)
  const { data: logged } = await admin
    .from('candidate_outcomes')
    .select('candidate_id')
    .in('candidate_id', candIds)
  const loggedSet = new Set((logged || []).map(o => o.candidate_id))
  const unlogged = staleCands.filter(c => !loggedSet.has(c.id))
  if (unlogged.length === 0) {
    return NextResponse.json({ checked: staleCands.length, sent: 0 })
  }

  // 3. Group unlogged candidates per user.
  const byUser = new Map()
  for (const c of unlogged) {
    if (!c.user_id) continue
    const list = byUser.get(c.user_id) || []
    list.push(c)
    byUser.set(c.user_id, list)
  }

  // 4. Pull the user rows to get email + throttle timestamp in one round trip.
  const userIds = [...byUser.keys()]
  const { data: userRows } = await admin
    .from('users')
    .select('id, email, last_outcome_log_reminder_sent')
    .in('id', userIds)
  const userRowById = new Map((userRows || []).map(u => [u.id, u]))

  const sent = []
  const skipped = []
  const errors = []

  for (const [userId, list] of byUser.entries()) {
    const userRow = userRowById.get(userId)
    if (!userRow?.email) { skipped.push({ userId, reason: 'no-email' }); continue }

 // Throttle, skip if we reminded within the last 30 days.
    if (userRow.last_outcome_log_reminder_sent && userRow.last_outcome_log_reminder_sent > throttleCutoff) {
      skipped.push({ userId, reason: 'throttled' })
      continue
    }

    const count = list.length
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: userRow.email,
        subject: "Don't forget to log your hiring outcomes",
        html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #e4e9f0;border-radius:14px;overflow:hidden;">
  <div style="background:#0f2137;padding:22px 28px;">
    <div style="color:#00BFA5;font-size:20px;font-weight:800;letter-spacing:-0.4px;">PRODICTA</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:2px;">Outcome logging reminder</div>
  </div>
  <div style="padding:30px 28px 24px;">
    <h1 style="margin:0 0 14px;font-size:18px;font-weight:800;color:#0f2137;">Don't forget to log your hiring outcomes</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#5e6b7f;line-height:1.65;">
      You have <strong style="color:#0f2137;">${count}</strong> candidate${count === 1 ? '' : 's'} who completed their PRODICTA assessment more than 2 weeks ago. Logging outcomes takes 30 seconds and unlocks your Prediction Accuracy score.
    </p>
    <div style="margin:22px 0 10px;">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:800;font-size:13px;padding:11px 22px;border-radius:8px;text-decoration:none;">
        Log outcomes now
      </a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#94a1b3;line-height:1.55;">
      You are receiving this because you have completed assessments on your PRODICTA account. We will remind you at most once every 30 days.
    </p>
  </div>
</div>
</body></html>`,
      })
 // Throttle marker, best effort. Failure here only means we may remind
      // again next week; safer than skipping the email.
      try {
        await admin.from('users').update({ last_outcome_log_reminder_sent: now.toISOString() }).eq('id', userId)
      } catch (markErr) {
        console.error('[outcome-log-reminders] throttle update failed', userId, markErr?.message)
      }
      sent.push({ userId, count })
    } catch (mailErr) {
      console.error('[outcome-log-reminders] send failed', userId, mailErr?.message)
      errors.push({ userId, error: mailErr?.message })
    }
  }

  return NextResponse.json({
    checked: staleCands.length,
    unlogged: unlogged.length,
    usersTargeted: byUser.size,
    sent: sent.length,
    skipped: skipped.length,
    errors,
  })
}
