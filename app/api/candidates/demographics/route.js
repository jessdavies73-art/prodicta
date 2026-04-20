import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Self-reported demographics from a completed candidate. No auth required,
// candidates are anonymous at this point. Inserts use the service role so they
// land even though RLS would otherwise block an anonymous writer.

const AGE_OPTIONS = new Set(['Under 25', '25-34', '35-44', '45-54', '55-64', '65 and over', 'Prefer not to say'])
const GENDER_OPTIONS = new Set(['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Prefer to self-describe'])
const ETHNICITY_OPTIONS = new Set([
  'Asian or Asian British',
  'Black or Black British',
  'Mixed or multiple ethnic groups',
  'White',
  'Other ethnic group',
  'Prefer not to say',
])

function sanitise(value, allowed) {
  if (!value) return null
  const s = String(value).trim()
  return allowed.has(s) ? s : null
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { candidate_id, age_band, gender, ethnicity } = body || {}

    if (!candidate_id || typeof candidate_id !== 'string') {
      return NextResponse.json({ error: 'candidate_id required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Confirm the candidate exists before inserting
    const { data: candidate, error: lookupErr } = await admin
      .from('candidates')
      .select('id')
      .eq('id', candidate_id)
      .maybeSingle()

    if (lookupErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const row = {
      candidate_id,
      age_band: sanitise(age_band, AGE_OPTIONS),
      gender: sanitise(gender, GENDER_OPTIONS),
      ethnicity: sanitise(ethnicity, ETHNICITY_OPTIONS),
    }

    // If all three fields are null, don't create a row at all
    if (!row.age_band && !row.gender && !row.ethnicity) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const { error: insertErr } = await admin.from('candidate_demographics').insert(row)
    if (insertErr) {
      console.error('demographics insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save demographics' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('demographics route error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
