import Stripe from 'stripe'

// Plan catalogue. `price` and `promoPrice` are in pence for Stripe; `display`
// is the headline monthly price. `userLimit` is the included seat count; extra
// seats are charged at EXTRA_SEAT_PRICE/month.
//
// `founding` is no longer offered to new signups, but is retained here so
// existing accounts on that plan still resolve their label and price via
// PLANS[plan_key]. Legacy `growth` and `scale` keys serve the same purpose.
export const PLANS = {
  starter:      { label: 'Starter',         price: 9900,  promoPrice: 4900,  display: '£99/month',  promoDisplay: '£49 first 30 days',  userLimit: 2,  assessmentLimit: 10 },
  professional: { label: 'Professional',    price: 29900, promoPrice: 14900, display: '£299/month', promoDisplay: '£149 first 30 days', userLimit: 5,  assessmentLimit: 30 },
  business:     { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100,  legacy: 'agency' },
  founding:     { label: 'Founding Member', price: 7900,                       display: '£79/month',  userLimit: 2,  assessmentLimit: null, legacy: true },
  growth:       { label: 'Professional',    price: 29900, promoPrice: 14900, display: '£299/month', promoDisplay: '£149 first 30 days', userLimit: 5,  assessmentLimit: 30,   legacy: 'professional' },
  // Retained aliases so existing rows with plan_key = 'agency' or 'scale' still
  // resolve to the Business plan via PLANS[plan_key]. Stripe lookup key stays
  // `prodicta_agency_monthly` via `legacy: 'agency'` so existing prices match.
  agency:       { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100,  legacy: 'agency' },
  scale:        { label: 'Business',        price: 49900, promoPrice: 24900, display: '£499/month', promoDisplay: '£249 first 30 days', userLimit: 15, assessmentLimit: 100,  legacy: 'agency' },
}

export const EXTRA_SEAT_PRICE = 3500 // pence, billed monthly per extra user
export const EXTRA_SEAT_DISPLAY = '£35/user/month'

export const ASSESSMENT_TOPUP_PRICES = {
  topup_10: { price: 4500,  assessments: 10, display: '£45' },
  topup_25: { price: 9900,  assessments: 25, display: '£99' },
  topup_50: { price: 17900, assessments: 50, display: '£179' },
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
