import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// GoCardless sends webhooks with a Webhook-Signature header.
// We verify using HMAC-SHA256 before processing any events.
// The webhook secret is set in the GoCardless dashboard when
// you register the webhook endpoint URL.

async function verifySignature(rawBody, secret, signature) {
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('webhook-signature') || ''
    const webhookSecret = process.env.GOCARDLESS_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('GOCARDLESS_WEBHOOK_SECRET is not set')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const valid = await verifySignature(rawBody, webhookSecret, signature)
    if (!valid) {
      console.warn('GoCardless webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 498 })
    }

    const { events } = JSON.parse(rawBody)
    const adminClient = createServiceClient()

    for (const event of events || []) {
      const { resource_type: type, action } = event

      // Subscription cancelled
      if (type === 'subscriptions' && action === 'cancelled') {
        const subscriptionId = event.links?.subscription
        if (subscriptionId) {
          await adminClient.from('users')
            .update({ subscription_status: 'cancelled' })
            .eq('gocardless_subscription_id', subscriptionId)
          console.log('[webhook] subscription cancelled:', subscriptionId)
        }
      }

      // Mandate cancelled (Direct Debit cancelled by customer's bank)
      if (type === 'mandates' && action === 'cancelled') {
        const mandateId = event.links?.mandate
        if (mandateId) {
          await adminClient.from('users')
            .update({ subscription_status: 'cancelled' })
            .eq('gocardless_mandate_id', mandateId)
          console.log('[webhook] mandate cancelled:', mandateId)
        }
      }

      // Payment failed
      if (type === 'payments' && action === 'failed') {
        const mandateId = event.links?.mandate
        if (mandateId) {
          await adminClient.from('users')
            .update({ subscription_status: 'past_due' })
            .eq('gocardless_mandate_id', mandateId)
          console.log('[webhook] payment failed for mandate:', mandateId)
        }
      }

      // Subscription reactivated or payment confirmed — restore active
      if (type === 'subscriptions' && action === 'resumed') {
        const subscriptionId = event.links?.subscription
        if (subscriptionId) {
          await adminClient.from('users')
            .update({ subscription_status: 'active' })
            .eq('gocardless_subscription_id', subscriptionId)
          console.log('[webhook] subscription resumed:', subscriptionId)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
