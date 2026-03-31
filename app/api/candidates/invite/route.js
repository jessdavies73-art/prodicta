import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { assessment_id, candidates } = await request.json()
    // candidates = [{ name, email }]

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Get assessment details
    const { data: assessment } = await supabase
      .from('assessments')
      .select('role_title, id')
      .eq('id', assessment_id)
      .eq('user_id', user.id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    // Get company name
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_name')
      .eq('id', user.id)
      .single()

    const company_name = userProfile?.company_name || 'The hiring team'

    const adminClient = createServiceClient()
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

    const results = []

    for (const candidate of candidates) {
      const unique_link = uuidv4()

      // Insert candidate record
      const { data: candidateRecord, error: insertError } = await adminClient
        .from('candidates')
        .insert({
          assessment_id,
          user_id: user.id,
          name: candidate.name,
          email: candidate.email,
          unique_link,
          status: 'sent'
        })
        .select()
        .single()

      if (insertError) {
        results.push({ email: candidate.email, success: false, error: insertError.message })
        continue
      }

      // Send email via Resend
      const assessmentLink = `${appUrl}/assess/${unique_link}`

      try {
        await resend.emails.send({
          from: 'Prodicta <assessments@prodicta.co.uk>',
          to: candidate.email,
          subject: `You've been invited to complete an assessment for ${assessment.role_title}`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#5bbfbd;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Prodicta</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:2px;">Work simulation assessment</div>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi ${candidate.name},</p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#0f172a;">${company_name}</strong> has invited you to complete a work simulation assessment for the <strong style="color:#0f2137;">${assessment.role_title}</strong> position.
      </p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 28px;">
        The assessment consists of 4 realistic work scenarios that take approximately 45 minutes to complete. You can complete it from any device, at any time.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${assessmentLink}" style="display:inline-block;background:#5bbfbd;color:#0f2137;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Start Assessment &#8594;</a>
      </div>
      <div style="background:#f7f9fb;border-radius:10px;padding:20px 24px;margin:24px 0;">
        <p style="font-size:14px;font-weight:700;color:#0f2137;margin:0 0 12px;">What to expect:</p>
        <ul style="margin:0;padding:0 0 0 18px;color:#5e6b7f;font-size:14px;line-height:1.8;">
          <li>4 timed scenarios based on real work situations</li>
          <li>Each scenario takes 8&#8211;15 minutes</li>
          <li>Write your responses as you would in the actual role</li>
          <li>There are no trick questions &#8212; we want to see how you think</li>
        </ul>
      </div>
      <p style="font-size:13px;color:#94a1b3;margin:24px 0 0;">If you have any questions, reply to this email.</p>
      <p style="font-size:14px;color:#5e6b7f;margin:16px 0 0;">Best regards,<br><strong>${company_name}</strong></p>
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#5bbfbd;">Prodicta</strong> &middot; <a href="${appUrl}" style="color:#94a1b3;">prodicta.co.uk</a></p>
    </div>
  </div>
</body>
</html>
          `
        })

        results.push({ email: candidate.email, success: true, candidateId: candidateRecord.id })
      } catch (emailError) {
        console.error('Email send error:', emailError)
        results.push({ email: candidate.email, success: false, error: 'Email failed to send' })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Invite error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
