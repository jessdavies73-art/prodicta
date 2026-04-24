import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

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

async function resolveAssessmentId(admin, { assessment_id, candidate_id, placement_id }, userId) {
  if (assessment_id) return assessment_id

  if (candidate_id) {
    const { data } = await admin
      .from('candidates')
      .select('assessment_id, assessments!inner(user_id)')
      .eq('id', candidate_id)
      .single()
    if (data && data.assessments?.user_id === userId) return data.assessment_id
    return null
  }

  if (placement_id) {
    // A "placement" in this product is represented by an assignment_reviews row.
    const { data } = await admin
      .from('assignment_reviews')
      .select('candidate_id, user_id, candidates!inner(assessment_id)')
      .eq('id', placement_id)
      .single()
    if (data && data.user_id === userId) return data.candidates?.assessment_id || null
    return null
  }

  return null
}

async function findReplacements(params, userId) {
  const admin = createServiceClient()

  const assessmentId = await resolveAssessmentId(admin, params, userId)
  if (!assessmentId) {
    return { status: 400, body: { error: 'assessment_id, candidate_id, or placement_id required' } }
  }

  // Load the source assessment, confirm the caller owns it, capture the role title
  // and detected_role_type for matching.
  const { data: source } = await admin
    .from('assessments')
    .select('id, role_title, detected_role_type, user_id')
    .eq('id', assessmentId)
    .single()

  if (!source || source.user_id !== userId) {
    return { status: 404, body: { error: 'Not found' } }
  }

  const currentCandidateId = params.candidate_id || null

  // Pull completed candidates from the caller's assessments whose role matches
  // either the same role_title OR the same detected_role_type. detected_role_type
  // lets us surface candidates assessed for a different-titled but functionally
  // similar role (e.g. "Sales Executive" vs "Business Development Rep" when both
  // resolved to detected_role_type = 'sales').
  const orClauses = [`role_title.eq.${source.role_title}`]
  if (source.detected_role_type) {
    orClauses.push(`detected_role_type.eq.${source.detected_role_type}`)
  }

  const { data: candidateRows } = await admin
    .from('candidates')
    .select('id, name, email, assessment_id, completed_at, results(overall_score, risk_level, pressure_fit_score), assessments!inner(id, role_title, detected_role_type, user_id)')
    .eq('status', 'completed')
    .eq('assessments.user_id', userId)
    .or(orClauses.join(','), { foreignTable: 'assessments' })

  const scored = (candidateRows || [])
    .map(c => {
      if (currentCandidateId && c.id === currentCandidateId) return null
      const r = Array.isArray(c.results) ? c.results[0] : c.results
      const score = r?.overall_score
      if (typeof score !== 'number' || score < 70) return null
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        assessment_id: c.assessment_id,
        completed_at: c.completed_at,
        role_title: c.assessments?.role_title || null,
        score,
        risk_level: r?.risk_level ?? null,
        pressure_fit_score: r?.pressure_fit_score ?? null,
      }
    })
    .filter(Boolean)

  if (scored.length === 0) {
    return { status: 200, body: { role_title: source.role_title, candidates: [] } }
  }

  // Exclude candidates currently in an active placement/probation state.
  const ids = scored.map(c => c.id)
  const { data: outcomes } = await admin
    .from('candidate_outcomes')
    .select('candidate_id, outcome')
    .in('candidate_id', ids)
    .eq('user_id', userId)

  const placedIds = new Set(
    (outcomes || [])
      .filter(o => CURRENTLY_PLACED.has(o.outcome))
      .map(o => o.candidate_id)
  )

  const available = scored
    .filter(c => !placedIds.has(c.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    status: 200,
    body: { role_title: source.role_title, candidates: available },
  }
}

async function authenticateAndAuthorise() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { status: 401, body: { error: 'Unauthorised' } } }

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('users')
    .select('account_type')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'agency') {
    return { error: { status: 403, body: { error: 'Agency accounts only' } } }
  }

  return { user }
}

export async function GET(request) {
  const auth = await authenticateAndAuthorise()
  if (auth.error) return NextResponse.json(auth.error.body, { status: auth.error.status })

  const { searchParams } = new URL(request.url)
  const result = await findReplacements({
    assessment_id: searchParams.get('assessment_id'),
    candidate_id: searchParams.get('candidate_id'),
    placement_id: searchParams.get('placement_id'),
  }, auth.user.id)

  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request) {
  const auth = await authenticateAndAuthorise()
  if (auth.error) return NextResponse.json(auth.error.body, { status: auth.error.status })

  let body = {}
  try { body = await request.json() } catch {}

  const result = await findReplacements({
    assessment_id: body.assessment_id,
    candidate_id: body.candidate_id,
    placement_id: body.placement_id,
  }, auth.user.id)

  return NextResponse.json(result.body, { status: result.status })
}
