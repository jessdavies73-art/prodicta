import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

const DEFAULT_FEE = 15000

const ENDED_EARLY_OUTCOMES = new Set([
  'failed_probation',
  'left_probation',
  'dismissed',
  'left_early',
])

const ACTIVE_OUTCOMES = new Set([
  null,
  undefined,
  '',
  'still_in_probation',
  'still_employed',
  'placed',
  'passing',
])

function quarterBounds(now = new Date()) {
  const year = now.getFullYear()
  const qIndex = Math.floor(now.getMonth() / 3)
  const start = new Date(year, qIndex * 3, 1)
  const label = `Q${qIndex + 1} ${year}`
  return { start, end: now, label }
}

function inRange(dateVal, start, end) {
  if (!dateVal) return false
  const d = new Date(dateVal)
  if (Number.isNaN(d.getTime())) return false
  return d >= start && d <= end
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: profile } = await admin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'agency') {
      return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })
    }

    const { start, end, label } = quarterBounds()
    const avgFee = Number(profile?.average_placement_fee) > 0
      ? Number(profile.average_placement_fee)
      : DEFAULT_FEE

    // Pull all candidate outcomes for this user (RLS bypassed via service client)
    const { data: outcomes } = await admin
      .from('candidate_outcomes')
      .select('id, candidate_id, outcome, outcome_date, placement_date, created_at, updated_at, placement_health_status, placement_amber_alerted')
      .eq('user_id', user.id)

    const outcomesList = outcomes || []

    // 1. FEES PROTECTED: placements that hit AMBER/RED at any point then completed successfully this quarter
    const feesProtectedCount = outcomesList.filter(o => {
      if (o.outcome !== 'passed_probation') return false
      const wentAtRisk = o.placement_amber_alerted === true
        || o.placement_health_status === 'AMBER'
        || o.placement_health_status === 'RED'
      if (!wentAtRisk) return false
      const dateRef = o.outcome_date || o.updated_at
      return inRange(dateRef, start, end)
    }).length
    const feesProtected = feesProtectedCount * avgFee

    // 2. PLACEMENTS SAVED: went AMBER/RED and now back to GREEN, still active, activity in quarter
    const placementsSaved = outcomesList.filter(o => {
      if (!ACTIVE_OUTCOMES.has(o.outcome)) return false
      if (o.placement_amber_alerted !== true) return false
      if (o.placement_health_status !== 'GREEN') return false
      const dateRef = o.updated_at || o.placement_date || o.created_at
      return inRange(dateRef, start, end)
    }).length

    // 3. SSP CLAIMS HANDLED: ssp_records with all 5 steps complete, in quarter
    const { data: sspRows } = await admin
      .from('ssp_records')
      .select('id, created_at, updated_at, step_entitlement_confirmed, step_evidence_requested, step_payroll_actioned, step_review_adjusted, step_communication_sent')
      .eq('user_id', user.id)

    const sspClaims = (sspRows || []).filter(r => {
      const allSteps = r.step_entitlement_confirmed
        && r.step_evidence_requested
        && r.step_payroll_actioned
        && r.step_review_adjusted
        && r.step_communication_sent
      if (!allSteps) return false
      const dateRef = r.updated_at || r.created_at
      return inRange(dateRef, start, end)
    }).length

    // 4. REPLACEMENTS FOUND: assignment_reviews with replacement_triggered=true whose candidate ended early, in quarter
    const { data: reviews } = await admin
      .from('assignment_reviews')
      .select('candidate_id, replacement_triggered, replacement_triggered_at')
      .eq('user_id', user.id)
      .eq('replacement_triggered', true)

    const endedEarlyByCandidate = new Map()
    for (const o of outcomesList) {
      if (ENDED_EARLY_OUTCOMES.has(o.outcome)) {
        endedEarlyByCandidate.set(o.candidate_id, o)
      }
    }

    const replacementsFound = (reviews || []).filter(r => {
      if (!endedEarlyByCandidate.has(r.candidate_id)) return false
      const dateRef = r.replacement_triggered_at
      return inRange(dateRef, start, end)
    }).length

    return NextResponse.json({
      quarter_label: label,
      fees_protected: feesProtected,
      fees_protected_count: feesProtectedCount,
      average_placement_fee: avgFee,
      placements_saved: placementsSaved,
      ssp_claims: sspClaims,
      replacements_found: replacementsFound,
    })
  } catch (err) {
    console.error('Revenue protection error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
