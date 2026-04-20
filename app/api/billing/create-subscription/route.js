import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, PLANS, getOrCreatePriceId } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

async function createSupabaseUser({ adminClient, email, password, companyName, accountType, plan, customerId, subscriptionId }) {
  // Use anon client signUp so Supabase automatically sends the confirmation email.
  const anonClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        company_name: companyName.trim(),
        account_type: accountType,
        plan,
      },
    },
  })

  if (signUpError) throw signUpError
  const userId = signUpData.user?.id
  if (!userId) throw new Error('Sign up did not return a user id')

  // Attach Stripe info via service-role admin update (bypasses RLS, sets app_metadata).
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      subscription_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    },
  })
  if (updateError) throw updateError

  const { error: usersUpsertError } = await adminClient.from('users').upsert(
    {
      id: userId,
      email: email.trim(),
      company_name: companyName.trim(),
      account_type: accountType,
      plan,
      plan_type: 'subscription',
      onboarding_complete: true,
      subscription_status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    },
    { onConflict: 'id' }
  )
  if (usersUpsertError) {
    console.error('[create-subscription] public.users upsert failed', { userId, error: usersUpsertError })
    throw usersUpsertError
  }

  // Forced verification UPDATE, runs after any DB trigger so subscription plan values always win.
  await adminClient
    .from('users')
    .update({
      plan,
      plan_type: 'subscription',
      subscription_status: 'active',
    })
    .eq('id', userId)
  console.log('[subscription-signup] plan verified and set for', userId, 'plan:', plan)

  return userId
}

export async function POST(request) {
  let currentStep = 'init'
  let stripeCustomerId    = null
  let stripeSubscriptionId = null

  console.log('[billing] create-subscription called')

  try {
    currentStep = 'parse-body'
    const body = await request.json()
    const { email, password, companyName, accountType, plan, paymentMethodId, promoCode } = body

    if (!email || !password || !companyName || !accountType || !plan || !paymentMethodId) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    currentStep = 'step1-price'
    const stripe  = getStripeClient()
    console.log('[billing] Step 1: Getting price for plan:', plan)
    const priceId = await getOrCreatePriceId(plan)
    console.log('[billing] Step 1 done, priceId:', priceId)

    currentStep = 'step2-customer'
    console.log('[billing] Step 2: Creating customer')
    const customer = await stripe.customers.create({
      email: email.trim(),
      name:  companyName.trim(),
      metadata: { plan, accountType },
    })
    stripeCustomerId = customer.id
    console.log('[billing] Step 2 done, customerId:', customer.id)

    currentStep = 'step3-attach-pm'
    console.log('[billing] Step 3: Attaching payment method')
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })
    console.log('[billing] Step 3 done')

    // default_incomplete: subscription is created immediately but payment may
    // still require SCA. The payment intent status tells us what to do next.
    currentStep = 'step4-subscription'
    console.log('[billing] Step 4: Creating subscription')
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    })
    stripeSubscriptionId = subscription.id
    console.log('[billing] Step 4 done, status:', subscription.status)

    let paymentIntent = subscription.latest_invoice?.payment_intent

    if (paymentIntent?.status === 'requires_confirmation') {
      currentStep = 'confirm-payment-intent'
      console.log('[billing] Confirming payment intent', paymentIntent.id)
      paymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id)
      console.log('[billing] Confirmed, new status:', paymentIntent.status)
    }

 // SCA / 3D Secure required, return the client secret so the browser can
    // open the authentication popup via stripe.confirmCardPayment.
    // Account creation is deferred to /api/billing/confirm-subscription.
    if (paymentIntent?.status === 'requires_action') {
      stripeCustomerId     = null  // prevent catch-block rollback; resources are intentionally held
      stripeSubscriptionId = null
      return NextResponse.json({
        requiresAction: true,
        clientSecret:   paymentIntent.client_secret,
        subscriptionId: subscription.id,
      })
    }

    // Card declined
    if (paymentIntent?.status === 'requires_payment_method') {
      const msg = paymentIntent.last_payment_error?.message
        || 'Your card was declined. Please try a different card.'
      await stripe.subscriptions.cancel(subscription.id)
      await stripe.customers.del(customer.id)
      stripeCustomerId = stripeSubscriptionId = null
      return NextResponse.json({ error: msg }, { status: 402 })
    }

    // Any other non-succeeded status
    if (paymentIntent?.status !== 'succeeded') {
      await stripe.subscriptions.cancel(subscription.id)
      await stripe.customers.del(customer.id)
      stripeCustomerId = stripeSubscriptionId = null
      console.log('[billing] unexpected pi status:', paymentIntent?.status, 'sub:', subscription?.status)
      return NextResponse.json({ error: 'Payment could not be completed. Please try again.' }, { status: 402 })
    }

 // Payment succeeded without SCA, create Supabase user immediately
    currentStep = 'step5-supabase-user'
    console.log('[billing] Step 5: Creating Supabase user')
    const adminClient = createServiceClient()
    let newUserId = null
    try {
      newUserId = await createSupabaseUser({
        adminClient,
        email, password, companyName, accountType, plan,
        customerId: customer.id,
        subscriptionId: subscription.id,
      })
      console.log('[billing] Step 5 done')
    } catch (createError) {
      await stripe.subscriptions.cancel(subscription.id)
      await stripe.customers.del(customer.id)
      stripeCustomerId = stripeSubscriptionId = null

      const msg = createError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      throw createError
    }

    let promoMessage = null
    if (promoCode && newUserId) {
      try {
        const result = await redeemPromoCode({ adminClient, userId: newUserId, code: promoCode })
        if (result.ok) promoMessage = result.message
      } catch (promoErr) {
        console.error('[billing] promo redeem error (non-fatal):', promoErr)
      }
    }

    return NextResponse.json({ success: true, promoMessage })
  } catch (err) {
    console.log('[billing] FULL ERROR:', err.message, err.type, err.code, err.decline_code);
    console.log('[billing] FAILED AT:', err.stack)

    try {
      const stripe = getStripeClient()
      if (stripeSubscriptionId) await stripe.subscriptions.cancel(stripeSubscriptionId)
      if (stripeCustomerId)     await stripe.customers.del(stripeCustomerId)
    } catch (rollbackErr) {
      console.error('Stripe rollback error:', rollbackErr)
    }

    const isCardError = err.type === 'StripeCardError'
    return NextResponse.json({
      error: isCardError
        ? (err.message || 'Your card was declined. Please try a different card.')
        : 'Payment could not be completed. Please try again.'
    }, { status: 402 })
  }
}
