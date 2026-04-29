import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

// Eligible credit types for signup-time PAYG purchase. Immersive is an add-on
// only, not something you'd buy as your first line.
const SELECTABLE_TYPES = ['rapid-screen', 'speed-fit', 'depth-fit', 'strategy-fit']
const MIN_QTY = 1
const MAX_QTY_PER_TYPE = 50
const MAX_TOTAL_QTY = 200

function labelFor(credit_type) {
  return CREDIT_PRICES[credit_type]?.label || credit_type
}

// Normalises an incoming body into a list of purchase rows. Accepts either:
//   - the new mixed-cart shape: { purchases: [{ credit_type, quantity }] }
//   - the legacy single-line shape: { credit_type, quantity }
// Throws { status, message } on invalid input. Total amount, in pence, is
// computed from CREDIT_PRICES so the server is the source of truth on price.
function normalisePurchases(body) {
  let purchases = []
  if (Array.isArray(body?.purchases) && body.purchases.length > 0) {
    purchases = body.purchases
  } else if (body?.credit_type) {
    purchases = [{ credit_type: body.credit_type, quantity: body.quantity }]
  } else {
    throw { status: 400, message: 'No assessment quantities provided.' }
  }

  const seen = new Set()
  const cleaned = []
  let totalQty = 0
  let totalAmount = 0

  for (const p of purchases) {
    const ct = p?.credit_type
    if (!SELECTABLE_TYPES.includes(ct)) {
      throw { status: 400, message: `Unknown assessment type: ${ct}` }
    }
    if (seen.has(ct)) {
      throw { status: 400, message: `Duplicate assessment type in cart: ${ct}` }
    }
    seen.add(ct)
    const qty = parseInt(p?.quantity, 10)
    if (!Number.isFinite(qty) || qty < MIN_QTY || qty > MAX_QTY_PER_TYPE) {
      throw { status: 400, message: `Quantity for ${ct} must be between ${MIN_QTY} and ${MAX_QTY_PER_TYPE}.` }
    }
    const unitPrice = CREDIT_PRICES[ct]?.price
    if (!unitPrice) {
      throw { status: 400, message: `No price configured for ${ct}` }
    }
    cleaned.push({ credit_type: ct, quantity: qty, unitPrice })
    totalQty += qty
    totalAmount += unitPrice * qty
  }

  if (cleaned.length === 0) {
    throw { status: 400, message: 'Add at least one assessment to continue.' }
  }
  if (totalQty > MAX_TOTAL_QTY) {
    throw { status: 400, message: `Total quantity exceeds ${MAX_TOTAL_QTY}. Contact us about a subscription.` }
  }

  return { purchases: cleaned, totalAmount, totalQty }
}

function describePurchases(purchases) {
  if (purchases.length === 1) {
    return `PRODICTA ${purchases[0].quantity} x ${labelFor(purchases[0].credit_type)}`
  }
  return 'PRODICTA: ' + purchases.map(p => `${p.quantity} x ${labelFor(p.credit_type)}`).join(', ')
}

async function createSupabaseUserAndGrantCredits({ email, password, companyName, accountType, customerId, purchases, promoCode }) {
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

  const { error: usersUpsertError } = await admin.from('users').upsert(
    {
      id: userId,
      email: email.trim(),
      company_name: companyName.trim(),
      account_type: accountType,
      plan: 'payg',
      plan_type: 'payg',
      onboarding_complete: true,
      subscription_status: 'payg',
      stripe_customer_id: customerId,
    },
    { onConflict: 'id' }
  )
  if (usersUpsertError) {
    console.error('[create-payg-with-bundle] public.users upsert failed', { userId, error: usersUpsertError })
    throw usersUpsertError
  }

  // Forced verification UPDATE, runs after any DB trigger so PAYG plan values always win.
  await admin
    .from('users')
    .update({
      plan: 'payg',
      plan_type: 'payg',
      subscription_status: 'payg',
      onboarding_complete: true,
    })
    .eq('id', userId)
  console.log('[payg-signup] plan verified and set to payg for', userId)

  // Mixed-cart credit grant: one row per credit_type. The composite uniqueness
  // (user_id, credit_type) means each upsert touches at most one row, so this
  // is safe even if the user re-runs through some recovery path with the same
  // payment intent (idempotent on credit_type, additive only via signup so
  // existing rows are guaranteed to be zero on first grant).
  const nowIso = new Date().toISOString()
  for (const p of purchases) {
    const { error: creditError } = await admin.from('assessment_credits').upsert(
      {
        user_id: userId,
        credit_type: p.credit_type,
        credits_remaining: p.quantity,
        credits_purchased: p.quantity,
        last_purchased_at: nowIso,
      },
      { onConflict: 'user_id,credit_type' }
    )
    if (creditError) console.error('[payg] credit grant failed:', { credit_type: p.credit_type, creditError })
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
    const { email, password, companyName, accountType, promoCode, paymentMethodId } = body

    if (!email || !password || !companyName || !accountType || !paymentMethodId) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (accountType !== 'employer' && accountType !== 'agency') {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 })
    }

    let purchases, amount, totalQty
    try {
      const normalised = normalisePurchases(body)
      purchases = normalised.purchases
      amount = normalised.totalAmount
      totalQty = normalised.totalQty
    } catch (validationErr) {
      return NextResponse.json({ error: validationErr.message }, { status: validationErr.status || 400 })
    }

    console.log('[payg-with-bundle] start', {
      hasEmail: !!email, hasPaymentMethodId: !!paymentMethodId,
      purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
      totalQty, amount, accountType,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: (process.env.STRIPE_SECRET_KEY || '').slice(0, 7),
    })

    currentStep = 'stripe-customer'
    const stripe = getStripeClient()

    const purchasesJson = JSON.stringify(purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity })))
    const customer = await stripe.customers.create({
      email: email.trim(),
      name: companyName.trim(),
      metadata: { plan: 'payg', accountType, purchases: purchasesJson, total_qty: String(totalQty) },
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
      description: describePurchases(purchases),
      metadata: {
        purchases: purchasesJson,
        total_qty: String(totalQty),
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
        customerId: customer.id, purchases, promoCode,
      })
      console.log('[payg-with-bundle] user created and credits granted', {
        userId, purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
        amountGBP: amount / 100,
      })
      return NextResponse.json({
        success: true,
        promoMessage,
        purchases: purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity })),
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
