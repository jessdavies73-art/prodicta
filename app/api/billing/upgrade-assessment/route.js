import { NextResponse } from 'next/server'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Tier order, upgrades must go up this list.
const TIER_ORDER = ['rapid-screen', 'speed-fit', 'depth-fit', 'strategy-fit']
const LABELS = { 'rapid-screen': 'Rapid Screen', 'speed-fit': 'Speed-Fit', 'depth-fit': 'Depth-Fit', 'strategy-fit': 'Strategy-Fit' }

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { from_type, to_type, assessment_id } = await request.json()
    if (!LABELS[from_type] || !LABELS[to_type]) {
      return NextResponse.json({ error: 'Unknown credit type' }, { status: 400 })
    }
    if (TIER_ORDER.indexOf(to_type) <= TIER_ORDER.indexOf(from_type)) {
      return NextResponse.json({ error: 'Target tier must be higher than current tier' }, { status: 400 })
    }

    // Price difference in pence. CREDIT_PRICES values are pence.
    const fromPence = CREDIT_PRICES[from_type]?.price
    const toPence   = CREDIT_PRICES[to_type]?.price
    if (!fromPence || !toPence) {
      return NextResponse.json({ error: 'Pricing not configured' }, { status: 500 })
    }
    const diffPence = toPence - fromPence
    if (diffPence <= 0) {
      return NextResponse.json({ error: 'No upgrade needed' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
    const successQuery = assessment_id ? `&assessment_id=${encodeURIComponent(assessment_id)}` : ''

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'gbp',
 product_data: { name: `PRODICTA, Upgrade to ${LABELS[to_type]}` },
          unit_amount: diffPence,
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/dashboard?upgrade=success${successQuery}`,
      cancel_url: `${siteUrl}/assessment/new`,
      metadata: {
        flow: 'upgrade-assessment',
        user_id: user.id,
        from_type,
        to_type,
        assessment_id: assessment_id || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[upgrade-assessment] error', err?.message)
    return NextResponse.json({ error: err?.message || 'Could not start checkout.' }, { status: 500 })
  }
}
