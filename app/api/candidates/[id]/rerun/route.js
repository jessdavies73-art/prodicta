import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export const maxDuration = 120

function stripDashes(value) {
  if (typeof value === 'string') return value.replace(/\s*[\u2014\u2013]\s*/g, ', ')
  if (Array.isArray(value)) return value.map(stripDashes)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = stripDashes(value[k])
    return out
  }
  return value
}

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, email, unique_link, user_id, assessment_id, assessments(role_title, job_description, scenarios)')
      .eq('id', params.id)
      .single()

    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: existingResult } = await adminClient
      .from('results')
      .select('additional_scenario')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (existingResult?.additional_scenario) {
      return NextResponse.json({ error: 'Re-run already used for this candidate.' }, { status: 409 })
    }

    const existingTitles = (candidate.assessments?.scenarios || [])
      .map(s => s.title).filter(Boolean).join(' | ')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `You are a specialist assessment designer. Generate ONE additional realistic work scenario for the role below. The candidate has already completed an assessment and the hiring manager wants one more data point.

ROLE: ${candidate.assessments?.role_title}

JOB DESCRIPTION:
${(candidate.assessments?.job_description || '').slice(0, 2500)}

EXISTING SCENARIOS (do not repeat any of these themes or framings):
${existingTitles || 'None'}

The new scenario must be different from the existing ones in framing and skill focus. It must still feel like a real day in the role. Time budget: 8 minutes.

Return ONLY a JSON object, no preamble, no markdown:

{
  "title": "Concise title describing the situation",
  "context": "The full situation in present tense, at least 130 words. Named characters, specific numbers. Must feel like a real working day.",
  "task": "Exactly what the candidate must produce. One specific deliverable.",
  "timeMinutes": 8,
  "skills": ["Communication", "Problem solving"]
}

Write in UK English. Never use em dash or en dash characters. Use commas or full stops.`
      }]
    }).finalMessage()

    const raw = message.content[0]?.text?.trim() || ''
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}')
    const scenario = stripDashes(JSON.parse(first !== -1 ? jsonStr.slice(first, last + 1) : jsonStr))

    const additional_scenario = {
      scenario,
      status: 'pending',
      requested_at: new Date().toISOString(),
    }

    await adminClient.from('results').update({ additional_scenario }).eq('candidate_id', candidate.id)

    // Email the candidate
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
    const link = `${appUrl}/assess/${candidate.unique_link}/extra`
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Prodicta <assessments@prodicta.co.uk>',
        to: candidate.email,
        subject: `One additional scenario for the ${candidate.assessments?.role_title} assessment`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e4e9f0;">
  <div style="background:#0f2137;padding:24px 32px;">
    <div style="color:#00BFA5;font-size:22px;font-weight:800;letter-spacing:-0.5px;">PRODICTA</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:2px;">One additional scenario</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#0f172a;margin:0 0 14px;">Hi ${candidate.name},</p>
    <p style="font-size:14px;color:#5e6b7f;line-height:1.65;margin:0 0 18px;">
      Thank you for completing your assessment for the <strong style="color:#0f172a;">${candidate.assessments?.role_title}</strong> role. The hiring team would like you to complete one short additional scenario, around 8 minutes. It is your chance to show a little more of your thinking.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${link}" style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px;text-decoration:none;">Start additional scenario</a>
    </div>
    <p style="font-size:12px;color:#94a1b3;margin:20px 0 0;">If you have any questions, reply to this email.</p>
  </div>
</div></body></html>`,
      })
    } catch (e) {
      console.error('Re-run email failed:', e?.message)
    }

    return NextResponse.json({ success: true, additional_scenario })
  } catch (err) {
    console.error('Re-run error:', err)
    return NextResponse.json({ error: err.message || 'Re-run failed' }, { status: 500 })
  }
}
