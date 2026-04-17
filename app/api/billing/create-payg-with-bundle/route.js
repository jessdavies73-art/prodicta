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
  try {
    const body = await request.json()
    const { email, password, companyName, accountType, promoCode, paymentMethodId, credit_type, quantity } = body

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
    const amount = unitPrice * qty // in pence

    const stripe = getStripeClient()

    const customer = await stripe.customers.create({
      email: email.trim(),
      name: companyName.trim(),
      metadata: { plan: 'payg', accountType, credit_type, quantity: String(qty) },
    })
    stripeCustomerId = customer.id

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `PRODICTA — ${qty} x ${labelFor(credit_type)}`,
      metadata: {
        credit_type,
        quantity: String(qty),
        signup: 'true',
      },
    })

    if (intent.status === 'requires_action') {
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
      await stripe.customers.del(customer.id).catch(() => {})
      stripeCustomerId = null
      return NextResponse.json({ error: msg }, { status: 402 })
    }

    if (intent.status !== 'succeeded') {
      await stripe.customers.del(customer.id).catch(() => {})
      stripeCustomerId = null
      return NextResponse.json({ error: 'Payment could not be completed. Please try again.' }, { status: 402 })
    }

    try {
      const { promoMessage } = await createSupabaseUserAndGrantCredits({
        email, password, companyName, accountType,
        customerId: customer.id, credit_type, quantity: qty, promoCode,
      })
      return NextResponse.json({
        success: true,
        promoMessage,
        credit_type,
        quantity: qty,
        amount: amount / 100,
      })
    } catch (createErr) {
      console.error('[payg-with-bundle] user creation failed after payment:', createErr)
      const msg = createErr.message || ''
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Your payment has been received — please contact support at hello@prodicta.co.uk to apply the credits.' },
          { status: 409 }
        )
      }
      throw createErr
    }
  } catch (err) {
    console.error('[payg-with-bundle] error:', err)
    try {
      if (stripeCustomerId) {
        const stripe = getStripeClient()
        await stripe.customers.del(stripeCustomerId).catch(() => {})
      }
    } catch {}
    const isCardError = err.type === 'StripeCardError'
    return NextResponse.json({
      error: isCardError
        ? (err.message || 'Your card was declined. Please try a different card.')
        : 'Something went wrong creating your account. Please try again.'
    }, { status: 402 })
  }
}
