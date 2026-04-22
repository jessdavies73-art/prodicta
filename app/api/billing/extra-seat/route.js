import { NextResponse } from 'next/server'
import { getStripeClient, EXTRA_SEAT_PRICE_ID } from '@/lib/stripe'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext, isOwnerOrManager } from '@/lib/team'

// POST /api/billing/extra-seat — owner/manager-only. Starts a Stripe Checkout
// session (mode: 'subscription') using EXTRA_SEAT_PRICE_ID. The webhook at
// /api/billing/webhook handles `checkout.session.completed` for
// flow='extra-seat' and increments users.user_limit_extra by 1.
export async function POST() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const ctx = await getTeamContext(admin, user.id)
    if (!isOwnerOrManager(ctx.role)) {
      return NextResponse.json({ error: 'Only owners and managers can purchase extra seats.' }, { status: 403 })
    }

    const { data: profile } = await admin
      .from('users')
      .select('stripe_customer_id, email, company_name, plan_type, plan')
      .eq('id', ctx.accountId)
      .maybeSingle()

    if (profile?.plan_type === 'payg' || profile?.plan === 'payg') {
      return NextResponse.json({
        error: 'Extra seats require a subscription plan. Upgrade to Starter, Professional, or Business first.',
        payg: true,
      }, { status: 403 })
    }

    const stripe = getStripeClient()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.company_name || undefined,
        metadata: { user_id: ctx.accountId },
      })
      customerId = customer.id
      await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', ctx.accountId)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: EXTRA_SEAT_PRICE_ID, quantity: 1 }],
      success_url: `${siteUrl}/settings?tab=team&success=seat`,
      cancel_url: `${siteUrl}/settings?tab=team`,
      metadata: { user_id: ctx.accountId, flow: 'extra-seat' },
      subscription_data: {
        metadata: { user_id: ctx.accountId, flow: 'extra-seat' },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing/extra-seat] error:', err)
    return NextResponse.json({ error: err?.message || 'Could not start checkout.' }, { status: 500 })
  }
}
