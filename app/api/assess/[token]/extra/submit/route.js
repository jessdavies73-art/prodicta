import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

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
    const { response_text, time_taken_seconds } = await request.json()
    if (!response_text || response_text.trim().length < 30) {
      return NextResponse.json({ error: 'Response too short' }, { status: 400 })
    }

    const adminClient = createServiceClient()
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, assessments(role_title, job_description)')
      .eq('unique_link', params.token)
      .single()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: result } = await adminClient
      .from('results')
      .select('additional_scenario')
      .eq('candidate_id', candidate.id)
      .maybeSingle()
    const ad = result?.additional_scenario
    if (!ad) return NextResponse.json({ error: 'No scenario to submit against' }, { status: 404 })
    if (ad.status === 'completed') return NextResponse.json({ error: 'already_completed' }, { status: 409 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You are scoring ONE additional scenario for a candidate already assessed for the role of ${candidate.assessments?.role_title}. Use the same calibration as a normal Prodicta assessment.

SCENARIO TITLE: ${ad.scenario?.title}
CONTEXT: ${ad.scenario?.context}
TASK: ${ad.scenario?.task}

CANDIDATE RESPONSE:
${response_text.slice(0, 4000)}

TIME TAKEN: ${time_taken_seconds || 0} seconds.

Score this single response 0 to 100 using the full range. 65 is competent, 75+ is strong, 85+ is excellent. Penalise generic, padded or AI-templated answers.

Return ONLY a JSON object, no preamble, no markdown:

{
  "score": 72,
  "narrative": "Two to three sentences in plain UK English explaining what they did well and where they fell short, with reference to specific things they wrote."
}

Never use em dash or en dash characters.`
      }]
    })

    const raw = message.content[0]?.text?.trim() || ''
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}')
    const parsed = stripDashes(JSON.parse(first !== -1 ? jsonStr.slice(first, last + 1) : jsonStr))

    const updated = {
      ...ad,
      response: response_text,
      time_taken_seconds: time_taken_seconds || null,
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null,
      narrative: parsed.narrative || null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }

    await adminClient.from('results').update({ additional_scenario: updated }).eq('candidate_id', candidate.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Extra scenario submit error:', err)
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 })
  }
}
