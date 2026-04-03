import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// Called immediately after client-side sign-up to set app_metadata.subscription_status = 'pending'.
// app_metadata can only be set via the service role key (admin), so users cannot fake their own status.
export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const adminClient = createServiceClient()

    // Only mark pending if not already active
    const existing = user.app_metadata?.subscription_status
    if (existing === 'active') {
      return NextResponse.json({ alreadyActive: true })
    }

    await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: { subscription_status: 'pending' },
    })

    // Also write to users table
    await adminClient
      .from('users')
      .update({ subscription_status: 'pending' })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('init-subscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
