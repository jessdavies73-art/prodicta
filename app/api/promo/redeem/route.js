import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { redeemPromoCode } from '@/lib/promo-redeem'

export async function POST(request) {
  try {
    const { code } = await request.json().catch(() => ({}))

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { ok: false, message: 'You must be signed in to redeem a promo code.' },
        { status: 401 }
      )
    }

    const adminClient = createServiceClient()
    const result = await redeemPromoCode({ adminClient, userId: user.id, code })

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[promo/redeem] error:', err)
    return NextResponse.json(
      { ok: false, message: 'Could not apply promo code. Please try again.' },
      { status: 500 }
    )
  }
}
