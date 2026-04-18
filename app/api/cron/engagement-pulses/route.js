import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

function pulseEmailHtml({ pulseId, workerName, clientCompany, startDate, pulseNumber }) {
  const fmtDate = new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const bodies = {
    1: `Are you all set for your start at ${clientCompany}? Any questions about the role before you begin?`,
 2: `Just checking in, still excited about starting on ${fmtDate}? Is there anything you need from us before then?`,
    3: `Big day tomorrow! You are starting at ${clientCompany}. Is everything confirmed and ready to go?`,
  }
  const bodyText = bodies[pulseNumber] || bodies[1]
  const responseUrl = (response) => `${appUrl}/api/engagement?pulse_id=${pulseId}&response=${response}`
  const trackUrl = `${appUrl}/api/engagement?pulse_id=${pulseId}&track=1`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="background:#0F2137;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center">
  <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px">
    <span style="color:#ffffff">PRO</span><span style="color:#00BFA5">DICTA</span>
  </span>
</div>
<div style="background:#ffffff;padding:32px 28px;border:1px solid #e4e9f0;border-top:none">
  <p style="font-size:15px;color:#1a202c;line-height:1.65;margin:0 0 20px">Hi ${workerName},</p>
  <p style="font-size:15px;color:#1a202c;line-height:1.65;margin:0 0 28px">${bodyText}</p>
  <div style="text-align:center;margin-bottom:28px">
    <a href="${responseUrl('confirmed')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#00BFA5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">Yes, all good</a>
    <a href="${responseUrl('question')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#D97706;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">I have a question</a>
    <a href="${responseUrl('concern')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#B91C1C;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">Something has come up</a>
  </div>
  <p style="font-size:12px;color:#94a1b3;line-height:1.5;margin:0">This is an automated engagement check from PRODICTA. If you have any issues, please contact your recruitment consultant directly.</p>
</div>
<div style="background:#0F2137;border-radius:0 0 12px 12px;padding:20px 28px;text-align:center">
 <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0;line-height:1.5">Powered by PRODICTA, Predictive Hiring Intelligence<br>prodicta.co.uk</p>
</div>
</div>
<img src="${trackUrl}" width="1" height="1" style="display:none" alt="" />
</body></html>`
}

function calculateRisk(pulses) {
  const sent = pulses.filter(p => p.pulse_sent_at)
  if (sent.length === 0) return 'low'
  if (sent.some(p => p.response === 'concern')) return 'critical'
  const p3 = sent.find(p => p.pulse_number === 3)
  if (p3 && !p3.pulse_completed) {
    const hrs = (Date.now() - new Date(p3.pulse_sent_at).getTime()) / 3600000
    if (hrs >= 24) return 'critical'
  }
  const noResp = sent.filter(p =>
    p.response === 'no_response' ||
    (!p.pulse_completed && (Date.now() - new Date(p.pulse_sent_at).getTime()) >= 86400000)
  ).length
  if (noResp >= 2) return 'high'
  if (noResp >= 1) return 'medium'
  return 'low'
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const client = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const todayStr = new Date().toISOString().slice(0, 10)
  const sent = []
  const errors = []
  const riskUpdates = []

  // ── 1. Send scheduled pulses for today ─────────────────────────────────────
  // Find pulses not yet sent. We use a convention where pulse dates are computed:
  // pulse_number 1 = 3 days after creation, 2 = 2 days before start, 3 = 1 day before start
  // We check by computing expected send dates from start_date
  const { data: unsent } = await client
    .from('engagement_pulses')
    .select('*, users(email, company_name)')
    .is('pulse_sent_at', null)

  for (const pulse of (unsent || [])) {
    const startMs = new Date(pulse.start_date + 'T00:00:00').getTime()
    const dayMs = 86400000

    // Calculate expected send date based on pulse number
    let sendDate
    if (pulse.pulse_number === 1) {
      sendDate = new Date(new Date(pulse.created_at).getTime() + 3 * dayMs).toISOString().slice(0, 10)
    } else if (pulse.pulse_number === 2) {
      sendDate = new Date(startMs - 2 * dayMs).toISOString().slice(0, 10)
    } else if (pulse.pulse_number === 3) {
      sendDate = new Date(startMs - 1 * dayMs).toISOString().slice(0, 10)
    }

    // Send if today is on or after the send date
    if (sendDate && todayStr >= sendDate) {
      try {
        const clientCompany = pulse.client_company || ''
        const fmtDate = new Date(pulse.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        // Fetch client_company from assignment_reviews
        let company = clientCompany
        if (!company) {
          const { data: review } = await client
            .from('assignment_reviews')
            .select('client_company')
            .eq('candidate_id', pulse.candidate_id)
            .eq('user_id', pulse.user_id)
            .maybeSingle()
          company = review?.client_company || ''
        }

        await resend.emails.send({
          from: 'Prodicta <engagement@prodicta.co.uk>',
          to: pulse.worker_email,
          subject: `Quick question before you start at ${company} on ${fmtDate}`,
          html: pulseEmailHtml({
            pulseId: pulse.id,
            workerName: pulse.worker_name,
            clientCompany: company,
            startDate: pulse.start_date,
            pulseNumber: pulse.pulse_number,
          }),
        })

        await client
          .from('engagement_pulses')
          .update({ pulse_sent_at: new Date().toISOString() })
          .eq('id', pulse.id)

        sent.push(pulse.id)
      } catch (err) {
        errors.push({ id: pulse.id, error: err.message })
      }
    }
  }

  // ── 2. Check for no-responses after 24 hours ──────────────────────────────
  const cutoff24h = new Date(Date.now() - 24 * 3600000).toISOString()
  const { data: overdue } = await client
    .from('engagement_pulses')
    .select('*')
    .not('pulse_sent_at', 'is', null)
    .eq('pulse_completed', false)
    .is('response', null)
    .lt('pulse_sent_at', cutoff24h)

  for (const pulse of (overdue || [])) {
    await client
      .from('engagement_pulses')
      .update({ response: 'no_response' })
      .eq('id', pulse.id)
  }

  // ── 3. Recalculate ghosting risk for all active sequences ─────────────────
  const { data: allPulses } = await client
    .from('engagement_pulses')
    .select('*')
    .not('pulse_sent_at', 'is', null)

  const grouped = {}
  for (const p of (allPulses || [])) {
    const key = `${p.user_id}:${p.candidate_id}`
    if (!grouped[key]) grouped[key] = { user_id: p.user_id, candidate_id: p.candidate_id, pulses: [] }
    grouped[key].pulses.push(p)
  }

  for (const g of Object.values(grouped)) {
    const risk = calculateRisk(g.pulses)

    const healthUpdate = { ghosting_risk: risk, last_engagement_at: new Date().toISOString() }
    if (risk === 'critical') {
      healthUpdate.placement_health = 'red'
      healthUpdate.overall_status = 'critical'
    } else if (risk === 'high') {
      healthUpdate.placement_health = 'amber'
      healthUpdate.overall_status = 'at_risk'
    }

    await client
      .from('assignment_reviews')
      .update(healthUpdate)
      .eq('candidate_id', g.candidate_id)
      .eq('user_id', g.user_id)

    // ── 4. Send consultant alerts for HIGH/CRITICAL ────────────────────────
    if (risk === 'high' || risk === 'critical') {
      const { data: userRow } = await client.from('users').select('email').eq('id', g.user_id).single()
      if (userRow?.email) {
        const latestPulse = g.pulses.sort((a, b) => b.pulse_number - a.pulse_number)[0]
        const fmtDate = latestPulse.start_date
          ? new Date(latestPulse.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'TBC'

        // Fetch client company
        const { data: review } = await client
          .from('assignment_reviews')
          .select('client_company')
          .eq('candidate_id', g.candidate_id)
          .eq('user_id', g.user_id)
          .maybeSingle()

        try {
          await resend.emails.send({
            from: 'Prodicta <alerts@prodicta.co.uk>',
            to: userRow.email,
 subject: `Ghosting Risk Alert, ${latestPulse.worker_name} starts ${fmtDate}`,
            html: buildCronAlertEmail({
              workerName: latestPulse.worker_name,
              clientCompany: review?.client_company || '',
              startDate: fmtDate,
              risk,
              pulses: g.pulses,
              appUrl,
              assessmentId: latestPulse.assessment_id,
              candidateId: g.candidate_id,
            }),
          })
        } catch (err) {
          errors.push({ candidate_id: g.candidate_id, error: err.message })
        }
      }
      riskUpdates.push({ candidate_id: g.candidate_id, risk })
    }
  }

  return NextResponse.json({
    pulses_sent: sent.length,
    no_responses_marked: (overdue || []).length,
    risk_alerts: riskUpdates.length,
    errors: errors.length,
  })
}

function buildCronAlertEmail({ workerName, clientCompany, startDate, risk, pulses, appUrl, assessmentId, candidateId }) {
  const riskColor = risk === 'critical' ? '#B91C1C' : '#D97706'
  const riskLabel = risk.charAt(0).toUpperCase() + risk.slice(1)
  const trackerUrl = `${appUrl}/assessment/${assessmentId}/candidate/${candidateId}/assignment-review`

  const pulseRows = pulses
    .sort((a, b) => a.pulse_number - b.pulse_number)
    .map(p => {
      const status = p.response === 'confirmed' ? 'Confirmed'
        : p.response === 'question' ? 'Has question'
        : p.response === 'concern' ? 'Concern raised'
        : p.response === 'no_response' ? 'No response'
        : p.pulse_opened ? 'Opened'
        : p.pulse_sent_at ? 'Sent'
        : 'Scheduled'
      const color = p.response === 'confirmed' ? '#00BFA5'
        : p.response === 'concern' || p.response === 'no_response' ? '#B91C1C'
        : p.response === 'question' ? '#D97706'
        : '#94a1b3'
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#4a5568">Pulse ${p.pulse_number}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:${color}">${status}</td></tr>`
    }).join('')

  const actions = risk === 'critical'
    ? `<li>Call ${workerName} immediately</li><li>Have a backup candidate ready</li><li>Notify the client</li><li><a href="${trackerUrl}" style="color:#00BFA5">Open assignment tracker</a></li>`
    : `<li>Call ${workerName} immediately</li><li>Have a backup candidate ready</li><li><a href="${trackerUrl}" style="color:#00BFA5">Open assignment tracker</a></li>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="background:#0F2137;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center">
  <span style="font-size:20px;font-weight:800"><span style="color:#ffffff">PRO</span><span style="color:#00BFA5">DICTA</span></span>
</div>
<div style="background:#ffffff;padding:32px 28px;border:1px solid #e4e9f0;border-top:none">
  <div style="background:${riskColor}12;border-left:4px solid ${riskColor};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px">
    <p style="font-size:16px;font-weight:800;color:${riskColor};margin:0 0 4px">${riskLabel} Ghosting Risk</p>
    <p style="font-size:13px;color:#4a5568;margin:0">${workerName}${clientCompany ? ' at ' + clientCompany : ''}</p>
  </div>
  <table style="width:100%;margin-bottom:20px">
    <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;width:120px">Worker</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#1a202c">${workerName}</td></tr>
    ${clientCompany ? `<tr><td style="padding:6px 0;font-size:13px;color:#94a1b3">Client</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#1a202c">${clientCompany}</td></tr>` : ''}
    <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3">Start date</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#1a202c">${startDate}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3">Risk level</td><td style="padding:6px 0;font-size:13px;font-weight:800;color:${riskColor}">${riskLabel}</td></tr>
  </table>
  <h3 style="font-size:14px;font-weight:800;color:#0F2137;margin:0 0 8px">Pulse History</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">${pulseRows}</table>
  <h3 style="font-size:14px;font-weight:800;color:#0F2137;margin:0 0 8px">Recommended Actions</h3>
  <ul style="margin:0;padding-left:20px;font-size:13px;color:#4a5568;line-height:1.8">${actions}</ul>
</div>
<div style="background:#0F2137;border-radius:0 0 12px 12px;padding:20px 28px;text-align:center">
 <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0">Powered by PRODICTA, Predictive Hiring Intelligence</p>
</div>
</div></body></html>`
}
