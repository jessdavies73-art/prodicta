import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { to, subject, body, candidate_id } = await request.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_name, account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'agency') {
      return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const htmlBody = body
      .split('\n')
      .map(line => line.trim() ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#2d3748;">${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>` : '<br>')
      .join('')

    await resend.emails.send({
      from: 'reports@prodicta.co.uk',
      to: [to],
      subject,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0f2137;border-radius:12px 12px 0 0;padding:24px 32px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:20px;font-weight:800;color:#00BFA5;letter-spacing:-0.5px;">PRODICTA</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">Candidate Assessment Report</div>
      </div>
      ${profile?.company_name ? `<div style="font-size:12px;color:rgba(255,255,255,0.5);">${profile.company_name}</div>` : ''}
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e4e9f0;border-top:none;">
      ${htmlBody}
    </div>
    <div style="text-align:center;padding:20px 0 8px;">
      <div style="font-size:11px;color:#94a1b3;">Sent via PRODICTA &middot; Candidate assessment platform</div>
    </div>
  </div>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Client email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
