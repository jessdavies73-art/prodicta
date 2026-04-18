/**
 * Validate and redeem a promo code for a given user.
 *
 * Must run with a service-role Supabase client (bypasses RLS to read
 * the full promo_codes row and update uses_count / assessment_credits).
 *
 * Returns a structured result: { ok: true, reward, message } on success,
 * or { ok: false, code, message } on failure. Never throws for expected
 * validation failures, only for unexpected DB errors.
 */
export async function redeemPromoCode({ adminClient, userId, code }) {
  if (!adminClient) throw new Error('adminClient is required')
  if (!userId) return { ok: false, code: 'no_user', message: 'You must be signed in to redeem a promo code.' }
  if (!code || !String(code).trim()) {
    return { ok: false, code: 'empty', message: 'Please enter a promo code.' }
  }

  const normalised = String(code).trim().toUpperCase()

  const { data: promo, error: promoErr } = await adminClient
    .from('promo_codes')
    .select('*')
    .ilike('code', normalised)
    .maybeSingle()

  if (promoErr) throw promoErr
  if (!promo) {
    return { ok: false, code: 'not_found', message: 'That promo code does not exist.' }
  }
  if (!promo.active) {
    return { ok: false, code: 'inactive', message: 'That promo code is no longer active.' }
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { ok: false, code: 'expired', message: 'That promo code has expired.' }
  }
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
    return { ok: false, code: 'max_uses', message: 'That promo code has reached its redemption limit.' }
  }

  const { data: existingRedemption, error: redErr } = await adminClient
    .from('promo_redemptions')
    .select('id')
    .eq('user_id', userId)
    .eq('promo_code', promo.code)
    .maybeSingle()

  if (redErr) throw redErr
  if (existingRedemption) {
    return { ok: false, code: 'already_redeemed', message: 'You have already redeemed this promo code.' }
  }

  const { error: insertErr } = await adminClient
    .from('promo_redemptions')
    .insert({ user_id: userId, promo_code: promo.code })

  if (insertErr) {
    if (String(insertErr.code) === '23505') {
      return { ok: false, code: 'already_redeemed', message: 'You have already redeemed this promo code.' }
    }
    throw insertErr
  }

  await adminClient
    .from('promo_codes')
    .update({ uses_count: (promo.uses_count || 0) + 1 })
    .eq('id', promo.id)

  let reward = { type: promo.reward_type, value: promo.reward_value }
  let rewardMessage = 'Promo code applied.'

  if (promo.reward_type === 'rapid_screens') {
    const qty = Number(promo.reward_value) || 0
    if (qty > 0) {
      const { data: existingCredit } = await adminClient
        .from('assessment_credits')
        .select('credits_remaining, credits_purchased')
        .eq('user_id', userId)
        .eq('credit_type', 'rapid-screen')
        .maybeSingle()

      if (existingCredit) {
        await adminClient.from('assessment_credits').update({
          credits_remaining: (existingCredit.credits_remaining || 0) + qty,
          credits_purchased: (existingCredit.credits_purchased || 0) + qty,
          last_purchased_at: new Date().toISOString(),
        }).eq('user_id', userId).eq('credit_type', 'rapid-screen')
      } else {
        await adminClient.from('assessment_credits').insert({
          user_id: userId,
          credit_type: 'rapid-screen',
          credits_remaining: qty,
          credits_purchased: qty,
          last_purchased_at: new Date().toISOString(),
        })
      }
      rewardMessage = `${qty} free Rapid Screens added to your account. Welcome to PRODICTA.`
    }
  }

  return { ok: true, reward, message: rewardMessage, codeApplied: promo.code }
}
