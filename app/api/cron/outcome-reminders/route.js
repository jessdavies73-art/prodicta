import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'
import { isAgencyPerm } from '@/lib/account-helpers'

const HIRE_OUTCOMES = ['passed_probation', 'still_probation', 'still_in_probation', 'still_employed']

function monthsBetween(fromIso, toDate) {
  if (!fromIso) return 0
  const from = new Date(fromIso)
  const days = (toDate.getTime() - from.getTime()) / 86400000
  return days / 30.44
}

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

  // Pull every outcome that represents an active hire
  const { data: outcomes, error } = await adminClient
    .from('candidate_outcomes')
    .select('id, candidate_id, user_id, outcome, placement_date, candidates(id, name, assessment_id, assessments(role_title))')
    .in('outcome', HIRE_OUTCOMES)
    .not('placement_date', 'is', null)

  if (error) {
    console.error('outcome-reminders: query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bulk-fetch the owner profiles in one round-trip so the per-row gate
  // below can read account_type + default_employment_type without N hits.
  // Permanent recruitment agencies do not retain a relationship with the
  // placement after the rebate period, so 6 and 12-month reminders are
  // out of scope for them; only 3-month reminders are generated.
  const ownerIds = Array.from(new Set((outcomes || []).map(o => o.user_id).filter(Boolean)))
  const profileById = new Map()
  if (ownerIds.length > 0) {
    const { data: profileRows } = await adminClient
      .from('users')
      .select('id, account_type, default_employment_type')
      .in('id', ownerIds)
    for (const p of profileRows || []) profileById.set(p.id, p)
  }

  const sent = []
  const errors = []

  for (const o of outcomes || []) {
    try {
      const months = monthsBetween(o.placement_date, now)
      const due = months >= 12 ? 12 : months >= 6 ? 6 : months >= 3 ? 3 : 0
      if (due === 0) continue

      // Agency-perm gate: only 3-month reminders are in scope.
      const ownerProfile = profileById.get(o.user_id)
      if (isAgencyPerm(ownerProfile) && due !== 3) continue

      // Check what reminder months we have already sent for this outcome
      const { data: existing } = await adminClient
        .from('outcome_reminders')
        .select('reminder_month')
        .eq('candidate_outcome_id', o.id)
      const sentMonths = new Set((existing || []).map(r => r.reminder_month))
      if (sentMonths.has(due)) continue

      const { data: ownerInfo } = await adminClient.auth.admin.getUserById(o.user_id)
      const ownerEmail = ownerInfo?.user?.email
      if (!ownerEmail) continue

      const candidateName = o.candidates?.name || 'your hire'
      const roleTitle = o.candidates?.assessments?.role_title || 'this role'
      const token = uuidv4()

      // Persist the reminder row first so the response link is valid even if mail fails
      await adminClient.from('outcome_reminders').insert({
        candidate_outcome_id: o.id,
        reminder_month: due,
        sent_at: new Date().toISOString(),
        token,
      })

      const linkBase = `${appUrl}/api/outcome-update/${token}`
      const buttonStyle = (bg, color) => `display:inline-block;background:${bg};color:${color};font-weight:700;font-size:13px;padding:11px 18px;margin:4px 4px 4px 0;border-radius:8px;text-decoration:none;`

      try {
        await resend.emails.send({
          from: EMAIL_FROM,
          to: ownerEmail,
          subject: `How is ${candidateName} doing? ${due}-month check-in for ${roleTitle}`,
          html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e4e9f0;">
  <div style="background:#0f2137;padding:24px 32px;">
    <div style="color:#00BFA5;font-size:22px;font-weight:800;letter-spacing:-0.5px;">PRODICTA</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:2px;">${due}-month outcome check-in</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 14px;">Quick check-in.</p>
    <p style="font-size:14.5px;color:#5e6b7f;line-height:1.65;margin:0 0 18px;">
      It has been ${due} month${due === 1 ? '' : 's'} since you logged ${candidateName} as hired for the <strong style="color:#0f172a;">${roleTitle}</strong> role. How are they doing? Click one button below and we will update the record automatically.
    </p>
    <div style="margin:24px 0 8px;">
      <a href="${linkBase}?response=passed_probation" style="${buttonStyle('#16a34a', '#fff')}">Passed probation</a>
      <a href="${linkBase}?response=still_probation" style="${buttonStyle('#00BFA5', '#0f2137')}">Still in probation</a>
      <a href="${linkBase}?response=failed_probation" style="${buttonStyle('#dc2626', '#fff')}">Failed</a>
      <a href="${linkBase}?response=left_early" style="${buttonStyle('#f59e0b', '#fff')}">Left early</a>
      <a href="${linkBase}?response=dismissed" style="${buttonStyle('#94a1b3', '#fff')}">Dismissed</a>
    </div>
    <p style="font-size:12px;color:#94a1b3;margin:22px 0 0;line-height:1.55;">
      Your response will be recorded against this hire and used to improve PRODICTA prediction accuracy for your account. No login required.
    </p>
  </div>
</div>
</body></html>`,
        })
        sent.push({ outcomeId: o.id, month: due })
      } catch (mailErr) {
        console.error('outcome-reminders: send failed', mailErr?.message)
        errors.push({ outcomeId: o.id, error: mailErr?.message })
      }
    } catch (rowErr) {
      console.error('outcome-reminders: row error', rowErr?.message)
      errors.push({ outcomeId: o.id, error: rowErr?.message })
    }
  }

  return NextResponse.json({ sent: sent.length, errors, details: sent })
}
