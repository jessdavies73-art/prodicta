import { NextResponse } from 'next/server'
import { getStripeClient } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'

// Grant `quantity` credits of `creditType` to `userId`. Performs a
// select-then-update/insert and checks .error on every supabase call so the
// caller can surface failures rather than silently swallow them.
//
// IMPORTANT: callers must treat any thrown error as fatal and allow the
// webhook to return 500 so Stripe retries the delivery. Historically these
// operations ignored .error, which caused paid customers to miss credits
// when a transient DB error coincided with a 200 OK to Stripe (Stripe then
// marked the event delivered and never retried).
async function grantCredits(adminClient, { userId, creditType, quantity, paymentId }) {
  const qty = parseInt(quantity, 10) || 0
  if (!userId || !creditType || qty <= 0) {
    const err = new Error(`[credit-grant] invalid args: ${JSON.stringify({ userId, creditType, quantity })}`)
    console.error('[credit-grant] error', { userId, creditType, error: err.message })
    throw err
  }

  console.log('[credit-grant] granting credits', { userId, creditType, quantity: qty, paymentId })

  const { data: existing, error: selectErr } = await adminClient
    .from('assessment_credits')
    .select('credits_remaining, credits_purchased')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .maybeSingle()

  if (selectErr) {
    console.error('[credit-grant] error', { userId, creditType, error: `select failed: ${selectErr.message}` })
    throw new Error(`[credit-grant] select failed for ${creditType}: ${selectErr.message}`)
  }

  let newBalance
  if (existing) {
    newBalance = (existing.credits_remaining || 0) + qty
    const { error: updateErr } = await adminClient
      .from('assessment_credits')
      .update({
        credits_remaining: newBalance,
        credits_purchased: (existing.credits_purchased || 0) + qty,
        last_purchased_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('credit_type', creditType)
    if (updateErr) {
      console.error('[credit-grant] error', { userId, creditType, error: `update failed: ${updateErr.message}` })
      throw new Error(`[credit-grant] update failed for ${creditType}: ${updateErr.message}`)
    }
  } else {
    newBalance = qty
    const { error: insertErr } = await adminClient
      .from('assessment_credits')
      .insert({
        user_id: userId,
        credit_type: creditType,
        credits_remaining: qty,
        credits_purchased: qty,
        last_purchased_at: new Date().toISOString(),
      })
    if (insertErr) {
      // Race: another webhook delivery just created the row. Re-read and
      // increment rather than failing outright.
      if (insertErr.code === '23505') {
        const { data: racedRow, error: reselectErr } = await adminClient
          .from('assessment_credits')
          .select('credits_remaining, credits_purchased')
          .eq('user_id', userId)
          .eq('credit_type', creditType)
          .maybeSingle()
        if (reselectErr || !racedRow) {
          console.error('[credit-grant] error', { userId, creditType, error: `insert race reselect failed: ${reselectErr?.message || 'no row'}` })
          throw new Error(`[credit-grant] insert race reselect failed for ${creditType}`)
        }
        newBalance = (racedRow.credits_remaining || 0) + qty
        const { error: raceUpdateErr } = await adminClient
          .from('assessment_credits')
          .update({
            credits_remaining: newBalance,
            credits_purchased: (racedRow.credits_purchased || 0) + qty,
            last_purchased_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('credit_type', creditType)
        if (raceUpdateErr) {
          console.error('[credit-grant] error', { userId, creditType, error: `race update failed: ${raceUpdateErr.message}` })
          throw new Error(`[credit-grant] race update failed for ${creditType}: ${raceUpdateErr.message}`)
        }
      } else {
        console.error('[credit-grant] error', { userId, creditType, error: `insert failed: ${insertErr.message}` })
        throw new Error(`[credit-grant] insert failed for ${creditType}: ${insertErr.message}`)
      }
    }
  }

  console.log('[credit-grant] success', { userId, creditType, newBalance })
  return newBalance
}

// Debit one credit, never below zero. Used by the tier-upgrade flow.
async function debitOneCredit(adminClient, { userId, creditType, paymentId }) {
  const { data: existing, error: selectErr } = await adminClient
    .from('assessment_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .maybeSingle()
  if (selectErr) {
    console.error('[credit-grant] error', { userId, creditType, error: `debit select failed: ${selectErr.message}` })
    throw new Error(`[credit-grant] debit select failed for ${creditType}: ${selectErr.message}`)
  }
  if (!existing) {
    console.warn('[credit-grant] debit skipped, no row', { userId, creditType, paymentId })
    return 0
  }
  const newBalance = Math.max(0, (existing.credits_remaining || 0) - 1)
  const { error: updateErr } = await adminClient
    .from('assessment_credits')
    .update({ credits_remaining: newBalance })
    .eq('user_id', userId)
    .eq('credit_type', creditType)
  if (updateErr) {
    console.error('[credit-grant] error', { userId, creditType, error: `debit update failed: ${updateErr.message}` })
    throw new Error(`[credit-grant] debit update failed for ${creditType}: ${updateErr.message}`)
  }
  return newBalance
}

export async function POST(request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const stripe = getStripeClient()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.warn('[webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[webhook] received', { type: event.type, id: event.id })

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
        // client_reference_id is a backup user identifier set in /api/stripe/
        // credit-bundle so we can still identify the user if metadata is lost.
        const userIdFromMeta = meta.user_id || session.client_reference_id || null
        const paymentId = session.id

        console.log('[webhook] checkout.session.completed', {
          sessionId: paymentId,
          userId: userIdFromMeta,
          flow: meta.flow || null,
          creditType: meta.credit_type || null,
          quantity: meta.quantity || null,
          addImmersive: meta.add_immersive || null,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
        })

        if (session.payment_status && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
          console.warn('[webhook] skipping credit grant, session not paid', {
            sessionId: paymentId, paymentStatus: session.payment_status,
          })
          break
        }

        // Extra team seat: increment users.user_limit_extra by 1 so the
        // inviter gets one more seat to fill. One checkout = one seat = one
        // separate £35/month Stripe subscription.
        if (meta.flow === 'extra-seat' && userIdFromMeta) {
          const { data: row, error: readErr } = await adminClient
            .from('users')
            .select('user_limit_extra')
            .eq('id', userIdFromMeta)
            .maybeSingle()
          if (readErr) {
            console.error('[webhook] extra-seat read failed', { userId: userIdFromMeta, error: readErr.message })
            throw new Error(`extra-seat read failed: ${readErr.message}`)
          }
          const next = (row?.user_limit_extra || 0) + 1
          const { error: seatErr } = await adminClient
            .from('users')
            .update({ user_limit_extra: next })
            .eq('id', userIdFromMeta)
          if (seatErr) {
            console.error('[webhook] extra-seat update failed', { userId: userIdFromMeta, error: seatErr.message })
            throw new Error(`extra-seat update failed: ${seatErr.message}`)
          }
          console.log('[webhook] extra-seat granted', { userId: userIdFromMeta, newLimitExtra: next })
          break
        }

        // PAYG tier upgrade: swap one `from_type` credit for one `to_type`
        // credit, and bump the linked assessment's mode so the next
        // generation (or user action) uses the new tier.
        if (meta.flow === 'upgrade-assessment' && userIdFromMeta && meta.from_type && meta.to_type) {
          const MODE_FROM_CREDIT = { 'rapid-screen': 'rapid', 'speed-fit': 'quick', 'depth-fit': 'standard', 'strategy-fit': 'advanced' }
          await grantCredits(adminClient, {
            userId: userIdFromMeta,
            creditType: meta.to_type,
            quantity: 1,
            paymentId,
          })
          await debitOneCredit(adminClient, {
            userId: userIdFromMeta,
            creditType: meta.from_type,
            paymentId,
          })
          if (meta.assessment_id) {
            const newMode = MODE_FROM_CREDIT[meta.to_type]
            if (newMode) {
              const { error: assessErr } = await adminClient
                .from('assessments')
                .update({ assessment_mode: newMode, scenarios: null })
                .eq('id', meta.assessment_id)
              if (assessErr) {
                console.error('[webhook] upgrade-assessment: failed to update assessment mode', { assessmentId: meta.assessment_id, error: assessErr.message })
                throw new Error(`upgrade-assessment: failed to update assessment ${meta.assessment_id}: ${assessErr.message}`)
              }
            }
          }
          console.log(`[webhook] upgrade-assessment: ${meta.from_type} -> ${meta.to_type} for user ${userIdFromMeta}${meta.assessment_id ? ` (assessment ${meta.assessment_id})` : ''}`)
          break
        }

        const { credit_type, quantity, add_immersive } = meta
        if (userIdFromMeta && credit_type && quantity) {
          const qty = parseInt(quantity, 10) || 1
          await grantCredits(adminClient, {
            userId: userIdFromMeta,
            creditType: credit_type,
            quantity: qty,
            paymentId,
          })

          if (add_immersive === 'true') {
            await grantCredits(adminClient, {
              userId: userIdFromMeta,
              creditType: 'immersive',
              quantity: qty,
              paymentId,
            })
          }
        } else if (session.amount_total && session.amount_total > 0) {
          // Paid session with no credit metadata. Log loudly so ops can
          // reconcile. We still return 200 because there is nothing actionable
          // here without metadata, and retrying the webhook will not change
          // that.
          console.error('[webhook] paid session with no credit metadata, manual reconciliation required', {
            sessionId: paymentId,
            userId: userIdFromMeta,
            amountTotal: session.amount_total,
            customerEmail: session.customer_details?.email || session.customer_email || null,
            metadata: meta,
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    // Return 500 so Stripe retries delivery. Stripe retries failed webhook
    // deliveries with exponential backoff for up to 3 days, which is our
    // safety net against transient database errors silently dropping credits.
    console.error('[webhook] processing error, returning 500 so Stripe retries', {
      eventId: event?.id, eventType: event?.type, error: err?.message,
    })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function updateSubscriptionStatus(adminClient, subscriptionId, status) {
  const { error: updateErr } = await adminClient
    .from('users')
    .update({ subscription_status: status })
    .eq('stripe_subscription_id', subscriptionId)
  if (updateErr) {
    console.error('[webhook] updateSubscriptionStatus update failed', { subscriptionId, status, error: updateErr.message })
    throw new Error(`updateSubscriptionStatus failed: ${updateErr.message}`)
  }

  const { data: users, error: selectErr } = await adminClient
    .from('users')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .limit(1)
  if (selectErr) {
    console.error('[webhook] updateSubscriptionStatus select failed', { subscriptionId, error: selectErr.message })
    throw new Error(`updateSubscriptionStatus select failed: ${selectErr.message}`)
  }

  if (users?.[0]) {
    await adminClient.auth.admin.updateUserById(users[0].id, {
      app_metadata: { subscription_status: status },
    })
  }
}
