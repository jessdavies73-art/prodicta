import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('*, assessments(role_title, job_description, scenarios, skill_weights, assessment_mode, role_level, calendar_events, inbox_events, employment_type, users(company_name))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const a = candidate.assessments || {}

    return NextResponse.json({
      candidate: {
        id: candidate.id,
        name: candidate.name,
        status: candidate.status,
      },
      assessment: {
        id: candidate.assessment_id,
        role_title: a.role_title,
        job_description: a.job_description,
        scenarios: a.scenarios,
        skill_weights: a.skill_weights,
        assessment_mode: a.assessment_mode,
        role_level: a.role_level,
        calendar_events: a.calendar_events,
        inbox_events: a.inbox_events,
        employment_type: a.employment_type,
      },
      company_name: a.users?.company_name || 'The hiring team',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
