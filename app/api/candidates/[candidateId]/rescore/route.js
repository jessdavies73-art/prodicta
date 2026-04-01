import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export async function POST(request, { params }) {
  try {
    const adminClient = createServiceClient()

    // Verify candidate exists
    const { data: candidate, error: candError } = await adminClient
      .from('candidates')
      .select('id, name, status')
      .eq('id', params.candidateId)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Delete existing results so scoreCandidate won't bail on the duplicate guard
    await adminClient.from('results').delete().eq('candidate_id', params.candidateId)

    const result = await scoreCandidate(params.candidateId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Rescore error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
