import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const adminClient = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

  const notifsSent = []
  const errors = []

  // ── Load all outcomes that have a placement_date ───────────────────────────
  const { data: outcomes, error: ocErr } = await adminClient
    .from('candidate_outcomes')
    .select('*, candidates(id, name, assessments(role_title)), users(email, company_name, account_type)')
    .not('placement_date', 'is', null)

  if (ocErr) {
    console.error('placement-reminders: query failed', ocErr)
    return NextResponse.json({ error: ocErr.message }, { status: 500 })
  }

  const now = new Date()

  for (const o of outcomes || []) {
    const user      = o.users
    const cand      = o.candidates
    const candName  = cand?.name || 'the candidate'
    const role      = cand?.assessments?.role_title || 'this role'
    const client    = o.client_name || 'your client'
    const elapsed   = Math.max(0, Math.floor((now - new Date(o.placement_date)) / 86400000))
    const candLink  = cand?.id ? `${appUrl}/assessment/new` : `${appUrl}/outcomes`

    try {
      // ── AGENCY: Rebate period reminders ─────────────────────────────────────
      if (user?.account_type === 'agency' && o.rebate_weeks) {
        const totalDays = o.rebate_weeks * 7
        const sent = o.rebate_reminder_sent || {}
        const weeksLeft = Math.max(0, o.rebate_weeks - Math.ceil(elapsed / 7))

        // Week 2 reminder (days 14-20)
        if (elapsed >= 14 && elapsed < 21 && !sent.week2) {
          const subject = `Rebate check-in: ${candName} at ${client} — ${o.rebate_weeks - 2} weeks remaining`
          await sendReminderEmail(resend, user.email, subject, buildRebateEmail({
            appUrl, candName, client, role, weeksLeft: o.rebate_weeks - 2, rebateWeeks: o.rebate_weeks,
            message: `Week 2 of the rebate period has passed. You have <strong>${o.rebate_weeks - 2} weeks</strong> remaining. Now is a good time to check in on how ${candName} is settling in at ${client}.`,
          }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Rebate check-in: ${candName}`,
            `Week 2 of the rebate period. ${weeksLeft} weeks remaining. Review their Prodicta assessment for flagged concerns.`)
          await adminClient.from('candidate_outcomes').update({ rebate_reminder_sent: { ...sent, week2: true } }).eq('id', o.id)
          notifsSent.push({ type: 'rebate_week2', candidate: candName })
        }

        // Week 4 reminder (days 28-34)
        if (elapsed >= 28 && elapsed < 35 && !sent.week4) {
          const subject = `Rebate check-in: ${candName} at ${client} — ${o.rebate_weeks - 4} weeks remaining`
          await sendReminderEmail(resend, user.email, subject, buildRebateEmail({
            appUrl, candName, client, role, weeksLeft: o.rebate_weeks - 4, rebateWeeks: o.rebate_weeks,
            message: `Week 4 has passed. You are now past the halfway point of the rebate window. Review any flagged concerns from ${candName}'s Prodicta assessment and ensure they are being addressed.`,
          }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Rebate mid-point: ${candName}`,
            `Week 4 of the rebate period. ${Math.max(0, weeksLeft)} weeks remaining. Review flagged concerns in the Prodicta report.`)
          await adminClient.from('candidate_outcomes').update({ rebate_reminder_sent: { ...sent, week4: true } }).eq('id', o.id)
          notifsSent.push({ type: 'rebate_week4', candidate: candName })
        }

        // Final week reminder (day >= (rebate_weeks-1)*7, < rebate_weeks*7)
        if (elapsed >= (o.rebate_weeks - 1) * 7 && elapsed < totalDays && !sent.final) {
          const subject = `Final week: Rebate period for ${candName} ends soon`
          await sendReminderEmail(resend, user.email, subject, buildRebateEmail({
            appUrl, candName, client, role, weeksLeft: 1, rebateWeeks: o.rebate_weeks,
            message: `The rebate window for <strong>${candName}</strong> at <strong>${client}</strong> closes this week. Log the final outcome now to confirm fee is secured or to action the rebate if needed.`,
            urgent: true,
          }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Final rebate week: ${candName}`,
            `Rebate period ends this week. Log the final outcome to confirm fee is secured.`)
          await adminClient.from('candidate_outcomes').update({ rebate_reminder_sent: { ...sent, final: true } }).eq('id', o.id)
          notifsSent.push({ type: 'rebate_final', candidate: candName })
        }

        // Rebate ended — prompt to log final outcome (day >= totalDays, within 7 days after)
        if (elapsed >= totalDays && elapsed < totalDays + 7 && !sent.ended) {
          const subject = `Fee secured: Rebate period for ${candName} has ended`
          await sendReminderEmail(resend, user.email, subject, buildRebateEmail({
            appUrl, candName, client, role, weeksLeft: 0, rebateWeeks: o.rebate_weeks,
            message: `The ${o.rebate_weeks}-week rebate period for <strong>${candName}</strong> at <strong>${client}</strong> has now ended. Log the final outcome to confirm the fee is secured.`,
            ended: true,
          }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Rebate period ended: ${candName}`,
            `The rebate window has closed. Log the final outcome now.`)
          await adminClient.from('candidate_outcomes').update({ rebate_reminder_sent: { ...sent, ended: true } }).eq('id', o.id)
          notifsSent.push({ type: 'rebate_ended', candidate: candName })
        }
      }

      // ── EMPLOYER: Probation reminders ───────────────────────────────────────
      if (user?.account_type === 'employer' && o.probation_months) {
        const sent = o.probation_reminder_sent || {}

        // Month 1 (days 30-36)
        if (elapsed >= 30 && elapsed < 37 && !sent.month1) {
          await sendReminderEmail(resend, user.email,
            `Month 1 check-in: ${candName}`,
            buildProbationEmail({ appUrl, candName, role, month: 1, probationMonths: o.probation_months,
              message: `${candName} is now one month into their probation. This is an ideal time for a structured check-in. Review their Prodicta assessment to see whether any flagged concerns have materialised.` }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Month 1 check-in: ${candName}`,
            `One month into probation. Review the Prodicta report — have any flagged concerns materialised?`)
          await adminClient.from('candidate_outcomes').update({ probation_reminder_sent: { ...sent, month1: true } }).eq('id', o.id)
          notifsSent.push({ type: 'probation_month1', candidate: candName })
        }

        // Month 3 (days 91-97)
        if (elapsed >= 91 && elapsed < 98 && !sent.month3) {
          await sendReminderEmail(resend, user.email,
            `Month 3 review: ${candName} — 3 months into probation`,
            buildProbationEmail({ appUrl, candName, role, month: 3, probationMonths: o.probation_months,
              message: `${candName} is now at the mid-point of probation. This is a critical review moment — especially for any watch-outs flagged in their Prodicta assessment. Document your findings now.` }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Month 3 review: ${candName}`,
            `Three months into probation. Conduct a structured mid-point review and log your findings.`)
          await adminClient.from('candidate_outcomes').update({ probation_reminder_sent: { ...sent, month3: true } }).eq('id', o.id)
          notifsSent.push({ type: 'probation_month3', candidate: candName })
        }

        // Month 5 — urgent ERA warning (days 152-158)
        if (elapsed >= 152 && elapsed < 159 && !sent.month5) {
          await sendReminderEmail(resend, user.email,
            `URGENT: One month until unfair dismissal rights apply — ${candName}`,
            buildProbationEmail({ appUrl, candName, role, month: 5, probationMonths: o.probation_months,
              message: `<strong style="color:#dc2626;">You have one month before ${candName} acquires unfair dismissal rights under ERA 2025.</strong> If there are unresolved performance concerns, you must act now. Review the flagged watch-outs in their Prodicta assessment and document your decision before the 6-month mark.`,
              urgent: true }))
          await insertNotification(adminClient, o.user_id, cand?.id, cand?.assessment_id,
            `Urgent: ${candName} approaching ERA 2025 threshold`,
            `One month until unfair dismissal rights apply. Log your probation outcome now.`)
          await adminClient.from('candidate_outcomes').update({ probation_reminder_sent: { ...sent, month5: true } }).eq('id', o.id)
          notifsSent.push({ type: 'probation_month5', candidate: candName })
        }
      }
    } catch (err) {
      console.error(`placement-reminders: failed for outcome ${o.id}`, err)
      errors.push({ outcome: o.id, error: err.message })
    }
  }

  return NextResponse.json({ sent: notifsSent.length, details: notifsSent, errors })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function insertNotification(client, userId, candidateId, assessmentId, title, body) {
  await client.from('notifications').insert({
    user_id: userId,
    type: 'placement_reminder',
    title,
    body,
    candidate_id: candidateId || null,
    assessment_id: assessmentId || null,
  })
}

async function sendReminderEmail(resend, to, subject, html) {
  if (!to) return
  await resend.emails.send({
    from: 'Prodicta <reminders@prodicta.co.uk>',
    to,
    subject,
    html,
  })
}

function emailShell(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">Placement &amp; Hire Tracking</div>
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

function buildRebateEmail({ appUrl, candName, client, role, weeksLeft, rebateWeeks, message, urgent = false, ended = false }) {
  const accentColor = ended ? '#16a34a' : urgent ? '#dc2626' : '#d97706'
  const badgeText   = ended ? 'Fee Secured' : urgent ? 'Final Week' : 'Rebate Active'
  const badgeBg     = ended ? '#dcfce7' : urgent ? '#fef2f2' : '#fef9c3'

  return emailShell(`
    <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${badgeBg};color:${accentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:18px;">${badgeText}</div>
    <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">${candName} &mdash; ${role}</h2>
    <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 20px;">${message}</p>
    ${!ended && weeksLeft > 0 ? `<div style="background:#f7f9fb;border:1px solid #e4e9f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:16px;">
      <div style="text-align:center;min-width:60px;">
        <div style="font-size:32px;font-weight:800;color:${accentColor};line-height:1;">${weeksLeft}</div>
        <div style="font-size:11px;color:#94a1b3;font-weight:600;">WEEKS LEFT</div>
      </div>
      <div>
        <div style="font-size:13px;color:#0f2137;font-weight:600;">${rebateWeeks}-week rebate &middot; Placement at ${client}</div>
        <div style="font-size:12px;color:#94a1b3;margin-top:3px;">Review the Prodicta assessment for flagged watch-outs</div>
      </div>
    </div>` : ''}
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${appUrl}/outcomes" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:14px;padding:13px 32px;border-radius:10px;text-decoration:none;">Log Outcome &rarr;</a>
    </div>
  `)
}

function buildProbationEmail({ appUrl, candName, role, month, probationMonths, message, urgent = false }) {
  const accentColor = urgent ? '#dc2626' : '#0f2137'
  const badgeText   = urgent ? 'Urgent: ERA 2025 Warning' : `Month ${month} Check-in`
  const badgeBg     = urgent ? '#fef2f2' : '#e0f2f0'

  return emailShell(`
    <div style="display:inline-block;padding:4px 12px;border-radius:20px;background:${badgeBg};color:${accentColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:18px;">${badgeText}</div>
    <h2 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 14px;line-height:1.3;">${candName} &mdash; ${role}</h2>
    <p style="font-size:14px;color:#5e6b7f;line-height:1.7;margin:0 0 24px;">${message}</p>
    ${urgent ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#dc2626;font-weight:600;margin:0;">Under ERA 2025, employees acquire unfair dismissal rights after 6 months of employment. Ensure all performance concerns are documented and any necessary steps are taken before this threshold.</p>
    </div>` : ''}
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${appUrl}/outcomes" style="display:inline-block;background:${urgent ? '#dc2626' : '#00BFA5'};color:#fff;font-weight:700;font-size:14px;padding:13px 32px;border-radius:10px;text-decoration:none;">Log Probation Outcome &rarr;</a>
    </div>
  `)
}
