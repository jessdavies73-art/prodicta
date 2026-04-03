import { NextResponse } from 'next/server'
import { getStripeClient, PLANS } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'

// Called after a successful 3D Secure authentication to complete account creation.
// Verifies with Stripe that the subscription's payment intent actually succeeded
// before creating any user records.
export async function POST(request) {
  try {
    const { subscriptionId, email, password, companyName, accountType, plan } = await request.json()

    if (!subscriptionId || !email || !password || !companyName || !accountType || !plan) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const stripe = getStripeClient()

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent', 'customer'],
    })

    // Verify the customer email matches to prevent one user from hijacking
    // another user's subscription.
    const customerEmail = (subscription.customer?.email || '').toLowerCase()
    if (customerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Email address does not match the payment record. Please try again.' },
        { status: 403 }
      )
    }

    const paymentIntent = subscription.latest_invoice?.payment_intent
    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been confirmed. Please complete card authentication and try again.' },
        { status: 402 }
      )
    }

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

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
        subscription_status:    'active',
        stripe_customer_id:     customerId,
        stripe_subscription_id: subscription.id,
      },
    })

    if (createError) {
      const msg = createError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      throw createError
    }

    await adminClient.from('users').insert({
      id:               userData.user.id,
      email:            email.trim(),
      company_name:     companyName.trim(),
      account_type:     accountType,
      plan,
      onboarding_complete:    true,
      subscription_status:    'active',
      stripe_customer_id:     customerId,
      stripe_subscription_id: subscription.id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('confirm-subscription error:', err)
    return NextResponse.json(
      { error: 'Something went wrong confirming your account. Please contact support at hello@prodicta.co.uk.' },
      { status: 500 }
    )
  }
}
