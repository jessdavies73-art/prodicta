import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, assessments(role_title)')
      .eq('unique_link', params.token)
      .single()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: result } = await adminClient
      .from('results')
      .select('additional_scenario')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    const ad = result?.additional_scenario
    if (!ad) return NextResponse.json({ error: 'No additional scenario' }, { status: 404 })
    if (ad.status === 'completed') return NextResponse.json({ error: 'already_completed' }, { status: 409 })

    return NextResponse.json({
      role_title: candidate.assessments?.role_title || 'this role',
      scenario: ad.scenario,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
