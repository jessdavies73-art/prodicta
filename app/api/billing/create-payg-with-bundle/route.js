import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'
import { sendSignupNotification } from '@/lib/send-signup-notification'

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

  // Atomic credit grant via RPC. The function wraps every row insert in a
  // single PL/pgSQL transaction and raises on any per-row error so a partial
  // grant (paid for 13, got 10) is impossible. If this fails after the user
  // is already created, the caller MUST avoid deleting the Stripe customer:
  // the payment_intent.succeeded webhook handler reads metadata.signup and
  // re-attempts the same RPC as a recovery path. See app/api/billing/webhook.
  const purchasesPayload = purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity }))
  const { error: rpcError } = await admin.rpc('grant_payg_credits', {
    user_id_input: userId,
    purchases_input: purchasesPayload,
  })

  let promoMessage = null
  if (!rpcError && promoCode) {
    try {
      const result = await redeemPromoCode({ adminClient: admin, userId, code: promoCode })
      if (result.ok) promoMessage = result.message
    } catch (err) {
      console.error('[payg-with-bundle] promo redeem error (non-fatal):', err)
    }
  }

  if (rpcError) {
    console.error('[payg] CRITICAL: grant_payg_credits RPC failed, awaiting webhook recovery', {
      userId, purchases: purchasesPayload, error: rpcError.message,
    })
  }

  return { userId, promoMessage, creditsGranted: !rpcError }
}

export async function POST(request) {
  let stripeCustomerId = null
  let currentStep = 'init'
  // Tracks whether we successfully created a Supabase user in this request.
  // If true, the catch block must NOT delete the Stripe customer: a failed
  // credit grant is recoverable via the payment_intent.succeeded webhook,
  // but only if the customer record (and its metadata.email) survives.
  let userWasCreated = false
  try {
    currentStep = 'parse-body'
    const body = await request.json()
    const { email, password, companyName, accountType, promoCode, paymentMethodId } = body
    // Stripe idempotency key: client generates once per form mount and
    // resends on any retry, so a network-level retry of the same submission
    // returns the same PaymentIntent rather than creating a duplicate
    // charge. Server falls back to a generated UUID if the header is
    // absent, which still gives single-request safety even if the client
    // is older or misbehaving.
    const idempotencyKey = request.headers.get('x-idempotency-key')
      || (typeof crypto !== 'undefined' && crypto.randomUUID
        ? `payg-${crypto.randomUUID()}`
        : `payg-${Date.now()}-${Math.random().toString(36).slice(2)}`)

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
      // Metadata is read by the payment_intent.succeeded webhook handler at
      // /api/billing/webhook to detect signup payments and recover from a
      // captured-but-no-account or captured-but-no-credits state. Keep these
      // keys stable: signup=true gates the handler, email is the lookup key
      // for the Supabase user, purchases is the JSON-encoded cart used by
      // the webhook to call grant_payg_credits as a recovery.
      metadata: {
        signup: 'true',
        email: email.trim(),
        purchases: purchasesJson,
        total_qty: String(totalQty),
        total_amount: String(amount),
      },
    }, {
      idempotencyKey,
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
      const { userId, promoMessage, creditsGranted } = await createSupabaseUserAndGrantCredits({
        email, password, companyName, accountType,
        customerId: customer.id, purchases, promoCode,
      })
      // The Supabase user exists from this point. Mark so the outer catch
      // skips the customer-delete branch on any later error: the webhook
      // recovery path needs the customer + intent metadata to find this user.
      if (userId) userWasCreated = true

      if (!creditsGranted) {
        // Payment captured, user created, RPC failed. The
        // payment_intent.succeeded webhook will retry the RPC. Surface a
        // clear message to the candidate and a 202 Accepted so the client
        // doesn't treat the captured payment as a hard error.
        console.error('[payg-with-bundle] CRITICAL: credits_pending after capture', {
          userId, purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
          amountGBP: amount / 100, paymentIntentId: intent.id,
        })
        return NextResponse.json({
          creditsPending: true,
          error: 'Your payment was successful and your account is being activated. Please check your email shortly. If your credits do not appear within 10 minutes, contact hello@prodicta.co.uk.',
          purchases: purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity })),
        }, { status: 202 })
      }

      console.log('[payg-with-bundle] user created and credits granted', {
        userId, purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
        amountGBP: amount / 100,
      })
      // Founder visibility on every paying signup. Best-effort: failure
      // here must not block the success response. Webhook recovery path
      // is silent so a recovery never produces a duplicate email.
      try {
        await sendSignupNotification({
          email,
          name: companyName,
          account_type: accountType,
          employment_type: undefined,
          plan_type: 'PAYG',
          purchases: purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity })),
          total_amount_gbp: amount / 100,
          signup_timestamp: new Date().toISOString(),
          stripe_customer_id: customer.id,
        })
      } catch (notifyErr) {
        console.error('[payg-with-bundle] founder signup notification failed (non-fatal)', { error: notifyErr?.message })
      }
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
      // Only delete the customer if the user was NOT created. After user
      // creation the webhook recovery path needs the customer+intent
      // metadata to find this user; deleting the customer here would
      // orphan the captured payment.
      if (stripeCustomerId && !userWasCreated) {
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
