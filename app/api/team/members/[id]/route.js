import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext, isOwnerOrManager } from '@/lib/team'

const ALLOWED_ROLES = new Set(['manager', 'consultant'])
const ALLOWED_STATUS = new Set(['active', 'suspended'])

async function assertWriter(request, params) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  const admin = createServiceClient()
  const ctx = await getTeamContext(admin, user.id)
  if (!isOwnerOrManager(ctx.role)) {
    return { error: NextResponse.json({ error: 'Only owners and managers can manage team members.' }, { status: 403 }) }
  }

  const { data: member, error: selectErr } = await admin
    .from('team_members')
    .select('id, account_id, role, status, email, user_id')
    .eq('id', params.id)
    .maybeSingle()
  if (selectErr) return { error: NextResponse.json({ error: selectErr.message }, { status: 500 }) }
  if (!member) return { error: NextResponse.json({ error: 'Member not found' }, { status: 404 }) }
  if (member.account_id !== ctx.accountId) return { error: NextResponse.json({ error: 'Not in your team' }, { status: 403 }) }
  if (member.role === 'owner') {
    return { error: NextResponse.json({ error: 'The account owner cannot be modified from here.' }, { status: 400 }) }
  }

  return { user, admin, ctx, member }
}

// PATCH — update role or status.
export async function PATCH(request, { params }) {
  const guard = await assertWriter(request, params)
  if (guard.error) return guard.error
  const { admin, member } = guard

  try {
    const body = await request.json()
    const update = {}
    if (body?.role !== undefined) {
      if (!ALLOWED_ROLES.has(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      update.role = body.role
    }
    if (body?.status !== undefined) {
      if (!ALLOWED_STATUS.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      update.status = body.status
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error: updateErr } = await admin
      .from('team_members')
      .update(update)
      .eq('id', member.id)
    if (updateErr) {
      console.error('[team/members] update error', { id: member.id, error: updateErr.message })
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: member.id, ...update })
  } catch (err) {
    console.error('[team/members] PATCH unhandled', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

// DELETE — remove a team member outright. Their user account is left intact;
// they simply lose the account_id link. Assessments and candidates they
// created remain owned by them in the data model.
export async function DELETE(request, { params }) {
  const guard = await assertWriter(request, params)
  if (guard.error) return guard.error
  const { admin, member } = guard

  const { error: deleteErr } = await admin
    .from('team_members')
    .delete()
    .eq('id', member.id)
  if (deleteErr) {
    console.error('[team/members] delete error', { id: member.id, error: deleteErr.message })
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, id: member.id })
}
