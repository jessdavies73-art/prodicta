import Stripe from 'stripe';
export async function GET() {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return Response.json({ error: 'STRIPE_SECRET_KEY not set' });
    const stripe = new Stripe(key);
    const balance = await stripe.balance.retrieve();
    return Response.json({ success: true, mode: key.startsWith('sk_test_') ? 'test' : 'live', balance: balance.available });
  } catch (err) {
    return Response.json({ error: err.message, type: err.type });
  }
}
