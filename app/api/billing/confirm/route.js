import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { createGoCardlessClient, PLAN_AMOUNTS, PLAN_LABELS } from '@/lib/gocardless'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { billingRequestId } = await request.json()
    if (!billingRequestId) {
      return NextResponse.json({ error: 'billingRequestId required' }, { status: 400 })
    }

    const adminClient = createServiceClient()
    const { data: profile } = await adminClient
      .from('users')
      .select('plan, gocardless_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const gc = createGoCardlessClient()

    // Fetch completed billing request from GoCardless to get mandate ID
    const billingRequest = await gc.billingRequests.get(billingRequestId)
    const mandateId = billingRequest.links?.mandate
    const customerId = billingRequest.links?.customer || profile.gocardless_customer_id

    if (!mandateId) {
      return NextResponse.json({ error: 'Mandate not found on billing request. Please try again.' }, { status: 400 })
    }

    const plan = profile.plan || 'starter'
    const amount = PLAN_AMOUNTS[plan] || 4900
    const planName = PLAN_LABELS[plan] || plan

    // Create monthly subscription against the mandate
    const subscription = await gc.subscriptions.create({
      amount,
      currency: 'GBP',
      name: `Prodicta ${planName}`,
      interval_unit: 'monthly',
      links: { mandate: mandateId },
      metadata: { supabase_user_id: user.id, plan },
    })

    // Update users table
    await adminClient.from('users').update({
      gocardless_customer_id: customerId,
      gocardless_mandate_id: mandateId,
      gocardless_subscription_id: subscription.id,
      subscription_status: 'active',
    }).eq('id', user.id)

    // Update auth app_metadata so middleware reads the new status from JWT
    await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: { subscription_status: 'active' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('billing confirm error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
