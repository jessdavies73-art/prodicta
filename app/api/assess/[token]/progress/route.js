import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// In-progress assessment state for the candidate-facing /assess/[token]
// flow. Auto-save target for the typed-text scenario path: ActivePage
// writes a JSONB blob containing scenario responses, ranked actions,
// forced-choice responses, the current scenario index, and per-scenario
// time elapsed. Cleared on successful submit, on Start-over from the
// Resume page, or via the DELETE handler below.
//
// All three handlers look up the candidate by unique_link (the same
// token used for the candidate-facing assessment URL). No additional
// auth: possession of the token is the auth model on this route, the
// same as the existing /consent and /submit endpoints.

// POST: write current state. Idempotent overwrite.
export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('id, status')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // A completed candidate's stale browser tab should not be able to
    // overwrite anything. Treat as a silent no-op so the client doesn't
    // need to special-case the response.
    if (candidate.status === 'completed') {
      return NextResponse.json({ ok: true, ignored: 'completed' })
    }
    await admin
      .from('candidates')
      .update({
        in_progress_state: body,
        last_progress_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Progress save error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: read current state. Returns { progress: null } when no in-progress
// data is saved, or when the candidate has already completed.
export async function GET(_request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('in_progress_state, last_progress_at, status')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (candidate.status === 'completed') {
      return NextResponse.json({ progress: null, completed: true })
    }
    return NextResponse.json({
      progress: candidate.in_progress_state || null,
      lastProgressAt: candidate.last_progress_at || null,
    })
  } catch (err) {
    console.error('Progress load error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE: clear progress. Used by the Resume page's Start-over button,
// and by the client after a successful submit to drop the JSONB blob
// from storage. Idempotent: clearing already-null progress is a no-op.
export async function DELETE(_request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('id')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await admin
      .from('candidates')
      .update({ in_progress_state: null, last_progress_at: null })
      .eq('id', candidate.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Progress clear error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
