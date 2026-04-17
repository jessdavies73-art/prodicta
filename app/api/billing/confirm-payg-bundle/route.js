import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

const SELECTABLE_TYPES = ['rapid-screen', 'speed-fit', 'depth-fit', 'strategy-fit']
const MIN_QTY = 1
const MAX_QTY = 100

// Runs after the client completes 3D Secure / SCA authentication on a payg
// assessment purchase. Verifies the PaymentIntent succeeded, creates the
// Supabase user, and grants the purchased credits.
export async function POST(request) {
  let currentStep = 'init'
  try {
    currentStep = 'parse-body'
    const { paymentIntentId, email, password, companyName, accountType, promoCode, credit_type, quantity } = await request.json()

    console.log('[confirm-payg-bundle] start', { paymentIntentId, credit_type, quantity, accountType })

    if (!paymentIntentId || !email || !password || !companyName || !accountType || !credit_type) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!SELECTABLE_TYPES.includes(credit_type)) {
      return NextResponse.json({ error: 'Unknown assessment type.' }, { status: 400 })
    }
    const qty = parseInt(quantity, 10)
    if (!Number.isFinite(qty) || qty < MIN_QTY || qty > MAX_QTY) {
      return NextResponse.json({ error: `Quantity must be between ${MIN_QTY} and ${MAX_QTY}.` }, { status: 400 })
    }

    currentStep = 'retrieve-intent'
    const stripe = getStripeClient()
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['customer'] })
    console.log('[confirm-payg-bundle] intent retrieved', { intentId: intent.id, status: intent.status, amount: intent.amount })

    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been confirmed. Please complete card authentication and try again.' },
        { status: 402 }
      )
    }

    const customerEmail = (intent.customer?.email || '').toLowerCase()
    if (customerEmail && customerEmail !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: 'Email address does not match the payment record. Please contact support.' },
        { status: 403 }
      )
    }

    // Cross-check amount to stop someone re-using a PaymentIntent for a bigger
    // purchase than they paid for.
    const expectedAmount = (CREDIT_PRICES[credit_type]?.price || 0) * qty
    if (expectedAmount === 0 || intent.amount !== expectedAmount) {
      return NextResponse.json({ error: 'Purchase details do not match the payment record.' }, { status: 403 })
    }

    const customerId = typeof intent.customer === 'string' ? intent.customer : intent.customer?.id

    currentStep = 'create-user'
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
          plan: 'payg',
        },
      },
    })
    if (signUpError) {
      const msg = signUpError.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Your payment has been received — please contact support at hello@prodicta.co.uk to apply the credits.' },
          { status: 409 }
        )
      }
      throw signUpError
    }
    const userId = signUpData.user?.id
    if (!userId) throw new Error('Sign up did not return a user id')
    console.log('[confirm-payg-bundle] user created', { userId })

    currentStep = 'grant-credits'
    const admin = createServiceClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        subscription_status: 'payg',
        plan_type: 'payg',
        stripe_customer_id: customerId,
      },
    })
    await admin.from('users').insert({
      id: userId,
      email: email.trim(),
      company_name: companyName.trim(),
      account_type: accountType,
      plan: 'payg',
      plan_type: 'payg',
      onboarding_complete: true,
      subscription_status: 'payg',
      stripe_customer_id: customerId,
    })

    const { data: existing } = await admin
      .from('assessment_credits')
      .select('credits_remaining, credits_purchased')
      .eq('user_id', userId)
      .eq('credit_type', credit_type)
      .maybeSingle()
    if (existing) {
      await admin.from('assessment_credits').update({
        credits_remaining: (existing.credits_remaining || 0) + qty,
        credits_purchased: (existing.credits_purchased || 0) + qty,
        last_purchased_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('credit_type', credit_type)
    } else {
      await admin.from('assessment_credits').insert({
        user_id: userId,
        credit_type,
        credits_remaining: qty,
        credits_purchased: qty,
        last_purchased_at: new Date().toISOString(),
      })
    }

    let promoMessage = null
    if (promoCode) {
      try {
        const result = await redeemPromoCode({ adminClient: admin, userId, code: promoCode })
        if (result.ok) promoMessage = result.message
      } catch (err) {
        console.error('[confirm-payg-bundle] promo redeem error (non-fatal):', err)
      }
    }

    console.log('[confirm-payg-bundle] credits granted', { userId, credit_type, quantity: qty, amountGBP: expectedAmount / 100 })
    return NextResponse.json({
      success: true,
      promoMessage,
      credit_type,
      quantity: qty,
      amount: expectedAmount / 100,
    })
  } catch (err) {
    console.error('[confirm-payg-bundle] error at step', currentStep, {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      statusCode: err?.statusCode,
    })
    return NextResponse.json(
      { error: 'Something went wrong finalising your account. Please contact support at hello@prodicta.co.uk.', step: currentStep },
      { status: 500 }
    )
  }
}
