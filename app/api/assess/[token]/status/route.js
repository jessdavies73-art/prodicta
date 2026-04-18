import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Candidate-facing polling endpoint. The browser hits this every few seconds
// after a candidate has submitted their responses so it can redirect to the
// rating / completion page as soon as scoring finishes. No auth: the token
// itself acts as the credential and the response reveals nothing sensitive.
export async function GET(request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('id, status')
      .eq('unique_link', params.token)
      .single()

    if (!candidate) return NextResponse.json({ complete: false, error: 'Not found' }, { status: 404 })

    // Scoring writes a row into `results` on success. If it exists, the
    // assessment is complete regardless of candidate.status transitions.
    const { data: result } = await admin
      .from('results')
      .select('id')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (result) {
      return NextResponse.json({ complete: true, candidate_id: candidate.id })
    }

    // Surface scoring_failed so the client can show an error instead of
    // polling forever.
    if (candidate.status === 'scoring_failed') {
      return NextResponse.json({ complete: false, error: 'scoring_failed', candidate_id: candidate.id })
    }

    return NextResponse.json({ complete: false, candidate_id: candidate.id })
  } catch (err) {
    console.error('[assess-status] error', err.message)
    return NextResponse.json({ complete: false, error: err.message }, { status: 500 })
  }
}
