import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const ALLOWED = ['passed_probation', 'still_probation', 'failed_probation', 'left_early', 'dismissed']

function htmlPage(title, body, accent = '#00BFA5') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
<div style="max-width:560px;margin:80px auto;background:#fff;border:1px solid #e4e9f0;border-radius:14px;padding:48px 36px;text-align:center;">
  <div style="font-size:24px;font-weight:800;color:${accent};letter-spacing:-0.5px;margin-bottom:6px;">PRODICTA</div>
  <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:24px;">Outcome check-in</div>
  <h1 style="font-size:22px;font-weight:800;color:#0f2137;margin:0 0 14px;">${title}</h1>
  <p style="font-size:14.5px;color:#5e6b7f;line-height:1.65;margin:0;">${body}</p>
  <a href="https://prodicta.co.uk/dashboard" style="display:inline-block;margin-top:26px;background:#00BFA5;color:#0f2137;font-weight:700;font-size:13.5px;padding:11px 22px;border-radius:8px;text-decoration:none;">Open dashboard</a>
</div>
</body></html>`
}

export async function GET(request, { params }) {
  const url = new URL(request.url)
  const response = url.searchParams.get('response')
  if (!response || !ALLOWED.includes(response)) {
    return new Response(htmlPage('Invalid response', 'That response is not recognised. Please use one of the buttons in the email.', '#dc2626'), {
      status: 400, headers: { 'Content-Type': 'text/html' },
    })
  }

  const adminClient = createServiceClient()
  const { data: reminder } = await adminClient
    .from('outcome_reminders')
    .select('id, candidate_outcome_id, responded_at')
    .eq('token', params.token)
    .maybeSingle()
  if (!reminder) {
    return new Response(htmlPage('Link expired', 'This check-in link is no longer valid. Open your dashboard to update outcomes manually.', '#dc2626'), {
      status: 404, headers: { 'Content-Type': 'text/html' },
    })
  }

  if (reminder.responded_at) {
    return new Response(htmlPage('Already recorded', 'Thanks, this check-in has already been recorded against the hire.'), {
      status: 200, headers: { 'Content-Type': 'text/html' },
    })
  }

  // Update the candidate_outcomes row with the new status
  await adminClient
    .from('candidate_outcomes')
    .update({ outcome: response, outcome_date: new Date().toISOString().slice(0, 10) })
    .eq('id', reminder.candidate_outcome_id)

  // Mark the reminder as responded
  await adminClient
    .from('outcome_reminders')
    .update({ responded_at: new Date().toISOString(), response })
    .eq('id', reminder.id)

  const labels = {
    passed_probation: 'Passed probation',
    still_probation: 'Still in probation',
    failed_probation: 'Failed probation',
    left_early: 'Left early',
    dismissed: 'Dismissed',
  }
  return new Response(htmlPage('Thank you', `Recorded as <strong>${labels[response]}</strong>. PRODICTA will use this to improve prediction accuracy for your account.`), {
    status: 200, headers: { 'Content-Type': 'text/html' },
  })
}
