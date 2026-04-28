import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

export async function POST(request) {
  try {
    const { assessment_id, candidates, interruption_keying } = await request.json()
    // candidates = [{ name, email }]
    // interruption_keying (optional) = 'candidate' | 'assessment'. When set on
    // a bulk invite, the assessment row is updated so every subsequent
    // candidate on this assessment uses the chosen keying. The bulk-invite
    // UI defaults to 'assessment' for apples-to-apples comparison; the
    // assessment-creation UI defaults to 'candidate' for anti-gaming.

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Get assessment details. shell_family drives sector-aware copy in
    // the invite email; legacy assessments without it fall back to office.
    const { data: assessment } = await supabase
      .from('assessments')
      .select('role_title, id, assessment_mode, shell_family')
      .eq('id', assessment_id)
      .eq('user_id', user.id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    // Optional: update interruption_keying on the assessment row if a valid
    // value was supplied. Failure is non-fatal so a missing column does not
    // block invites.
    if (interruption_keying === 'candidate' || interruption_keying === 'assessment') {
      try {
        await supabase
          .from('assessments')
          .update({ interruption_keying })
          .eq('id', assessment_id)
          .eq('user_id', user.id)
      } catch (e) {
        console.warn('[invite] interruption_keying update skipped:', e?.message)
      }
    }

    // Get company name
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_name')
      .eq('id', user.id)
      .single()

    const company_name = userProfile?.company_name || 'The hiring team'

    // Resolve mode-specific copy for the invite email
    const mode = (assessment.assessment_mode || 'standard').toLowerCase()
    const normalisedMode = mode === 'rapid' ? 'quick' : mode
    const modeCopy = normalisedMode === 'quick'
      ? { line: '2 focused work scenarios that take approximately 15 minutes', count: 2, range: '6 to 8 minutes', minutes: 15 }
      : normalisedMode === 'advanced'
      ? { line: '4 comprehensive work scenarios that take approximately 45 minutes', count: 4, range: '10 to 14 minutes', minutes: 45 }
      : { line: '3 realistic work scenarios that take approximately 25 minutes', count: 3, range: '8 to 9 minutes', minutes: 25 }

    // Sector-aware invite copy. Office is the default and preserves the
    // existing baseline (with the cliché "simulation" softened to
    // "scenario"); healthcare and education use practical, role-appropriate
    // framing rather than generic office-coded language. Legacy assessments
    // with no shell_family, or any unexpected value, fall through to office,
    // so a missing or new shell never blocks the invite send.
    const CANDIDATE_INVITE_COPY_BY_SHELL = {
      office: {
        subject: `You've been invited to complete an assessment for ${assessment.role_title}`,
        subHeader: 'Work scenario assessment',
        introHTML: `<strong style="color:#0f172a;">${company_name}</strong> has invited you to complete a work scenario assessment for the <strong style="color:#0f2137;">${assessment.role_title}</strong> position.`,
        summaryText: `The assessment consists of ${modeCopy.line} to complete. You can complete it from any device, at any time.`,
        bulletScenarios: `${modeCopy.count} timed scenarios based on real work situations`,
      },
      healthcare: {
        subject: `Your assessment for the ${assessment.role_title} role`,
        subHeader: 'Care scenario assessment',
        introHTML: `<strong style="color:#0f172a;">${company_name}</strong> has invited you to complete a practical assessment that mirrors the actual work of a <strong style="color:#0f2137;">${assessment.role_title}</strong>.`,
        summaryText: `You will work through ${modeCopy.count} realistic care scenarios that take approximately ${modeCopy.minutes} minutes to complete. You can complete it from any device, at any time.`,
        bulletScenarios: `${modeCopy.count} timed care scenarios drawn from situations you would meet in role: handovers, family conversations, prioritising care, recording what you do`,
      },
      education: {
        subject: `Your assessment for the ${assessment.role_title} role`,
        subHeader: 'Classroom scenario assessment',
        introHTML: `<strong style="color:#0f172a;">${company_name}</strong> has invited you to complete a practical assessment that mirrors the actual work of a <strong style="color:#0f2137;">${assessment.role_title}</strong>.`,
        summaryText: `You will work through ${modeCopy.count} realistic school scenarios that take approximately ${modeCopy.minutes} minutes to complete. You can complete it from any device, at any time.`,
        bulletScenarios: `${modeCopy.count} timed school scenarios drawn from situations you would meet in role: lessons, parent communication, behaviour incidents, pupil-related judgement calls`,
      },
    }
    const shellKey = String(assessment.shell_family || 'office').toLowerCase()
    const inviteCopy = CANDIDATE_INVITE_COPY_BY_SHELL[shellKey] || CANDIDATE_INVITE_COPY_BY_SHELL.office

    const adminClient = createServiceClient()
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

    // Bulk vs individual classifier. A single POST body with more than
    // one candidate is treated as a bulk invite; a single-candidate POST
    // is individual. Mirrors the existing UI distinction, the Invite
    // Candidate form posts one and the Bulk Invite modal posts N. The
    // flag is stamped on every row in this request so the agency-side
    // Bulk Screening Mode and Individual Screening dashboard panels
    // can split their counts cleanly.
    const isBulkInvite = Array.isArray(candidates) && candidates.length > 1

    const results = []

    for (const candidate of candidates) {
      const unique_link = uuidv4()

      // Insert candidate record. created_via_bulk falls back to the
      // schema default (false) on the rare path where the migration has
      // not landed yet, so the writer is forward-compatible.
      const { data: candidateRecord, error: insertError } = await adminClient
        .from('candidates')
        .insert({
          assessment_id,
          user_id: user.id,
          name: candidate.name,
          email: candidate.email,
          unique_link,
          status: 'sent',
          created_via_bulk: isBulkInvite,
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
          from: EMAIL_FROM,
          to: candidate.email,
          subject: inviteCopy.subject,
          html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#0f2137;padding:28px 36px;">
      <div style="color:#00BFA5;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Prodicta</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:2px;">${inviteCopy.subHeader}</div>
    </div>
    <div style="padding:36px;">
      <p style="font-size:16px;color:#0f172a;margin:0 0 16px;">Hi ${candidate.name},</p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 24px;">
        ${inviteCopy.introHTML}
      </p>
      <p style="font-size:15px;color:#5e6b7f;line-height:1.6;margin:0 0 28px;">
        ${inviteCopy.summaryText}
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${assessmentLink}" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">Start Assessment &#8594;</a>
      </div>
      <div style="background:#f7f9fb;border-radius:10px;padding:20px 24px;margin:24px 0;">
        <p style="font-size:14px;font-weight:700;color:#0f2137;margin:0 0 12px;">What to expect:</p>
        <ul style="margin:0;padding:0 0 0 18px;color:#5e6b7f;font-size:14px;line-height:1.8;">
          <li>${inviteCopy.bulletScenarios}</li>
          <li>Each scenario takes ${modeCopy.range}</li>
          <li>Write your responses as you would in the actual role</li>
          <li>There are no trick questions, we want to see how you think</li>
        </ul>
      </div>
      <p style="font-size:13px;color:#94a1b3;margin:24px 0 0;">If you have any questions, reply to this email.</p>
      <p style="font-size:14px;color:#5e6b7f;margin:16px 0 0;">Best regards,<br><strong>${company_name}</strong></p>
    </div>
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">Powered by <strong style="color:#00BFA5;">Prodicta</strong> &middot; <a href="${appUrl}" style="color:#94a1b3;">prodicta.co.uk</a></p>
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
