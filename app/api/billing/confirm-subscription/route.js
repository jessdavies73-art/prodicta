import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, PLANS } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

// Called after a successful 3D Secure authentication to complete account creation.
// Verifies with Stripe that the subscription's payment intent actually succeeded
// before creating any user records.
export async function POST(request) {
  try {
    const { subscriptionId, email, password, companyName, accountType, plan, promoCode } = await request.json()

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

    // Use anon signUp so Supabase automatically sends the confirmation email.
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

    if (signUpError) {
      const msg = signUpError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
      }
      throw signUpError
    }

    const userId = signUpData.user?.id
    if (!userId) throw new Error('Sign up did not return a user id')

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        subscription_status:    'active',
        stripe_customer_id:     customerId,
        stripe_subscription_id: subscription.id,
      },
    })
    if (updateError) throw updateError

    const { error: usersUpsertError } = await adminClient.from('users').upsert(
      {
        id:               userId,
        email:            email.trim(),
        company_name:     companyName.trim(),
        account_type:     accountType,
        plan,
        plan_type:              'subscription',
        onboarding_complete:    true,
        subscription_status:    'active',
        stripe_customer_id:     customerId,
        stripe_subscription_id: subscription.id,
      },
      { onConflict: 'id' }
    )
    if (usersUpsertError) {
      console.error('[confirm-subscription] public.users upsert failed', { userId, error: usersUpsertError })
      throw usersUpsertError
    }

    let promoMessage = null
    if (promoCode) {
      try {
        const result = await redeemPromoCode({ adminClient, userId, code: promoCode })
        if (result.ok) promoMessage = result.message
      } catch (promoErr) {
        console.error('[confirm-subscription] promo redeem error (non-fatal):', promoErr)
      }
    }

    return NextResponse.json({ success: true, promoMessage })
  } catch (err) {
    console.error('confirm-subscription error:', err)
    return NextResponse.json(
      { error: 'Something went wrong confirming your account. Please contact support at hello@prodicta.co.uk.' },
      { status: 500 }
    )
  }
}
