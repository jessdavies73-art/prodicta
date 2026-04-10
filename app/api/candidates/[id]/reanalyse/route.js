import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

// -- ALTER TABLE results ADD COLUMN rerun_context TEXT;
// -- ALTER TABLE results ADD COLUMN rerun_at TIMESTAMPTZ;
// -- ALTER TABLE results ADD COLUMN previous_results JSONB;

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const { additional_context } = await request.json()

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, user_id, name')
      .eq('id', params.id)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Save current results as previous_results before re-scoring
    const { data: currentResults } = await admin
      .from('results')
      .select('overall_score, ai_summary, watchouts, predictions, tuesday_reality, risk_level, hiring_confidence')
      .eq('candidate_id', params.id)
      .maybeSingle()

    if (!currentResults) {
      return NextResponse.json({ error: 'No results to re-analyse' }, { status: 400 })
    }

    // Store previous results snapshot
    await admin.from('results').update({
      previous_results: currentResults,
      rerun_context: additional_context || null,
      rerun_at: new Date().toISOString(),
    }).eq('candidate_id', params.id)

    // Delete current results so scoreCandidate creates fresh ones
    await admin.from('results').delete().eq('candidate_id', params.id)

    // Update the assessment's context_answers to include the additional context
    if (additional_context) {
      const { data: cand } = await admin
        .from('candidates')
        .select('assessment_id, assessments(context_answers)')
        .eq('id', params.id)
        .single()

      if (cand?.assessment_id) {
        const existing = cand.assessments?.context_answers || {}
        await admin.from('assessments').update({
          context_answers: { ...existing, reanalysis_context: additional_context },
        }).eq('id', cand.assessment_id)
      }
    }

    // Re-run the full scoring pipeline
    await scoreCandidate(params.id)

    // Restore previous_results and rerun metadata on the new results row
    await admin.from('results').update({
      previous_results: currentResults,
      rerun_context: additional_context || null,
      rerun_at: new Date().toISOString(),
    }).eq('candidate_id', params.id)

    // Fetch the new results
    const { data: newResults } = await admin
      .from('results')
      .select('overall_score, ai_summary, watchouts, predictions, tuesday_reality, risk_level, hiring_confidence')
      .eq('candidate_id', params.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      previous: currentResults,
      updated: newResults,
    })
  } catch (err) {
    console.error('Reanalyse error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
