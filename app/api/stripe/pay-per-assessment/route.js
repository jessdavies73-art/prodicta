import { NextResponse } from 'next/server'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { credit_type, quantity, add_immersive } = await request.json()

    if (!CREDIT_PRICES[credit_type]) {
      return NextResponse.json({ error: 'Invalid credit type' }, { status: 400 })
    }
    const qty = [1, 5, 10].includes(quantity) ? quantity : 1

    const stripe = getStripeClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'

    const lineItems = [{
      price_data: {
        currency: 'gbp',
        product_data: { name: `${CREDIT_PRICES[credit_type].label} x${qty}` },
        unit_amount: CREDIT_PRICES[credit_type].price,
      },
      quantity: qty,
    }]

    if (add_immersive && credit_type !== 'immersive') {
      lineItems.push({
        price_data: {
          currency: 'gbp',
          product_data: { name: `${CREDIT_PRICES['immersive'].label} x${qty}` },
          unit_amount: CREDIT_PRICES['immersive'].price,
        },
        quantity: qty,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${siteUrl}/dashboard?credits=success&type=${credit_type}&qty=${qty}`,
      cancel_url: `${siteUrl}/dashboard?credits=cancelled`,
      metadata: {
        user_id: user.id,
        credit_type,
        quantity: String(qty),
        add_immersive: add_immersive ? 'true' : 'false',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Pay-per-assessment checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
