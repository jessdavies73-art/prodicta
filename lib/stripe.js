import Stripe from 'stripe'

export const PLANS = {
  starter:      { label: 'Starter',         price: 4900,  display: '£49/month'  },
  professional: { label: 'Professional',    price: 12000, display: '£120/month' },
  unlimited:    { label: 'Unlimited',       price: 15900, display: '£159/month' },
  founding:     { label: 'Founding Member', price: 7900,  display: '£79/month'  },
  // Legacy keys retained so existing subscriptions and stored plan strings continue to resolve
  growth:       { label: 'Professional',    price: 12000, display: '£120/month', legacy: 'professional' },
  scale:        { label: 'Unlimited',       price: 15900, display: '£159/month', legacy: 'unlimited' },
}

export const CREDIT_PRICES = {
  'speed-fit':  { label: 'Speed-Fit Assessment Credit',  price: 1800, display: '£18' },
  'depth-fit':  { label: 'Depth-Fit Assessment Credit',  price: 3500, display: '£35' },
  'strategy-fit': { label: 'Strategy-Fit Assessment Credit', price: 6500, display: '£65' },
  'immersive':  { label: 'Immersive Add-on Credit',      price: 2500, display: '£25' },
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
