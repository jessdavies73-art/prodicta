import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export const maxDuration = 180

export async function POST(request, { params }) {
  const { candidateId } = params
  console.log('[rescore] Starting for candidate:', candidateId)
  try {
    const adminClient = createServiceClient()

    // Clear existing results so the duplicate guard in scoreCandidate doesn't bail
    const { error: delError } = await adminClient.from('results').delete().eq('candidate_id', candidateId)
    if (delError) console.error('[rescore] Delete existing results error:', delError)

    console.log('[rescore] Calling scoreCandidate...')
    const result = await scoreCandidate(candidateId)
    console.log('[rescore] Scoring complete. Score:', result?.overall_score)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[rescore] Failed for candidate:', candidateId, err?.message, err?.stack)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
