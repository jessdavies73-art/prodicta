import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

// Pay-as-you-go signup: creates the Supabase user with plan='payg' and no Stripe
// subscription. Credits are purchased on demand via one-time Stripe Checkout.
export async function POST(request) {
  try {
    const { email, password, companyName, accountType, promoCode } = await request.json()

    if (!email || !password || !companyName || !accountType) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (accountType !== 'employer' && accountType !== 'agency') {
      return NextResponse.json({ error: 'Invalid account type.' }, { status: 400 })
    }

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
          plan: 'payg',
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

    const adminClient = createServiceClient()

    await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        subscription_status: 'payg',
        plan_type: 'payg',
      },
    })

    const { error: usersUpsertError } = await adminClient.from('users').upsert(
      {
        id: userId,
        email: email.trim(),
        company_name: companyName.trim(),
        account_type: accountType,
        plan: 'payg',
        plan_type: 'payg',
        onboarding_complete: true,
        subscription_status: 'payg',
      },
      { onConflict: 'id' }
    )
    if (usersUpsertError) {
      console.error('[create-payg-account] public.users upsert failed', { userId, error: usersUpsertError })
      throw usersUpsertError
    }

    // Forced verification UPDATE — runs after any DB trigger so PAYG plan values always win.
    await adminClient
      .from('users')
      .update({
        plan: 'payg',
        plan_type: 'payg',
        subscription_status: 'payg',
        onboarding_complete: true,
      })
      .eq('id', userId)
    console.log('[payg-signup] plan verified and set to payg for', userId)

    let promoMessage = null
    if (promoCode) {
      try {
        const result = await redeemPromoCode({ adminClient, userId, code: promoCode })
        if (result.ok) promoMessage = result.message
      } catch (promoErr) {
        console.error('[create-payg-account] promo redeem error (non-fatal):', promoErr)
      }
    }

    return NextResponse.json({ success: true, promoMessage })
  } catch (err) {
    console.error('[create-payg-account] error:', err)
    return NextResponse.json(
      { error: 'Something went wrong creating your account. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
