import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

// Eligible credit types for signup-time PAYG purchase. Immersive is an add-on
// only, not something you'd buy as your first line.
const SELECTABLE_TYPES = ['rapid-screen', 'speed-fit', 'depth-fit', 'strategy-fit']
const MIN_QTY = 1
const MAX_QTY = 100

function labelFor(credit_type) {
  return CREDIT_PRICES[credit_type]?.label || credit_type
}

async function createSupabaseUserAndGrantCredits({ email, password, companyName, accountType, customerId, credit_type, quantity, promoCode }) {
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
  if (signUpError) throw signUpError
  const userId = signUpData.user?.id
  if (!userId) throw new Error('Sign up did not return a user id')

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
      credits_remaining: (existing.credits_remaining || 0) + quantity,
      credits_purchased: (existing.credits_purchased || 0) + quantity,
      last_purchased_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('credit_type', credit_type)
  } else {
    await admin.from('assessment_credits').insert({
      user_id: userId,
      credit_type,
      credits_remaining: quantity,
      credits_purchased: quantity,
      last_purchased_at: new Date().toISOString(),
    })
  }

  let promoMessage = null
  if (promoCode) {
    try {
      const result = await redeemPromoCode({ adminClient: admin, userId, code: promoCode })
      if (result.ok) promoMessage = result.message
    } catch (err) {
      console.error('[payg-with-bundle] promo redeem error (non-fatal):', err)
    }
  }

  return { userId, promoMessage }
}

export async function POST(request) {
  let stripeCustomerId = null
  let currentStep = 'init'
  try {
    currentStep = 'parse-body'
    const body = await request.json()
    const { email, password, companyName, accountType, promoCode, paymentMethodId, credit_type, quantity } = body

    console.log('[payg-with-bundle] start', {
      hasEmail: !!email, hasPaymentMethodId: !!paymentMethodId, credit_type, quantity, accountType,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: (process.env.STRIPE_SECRET_KEY || '').slice(0, 7),
    })

    if (!email || !password || !companyName || !accountType || !paymentMethodId || !credit_type) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (accountType !== 'employer' && accountType !== 'agency') {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 })
    }
    if (!SELECTABLE_TYPES.includes(credit_type)) {
      return NextResponse.json({ error: 'Unknown assessment type.' }, { status: 400 })
    }
    const qty = parseInt(quantity, 10)
    if (!Number.isFinite(qty) || qty < MIN_QTY || qty > MAX_QTY) {
      return NextResponse.json({ error: `Quantity must be between ${MIN_QTY} and ${MAX_QTY}.` }, { status: 400 })
    }
    const unitPrice = CREDIT_PRICES[credit_type]?.price
    if (!unitPrice) {
      return NextResponse.json({ error: 'Unknown assessment type.' }, { status: 400 })
    }
    const amount = unitPrice * qty // already in pence (lib/stripe.js stores minor units)
    console.log('[payg-with-bundle] amount calc', { unitPrice, qty, amount })

    currentStep = 'stripe-customer'
    const stripe = getStripeClient()

    const customer = await stripe.customers.create({
      email: email.trim(),
      name: companyName.trim(),
      metadata: { plan: 'payg', accountType, credit_type, quantity: String(qty) },
    })
    stripeCustomerId = customer.id
    console.log('[payg-with-bundle] customer created', { customerId: customer.id })

    currentStep = 'attach-payment-method'
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    currentStep = 'create-payment-intent'
    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      // When a specific payment_method is passed, we don't need automatic_payment_methods.
      // Using payment_method_types keeps the intent card-only and avoids any redirect flows.
      payment_method_types: ['card'],
      description: `PRODICTA ${qty} x ${labelFor(credit_type)}`,
      metadata: {
        credit_type,
        quantity: String(qty),
        signup: 'true',
      },
    })
    console.log('[payg-with-bundle] intent created', {
      intentId: intent.id, status: intent.status,
      lastError: intent.last_payment_error ? {
        code: intent.last_payment_error.code,
        decline_code: intent.last_payment_error.decline_code,
        message: intent.last_payment_error.message,
        type: intent.last_payment_error.type,
      } : null,
    })

    if (intent.status === 'requires_action') {
      console.log('[payg-with-bundle] requires_action, returning clientSecret for SCA')
      return NextResponse.json({
        requiresAction: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        customerId: customer.id,
      })
    }

    if (intent.status === 'requires_payment_method') {
      const msg = intent.last_payment_error?.message
        || 'Your card was declined. Please try a different card.'
      console.warn('[payg-with-bundle] requires_payment_method (declined)', { msg })
      await stripe.customers.del(customer.id).catch(() => {})
      stripeCustomerId = null
      return NextResponse.json({ error: msg }, { status: 402 })
    }

    if (intent.status !== 'succeeded') {
      console.warn('[payg-with-bundle] unexpected intent status', { status: intent.status })
      await stripe.customers.del(customer.id).catch(() => {})
      stripeCustomerId = null
      return NextResponse.json({ error: `Payment could not be completed (status: ${intent.status}). Please try again.` }, { status: 402 })
    }

    currentStep = 'create-user-and-credits'
    try {
      const { userId, promoMessage } = await createSupabaseUserAndGrantCredits({
        email, password, companyName, accountType,
        customerId: customer.id, credit_type, quantity: qty, promoCode,
      })
      console.log('[payg-with-bundle] user created and credits granted', {
        userId, credit_type, quantity: qty, amountGBP: amount / 100,
      })
      return NextResponse.json({
        success: true,
        promoMessage,
        credit_type,
        quantity: qty,
        amount: amount / 100,
      })
    } catch (createErr) {
      console.error('[payg-with-bundle] user creation failed after payment (payment captured)', {
        message: createErr?.message, code: createErr?.code,
      })
      const msg = createErr.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Your payment has been received, please contact support at hello@prodicta.co.uk to apply the credits.' },
          { status: 409 }
        )
      }
      throw createErr
    }
  } catch (err) {
    console.error('[payg-with-bundle] error at step', currentStep, {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      decline_code: err?.decline_code,
      statusCode: err?.statusCode,
      raw: err?.raw ? { code: err.raw.code, message: err.raw.message, type: err.raw.type } : null,
    })
    try {
      if (stripeCustomerId) {
        const stripe = getStripeClient()
        await stripe.customers.del(stripeCustomerId).catch(() => {})
      }
    } catch {}
    const stripeTypes = ['StripeCardError', 'StripeInvalidRequestError', 'StripeAuthenticationError', 'StripeAPIError', 'StripeConnectionError', 'StripeRateLimitError']
    const isStripeErr = stripeTypes.includes(err?.type)
    const userMessage = err?.message && (isStripeErr || err?.type === 'StripeCardError')
      ? err.message
      : 'Something went wrong creating your account. Please try again.'
    return NextResponse.json({ error: userMessage, step: currentStep }, { status: 402 })
  }
}
