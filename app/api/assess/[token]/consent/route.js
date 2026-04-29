import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Record the candidate's consent timestamp on Start click. The Start
// button on /assess/[token] doubles as the consent action: the candidate
// has been shown a brief disclosure of AI analysis and UK GDPR data
// handling. Idempotent: only writes if no consent_timestamp is set, so
// a refresh-and-Start-again does not overwrite the original record.
export async function POST(_request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('id, consent_timestamp')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (candidate.consent_timestamp) {
      return NextResponse.json({ ok: true, alreadyRecorded: true })
    }
    await admin
      .from('candidates')
      .update({ consent_timestamp: new Date().toISOString() })
      .eq('id', candidate.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Consent record error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
