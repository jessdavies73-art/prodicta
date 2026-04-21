import Stripe from 'stripe'

// Plan catalogue. `price` and `promoPrice` are in pence for Stripe; `display`
// is the headline monthly price. `userLimit` is the included seat count; extra
// seats are charged at EXTRA_SEAT_PRICE/month. Unchanged Founding Member price
// intentionally retained.
export const PLANS = {
  starter:      { label: 'Starter',         price: 7900,  promoPrice: 3900,  display: '£79/month',  promoDisplay: '£39 first 30 days', userLimit: 2,  assessmentLimit: 10 },
  professional: { label: 'Professional',    price: 24900, promoPrice: 12400, display: '£249/month', promoDisplay: '£124 first 30 days', userLimit: 5,  assessmentLimit: 30 },
  unlimited:    { label: 'Unlimited',       price: 39900, promoPrice: 19900, display: '£399/month', promoDisplay: '£199 first 30 days', userLimit: 15, assessmentLimit: null },
  founding:     { label: 'Founding Member', price: 7900,                       display: '£79/month',  userLimit: 2,  assessmentLimit: null },
  // Legacy keys retained so existing subscriptions and stored plan strings continue to resolve.
  growth:       { label: 'Professional',    price: 24900, promoPrice: 12400, display: '£249/month', promoDisplay: '£124 first 30 days', userLimit: 5,  assessmentLimit: 30,   legacy: 'professional' },
  scale:        { label: 'Unlimited',       price: 39900, promoPrice: 19900, display: '£399/month', promoDisplay: '£199 first 30 days', userLimit: 15, assessmentLimit: null, legacy: 'unlimited' },
}

export const EXTRA_SEAT_PRICE = 2500 // pence, billed monthly per extra user
export const EXTRA_SEAT_DISPLAY = '£25/user/month'

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
