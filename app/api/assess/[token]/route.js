import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('*, assessments(role_title, job_description, scenarios, skill_weights, assessment_mode, role_level, calendar_events, inbox_events, users(company_name))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        name: candidate.name,
        status: candidate.status,
      },
      assessment: {
        id: candidate.assessment_id,
        role_title: candidate.assessments.role_title,
        scenarios: candidate.assessments.scenarios,
        skill_weights: candidate.assessments.skill_weights,
      },
      company_name: candidate.assessments.users?.company_name || 'The hiring team',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
