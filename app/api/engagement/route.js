import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Public endpoint: handles tracking pixel opens and pulse responses
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pulseId = searchParams.get('pulse_id')
  const track = searchParams.get('track')
  const response = searchParams.get('response')

  if (!pulseId) return NextResponse.json({ error: 'Missing pulse_id' }, { status: 400 })

  const client = createServiceClient()

  // Tracking pixel — mark email as opened
  if (track === '1') {
    await client
      .from('engagement_pulses')
      .update({ pulse_opened: true, pulse_opened_at: new Date().toISOString() })
      .eq('id', pulseId)
      .eq('pulse_opened', false)

    // Return 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    return new NextResponse(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  }

  // Pulse response — update record
  if (response && ['confirmed', 'question', 'concern'].includes(response)) {
    const { data: pulse } = await client
      .from('engagement_pulses')
      .select('*, users(email, company_name)')
      .eq('id', pulseId)
      .single()

    if (!pulse) return NextResponse.json({ error: 'Pulse not found' }, { status: 404 })

    // Update pulse record
    await client
      .from('engagement_pulses')
      .update({
        pulse_completed: true,
        pulse_completed_at: new Date().toISOString(),
        pulse_opened: true,
        pulse_opened_at: pulse.pulse_opened_at || new Date().toISOString(),
        response,
      })
      .eq('id', pulseId)

    // Update last_engagement_at on assignment_reviews
    await client
      .from('assignment_reviews')
      .update({ last_engagement_at: new Date().toISOString() })
      .eq('candidate_id', pulse.candidate_id)
      .eq('user_id', pulse.user_id)

    // Recalculate ghosting risk
    const { data: allPulses } = await client
      .from('engagement_pulses')
      .select('*')
      .eq('candidate_id', pulse.candidate_id)
      .eq('user_id', pulse.user_id)
      .order('pulse_number', { ascending: true })

    const ghostingRisk = calculateRisk(allPulses || [])

    // Update assignment_reviews ghosting risk and potentially placement health
    const healthUpdate = { ghosting_risk: ghostingRisk }
    if (ghostingRisk === 'critical') {
      healthUpdate.placement_health = 'red'
      healthUpdate.overall_status = 'critical'
    } else if (ghostingRisk === 'high') {
      healthUpdate.placement_health = 'amber'
      healthUpdate.overall_status = 'at_risk'
    }
    await client
      .from('assignment_reviews')
      .update(healthUpdate)
      .eq('candidate_id', pulse.candidate_id)
      .eq('user_id', pulse.user_id)

    // Send consultant alerts for question/concern responses
    if ((response === 'question' || response === 'concern') && pulse.users?.email) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const isUrgent = response === 'concern'
        const fmtDate = pulse.start_date
          ? new Date(pulse.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'TBC'

        await resend.emails.send({
          from: 'Prodicta <alerts@prodicta.co.uk>',
          to: pulse.users.email,
          subject: isUrgent
            ? `Ghosting Risk Alert — ${pulse.worker_name} starts ${fmtDate}`
            : `Engagement Update — ${pulse.worker_name} has a question`,
          html: buildAlertEmail({
            workerName: pulse.worker_name,
            clientCompany: pulse.client_company || '',
            startDate: fmtDate,
            pulseNumber: pulse.pulse_number,
            response,
            ghostingRisk,
            allPulses: allPulses || [],
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk',
            assessmentId: pulse.assessment_id,
            candidateId: pulse.candidate_id,
          }),
        })
      } catch (err) {
        console.error('Failed to send consultant alert:', err)
      }
    }

    // Redirect to a thank-you page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
    const messages = {
      confirmed: 'Thanks for confirming. Your recruitment consultant has been notified.',
      question: 'Thanks for letting us know. Your consultant will be in touch shortly.',
      concern: 'We have notified your consultant who will contact you as soon as possible.',
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Response Received — PRODICTA</title></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',Helvetica,Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:60px 20px;text-align:center">
<div style="margin-bottom:24px">
  <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px">
    <span style="color:#0F2137">PRO</span><span style="color:#00BFA5">DICTA</span>
  </span>
</div>
<div style="background:#ffffff;border:1px solid #e4e9f0;border-radius:14px;padding:36px 28px">
  <div style="width:56px;height:56px;border-radius:50%;background:${response === 'confirmed' ? '#E6F7F5' : response === 'question' ? '#fffbeb' : '#fef2f2'};margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
    <span style="font-size:24px">${response === 'confirmed' ? '&#10003;' : response === 'question' ? '?' : '!'}</span>
  </div>
  <h1 style="font-size:20px;font-weight:800;color:#0F2137;margin:0 0 12px">Response received</h1>
  <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0">${messages[response]}</p>
</div>
</div></body></html>`

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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

function buildAlertEmail({ workerName, clientCompany, startDate, pulseNumber, response, ghostingRisk, allPulses, appUrl, assessmentId, candidateId }) {
  const riskColors = { low: '#00BFA5', medium: '#D97706', high: '#B91C1C', critical: '#B91C1C' }
  const riskColor = riskColors[ghostingRisk] || '#94a1b3'
  const riskLabel = ghostingRisk.charAt(0).toUpperCase() + ghostingRisk.slice(1)

  const pulseRows = allPulses.map(p => {
    const status = p.response === 'confirmed' ? 'Confirmed'
      : p.response === 'question' ? 'Has question'
      : p.response === 'concern' ? 'Concern raised'
      : p.response === 'no_response' ? 'No response'
      : p.pulse_opened ? 'Opened, awaiting response'
      : p.pulse_sent_at ? 'Sent, not opened'
      : 'Scheduled'
    const color = p.response === 'confirmed' ? '#00BFA5'
      : p.response === 'concern' ? '#B91C1C'
      : p.response === 'no_response' ? '#B91C1C'
      : p.response === 'question' ? '#D97706'
      : '#94a1b3'
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#4a5568">Pulse ${p.pulse_number}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:${color}">${status}</td></tr>`
  }).join('')

  const trackerUrl = `${appUrl}/assessment/${assessmentId}/candidate/${candidateId}/assignment-review`

  const actions = ghostingRisk === 'critical'
    ? `<li>Call ${workerName} immediately</li><li>Have a backup candidate ready</li><li>Notify the client</li><li><a href="${trackerUrl}" style="color:#00BFA5">Open assignment tracker</a></li>`
    : `<li>Call ${workerName} immediately</li><li>Have a backup candidate ready</li><li><a href="${trackerUrl}" style="color:#00BFA5">Open assignment tracker</a></li>`

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
  <div style="background:${riskColor}12;border-left:4px solid ${riskColor};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px">
    <p style="font-size:16px;font-weight:800;color:${riskColor};margin:0 0 4px">${riskLabel} Ghosting Risk</p>
    <p style="font-size:13px;color:#4a5568;margin:0">Engagement pulse ${response === 'concern' ? 'flagged a concern' : response === 'question' ? 'received a question' : 'update'}</p>
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
  <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0">Powered by PRODICTA — Predictive Hiring Intelligence</p>
</div>
</div></body></html>`
}
