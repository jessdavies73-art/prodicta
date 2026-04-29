import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient, CREDIT_PRICES } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

const SELECTABLE_TYPES = ['rapid-screen', 'speed-fit', 'depth-fit', 'strategy-fit']
const MIN_QTY = 1
const MAX_QTY_PER_TYPE = 50
const MAX_TOTAL_QTY = 200

// Mirrors the create endpoint's normaliser. See create-payg-with-bundle for
// docs. Accepts either { purchases: [...] } or legacy { credit_type, quantity }.
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
    if (!unitPrice) throw { status: 400, message: `No price configured for ${ct}` }
    cleaned.push({ credit_type: ct, quantity: qty, unitPrice })
    totalQty += qty
    totalAmount += unitPrice * qty
  }
  if (cleaned.length === 0) throw { status: 400, message: 'Add at least one assessment to continue.' }
  if (totalQty > MAX_TOTAL_QTY) {
    throw { status: 400, message: `Total quantity exceeds ${MAX_TOTAL_QTY}. Contact us about a subscription.` }
  }
  return { purchases: cleaned, totalAmount, totalQty }
}

// Runs after the client completes 3D Secure / SCA authentication on a payg
// assessment purchase. Verifies the PaymentIntent succeeded, creates the
// Supabase user, and grants the purchased credits.
export async function POST(request) {
  let currentStep = 'init'
  try {
    currentStep = 'parse-body'
    const body = await request.json()
    const { paymentIntentId, email, password, companyName, accountType, promoCode } = body

    if (!paymentIntentId || !email || !password || !companyName || !accountType) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    let purchases, expectedAmount
    try {
      const normalised = normalisePurchases(body)
      purchases = normalised.purchases
      expectedAmount = normalised.totalAmount
    } catch (validationErr) {
      return NextResponse.json({ error: validationErr.message }, { status: validationErr.status || 400 })
    }

    console.log('[confirm-payg-bundle] start', {
      paymentIntentId,
      purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
      expectedAmount, accountType,
    })

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
 { error: 'An account with this email already exists. Your payment has been received, please contact support at hello@prodicta.co.uk to apply the credits.' },
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
      console.error('[confirm-payg-bundle] public.users upsert failed', { userId, error: usersUpsertError })
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

    // Mixed-cart credit grant: one row per credit_type. See create endpoint
    // for the same pattern.
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
        console.error('[confirm-payg-bundle] promo redeem error (non-fatal):', err)
      }
    }

    console.log('[confirm-payg-bundle] credits granted', {
      userId,
      purchases: purchases.map(p => `${p.quantity} x ${p.credit_type}`),
      amountGBP: expectedAmount / 100,
    })
    return NextResponse.json({
      success: true,
      promoMessage,
      purchases: purchases.map(p => ({ credit_type: p.credit_type, quantity: p.quantity })),
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
