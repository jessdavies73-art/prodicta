import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendAdjustmentNotice } from '@/lib/send-adjustment-notice'

// Layer 1 reasonable-adjustments disclosure. The candidate ticks any
// adjustments that apply (or describes them in free text) on the
// /assess/[token] landing screen. This endpoint:
//   - validates the candidate token
//   - upserts a row in adjustment_requests (so the candidate can refine
//     their request without producing duplicate rows)
//   - sends an informational email to the inviting agency or employer
//   - inserts an in-app notification on the inviter's dashboard
//
// All side effects are wrapped in try/catch and never block the caller:
// the candidate must be able to proceed with the assessment regardless of
// notification delivery state.

const ALLOWED_TYPES = new Set([
  'screen_reader',
  'simplified_ui',
  'audio_response',
  'frequent_breaks',
  'other',
])
const MAX_NOTES_LENGTH = 2000

function sanitiseTypes(input) {
  if (!Array.isArray(input)) return []
  const out = []
  const seen = new Set()
  for (const t of input) {
    if (typeof t !== 'string') continue
    if (!ALLOWED_TYPES.has(t)) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export async function POST(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}))
    const adjustmentTypes = sanitiseTypes(body.adjustment_types)
    const additionalNotes = typeof body.additional_notes === 'string'
      ? body.additional_notes.trim().slice(0, MAX_NOTES_LENGTH)
      : ''

    if (adjustmentTypes.length === 0 && additionalNotes.length === 0) {
      return NextResponse.json(
        { error: 'Tick at least one option or add a note describing the adjustment you need.' },
        { status: 400 }
      )
    }

    const admin = createServiceClient()

    const { data: candidate, error: candError } = await admin
      .from('candidates')
      .select('id, name, user_id, assessment_id, assessments(role_title)')
      .eq('unique_link', params.token)
      .maybeSingle()

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Assessment link not found.' }, { status: 404 })
    }

    // Detect insert vs update so the email subject and in-app notification
    // can reflect "updated" rather than "new" when the candidate revises
    // their request after submitting once.
    const { data: existing } = await admin
      .from('adjustment_requests')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('assessment_id', candidate.assessment_id)
      .maybeSingle()

    const isUpdate = !!existing
    const nowIso = new Date().toISOString()

    const upsertPayload = {
      candidate_id: candidate.id,
      assessment_id: candidate.assessment_id,
      adjustment_types: adjustmentTypes,
      additional_notes: additionalNotes || null,
    }
    if (isUpdate) {
      upsertPayload.updated_at = nowIso
    }

    const { error: upsertError } = await admin
      .from('adjustment_requests')
      .upsert(upsertPayload, { onConflict: 'candidate_id,assessment_id' })

    if (upsertError) {
      console.error('[adjustment-request] upsert failed', { candidateId: candidate.id, error: upsertError.message })
      return NextResponse.json({ error: 'Could not save your request. Please try again.' }, { status: 500 })
    }

    // Look up the inviter (assessment owner) for email + in-app
    // notification. Fall through quietly if missing rather than blocking
    // the candidate.
    let recipientEmail = null
    if (candidate.user_id) {
      const { data: inviter } = await admin
        .from('users')
        .select('email')
        .eq('id', candidate.user_id)
        .maybeSingle()
      recipientEmail = inviter?.email || null
    }

    const roleTitle = candidate?.assessments?.role_title || ''
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'
    const candidateReportUrl = `${appUrl}/assessment/${candidate.assessment_id}/candidate/${candidate.id}`

    // Informational email. Best-effort.
    try {
      await sendAdjustmentNotice({
        recipientEmail,
        candidateName: candidate.name,
        roleTitle,
        adjustmentTypes,
        additionalNotes,
        submittedAt: nowIso,
        isUpdate,
        candidateReportUrl,
      })
    } catch (emailErr) {
      console.error('[adjustment-request] email notice failed (non-fatal)', { error: emailErr?.message })
    }

    // In-app notification. Same pattern as candidate_completed in
    // /api/assess/[token]/submit. Best-effort.
    try {
      if (candidate.user_id) {
        await admin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'adjustment_request_informational',
          title: isUpdate
            ? `Adjustment notice updated by ${candidate.name || 'a candidate'}`
            : `Adjustment notice from ${candidate.name || 'a candidate'}`,
          body: 'Tap to view request details. PRODICTA accommodates these adjustments where possible. No action required.',
          candidate_id: candidate.id,
          assessment_id: candidate.assessment_id,
        })
      }
    } catch (notifErr) {
      console.error('[adjustment-request] in-app notification failed (non-fatal)', { error: notifErr?.message })
    }

    return NextResponse.json({
      ok: true,
      isUpdate,
      adjustment_types: adjustmentTypes,
      additional_notes: additionalNotes,
      submitted_at: nowIso,
    })
  } catch (err) {
    console.error('[adjustment-request] error', { message: err?.message })
    return NextResponse.json(
      { error: 'Something went wrong saving your request. Please try again.' },
      { status: 500 }
    )
  }
}

// Read existing request so the form can pre-fill on re-open.
export async function GET(_request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('id, assessment_id')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (!candidate) {
      return NextResponse.json({ ok: true, request: null })
    }
    const { data: row } = await admin
      .from('adjustment_requests')
      .select('adjustment_types, additional_notes, requested_at, updated_at')
      .eq('candidate_id', candidate.id)
      .eq('assessment_id', candidate.assessment_id)
      .maybeSingle()
    return NextResponse.json({ ok: true, request: row || null })
  } catch (err) {
    console.error('[adjustment-request GET] error', { message: err?.message })
    return NextResponse.json({ ok: true, request: null })
  }
}
