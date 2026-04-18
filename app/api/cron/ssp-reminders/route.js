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

  // Find alerts reported >24h ago where SSP check not completed and reminder not yet sent
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: alerts, error } = await adminClient
    .from('ssp_alerts')
    .select('*, users(email, company_name)')
    .eq('ssp_check_completed', false)
    .eq('reminder_sent', false)
    .eq('resolved', false)
    .lt('reported_at', cutoff)

  if (error) {
    console.error('ssp-reminders: query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sent = []
  const errors = []

  for (const alert of alerts || []) {
    const email = alert.users?.email
    if (!email) continue

    const sickDateFormatted = new Date(alert.reported_sick_date + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const hoursAgo = Math.round((Date.now() - new Date(alert.reported_at).getTime()) / (1000 * 60 * 60))

    try {
      await resend.emails.send({
        from: 'Prodicta <reminders@prodicta.co.uk>',
        to: email,
 subject: `Reminder: SSP Check Still Required, ${alert.worker_name}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">SSP Reminder</div>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;font-weight:700;">SSP Check Overdue</p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 20px;">
        A sickness absence was reported <strong>${hoursAgo} hours ago</strong> and the SSP eligibility check has not yet been completed.
      </p>
      <div style="background:#f7f9fb;border:1px solid #e4e9f0;border-radius:10px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;width:140px;">Worker</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${alert.worker_name}</td></tr>
          ${alert.role_title ? `<tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Role</td><td style="padding:6px 0;font-size:14px;color:#0f172a;">${alert.role_title}</td></tr>` : ''}
          ${alert.client_company ? `<tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Client</td><td style="padding:6px 0;font-size:14px;color:#0f172a;">${alert.client_company}</td></tr>` : ''}
          <tr><td style="padding:6px 0;font-size:13px;color:#94a1b3;">Reported sick date</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${sickDateFormatted}</td></tr>
        </table>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
        <p style="font-size:13px;color:#991b1b;margin:0;line-height:1.5;">
          <strong>Action required:</strong> Under the 2026 SSP rules, entitlement begins from day one. Please complete the SSP check promptly to ensure compliance and correct payroll processing.
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/ssp" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Complete SSP Check</a>
      </div>
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#00BFA5;">PRODICTA</strong> &middot; <a href="${appUrl}" style="color:#94a1b3;">prodicta.co.uk</a></p>
    </div>
  </div>
</body>
</html>`,
      })

      await adminClient
        .from('ssp_alerts')
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq('id', alert.id)

      sent.push(email)
    } catch (err) {
      console.error(`ssp-reminders: failed for ${email}`, err)
      errors.push({ email, error: err.message })
    }
  }

  return NextResponse.json({ sent: sent.length, errors })
}
