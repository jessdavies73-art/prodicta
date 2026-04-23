import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('candidateIds') || searchParams.get('ids') || ''
    const candidateIds = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6)

    if (candidateIds.length === 0) {
      return NextResponse.json({ error: 'candidateIds query parameter is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data: assessment } = await admin
      .from('assessments')
      .select('id, user_id, role_title, scenarios')
      .eq('id', params.id)
      .single()

    if (!assessment || assessment.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: candRows } = await admin
      .from('candidates')
      .select('id, name, email, assessments(employment_type), results(overall_score, scores, score_narratives, candidate_type)')
      .in('id', candidateIds)
      .eq('assessment_id', assessment.id)
      .eq('user_id', user.id)

    const candidates = (candRows || []).map(c => {
      const r = Array.isArray(c.results) ? c.results[0] : c.results
      return {
        id: c.id,
        name: c.name,
        employment_type: c.assessments?.employment_type || null,
        overall_score: r?.overall_score ?? null,
        scores: r?.scores || {},
        score_narratives: r?.score_narratives || {},
        candidate_type: r?.candidate_type || null,
      }
    })

    const { data: respRows } = await admin
      .from('responses')
      .select('candidate_id, scenario_index, response_text, time_taken_seconds')
      .in('candidate_id', candidateIds)

    const responsesByCandidate = {}
    for (const row of respRows || []) {
      if (!responsesByCandidate[row.candidate_id]) responsesByCandidate[row.candidate_id] = {}
      responsesByCandidate[row.candidate_id][row.scenario_index] = {
        response_text: row.response_text,
        time_taken_seconds: row.time_taken_seconds,
      }
    }

    const scenarios = Array.isArray(assessment.scenarios) ? assessment.scenarios : []
    const shared = []
    scenarios.forEach((s, idx) => {
      const respondents = candidates.filter(c => responsesByCandidate[c.id]?.[idx]?.response_text)
      if (respondents.length >= 2) {
        const scenarioSkills = Array.isArray(s?.skills) ? s.skills : []
        shared.push({
          scenario_index: idx,
          title: s?.title || `Scenario ${idx + 1}`,
          type: s?.type || null,
          context: s?.context || '',
          task: s?.task || '',
          skills: scenarioSkills,
          responses: candidates.map(c => {
            const resp = responsesByCandidate[c.id]?.[idx] || null
            if (!resp?.response_text) {
              return { candidate_id: c.id, has_response: false }
            }
            const matched = scenarioSkills
              .map(sk => c.scores?.[sk] ?? c.scores?.[sk?.toLowerCase?.()])
              .filter(v => typeof v === 'number')
            const avg10 = matched.length > 0
              ? Math.round(matched.reduce((a, b) => a + b, 0) / matched.length / 10)
              : (typeof c.overall_score === 'number' ? Math.round(c.overall_score / 10) : null)
            const narrativeSkill = scenarioSkills.find(sk => c.score_narratives?.[sk])
            const observation = narrativeSkill ? c.score_narratives[narrativeSkill] : null
            return {
              candidate_id: c.id,
              has_response: true,
              response_text: resp.response_text,
              time_taken_seconds: resp.time_taken_seconds ?? null,
              scenario_score_10: avg10,
              observation,
            }
          }),
        })
      }
    })

    return NextResponse.json({
      assessment: { id: assessment.id, role_title: assessment.role_title },
      candidates,
      shared_scenarios: shared,
    })
  } catch (err) {
    console.error('Scenario replay error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
