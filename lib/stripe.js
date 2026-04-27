import Stripe from 'stripe'

// Plan catalogue. `price` and `promoPrice` are in pence for Stripe; `display`
// is the headline monthly price. `userLimit` is the included seat count; extra
// seats are charged at EXTRA_SEAT_PRICE/month.
//
// Workspace and Highlight Reel rules per tier (final pricing alignment):
//
//   workspace_addon_required           TRUE on every subscriber tier. The £25
//                                      Workspace add-on appears as an invoice
//                                      line item on Speed-Fit and Depth-Fit
//                                      (Rapid Screen subscribers don't see
//                                      the toggle). Strategy-Fit always
//                                      includes Workspace at no extra charge.
//   workspace_free_on_strategy_fit     TRUE on every active tier (and PAYG).
//                                      Strategy-Fit assessments include
//                                      Workspace inside their plan slot.
//   workspace_unlimited_strategy_fit   Marketing flag. Business is the only
//                                      tier flagged true; the cap below is
//                                      the actual constraint.
//   highlight_reel_included_on_all     TRUE on every subscriber tier.
//                                      Highlight Reel mints automatically
//                                      for every subscriber assessment
//                                      (Rapid Screen / Speed-Fit / Depth-Fit
//                                      / Strategy-Fit) as part of the
//                                      monthly subscription cost. PAYG
//                                      buyers continue to use the existing
//                                      £10 standalone add-on (Speed-Fit /
//                                      Depth-Fit only) or get it included
//                                      with Strategy-Fit £65.
//   strategy_fit_monthly_cap           Per-tier cap on Strategy-Fit
//                                      assessments per calendar month.
//                                      Starter and Professional are
//                                      uncapped beyond the total assessment
//                                      limit. Business is hard-capped at
//                                      30 Strategy-Fits per month;
//                                      remaining 70 of the 100 plan slot
//                                      must be Rapid Screen, Speed-Fit, or
//                                      Depth-Fit.
//
// `founding` is no longer offered to new signups, but is retained here so
// existing accounts on that plan still resolve their label and price via
// PLANS[plan_key]. Legacy `growth` and `scale` keys serve the same purpose.
export const PLANS = {
  starter:      { label: 'Starter',         price: 9900,  promoPrice: 4900,  display: '£99/month',  promoDisplay: '£49 first 30 days',  userLimit: 2,  assessmentLimit: 10,  priceId: 'price_1TOto1GVlQzjj1KqF0rGq15E', workspace_addon_required: true,  workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: false, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: null },
  professional: { label: 'Professional',    price: 29900, promoPrice: 14900, display: '£299/month', promoDisplay: '£149 first 30 days', userLimit: 5,  assessmentLimit: 30,  priceId: 'price_1TOtqNGVlQzjj1KqkU0vwlbU', workspace_addon_required: true,  workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: false, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: null },
  business:     { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100, priceId: 'price_1TOtuEGVlQzjj1KqRzm9BI98', legacy: 'agency', workspace_addon_required: true, workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: true, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: 30 },
  founding:     { label: 'Founding Member', price: 7900,                       display: '£79/month',  userLimit: 2,  assessmentLimit: null, legacy: true, workspace_addon_required: true, workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: false, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: null },
  growth:       { label: 'Professional',    price: 29900, promoPrice: 14900, display: '£299/month', promoDisplay: '£149 first 30 days', userLimit: 5,  assessmentLimit: 30,  priceId: 'price_1TOtqNGVlQzjj1KqkU0vwlbU', legacy: 'professional', workspace_addon_required: true, workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: false, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: null },
  // Retained aliases so existing rows with plan_key = 'agency' or 'scale' still
  // resolve to the Business plan via PLANS[plan_key]. They share the business
  // priceId; new subscriptions write plan='business'.
  agency:       { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100, priceId: 'price_1TOtuEGVlQzjj1KqRzm9BI98', legacy: 'agency', workspace_addon_required: true, workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: true, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: 30 },
  scale:        { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100, priceId: 'price_1TOtuEGVlQzjj1KqRzm9BI98', legacy: 'agency', workspace_addon_required: true, workspace_free_on_strategy_fit: true, workspace_unlimited_strategy_fit: true, highlight_reel_included_on_all: true, strategy_fit_monthly_cap: 30 },
}

// Subscription Workspace add-on price. Charged via stripe.invoiceItems on
// the next subscription invoice when a subscriber toggles the Workspace
// simulation on for a Speed-Fit or Depth-Fit assessment. PAYG buyers
// continue to use the existing one-time Immersive credit purchase
// (CREDIT_PRICES.immersive below) at the same price point.
export const WORKSPACE_ADDON_PRICE_PENCE = 2500
export const WORKSPACE_ADDON_DISPLAY = '£25'

export const EXTRA_SEAT_PRICE = 3500 // pence, billed monthly per extra user
export const EXTRA_SEAT_DISPLAY = '£35/user/month'
export const EXTRA_SEAT_PRICE_ID = 'price_1TOtwDGVlQzjj1KqcIYsEuUv'

// Applied automatically to every new subscription checkout (first-month 50%).
export const LAUNCH_COUPON_ID = 'L3uNNUYe'

export const ASSESSMENT_TOPUP_PRICES = {
  topup_10: { price: 4500,  assessments: 10, display: '£45',  priceId: 'price_1TOtxAGVlQzjj1KqMWEfCvhe' },
  topup_25: { price: 9900,  assessments: 25, display: '£99',  priceId: 'price_1TOtxuGVlQzjj1KqCtAmmjhD' },
  topup_50: { price: 17900, assessments: 50, display: '£179', priceId: 'price_1TOtypGVlQzjj1KqS1OD5eQO' },
}

export const CREDIT_PRICES = {
  'rapid-screen': { label: 'Rapid Screen Credit',           price: 600,  display: '£6' },
  'speed-fit':  { label: 'Speed-Fit Assessment Credit',  price: 1800, display: '£18' },
  'depth-fit':  { label: 'Depth-Fit Assessment Credit',  price: 3500, display: '£35' },
  'strategy-fit': { label: 'Strategy-Fit Assessment Credit', price: 6500, display: '£65' },
  'immersive':  { label: 'Immersive Add-on Credit',      price: 2500, display: '£25' },
  'highlight-reel': { label: 'Highlight Reel Add-on Credit', price: 1000, display: '£10' },
}

// -- CREATE TABLE IF NOT EXISTS assessment_credits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id), credit_type TEXT NOT NULL, credits_remaining INTEGER NOT NULL DEFAULT 0, credits_purchased INTEGER NOT NULL DEFAULT 0, last_purchased_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, credit_type));

// Lazily initialised so the module can be imported at build time without STRIPE_SECRET_KEY
let _stripe = null
export function getStripeClient() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  }
  return _stripe
}

export async function getOrCreatePriceId(plan) {
  const planData = PLANS[plan]
  if (!planData) throw new Error(`Unknown plan: ${plan}`)

  // Confirmed Stripe price IDs short-circuit the Stripe round-trip.
  if (planData.priceId) return planData.priceId

  const stripe = getStripeClient()
  // Map legacy plan keys to their new lookup key so existing rows keep working
  const lookupPlan = planData.legacy || plan
  const lookupKey = `prodicta_${lookupPlan}_monthly`

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id

  const product = await stripe.products.create({
    name: `Prodicta ${planData.label}`,
    metadata: { plan },
  })

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: planData.price,
    currency: 'gbp',
    recurring: { interval: 'month' },
    lookup_key: lookupKey,
  })

  return price.id
}
