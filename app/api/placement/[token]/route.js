import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  const { token } = params

  if (!token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createServiceClient()

  // Fetch the assignment review by share token (only if sharing is enabled)
  const { data: record, error } = await admin
    .from('assignment_reviews')
    .select('*')
    .eq('client_share_token', token)
    .eq('client_share_enabled', true)
    .maybeSingle()

  if (error || !record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch the agency user's company name
  const { data: profile } = await admin
    .from('users')
    .select('company_name')
    .eq('id', record.user_id)
    .maybeSingle()

  // Build review milestones
  const reviews = {
    week1: {
      done: !!record.week1_review_done,
      date: record.week1_review_date || null,
      rating: record.week1_rating || null,
      notes: record.week1_notes || null,
    },
    week4: {
      done: !!record.week4_review_done,
      date: record.week4_review_date || null,
      rating: record.week4_rating || null,
      notes: record.week4_notes || null,
    },
    week8: {
      done: !!record.week8_review_done,
      date: record.week8_review_date || null,
      rating: record.week8_rating || null,
      notes: record.week8_notes || null,
    },
  }

  // Extract first name from worker_name
  const workerFirstName = record.worker_name
    ? record.worker_name.split(' ')[0]
    : null

  const payload = {
    worker_first_name: workerFirstName,
    role_title: record.role_title || null,
    client_company: record.client_company || null,
    assignment_start_date: record.assignment_start_date || null,
    placement_health: record.placement_health || null,
    ...(record.reliability_score != null && { reliability_score: record.reliability_score }),
    ...(record.attendance_risk != null && { attendance_risk: record.attendance_risk }),
    agency_name: profile?.company_name || null,
    reviews,
  }

  return NextResponse.json(payload)
}
