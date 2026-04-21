import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// GET /api/team/invite/[id] — public read of a pending invite so the accept
// page can render even before the user has signed in. Returns only safe
// fields; secrets (invited_by, account_id) stay server-side.
export async function GET(_request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: member, error } = await admin
      .from('team_members')
      .select('id, email, name, role, status, account_id')
      .eq('id', params.id)
      .maybeSingle()
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Team feature not configured on this deployment.' }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!member) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const { data: ownerRow } = await admin
      .from('users')
      .select('company_name, email')
      .eq('id', member.account_id)
      .maybeSingle()

    return NextResponse.json({
      id: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
      status: member.status,
      companyName: ownerRow?.company_name || null,
    })
  } catch (err) {
    console.error('[team/invite/id] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
