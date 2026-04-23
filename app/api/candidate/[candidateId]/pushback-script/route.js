import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { calculateSurvivalScore } from '@/lib/survival-score'

export const maxDuration = 60

function formatStrengths(strengths) {
  const list = Array.isArray(strengths) ? strengths.slice(0, 3) : []
  if (list.length === 0) return 'Not available'
  return list.map((s, i) => {
    if (typeof s === 'string') return `${i + 1}. ${s}`
    const title = s?.strength || s?.title || s?.text || ''
    const detail = s?.evidence || s?.explanation || s?.detail || ''
    return detail ? `${i + 1}. ${title} — Evidence: ${detail}` : `${i + 1}. ${title}`
  }).join('\n')
}

function formatWatchouts(watchouts) {
  const list = Array.isArray(watchouts) ? watchouts.slice(0, 4) : []
  if (list.length === 0) return 'None recorded'
  return list.map((w, i) => {
    if (typeof w === 'string') return `${i + 1}. ${w}`
    const title = w?.watchout || w?.title || w?.text || ''
    const sev = w?.severity ? ` (${w.severity})` : ''
    const ifIgnored = w?.if_ignored ? ` If unmanaged: ${w.if_ignored}` : ''
    return `${i + 1}. ${title}${sev}.${ifIgnored}`
  }).join('\n')
}

function formatCounterOffer(raw) {
  if (raw == null) return 'Not scored'
  if (typeof raw === 'number') return `${raw}/100`
  if (typeof raw === 'object') {
    const score = raw.score ?? raw.value
    const label = raw.label || raw.level
    if (score != null && label) return `${score}/100 (${label})`
    if (score != null) return `${score}/100`
    if (label) return label
  }
  return String(raw)
}

export async function POST(_request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: profile } = await admin
      .from('users')
      .select('id, account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'agency') {
      return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })
    }

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, name, user_id, assessment_id, assessments(role_title)')
      .eq('id', params.candidateId)
      .single()

    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: result } = await admin
      .from('results')
      .select('*')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (!result) {
      return NextResponse.json({ error: 'No assessment results available for this candidate' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Claude API is not configured' }, { status: 500 })
    }

    const candidateName = candidate.name || 'the candidate'
    const roleTitle = candidate.assessments?.role_title || 'the role'
    const overallScore = result.overall_score ?? 'Not scored'
    const recommendation = result.hiring_recommendation
      || (typeof result.recommendation === 'string' ? result.recommendation : result.recommendation?.label)
      || 'Not available'

    const survival = calculateSurvivalScore({
      overallScore: typeof result.overall_score === 'number' ? result.overall_score : 50,
      hiringConfidence: result.hiring_confidence,
      watchouts: result.watchouts || [],
      executionReliability: result.execution_reliability,
      trainingPotential: result.training_potential,
    })

    const strengthsText = formatStrengths(result.strengths)
    const watchoutsText = formatWatchouts(result.watchouts)
    const executionReliability = typeof result.execution_reliability === 'number'
      ? `${result.execution_reliability}/100`
      : 'Not scored'
    const counterOffer = formatCounterOffer(result.counter_offer_resilience_score ?? result.counter_offer_resilience)

    const userPrompt = `A recruiter has recommended ${candidateName} for the role of ${roleTitle} and the client is pushing back, saying they prefer another candidate or that this person did not feel right.

Here is the PRODICTA assessment data for ${candidateName}:

Overall Score: ${overallScore}/100
Hiring Recommendation: ${recommendation}
Placement Survival Score: ${survival}%
Top Strengths:
${strengthsText}
Watch-outs:
${watchoutsText}
Execution Reliability: ${executionReliability}
Counter-Offer Resilience: ${counterOffer}

Write a short professional script the recruiter can use to respond to the client pushback. The script should:
- Open by acknowledging the client's instinct without dismissing it
- Use the specific data points above to make the evidence-based case for this candidate
- Address the most likely objection based on the watch-outs
- Close with a confident recommendation that protects the recruiter's professional credibility
- Feel like something a confident senior consultant would actually say, not a sales pitch
- Be 150 to 200 words maximum
- Be written as natural spoken language not bullet points`

    const systemPrompt = 'You are an expert recruitment consultant coach helping a recruiter handle a client objection professionally and confidently. Write in plain conversational UK English. No em dashes. No bullet points in the script itself, write it as natural spoken language the consultant can say out loud or adapt for a message.'

    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const script = (msg.content?.[0]?.text || '').replace(/—/g, ', ').trim()
    if (!script) {
      return NextResponse.json({ error: 'Script generation returned empty' }, { status: 500 })
    }

    return NextResponse.json({
      script,
      candidate_name: candidateName,
      role_title: roleTitle,
    })
  } catch (err) {
    console.error('Pushback script error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate script' }, { status: 500 })
  }
}
