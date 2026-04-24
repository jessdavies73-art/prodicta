import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

// Coaching plan reminder cron.
// Fires at day 7, 30, 60 and 90 after placement for employer permanent hires
// who have a Strong Hire verdict (overall_score >= 70) and a populated 90-day
// coaching plan on their result.
//
// Dedup is tracked on candidate_outcomes.coaching_reminders_sent (JSONB array).
// Run the following migration before enabling this cron:
//   ALTER TABLE candidate_outcomes ADD COLUMN IF NOT EXISTS coaching_reminders_sent JSONB DEFAULT '[]'::jsonb;
//
// Strong Hire, permanent, and employer-only checks are enforced here to keep
// the reminder audience tight.

const TIDYCAL_URL = 'https://tidycal.com/m57e7l3/30-minute-coaching-check-in'

const TRIGGERS = [
  { key: 'day_7',  min: 7,  max: 13 },
  { key: 'day_30', min: 30, max: 36 },
  { key: 'day_60', min: 60, max: 66 },
  { key: 'day_90', min: 90, max: 96 },
]

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const adminClient = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
  const now = new Date()

  // Pull every outcome with a placement_date. Filter to employer permanent
  // Strong Hire with a coaching plan client-side.
  const { data: outcomes, error } = await adminClient
    .from('candidate_outcomes')
    .select(`
      id,
      user_id,
      candidate_id,
      placement_date,
      coaching_reminders_sent,
      candidates (
        id,
        name,
        assessment_id,
        assessments ( role_title, employment_type ),
        results ( overall_score, coaching_plan )
      )
    `)
    .not('placement_date', 'is', null)

  if (error) {
    console.error('coaching-plan-reminders: query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Batch-fetch user records so we can gate to employer accounts.
  const userIds = [...new Set((outcomes || []).map(o => o.user_id).filter(Boolean))]
  let usersById = {}
  if (userIds.length > 0) {
    const { data: userRows } = await adminClient
      .from('users')
      .select('id, email, company_name, account_type')
      .in('id', userIds)
    usersById = Object.fromEntries((userRows || []).map(u => [u.id, u]))
  }

  const sent = []
  const errors = []
  const skipped = []

  for (const o of outcomes || []) {
    try {
      const user = usersById[o.user_id]
      if (!user || user.account_type !== 'employer' || !user.email) { skipped.push({ id: o.id, reason: 'not-employer' }); continue }

      const cand = o.candidates
      const assessment = cand?.assessments
      if (!cand || !assessment) { skipped.push({ id: o.id, reason: 'missing-candidate' }); continue }
      if (assessment.employment_type === 'temporary') { skipped.push({ id: o.id, reason: 'temporary' }); continue }

      const result = Array.isArray(cand.results) ? cand.results[0] : cand.results
      if (!result) { skipped.push({ id: o.id, reason: 'no-result' }); continue }
      if ((result.overall_score ?? 0) < 70) { skipped.push({ id: o.id, reason: 'not-strong-hire' }); continue }
      if (!result.coaching_plan) { skipped.push({ id: o.id, reason: 'no-coaching-plan' }); continue }

      const elapsedDays = Math.max(0, Math.floor((now.getTime() - new Date(o.placement_date).getTime()) / 86400000))
      const trigger = TRIGGERS.find(t => elapsedDays >= t.min && elapsedDays <= t.max)
      if (!trigger) continue

      const alreadySent = Array.isArray(o.coaching_reminders_sent) ? o.coaching_reminders_sent : []
      if (alreadySent.some(r => r?.reminder === trigger.key)) continue

      const candName = cand.name || 'your new hire'
      const roleTitle = assessment.role_title || 'this role'
      const planUrl = `${appUrl}/assessment/${cand.assessment_id}/candidate/${cand.id}/coaching-plan`
      const outcomeLogUrl = `${appUrl}/assessment/${cand.assessment_id}/candidate/${cand.id}`
      const greeting = buildGreeting(user)
      const phase2Title = result.coaching_plan?.phase2?.title || 'Phase 2, Pressure and Delivery'

      const { subject, html } = buildEmail({
        trigger: trigger.key,
        candName,
        roleTitle,
        greeting,
        planUrl,
        outcomeLogUrl,
        phase2Title,
        companyName: user.company_name,
      })

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: user.email,
          subject,
          html,
        })
      } catch (sendErr) {
        errors.push({ outcome: o.id, trigger: trigger.key, error: sendErr?.message || 'send-failed' })
        continue
      }

      // Persist the reminder record so we never re-send
      const nextSent = [...alreadySent, { reminder: trigger.key, sent_at: new Date().toISOString() }]
      await adminClient
        .from('candidate_outcomes')
        .update({ coaching_reminders_sent: nextSent })
        .eq('id', o.id)

      await adminClient.from('notifications').insert({
        user_id: o.user_id,
        type: 'coaching_plan_reminder',
        title: `${trigger.key.replace('_', ' ')}: ${candName}`,
        body: subject,
        candidate_id: cand.id,
        assessment_id: cand.assessment_id,
      }).catch(() => {})

      sent.push({ outcome: o.id, trigger: trigger.key, candidate: candName })
    } catch (err) {
      console.error('coaching-plan-reminders: failed for outcome', o.id, err)
      errors.push({ outcome: o.id, error: err?.message || 'unknown' })
    }
  }

  return NextResponse.json({
    sent: sent.length,
    details: sent,
    skipped_count: skipped.length,
    errors,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildGreeting(user) {
  const email = user?.email || ''
  const localPart = email.split('@')[0] || ''
  const token = localPart.split(/[._-]/)[0] || ''
  if (!token) return 'Hi there'
  const name = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
  return `Hi ${name}`
}

function emailShell(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">Hiring Manager Coaching, in partnership with Alchemy Training UK</div>
    </div>
    <div style="padding:36px;">
      ${body}
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#00BFA5;">PRODICTA</strong> &middot; <a href="https://prodicta.co.uk" style="color:#94a1b3;">prodicta.co.uk</a></p>
    </div>
  </div>
</body>
</html>`
}

function ctaBlock({ planUrl, outcomeLogUrl, label, includeOutcome = false }) {
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      ${includeOutcome ? `<a href="${outcomeLogUrl}" style="display:inline-block;background:#0f2137;color:#ffffff;font-weight:700;font-size:14px;padding:13px 26px;margin:0 6px 10px;border-radius:10px;text-decoration:none;">${label}</a>` : `<a href="${planUrl}" style="display:inline-block;background:#00BFA5;color:#ffffff;font-weight:700;font-size:14px;padding:13px 26px;margin:0 6px 10px;border-radius:10px;text-decoration:none;">${label}</a>`}
      <a href="${TIDYCAL_URL}" style="display:inline-block;background:${includeOutcome ? '#00BFA5' : '#ffffff'};color:${includeOutcome ? '#ffffff' : '#00BFA5'};${includeOutcome ? '' : 'border:1.5px solid #00BFA5;'}font-weight:700;font-size:14px;padding:13px 26px;margin:0 6px 10px;border-radius:10px;text-decoration:none;">Book a check-in with Liz</a>
    </div>
  `
}

function buildEmail({ trigger, candName, roleTitle, greeting, planUrl, outcomeLogUrl, phase2Title }) {
  if (trigger === 'day_7') {
    return {
      subject: `How is week one going with ${candName}?`,
      html: emailShell(`
        <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">Week one check-in</h2>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${greeting},</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${candName} has been in post for a week as your new ${roleTitle}. Phase 1 of the 90-day coaching plan covers the first 30 days and sets specific objectives for bedding in, building key relationships and delivering an early win.</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 16px;">Now is a good moment to review Phase 1 progress with ${candName}. Liz Harris at Alchemy Training UK runs 30-minute coaching check-ins for hiring managers if you want external support.</p>
        ${ctaBlock({ planUrl, outcomeLogUrl, label: 'Open coaching plan' })}
      `),
    }
  }
  if (trigger === 'day_30') {
    return {
      subject: `${candName}, Phase 1 complete, time for Phase 2`,
      html: emailShell(`
        <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:#e0f2f0;color:#0f2137;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:18px;">Phase 1 Milestone</div>
        <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">One month in with ${candName}</h2>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${greeting},</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${candName} has reached the end of Phase 1 of the coaching plan. If you have early signals worth logging, now is the moment to do it while they are fresh.</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 16px;">Phase 2 focuses on <strong>${phase2Title}</strong>. A 30-minute check-in with Liz Harris at Alchemy Training UK is a practical way to review how Phase 1 went and set Phase 2 up properly.</p>
        ${ctaBlock({ planUrl, outcomeLogUrl, label: 'Open coaching plan' })}
      `),
    }
  }
  if (trigger === 'day_60') {
    return {
      subject: `${candName}, two months in, here's what matters now`,
      html: emailShell(`
        <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:#e0f2f0;color:#0f2137;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:18px;">Phase 2 Complete</div>
        <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">Phase 3 starts now</h2>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${greeting},</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${candName} has completed Phase 2 of the coaching plan. Phase 3 is the final stretch before the probation review point.</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 16px;">Liz's check-ins are most valuable here if issues are emerging. Phase 3 tends to surface the questions that decide the probation outcome, and a short coaching conversation can save a difficult one later.</p>
        ${ctaBlock({ planUrl, outcomeLogUrl, label: 'Open coaching plan' })}
      `),
    }
  }
  if (trigger === 'day_90') {
    return {
      subject: `${candName}, probation review: log the outcome`,
      html: emailShell(`
        <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:18px;">Probation Review Point</div>
        <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">Ninety days with ${candName}</h2>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${greeting},</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 14px;">${candName} has reached the 90-day probation review point. Log the probation outcome now so PRODICTA can close out the coaching plan and update your prediction accuracy.</p>
        <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 16px;">If the hire worked, the coaching plan is complete. If there were issues, a debrief with Liz Harris at Alchemy Training UK is worth the half hour. It is the right moment to turn any lessons into a hiring playbook for next time.</p>
        ${ctaBlock({ planUrl, outcomeLogUrl, label: 'Log probation outcome', includeOutcome: true })}
      `),
    }
  }
  return {
    subject: `Coaching plan reminder for ${candName}`,
    html: emailShell(`<p>${greeting},</p><p>Coaching plan reminder for ${candName}.</p>${ctaBlock({ planUrl, outcomeLogUrl, label: 'Open coaching plan' })}`),
  }
}
