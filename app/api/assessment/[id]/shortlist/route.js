import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { id } = params

    // Load assessment + candidates with results
    const { data: assessment } = await supabase
      .from('assessments')
      .select('role_title, job_description')
      .eq('id', id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, name, results(overall_score, pressure_fit_score, risk_level, candidate_type, ai_summary, strengths, watchouts, scores)')
      .eq('assessment_id', id)
      .eq('status', 'completed')

    const completed = (candidates || []).filter(c => {
      const r = Array.isArray(c.results) ? c.results[0] : c.results
      return r?.overall_score != null
    })

    if (completed.length < 2) {
      return NextResponse.json({ error: 'At least 2 completed candidates required to generate a shortlist.' }, { status: 400 })
    }

    // Sort by score descending
    const sorted = [...completed].sort((a, b) => {
      const sa = (Array.isArray(a.results) ? a.results[0] : a.results)?.overall_score || 0
      const sb = (Array.isArray(b.results) ? b.results[0] : b.results)?.overall_score || 0
      return sb - sa
    })

    const top = sorted.slice(0, Math.min(3, sorted.length))
    const rest = sorted.slice(Math.min(3, sorted.length))

    const candidateSummaries = sorted.map((c, i) => {
      const r = Array.isArray(c.results) ? c.results[0] : c.results
      const strengths = (r?.strengths || []).slice(0, 2).map(s =>
        typeof s === 'object' ? (s.strength || s.title || '') : s
      ).join('; ')
      const watchouts = (r?.watchouts || []).slice(0, 2).map(w =>
        typeof w === 'object' ? (w.watchout || w.title || w.text || '') : w
      ).join('; ')
      return `CANDIDATE ${i + 1}: ${c.name}
Overall score: ${r?.overall_score}/100
Pressure-fit: ${r?.pressure_fit_score ?? 'N/A'}/100
Risk level: ${r?.risk_level || 'Unknown'}
Candidate type: ${r?.candidate_type || 'N/A'}
Top strengths: ${strengths || 'N/A'}
Key watch-outs: ${watchouts || 'N/A'}
AI summary: ${r?.ai_summary ? r.ai_summary.slice(0, 300) : 'N/A'}`
    }).join('\n\n')

    const prompt = `You are a specialist recruitment analyst. Below are ${sorted.length} candidates who completed a work simulation assessment for the role of ${assessment.role_title}.

Your task: produce a ranked shortlist of the top ${top.length} candidates with a written justification for each.

ROLE: ${assessment.role_title}

CANDIDATES (ordered by score):
${candidateSummaries}

${rest.length > 0 ? `NOT SHORTLISTED: ${rest.map(c => {
  const r = Array.isArray(c.results) ? c.results[0] : c.results
  return `${c.name} (${r?.overall_score}/100)`
}).join(', ')}` : ''}

INSTRUCTIONS:
- Rank the top ${top.length} candidates in order of recommendation strength
- For each: write a 3-4 sentence justification explaining why they are shortlisted, where they outperform the others, and their key risk
- Reference specific evidence from scores, candidate type, strengths, and watch-outs
- For NOT SHORTLISTED candidates: write one sentence explaining why they did not make the shortlist
- Be direct, specific, and honest. No flattery. UK English throughout.

Return ONLY valid JSON. No preamble, no markdown.

{
  "shortlist": [
    {
      "rank": 1,
      "candidate_name": "Name",
      "justification": "3-4 sentence justification.",
      "key_strength": "Single most important differentiator",
      "key_risk": "Single most important concern"
    }
  ],
  "not_shortlisted": [
    {
      "candidate_name": "Name",
      "reason": "One sentence reason."
    }
  ]
}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = message.content[0].text.trim()
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const result = JSON.parse(jsonStr)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Shortlist error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
