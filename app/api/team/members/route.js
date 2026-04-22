import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext } from '@/lib/team'
import { PLANS } from '@/lib/stripe'

// GET /api/team/members — returns the roster for the caller's account plus
// the plan + seat usage so the UI can render the usage strip and limit CTA
// without a second round-trip. Any active team member can read the roster;
// only owner/manager can mutate (enforced in the PATCH/DELETE routes).
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const ctx = await getTeamContext(admin, user.id)
    if (!ctx.accountId) return NextResponse.json({ error: 'No team found' }, { status: 404 })

    const { data: accountRow } = await admin
      .from('users')
      .select('plan, plan_type, user_limit_extra')
      .eq('id', ctx.accountId)
      .maybeSingle()

    const planKey = (accountRow?.plan || 'starter').toLowerCase()
    const planType = accountRow?.plan_type || null
    const planMeta = PLANS[planKey]
    const baseLimit = typeof planMeta?.userLimit === 'number' ? planMeta.userLimit : 2
    const extraSeats = accountRow?.user_limit_extra || 0
    const userLimit = baseLimit + extraSeats

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
          plan: planKey,
          planType,
          userLimit,
          extraSeats,
          used: 1,
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const used = (members || []).filter(m => m.status === 'active' || m.status === 'invited').length

    return NextResponse.json({
      members: members || [],
      viewerRole: ctx.role,
      plan: planKey,
      planType,
      userLimit,
      extraSeats,
      used,
    })
  } catch (err) {
    console.error('[team/members] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
