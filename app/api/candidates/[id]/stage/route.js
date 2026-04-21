import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

const ALLOWED_STAGES = new Set(['active', 'progress', 'hold', 'reject'])

export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const stage = body?.stage
    if (!ALLOWED_STAGES.has(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data: candidate, error: selectErr } = await admin
      .from('candidates')
      .select('id, user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (selectErr) {
      console.error('[candidates/stage] select error', { id: params.id, error: selectErr.message })
      return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
    }
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: updateErr } = await admin
      .from('candidates')
      .update({ stage })
      .eq('id', params.id)
      .eq('user_id', user.id)
    if (updateErr) {
      console.error('[candidates/stage] update error', { id: params.id, stage, error: updateErr.message })
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ id: params.id, stage })
  } catch (err) {
    console.error('[candidates/stage] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
