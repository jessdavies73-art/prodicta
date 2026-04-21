import { NextResponse } from 'next/server'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Bundle-level pricing (the user pays one fixed total for the whole bundle).
// Webhook at /api/billing/webhook reads `credit_type` + `quantity` from the
// session metadata and upserts the appropriate assessment_credits row.
export const CREDIT_BUNDLES = {
  'rapid-10':  { credit_type: 'rapid-screen', quantity: 10, priceGBP: 60,  label: '10 Rapid Screens' },
  'rapid-25':  { credit_type: 'rapid-screen', quantity: 25, priceGBP: 140, label: '25 Rapid Screens' },
  'rapid-50':  { credit_type: 'rapid-screen', quantity: 50, priceGBP: 275, label: '50 Rapid Screens' },
  'speed-10':  { credit_type: 'speed-fit',    quantity: 10, priceGBP: 170, label: '10 Speed-Fits' },
  'depth-10':  { credit_type: 'depth-fit',    quantity: 10, priceGBP: 330, label: '10 Depth-Fits' },
}

const MAX_QTY = 100

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const stripe = getStripeClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'

    let lineItem
    let metadata = { user_id: user.id }
    let successPath

    if (body.bundle_id) {
      const bundle = CREDIT_BUNDLES[body.bundle_id]
      if (!bundle) return NextResponse.json({ error: 'Unknown bundle' }, { status: 400 })
      lineItem = {
        price_data: {
          currency: 'gbp',
 product_data: { name: `PRODICTA, ${bundle.label}` },
          unit_amount: bundle.priceGBP * 100,
        },
        quantity: 1,
      }
      metadata = { ...metadata, credit_type: bundle.credit_type, quantity: String(bundle.quantity), bundle_id: body.bundle_id }
      successPath = `/billing/credits?purchase=success&bundle=${body.bundle_id}`
    } else if (body.credit_type) {
      const priceInfo = CREDIT_PRICES[body.credit_type]
      if (!priceInfo) return NextResponse.json({ error: 'Unknown credit type' }, { status: 400 })
      const qty = Math.max(1, Math.min(MAX_QTY, parseInt(body.quantity, 10) || 1))
      lineItem = {
        price_data: {
          currency: 'gbp',
 product_data: { name: `PRODICTA, ${qty} x ${priceInfo.label}` },
          unit_amount: priceInfo.price,
        },
        quantity: qty,
      }
      metadata = { ...metadata, credit_type: body.credit_type, quantity: String(qty) }
      successPath = `/settings?purchase=success&type=${body.credit_type}&qty=${qty}`
    } else {
      return NextResponse.json({ error: 'Missing bundle_id or credit_type' }, { status: 400 })
    }

    // Credits are granted asynchronously by the /api/billing/webhook handler
    // on the `checkout.session.completed` event, which is the source of
    // truth that the payment actually cleared. We set client_reference_id as
    // a backup user identifier so the webhook can still resolve the user if
    // metadata is ever stripped.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [lineItem],
      payment_intent_data: { metadata },
      success_url: `${siteUrl}${successPath}`,
      cancel_url: `${siteUrl}/settings?purchase=cancelled`,
      metadata,
    })

    console.log('[credit-bundle] checkout session created', {
      sessionId: session.id,
      userId: user.id,
      creditType: metadata.credit_type,
      quantity: metadata.quantity,
      bundleId: metadata.bundle_id || null,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[credit-bundle] checkout error', { error: err?.message })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
