import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export const maxDuration = 300

// Kick off scoring in the background so the candidate's browser can redirect
// to the polling page immediately. On success, mark the candidate complete and
// send a completion email so they have a record even if the browser gave up.
async function scoreAndNotify(candidateId, adminClient) {
  try {
    await scoreCandidate(candidateId)
  } catch (scoringErr) {
    console.error('[submit] scoreCandidate failed', candidateId, scoringErr?.message)
    await adminClient
      .from('candidates')
      .update({ status: 'scoring_failed' })
      .eq('id', candidateId)
      .catch(() => {})
    return
  }

  // Email the candidate so they always get a trail of the submission, even if
  // they left the browser or hit the 3-minute polling cap.
  if (!process.env.RESEND_API_KEY) return
  try {
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('name, email, unique_link')
      .eq('id', candidateId)
      .single()
    if (!candidate?.email) return

    const firstName = (candidate.name || '').split(' ')[0] || 'there'
    const feedbackUrl = `https://prodicta.co.uk/assess/${candidate.unique_link}/feedback`
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Prodicta <hello@prodicta.co.uk>',
      to: candidate.email,
      subject: 'Your PRODICTA assessment results are ready',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;color:#0f2137;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e9f0;border-radius:14px;padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0f2137;">Your results are ready</h1>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#5e6b7f;">Hi ${firstName},</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#5e6b7f;">Thank you for completing your assessment. Leave optional feedback about your experience and then view your personalised development report.</p>
          <p style="margin:0 0 20px;text-align:center;">
            <a href="${feedbackUrl}" style="display:inline-block;background:#00BFA5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">Leave feedback and view my report</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a1b3;text-align:center;">Or paste this link into your browser: ${feedbackUrl}</p>
        </div>
      </body></html>`,
    })
  } catch (emailErr) {
    console.error('[submit] completion email failed', candidateId, emailErr?.message)
  }
}

export async function POST(request, { params }) {
  try {
    const { responses } = await request.json()
    const adminClient = createServiceClient()

    const { data: candidate, error: candError } = await adminClient
      .from('candidates')
      .select('id, status, name, email, user_id, assessment_id')
      .eq('unique_link', params.token)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Assessment link not found' }, { status: 404 })
    }

    if (candidate.status === 'completed') {
      return NextResponse.json({ error: 'Already completed' }, { status: 400 })
    }

    const { error: respError } = await adminClient
      .from('responses')
      .insert(
        responses.map(r => ({
          candidate_id: candidate.id,
          scenario_index: r.scenario_index,
          response_text: r.response_text,
          time_taken_seconds: r.time_taken_seconds || 0,
          audio_url: r.audio_url || null,
          input_mode: r.input_mode || 'type',
        }))
      )

    if (respError) throw respError

    const { error: updateError } = await adminClient
      .from('candidates')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', candidate.id)

    if (updateError) throw updateError

 // In-app notification for the hiring team, cheap, keep inline.
    try {
      await adminClient.from('notifications').insert({
        user_id: candidate.user_id,
        type: 'candidate_completed',
        title: `${candidate.name} completed their assessment`,
        body: 'Results will be ready within minutes.',
        candidate_id: candidate.id,
        assessment_id: candidate.assessment_id,
      })
    } catch {}

    // Hand off scoring to Vercel's waitUntil so the function keeps running
    // after the response is returned. The browser is free to redirect to
    // the status poller immediately.
    waitUntil(scoreAndNotify(candidate.id, adminClient))

    return NextResponse.json({ success: true, candidate_id: candidate.id })
  } catch (err) {
    console.error('[submit] error', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
