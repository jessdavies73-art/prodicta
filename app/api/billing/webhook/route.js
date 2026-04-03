import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const stripe = getStripeClient()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.warn('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminClient = createServiceClient()

  try {
    switch (event.type) {
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await updateSubscriptionStatus(adminClient, sub.id, 'cancelled')
        console.log('[webhook] subscription deleted:', sub.id)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const status =
          sub.status === 'active'   ? 'active'   :
          sub.status === 'past_due' ? 'past_due' : 'cancelled'
        await updateSubscriptionStatus(adminClient, sub.id, status)
        console.log('[webhook] subscription updated:', sub.id, status)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          await updateSubscriptionStatus(adminClient, invoice.subscription, 'past_due')
          console.log('[webhook] payment failed for subscription:', invoice.subscription)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription && invoice.billing_reason !== 'subscription_create') {
          // subscription_create is handled at sign-up; only process renewals here
          await updateSubscriptionStatus(adminClient, invoice.subscription, 'active')
          console.log('[webhook] payment succeeded for subscription:', invoice.subscription)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function updateSubscriptionStatus(adminClient, subscriptionId, status) {
  await adminClient
    .from('users')
    .update({ subscription_status: status })
    .eq('stripe_subscription_id', subscriptionId)

  const { data: users } = await adminClient
    .from('users')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .limit(1)

  if (users?.[0]) {
    await adminClient.auth.admin.updateUserById(users[0].id, {
      app_metadata: { subscription_status: status },
    })
  }
}
