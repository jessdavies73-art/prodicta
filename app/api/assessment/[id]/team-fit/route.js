import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// -- ALTER TABLE results ADD COLUMN IF NOT EXISTS team_fit_score INTEGER;
// -- ALTER TABLE results ADD COLUMN IF NOT EXISTS team_fit_narrative TEXT;
// -- ALTER TABLE results ADD COLUMN IF NOT EXISTS team_fit_data JSONB;

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { candidate_id } = await request.json()
    if (!candidate_id) return NextResponse.json({ error: 'candidate_id required' }, { status: 400 })

    const admin = createServiceClient()

    const { data: teamProfiles } = await admin
      .from('team_profiles')
      .select('member_name, member_role, conflict_style, working_pace, struggle_area, colleague_needs, decision_style')
      .eq('assessment_id', params.id)
    if (!teamProfiles || teamProfiles.length === 0) {
      return NextResponse.json({ error: 'No team profiles found' }, { status: 400 })
    }

    const { data: result } = await admin
      .from('results')
      .select('overall_score, scores, strengths, watchouts, pressure_fit_score, pressure_fit, candidate_type, ai_summary')
      .eq('candidate_id', candidate_id)
      .maybeSingle()
    if (!result) return NextResponse.json({ error: 'No results' }, { status: 404 })

    const { data: candidate } = await admin
      .from('candidates')
      .select('name, assessments(role_title)')
      .eq('id', candidate_id)
      .single()

    const teamSummary = teamProfiles.map(m =>
      `${m.member_name} (${m.member_role || 'team member'}): conflict=${m.conflict_style}, pace=${m.working_pace}, struggles=${m.struggle_area}, needs=${m.colleague_needs}, decisions=${m.decision_style}`
    ).join('\n')

    const candidateSummary = `Score: ${result.overall_score}, Pressure-Fit: ${result.pressure_fit_score}, Type: ${result.candidate_type || 'N/A'}. Strengths: ${(result.strengths || []).slice(0, 3).map(s => s.text || s.strength || s.title).join(', ')}. Watch-outs: ${(result.watchouts || []).slice(0, 2).map(w => w.watchout || w.title || w.text).join(', ')}.`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Analyse how this candidate will fit into this existing team.

CANDIDATE: ${candidate?.name} for ${candidate?.assessments?.role_title}
${candidateSummary}

EXISTING TEAM:
${teamSummary}

Analyse: conflict compatibility, pace compatibility, decision-making alignment, what gap the candidate fills, and which relationships need managing.

Return JSON only. UK English. No emoji. No em dashes.
{
  "team_fit_score": 0-100,
  "team_fit_narrative": "3-4 sentences overall",
  "top_compatibility": {"member": "string", "reason": "one sentence"},
  "friction_risk": {"member": "string", "reason": "one sentence"},
  "gap_filled": "one sentence on what this candidate brings that the team lacks",
  "management_advice": ["string", "string", "string"],
  "member_fit_scores": [{"name": "string", "score": 0-100, "note": "one sentence"}]
}`
      }],
    })

    const text = msg.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    const fitResult = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

    await admin.from('results').update({
      team_fit_score: fitResult.team_fit_score,
      team_fit_narrative: fitResult.team_fit_narrative,
      team_fit_data: fitResult,
    }).eq('candidate_id', candidate_id)

    return NextResponse.json(fitResult)
  } catch (err) {
    console.error('Team fit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
