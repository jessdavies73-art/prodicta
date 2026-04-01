import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export async function POST(request, { params }) {
  try {
    const adminClient = createServiceClient()
    // Clear any existing results so the duplicate guard in scoreCandidate doesn't bail
    await adminClient.from('results').delete().eq('candidate_id', params.candidateId)
    const result = await scoreCandidate(params.candidateId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Rescore error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
