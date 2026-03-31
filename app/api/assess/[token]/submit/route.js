import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export async function POST(request, { params }) {
  try {
    const { responses } = await request.json()
    const adminClient = createServiceClient()

    // Look up candidate by unique_link
    const { data: candidate, error: candError } = await adminClient
      .from('candidates')
      .select('id, status')
      .eq('unique_link', params.token)
      .single()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Assessment link not found' }, { status: 404 })
    }

    if (candidate.status === 'completed') {
      return NextResponse.json({ error: 'Already completed' }, { status: 400 })
    }

    // Insert all responses
    const { error: respError } = await adminClient
      .from('responses')
      .insert(
        responses.map(r => ({
          candidate_id: candidate.id,
          scenario_index: r.scenario_index,
          response_text: r.response_text,
          time_taken_seconds: r.time_taken_seconds || 0,
        }))
      )

    if (respError) throw respError

    // Mark candidate as completed
    const { error: updateError } = await adminClient
      .from('candidates')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', candidate.id)

    if (updateError) throw updateError

    // Run AI scoring directly — no HTTP round-trip, no port issues
    // Run in background so candidate gets immediate success response
    scoreCandidate(candidate.id).catch(err =>
      console.error('Scoring failed for candidate', candidate.id, err)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
