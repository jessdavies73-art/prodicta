import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { readDayOnePlanning, readInboxOverload } from '@/lib/depth-fit-components'

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('*, assessments(role_title, job_description, scenarios, skill_weights, assessment_mode, role_level, calendar_events, inbox_events, depth_fit_components, employment_type, users(company_name))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const a = candidate.assessments || {}

    // Depth-Fit components (Day One Planning + Inbox Overload) prefer the
    // new shell-aware payload at assessments.depth_fit_components and fall
    // back to the legacy calendar_events / inbox_events columns for
    // assessments produced before that column existed.
    const calendarEvents = readDayOnePlanning(a)
    const inboxEvents = readInboxOverload(a)

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
        calendar_events: calendarEvents,
        inbox_events: inboxEvents,
        employment_type: a.employment_type,
      },
      company_name: a.users?.company_name || 'The hiring team',
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
