import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export const maxDuration = 180

export async function POST(request, { params }) {
  try {
    // Verify auth
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const candidateId = params.candidateId

    // Verify the requesting user owns the assessment this candidate belongs to
    const adminClient = createServiceClient()
    const { data: candidate, error: candError } = await adminClient
      .from('candidates')
      .select('id, assessment_id, assessments(user_id)')
      .eq('id', candidateId)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (candidate.assessments?.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete existing results row so scoreCandidate's double-scoring guard doesn't block
    await adminClient.from('results').delete().eq('candidate_id', candidateId)

    // Re-score
    const result = await scoreCandidate(candidateId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Rescore route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
