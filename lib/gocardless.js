// GoCardless client factory and plan constants
// Uses require() inside function to handle CJS module in Next.js ESM context

export const PLAN_AMOUNTS = {
  starter:  4900,
  growth:   9900,
  scale:    12000,
  founding: 7900,
}

export const PLAN_LABELS = {
  starter:  'Starter',
  growth:   'Growth',
  scale:    'Scale',
  founding: 'Founding',
}

export const PLAN_DISPLAY_PRICES = {
  starter:  '£49/month',
  growth:   '£99/month',
  scale:    '£120/month',
  founding: '£79/month',
}

export function createGoCardlessClient() {
  const { GoCardlessClient, Environments } = require('gocardless-nodejs')
  const token = process.env.GOCARDLESS_ACCESS_TOKEN
  const environment = process.env.GOCARDLESS_ENVIRONMENT === 'live'
    ? Environments.Live
    : Environments.Sandbox
  return new GoCardlessClient(token, environment)
}
