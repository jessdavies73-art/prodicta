import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export const maxDuration = 180

export async function POST(request, { params }) {
  try {
    const { responses } = await request.json()
    const adminClient = createServiceClient()

    // Look up candidate by unique_link
    const { data: candidate, error: candError } = await adminClient
      .from('candidates')
      .select('id, status, name, user_id, assessment_id')
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

    // Notification: candidate completed
    try {
      await adminClient.from('notifications').insert({
        user_id: candidate.user_id,
        type: 'candidate_completed',
        title: `${candidate.name} completed their assessment`,
        body: 'Results will be ready within minutes.',
        candidate_id: candidate.id,
        assessment_id: candidate.assessment_id,
      })
    } catch {}

    // Await scoring , wrap separately so a scoring failure doesn't lose the submission
    try {
      await scoreCandidate(candidate.id)
    } catch (scoringErr) {
      console.error('[submit] scoreCandidate failed for candidate', candidate.id, scoringErr?.message, scoringErr?.stack)
      await adminClient
        .from('candidates')
        .update({ status: 'scoring_failed' })
        .eq('id', candidate.id)
      return NextResponse.json({ success: true, scoring_error: scoringErr.message })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
