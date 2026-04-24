import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const adminClient = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Candidates sent >48h ago, not started, reminder not yet sent
  const { data: candidates, error } = await adminClient
    .from('candidates')
    .select('id, name, email, unique_link, assessment_id, user_id, assessments(role_title), users(company_name)')
    .eq('status', 'sent')
    .lt('created_at', cutoff)
    .or('reminder_sent.is.null,reminder_sent.eq.false')

  if (error) {
    console.error('follow-up: query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sent = []
  const errors = []

  for (const candidate of candidates || []) {
    if (!candidate.email) continue
    const companyName = candidate.users?.company_name || 'The hiring team'
    const roleTitle = candidate.assessments?.role_title || 'the role'
    const link = `${appUrl}/assess/${candidate.unique_link}`

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: candidate.email,
        subject: `Reminder: Your assessment for ${roleTitle} is waiting`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">Work simulation assessment</div>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi ${candidate.name},</p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 20px;">
        Just a quick reminder that <strong style="color:#0f172a;">${companyName}</strong> is waiting for you to complete your work simulation assessment for the <strong style="color:#0f2137;">${roleTitle}</strong> role.
      </p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 28px;">
        The assessment takes around 45 minutes and you can complete it at any time from any device. Your link is still active.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${link}" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Start Assessment &rarr;</a>
      </div>
      <p style="font-size:13px;color:#94a1b3;margin:24px 0 0;">If you have any questions, reply to this email.</p>
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#00BFA5;">PRODICTA</strong> &middot; <a href="${appUrl}" style="color:#94a1b3;">prodicta.co.uk</a></p>
    </div>
  </div>
</body>
</html>`,
      })

      await adminClient
        .from('candidates')
        .update({ reminder_sent: true })
        .eq('id', candidate.id)

      sent.push(candidate.email)
    } catch (err) {
      console.error(`follow-up: failed for ${candidate.email}`, err)
      errors.push({ email: candidate.email, error: err.message })
    }
  }

  return NextResponse.json({ sent: sent.length, errors })
}
