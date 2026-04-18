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
          await updateSubscriptionStatus(adminClient, invoice.subscription, 'active')
          console.log('[webhook] payment succeeded for subscription:', invoice.subscription)
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object
        const meta = session.metadata || {}

        // PAYG tier upgrade: swap one `from_type` credit for one `to_type`
        // credit, and bump the linked assessment's mode so the next
        // generation (or user action) uses the new tier.
        if (meta.flow === 'upgrade-assessment' && meta.user_id && meta.from_type && meta.to_type) {
          const MODE_FROM_CREDIT = { 'rapid-screen': 'rapid', 'speed-fit': 'quick', 'depth-fit': 'standard', 'strategy-fit': 'advanced' }
          try {
            // Credit the new tier (+1)
            const { data: toExisting } = await adminClient
              .from('assessment_credits')
              .select('credits_remaining, credits_purchased')
              .eq('user_id', meta.user_id)
              .eq('credit_type', meta.to_type)
              .maybeSingle()
            if (toExisting) {
              await adminClient.from('assessment_credits').update({
                credits_remaining: (toExisting.credits_remaining || 0) + 1,
                credits_purchased: (toExisting.credits_purchased || 0) + 1,
                last_purchased_at: new Date().toISOString(),
              }).eq('user_id', meta.user_id).eq('credit_type', meta.to_type)
            } else {
              await adminClient.from('assessment_credits').insert({
                user_id: meta.user_id, credit_type: meta.to_type,
                credits_remaining: 1, credits_purchased: 1,
                last_purchased_at: new Date().toISOString(),
              })
            }
            // Debit the old tier (-1, never below zero)
            const { data: fromExisting } = await adminClient
              .from('assessment_credits')
              .select('credits_remaining')
              .eq('user_id', meta.user_id)
              .eq('credit_type', meta.from_type)
              .maybeSingle()
            if (fromExisting) {
              await adminClient.from('assessment_credits').update({
                credits_remaining: Math.max(0, (fromExisting.credits_remaining || 0) - 1),
              }).eq('user_id', meta.user_id).eq('credit_type', meta.from_type)
            }
            // Bump the linked assessment's mode and invalidate its stored
            // scenarios so the next load / generator call refreshes them at
            // the new tier. We don't regenerate synchronously here because
            // webhooks must return quickly.
            if (meta.assessment_id) {
              const newMode = MODE_FROM_CREDIT[meta.to_type]
              if (newMode) {
                await adminClient.from('assessments').update({
                  assessment_mode: newMode,
                  scenarios: null,
                }).eq('id', meta.assessment_id)
              }
            }
            console.log(`[webhook] upgrade-assessment: ${meta.from_type} -> ${meta.to_type} for user ${meta.user_id}${meta.assessment_id ? ` (assessment ${meta.assessment_id})` : ''}`)
          } catch (upgradeErr) {
            console.error('[webhook] upgrade-assessment handler error', upgradeErr?.message)
          }
          break
        }

        const { user_id, credit_type, quantity, add_immersive } = meta
        if (user_id && credit_type && quantity) {
          const qty = parseInt(quantity) || 1
          // Upsert assessment credits
          const { data: existing } = await adminClient
            .from('assessment_credits')
            .select('credits_remaining, credits_purchased')
            .eq('user_id', user_id)
            .eq('credit_type', credit_type)
            .maybeSingle()

          if (existing) {
            await adminClient.from('assessment_credits').update({
              credits_remaining: existing.credits_remaining + qty,
              credits_purchased: existing.credits_purchased + qty,
              last_purchased_at: new Date().toISOString(),
            }).eq('user_id', user_id).eq('credit_type', credit_type)
          } else {
            await adminClient.from('assessment_credits').insert({
              user_id, credit_type,
              credits_remaining: qty,
              credits_purchased: qty,
              last_purchased_at: new Date().toISOString(),
            })
          }

          // Handle immersive add-on credits
          if (add_immersive === 'true') {
            const { data: immExisting } = await adminClient
              .from('assessment_credits')
              .select('credits_remaining, credits_purchased')
              .eq('user_id', user_id)
              .eq('credit_type', 'immersive')
              .maybeSingle()

            if (immExisting) {
              await adminClient.from('assessment_credits').update({
                credits_remaining: immExisting.credits_remaining + qty,
                credits_purchased: immExisting.credits_purchased + qty,
                last_purchased_at: new Date().toISOString(),
              }).eq('user_id', user_id).eq('credit_type', 'immersive')
            } else {
              await adminClient.from('assessment_credits').insert({
                user_id, credit_type: 'immersive',
                credits_remaining: qty,
                credits_purchased: qty,
                last_purchased_at: new Date().toISOString(),
              })
            }
          }

          console.log(`[webhook] credits added: ${qty}x ${credit_type} for user ${user_id}`)
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
