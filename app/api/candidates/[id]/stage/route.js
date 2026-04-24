import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

const ALLOWED_STAGES = new Set(['active', 'progress', 'hold', 'reject'])
const EMAIL_STAGES = new Set(['hold', 'reject'])

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

// Body copy resolver. Pure function for easy reasoning and testing.
// `account` is 'agency' | 'employer'. `employment` is 'permanent' | 'temporary'.
function buildEmailBody({ stage, account, employment, roleTitle, companyName }) {
  const role = roleTitle || 'this role'
  const company = companyName || 'our company'

  if (stage === 'reject') {
    if (account === 'agency') {
      if (employment === 'temporary') {
        return 'Thank you for completing our assessment. We will not be progressing your application for this particular assignment. We will keep your details on file for future opportunities that may be a good match.'
      }
      return `Thank you for taking the time to complete our assessment for the ${role} position. After careful review we will not be progressing your application at this stage. We wish you every success in your search.`
    }
    // employer
    if (employment === 'temporary') {
      return 'Thank you for completing our assessment. We will not be progressing your application for this assignment at this stage. We will keep your details on file for future opportunities.'
    }
    return `Thank you for completing our assessment for the ${role} role at ${company}. After careful consideration we will not be progressing your application at this stage. We wish you every success.`
  }

  // stage === 'hold'
  if (account === 'agency') {
    if (employment === 'temporary') {
      return 'Thank you for completing our assessment. You remain under consideration for suitable assignments. We will be in touch as soon as a matching opportunity becomes available.'
    }
    return `Thank you for completing our assessment for the ${role} position. We were impressed with your responses and you remain under active consideration. We will be in touch with a further update shortly.`
  }
  // employer
  if (employment === 'temporary') {
    return `Thank you for completing our assessment. You remain under consideration for assignments at ${company} and we will be in touch when a suitable opportunity arises.`
  }
  return `Thank you for completing our assessment for the ${role} role at ${company}. You remain under active consideration and we will be in touch with a further update in due course.`
}

function renderEmailHtml({ body, candidateName }) {
  const safeName = (candidateName || 'there').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeBody = body.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `
    <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#0f2137;padding:16px 24px;border-radius:12px 12px 0 0">
        <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e4e9f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
        <p style="color:#0f172a;margin:0 0 14px;font-size:15px;line-height:1.6">Hi ${safeName},</p>
        <p style="color:#0f172a;margin:0 0 14px;font-size:14.5px;line-height:1.7">${safeBody}</p>
        <p style="color:#0f172a;margin:0;font-size:14.5px;line-height:1.7">Best regards,<br/>The recruiting team</p>
      </div>
      <p style="color:#94a1b3;font-size:11px;margin:12px 0 0;text-align:center">Sent via PRODICTA</p>
    </div>
  `
}

export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const stage = body?.stage
    // `notify` defaults to true so existing callers still send emails. The
    // dashboard confirm modal passes `notify: false` when the recruiter opts
    // out of notifying the candidate.
    const notify = body?.notify !== false
    if (!ALLOWED_STAGES.has(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Fetch candidate + linked assessment so we can build the email body.
    const { data: candidate, error: selectErr } = await admin
      .from('candidates')
      .select('id, name, email, user_id, assessments(role_title, employment_type)')
      .eq('id', params.id)
      .maybeSingle()
    if (selectErr) {
      console.error('[candidates/stage] select error', { id: params.id, error: selectErr.message })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: updateErr } = await admin
      .from('candidates')
      .update({ stage })
      .eq('id', params.id)
      .eq('user_id', user.id)
    if (updateErr) {
      console.error('[candidates/stage] update error', { id: params.id, stage, error: updateErr.message })
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Fire-and-log email for hold/reject. Never block the stage update on a
    // send failure; log and continue so the UI reflects the move.
    let emailSent = false
    if (notify && EMAIL_STAGES.has(stage)) {
      try {
        const { data: profile } = await admin
          .from('users')
          .select('account_type, default_employment_type, company_name')
          .eq('id', user.id)
          .maybeSingle()

        const account = profile?.account_type === 'agency' ? 'agency' : 'employer'
        // Prefer the specific candidate's assessment employment type so
        // 'both' accounts get the correct per-candidate language.
        const employment = candidate.assessments?.employment_type === 'temporary'
          ? 'temporary'
          : 'permanent'
        const roleTitle = candidate.assessments?.role_title || ''
        const companyName = profile?.company_name || ''

        const body = buildEmailBody({ stage, account, employment, roleTitle, companyName })
        const subject = `Your application update, ${roleTitle || 'update'}`

        if (!candidate.email) {
          console.warn('[stage-email] skipped, no candidate email', { candidateId: params.id, stage })
        } else if (!process.env.RESEND_API_KEY) {
          console.warn('[stage-email] skipped, RESEND_API_KEY not set', { candidateId: params.id, stage })
        } else {
          await getResend().emails.send({
            from: EMAIL_FROM,
            to: candidate.email,
            subject,
            html: renderEmailHtml({ body, candidateName: candidate.name }),
          })
          emailSent = true
          console.log('[stage-email] sent', { candidateId: params.id, stage, email: candidate.email })
        }
      } catch (emailErr) {
        console.error('[stage-email] error', { candidateId: params.id, stage, error: emailErr?.message })
      }
    }

    return NextResponse.json({ id: params.id, stage, emailSent })
  } catch (err) {
    console.error('[candidates/stage] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
