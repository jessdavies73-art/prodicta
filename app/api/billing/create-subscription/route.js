import { NextResponse } from 'next/server'
import { getStripeClient, PLANS, getOrCreatePriceId } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  let stripeCustomerId = null
  let stripeSubscriptionId = null

  try {
    const { email, password, companyName, accountType, plan, paymentMethodId } = await request.json()

    if (!email || !password || !companyName || !accountType || !plan || !paymentMethodId) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const stripe = getStripeClient()
    const priceId = await getOrCreatePriceId(plan)

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email.trim(),
      name: companyName.trim(),
      metadata: { plan, accountType },
    })
    stripeCustomerId = customer.id

    // Attach payment method and set as default
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    // Create subscription — charges immediately, fails fast if card declines
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'error_if_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    })
    stripeSubscriptionId = subscription.id

    if (subscription.status !== 'active') {
      await stripe.subscriptions.cancel(subscription.id)
      await stripe.customers.del(customer.id)
      return NextResponse.json(
        { error: 'Payment failed. Please check your card details and try again.' },
        { status: 402 }
      )
    }

    // Payment succeeded — create Supabase user (sends verification email)
    const adminClient = createServiceClient()
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: false,
      user_metadata: {
        company_name: companyName.trim(),
        account_type: accountType,
        plan,
      },
      app_metadata: {
        subscription_status: 'active',
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
      },
    })

    if (createError) {
      // Roll back Stripe resources if user creation fails
      await stripe.subscriptions.cancel(subscription.id)
      await stripe.customers.del(customer.id)

      const msg = createError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      throw createError
    }

    // Insert profile row into public.users
    await adminClient.from('users').insert({
      id: userData.user.id,
      email: email.trim(),
      company_name: companyName.trim(),
      account_type: accountType,
      plan,
      onboarding_complete: true,
      subscription_status: 'active',
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('create-subscription error:', err)

    // Roll back Stripe resources on unexpected errors
    try {
      const stripe = getStripeClient()
      if (stripeSubscriptionId) await stripe.subscriptions.cancel(stripeSubscriptionId)
      if (stripeCustomerId) await stripe.customers.del(stripeCustomerId)
    } catch (rollbackErr) {
      console.error('Stripe rollback error:', rollbackErr)
    }

    if (err.type === 'StripeCardError') {
      return NextResponse.json({ error: err.message }, { status: 402 })
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
