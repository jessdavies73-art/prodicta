import { NextResponse } from 'next/server'
import { getStripeClient, PLANS, getOrCreatePriceId, LAUNCH_COUPON_ID } from '@/lib/stripe'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// Starts a Stripe Checkout Session (mode: 'subscription') for an existing
// logged-in user switching from PAYG (or any other state) to a monthly plan.
// The webhook at /api/billing/webhook is responsible for flipping
// users.plan / users.plan_type / users.subscription_status once the
// subscription becomes active.
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { plan } = await request.json()
    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const admin = createServiceClient()

    const { data: profile } = await admin
      .from('users')
      .select('stripe_customer_id, email, company_name')
      .eq('id', user.id)
      .maybeSingle()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.company_name || undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const priceId = await getOrCreatePriceId(plan)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      discounts: [{ coupon: LAUNCH_COUPON_ID }],
      success_url: `${siteUrl}/settings?subscription=success&plan=${plan}`,
      cancel_url: `${siteUrl}/settings?subscription=cancelled`,
      metadata: { user_id: user.id, plan, flow: 'switch-to-subscription' },
      subscription_data: {
        metadata: { user_id: user.id, plan, flow: 'switch-to-subscription' },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[switch-to-subscription] error:', err)
    return NextResponse.json({ error: err.message || 'Could not start checkout.' }, { status: 500 })
  }
}
