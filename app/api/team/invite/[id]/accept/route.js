import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// POST /api/team/invite/[id]/accept
// Body: { name, password }
// Creates (or links) an auth.users account for the invited email, inserts a
// matching public.users row tied to the account_id, and flips the
// team_members row to status='active'. Returns success so the client can
// sign in and redirect to /dashboard.
export async function POST(request, { params }) {
  try {
    const body = await request.json()
    const name = (body?.name || '').toString().trim().slice(0, 120)
    const password = (body?.password || '').toString()

    if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { data: invite, error: selectErr } = await admin
      .from('team_members')
      .select('id, account_id, email, role, status, user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (selectErr) {
      console.error('[team/invite/accept] select error', selectErr.message)
      return NextResponse.json({ error: 'Invitation lookup failed.' }, { status: 500 })
    }
    if (!invite) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 })
    if (invite.status === 'active') {
      return NextResponse.json({ error: 'You have already joined this team.', alreadyActive: true }, { status: 400 })
    }
    if (invite.status === 'suspended') {
      return NextResponse.json({ error: 'This invitation has been suspended. Please contact the account owner.' }, { status: 400 })
    }

    // Create the auth user with the invited email. If the email already has
    // an auth account (e.g. they had one as an owner elsewhere), link to it
    // rather than fail.
    let userId = null
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })
    if (createErr) {
      const msg = (createErr.message || '').toLowerCase()
      const alreadyExists = msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')
      if (!alreadyExists) {
        console.error('[team/invite/accept] auth create error', createErr.message)
        return NextResponse.json({ error: createErr.message || 'Could not create account.' }, { status: 500 })
      }
      // Look up the existing user by email via the admin API.
      const { data: list } = await admin.auth.admin.listUsers()
      const match = list?.users?.find(u => (u.email || '').toLowerCase() === invite.email.toLowerCase())
      if (!match) {
        return NextResponse.json({ error: 'An account for this email already exists. Please sign in and contact your owner.' }, { status: 409 })
      }
      userId = match.id
      // Reset password so they can sign in with the one they just set.
      try {
        await admin.auth.admin.updateUserById(userId, { password })
      } catch (_) {}
    } else {
      userId = created.user.id
    }

    // Upsert the users row (linked to the shared account) so downstream
    // queries that look up company_name etc. still work for this member.
    const { data: ownerRow } = await admin
      .from('users')
      .select('company_name, account_type, default_employment_type')
      .eq('id', invite.account_id)
      .maybeSingle()

    await admin
      .from('users')
      .upsert({
        id: userId,
        email: invite.email,
        company_name: ownerRow?.company_name || null,
        account_type: ownerRow?.account_type || 'employer',
        default_employment_type: ownerRow?.default_employment_type || null,
        onboarding_complete: true,
      }, { onConflict: 'id' })

    // Flip the invite to active and attach the auth id.
    const { error: updateErr } = await admin
      .from('team_members')
      .update({
        user_id: userId,
        status: 'active',
        joined_at: new Date().toISOString(),
        name: name,
      })
      .eq('id', invite.id)
    if (updateErr) {
      console.error('[team/invite/accept] status update error', updateErr.message)
      return NextResponse.json({ error: 'Could not finalise invitation.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: invite.email })
  } catch (err) {
    console.error('[team/invite/accept] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
