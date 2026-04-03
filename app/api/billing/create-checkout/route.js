import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { createGoCardlessClient, PLAN_LABELS, PLAN_DISPLAY_PRICES } from '@/lib/gocardless'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const adminClient = createServiceClient()
    const { data: profile } = await adminClient
      .from('users')
      .select('plan, gocardless_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // If already active, tell the client to redirect to dashboard
    if (profile.subscription_status === 'active') {
      return NextResponse.json({ alreadyActive: true })
    }

    const plan = profile.plan || 'starter'
    const gc = createGoCardlessClient()

    // Create or reuse GoCardless customer
    let customerId = profile.gocardless_customer_id
    if (!customerId) {
      const customer = await gc.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await adminClient.from('users').update({ gocardless_customer_id: customerId }).eq('id', user.id)
    }

    // Create billing request for mandate collection only
    const billingRequest = await gc.billingRequests.create({
      mandate_request: {
        currency: 'GBP',
        scheme: 'bacs',
        metadata: { plan, supabase_user_id: user.id },
      },
      links: { customer: customerId },
    })

    // Derive origin for redirect URIs
    const host = request.headers.get('host') || 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    const origin = `${proto}://${host}`

    // Create billing request flow (provides the Drop-in flow ID)
    const flow = await gc.billingRequestFlows.create({
      redirect_uri: `${origin}/setup-payment`,
      exit_uri: `${origin}/setup-payment`,
      links: { billing_request: billingRequest.id },
      prefilled_customer: { email: user.email },
    })

    const environment = (process.env.GOCARDLESS_ENVIRONMENT || 'sandbox').toUpperCase()

    return NextResponse.json({
      flowId: flow.id,
      environment,
      planLabel: PLAN_LABELS[plan] || plan,
      planPrice: PLAN_DISPLAY_PRICES[plan] || '',
    })
  } catch (err) {
    console.error('create-checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
