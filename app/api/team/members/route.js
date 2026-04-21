import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext } from '@/lib/team'

// GET /api/team/members — returns the roster for the caller's account. Any
// active team member can read the roster; only owner/manager can mutate.
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const ctx = await getTeamContext(admin, user.id)
    if (!ctx.accountId) return NextResponse.json({ error: 'No team found' }, { status: 404 })

    const { data: members, error } = await admin
      .from('team_members')
      .select('id, email, name, role, status, invited_at, joined_at, user_id')
      .eq('account_id', ctx.accountId)
      .order('role', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        // Legacy pre-migration account: synthesise owner-only response.
        return NextResponse.json({
          members: [{ id: user.id, email: user.email, name: null, role: 'owner', status: 'active', invited_at: null, joined_at: null, user_id: user.id }],
          viewerRole: 'owner',
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: members || [], viewerRole: ctx.role })
  } catch (err) {
    console.error('[team/members] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
