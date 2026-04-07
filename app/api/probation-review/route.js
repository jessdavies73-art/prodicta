import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { candidate_id, review_month, predictions_checked, manager_notes } = body || {}
    if (!candidate_id || !review_month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { data, error } = await admin.from('probation_reviews').insert({
      candidate_id,
      review_month,
      predictions_checked: predictions_checked || null,
      manager_notes: manager_notes || null,
    }).select().single()

    if (error) {
      console.error('[probation-review] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review: data })
  } catch (err) {
    console.error('[probation-review] error:', err)
    return NextResponse.json({ error: 'Failed to save probation review' }, { status: 500 })
  }
}
