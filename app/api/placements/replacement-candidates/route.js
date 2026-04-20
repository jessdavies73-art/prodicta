import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Candidates in one of these outcome states are currently placed and should
// not appear as replacement options. Terminal failure states (failed_probation,
// left_probation) and no-outcome rows are both eligible.
const CURRENTLY_PLACED = new Set([
  'placed',
  'still_in_probation',
  'still_employed',
  'passed_probation',
  'passing',
])

export async function GET(request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const assessmentId = searchParams.get('assessment_id')
  if (!assessmentId) {
    return NextResponse.json({ error: 'assessment_id required' }, { status: 400 })
  }

  // Load the source assessment, confirm the caller owns it, capture the role title
  const { data: source } = await supabase
    .from('assessments')
    .select('id, role_title, user_id')
    .eq('id', assessmentId)
    .single()

  if (!source || source.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Pull all completed candidates from the caller's assessments that match this
  // role_title. Role title is the right match key for "same role" because a
  // consultant may have run the role multiple times across separate assessment
  // records.
  const { data: candidateRows } = await supabase
    .from('candidates')
    .select('id, name, email, assessment_id, results(overall_score, risk_level, pressure_fit_score), assessments!inner(id, role_title, user_id)')
    .eq('status', 'completed')
    .eq('assessments.role_title', source.role_title)
    .eq('assessments.user_id', user.id)

  const scored = (candidateRows || [])
    .map(c => {
      const r = Array.isArray(c.results) ? c.results[0] : c.results
      const score = r?.overall_score
      if (typeof score !== 'number' || score < 70) return null
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        assessment_id: c.assessment_id,
        score,
        risk_level: r?.risk_level ?? null,
        pressure_fit_score: r?.pressure_fit_score ?? null,
      }
    })
    .filter(Boolean)

  if (scored.length === 0) {
    return NextResponse.json({ role_title: source.role_title, candidates: [] })
  }

  // Exclude candidates currently in an active placement/probation state.
  const ids = scored.map(c => c.id)
  const { data: outcomes } = await supabase
    .from('candidate_outcomes')
    .select('candidate_id, outcome')
    .in('candidate_id', ids)
    .eq('user_id', user.id)

  const placedIds = new Set(
    (outcomes || [])
      .filter(o => CURRENTLY_PLACED.has(o.outcome))
      .map(o => o.candidate_id)
  )

  const available = scored
    .filter(c => !placedIds.has(c.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return NextResponse.json({
    role_title: source.role_title,
    candidates: available,
  })
}
