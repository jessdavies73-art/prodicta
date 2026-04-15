import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { candidate_id, assessment_id, worker_name, role_title, client_company, reported_sick_date } = body

  if (!worker_name || !reported_sick_date) {
    return NextResponse.json({ error: 'worker_name and reported_sick_date are required' }, { status: 400 })
  }

  // Insert the SSP alert record
  const { data: alert, error: insertErr } = await supabase.from('ssp_alerts').insert({
    user_id: user.id,
    candidate_id: candidate_id || null,
    assessment_id: assessment_id || null,
    worker_name,
    role_title: role_title || null,
    client_company: client_company || null,
    reported_sick_date,
  }).select('id').single()

  if (insertErr) {
    console.error('ssp-alerts: insert failed', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Send email notification via Resend
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

  const sickDateFormatted = new Date(reported_sick_date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  try {
    await resend.emails.send({
      from: 'Prodicta <alerts@prodicta.co.uk>',
      to: user.email,
      subject: `SSP Check Required — ${worker_name}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">SSP Alert</div>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;font-weight:700;">SSP Check Required</p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 20px;">
        A sickness absence has been reported for one of your temporary workers. An SSP eligibility check is now required.
      </p>
      <div style="background:#f7f9fb;border:1px solid #e4e9f0;border-radius:10px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;width:140px;">Worker</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${worker_name}</td></tr>
          ${role_title ? `<tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Role</td><td style="padding:6px 0;font-size:14px;color:#0f172a;">${role_title}</td></tr>` : ''}
          ${client_company ? `<tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Client</td><td style="padding:6px 0;font-size:14px;color:#0f172a;">${client_company}</td></tr>` : ''}
          <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Reported sick date</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${sickDateFormatted}</td></tr>
        </table>
      </div>
      <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
        <p style="font-size:13px;color:#92400e;margin:0;line-height:1.5;">
          <strong>Reminder:</strong> Under the Employment Rights Act 2026 amendments, SSP is payable from day one of sickness absence. There is no waiting period and no lower earnings limit for absences starting on or after 6 April 2026.
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/ssp" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Run SSP Check</a>
      </div>
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#00BFA5;">PRODICTA</strong> &middot; <a href="${appUrl}" style="color:#94a1b3;">prodicta.co.uk</a></p>
    </div>
  </div>
</body>
</html>`,
    })
  } catch (emailErr) {
    console.error('ssp-alerts: email failed', emailErr)
    // Alert was created successfully, email failure is non-blocking
  }

  return NextResponse.json({ id: alert.id })
}

export async function PATCH(request) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { id, action, ssp_record_id } = body

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
  }

  const updates = {}
  if (action === 'complete') {
    updates.ssp_check_completed = true
    updates.ssp_check_completed_at = new Date().toISOString()
    if (ssp_record_id) updates.ssp_record_id = ssp_record_id
  } else if (action === 'resolve') {
    updates.resolved = true
    updates.resolved_at = new Date().toISOString()
  }

  const { error: updateErr } = await supabase
    .from('ssp_alerts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
