import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const MAX_SAVED_ROLES = 10

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('saved_roles')
    .select('id, role_title, client_name, job_description, assessment_mode, employment_type, context_answers, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[saved-roles] list error', error.message)
    return NextResponse.json({ error: 'Failed to load saved roles' }, { status: 500 })
  }

  return NextResponse.json({ saved_roles: data || [] })
}

export async function POST(req) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const role_title = (body?.role_title || '').toString().trim()
  if (!role_title) {
    return NextResponse.json({ error: 'Role title is required' }, { status: 400 })
  }

  const { count, error: countErr } = await supabase
    .from('saved_roles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (countErr) {
    console.error('[saved-roles] count error', countErr.message)
    return NextResponse.json({ error: 'Failed to check saved role limit' }, { status: 500 })
  }
  if ((count || 0) >= MAX_SAVED_ROLES) {
    return NextResponse.json({ error: 'limit_reached', message: `You can save up to ${MAX_SAVED_ROLES} roles. Delete one before saving another.` }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    role_title,
    client_name: body?.client_name ? body.client_name.toString().trim() || null : null,
    job_description: body?.job_description ? body.job_description.toString() : null,
    assessment_mode: body?.assessment_mode ? body.assessment_mode.toString() : null,
    employment_type: body?.employment_type ? body.employment_type.toString() : null,
    context_answers: body?.context_answers && typeof body.context_answers === 'object' ? body.context_answers : {},
  }

  const { data, error } = await supabase
    .from('saved_roles')
    .insert(row)
    .select('id, role_title, client_name, job_description, assessment_mode, employment_type, context_answers, created_at')
    .single()

  if (error) {
    console.error('[saved-roles] insert error', error.message)
    return NextResponse.json({ error: 'Failed to save role' }, { status: 500 })
  }

  return NextResponse.json({ saved_role: data })
}
