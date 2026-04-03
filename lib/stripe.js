import Stripe from 'stripe'

export const PLANS = {
  starter:  { label: 'Starter',         price: 4900,  display: '£49/month'  },
  growth:   { label: 'Growth',          price: 9900,  display: '£99/month'  },
  scale:    { label: 'Scale',           price: 12000, display: '£120/month' },
  founding: { label: 'Founding Member', price: 7900,  display: '£79/month'  },
}

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
  const lookupKey = `prodicta_${plan}_monthly`

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
