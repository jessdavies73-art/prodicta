import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStripeClient } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

// Must match the client's bundle catalogue.
export const CREDIT_BUNDLES = {
  'rapid-10': { credit_type: 'rapid-screen', quantity: 10, priceGBP: 60,  label: '10 Rapid Screens' },
  'rapid-25': { credit_type: 'rapid-screen', quantity: 25, priceGBP: 140, label: '25 Rapid Screens' },
  'rapid-50': { credit_type: 'rapid-screen', quantity: 50, priceGBP: 275, label: '50 Rapid Screens' },
  'speed-10': { credit_type: 'speed-fit',    quantity: 10, priceGBP: 170, label: '10 Speed-Fits' },
  'depth-10': { credit_type: 'depth-fit',    quantity: 10, priceGBP: 330, label: '10 Depth-Fits' },
}

async function createSupabaseUserAndGrantCredits({ email, password, companyName, accountType, customerId, bundle, promoCode }) {
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

  // Grant bundle credits directly (no webhook here — we charged with PaymentIntent,
  // not Checkout Session).
  const qty = bundle.quantity
  const { data: existing } = await admin
    .from('assessment_credits')
    .select('credits_remaining, credits_purchased')
    .eq('user_id', userId)
    .eq('credit_type', bundle.credit_type)
    .maybeSingle()
  if (existing) {
    await admin.from('assessment_credits').update({
      credits_remaining: (existing.credits_remaining || 0) + qty,
      credits_purchased: (existing.credits_purchased || 0) + qty,
      last_purchased_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('credit_type', bundle.credit_type)
  } else {
    await admin.from('assessment_credits').insert({
      user_id: userId,
      credit_type: bundle.credit_type,
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
      console.error('[payg-with-bundle] promo redeem error (non-fatal):', err)
    }
  }

  return { userId, promoMessage }
}

export async function POST(request) {
  let stripeCustomerId = null
  try {
    const body = await request.json()
    const { email, password, companyName, accountType, promoCode, paymentMethodId, bundle_id } = body

    if (!email || !password || !companyName || !accountType || !paymentMethodId || !bundle_id) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (accountType !== 'employer' && accountType !== 'agency') {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 })
    }
    const bundle = CREDIT_BUNDLES[bundle_id]
    if (!bundle) return NextResponse.json({ error: 'Unknown bundle.' }, { status: 400 })

    const stripe = getStripeClient()

    const customer = await stripe.customers.create({
      email: email.trim(),
      name: companyName.trim(),
      metadata: { plan: 'payg', accountType, bundle_id },
    })
    stripeCustomerId = customer.id

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    })

    const intent = await stripe.paymentIntents.create({
      amount: bundle.priceGBP * 100,
      currency: 'gbp',
      customer: customer.id,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: `PRODICTA — ${bundle.label}`,
      metadata: {
        bundle_id,
        credit_type: bundle.credit_type,
        quantity: String(bundle.quantity),
        signup: 'true',
      },
    })

    if (intent.status === 'requires_action') {
      // Client-side SCA needed. We hold off on creating the Supabase user until
      // the confirm endpoint runs after authentication completes.
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

    // Payment cleared — create user and grant credits.
    try {
      const { promoMessage } = await createSupabaseUserAndGrantCredits({
        email, password, companyName, accountType,
        customerId: customer.id, bundle, promoCode,
      })
      return NextResponse.json({ success: true, promoMessage, bundle: bundle.label, amount: bundle.priceGBP })
    } catch (createErr) {
      // Payment already captured. Do not delete the customer — support will
      // refund manually. Return a clear error.
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
