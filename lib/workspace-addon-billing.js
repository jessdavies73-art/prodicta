// Subscription Workspace add-on billing helper.
//
// PAYG buyers purchase the £25 Immersive add-on as a one-off via the
// existing /api/stripe/credit-bundle Checkout flow; that path is
// unchanged. This helper handles the subscription parallel: when a
// Starter / Professional / Business subscriber toggles Workspace
// simulation on for a Speed-Fit or Depth-Fit assessment, we attach a
// £25 invoice item to the customer's next subscription invoice using
// stripe.invoiceItems.create with the `subscription` parameter. Stripe
// settles it on the next monthly billing cycle alongside the
// subscription fee.
//
// The function returns:
//   { invoice_item_id, amount_pence, currency, description }
// on success, or null when:
//   - the customer or subscription parameters are missing (no charge made)
//   - Stripe rejects the call (the error is logged; caller decides
//     whether to roll back the workspace_addon_purchased state)
//
// Caller responsibilities:
//   - Skip this helper for Strategy-Fit assessments (Workspace is
//     included in the Strategy-Fit assessment cost, no add-on charge).
//   - Skip for PAYG users (they buy Immersive credits separately).
//   - Verify the user has an active subscription before calling; if
//     subscriptionId is null this helper returns null without
//     pretending a charge was made.

import { getStripeClient, WORKSPACE_ADDON_PRICE_PENCE } from './stripe.js'

const ADDON_CURRENCY = 'gbp'

function buildDescription({ candidateName, roleTitle, assessmentId }) {
  const candidate = (candidateName || '').toString().trim().slice(0, 60)
  const role = (roleTitle || '').toString().trim().slice(0, 80)
  if (candidate && role) return `Workspace simulation: ${candidate}, ${role}`
  if (candidate) return `Workspace simulation: ${candidate}`
  if (role) return `Workspace simulation: ${role}`
  return assessmentId
    ? `Workspace simulation (assessment ${String(assessmentId).slice(0, 8)})`
    : 'Workspace simulation add-on'
}

export async function addWorkspaceAddonToSubscription({
  customerId,
  subscriptionId,
  assessmentId,
  candidateName,
  roleTitle,
  metadata: extraMetadata,
} = {}) {
  // Defensive: a missing customer or subscription means we cannot
  // attribute the charge correctly. Return null rather than risk
  // billing the wrong account or creating an orphan invoice item.
  if (!customerId || !subscriptionId) {
    console.warn('[workspace-addon-billing] missing customer or subscription id; no charge made', {
      assessmentId, hasCustomer: !!customerId, hasSubscription: !!subscriptionId,
    })
    return null
  }

  const description = buildDescription({ candidateName, roleTitle, assessmentId })
  const metadata = {
    addon_type: 'workspace_simulation',
    assessment_id: assessmentId ? String(assessmentId) : '',
    candidate_name: candidateName ? String(candidateName).slice(0, 60) : '',
    role_title: roleTitle ? String(roleTitle).slice(0, 80) : '',
    ...(extraMetadata && typeof extraMetadata === 'object' ? extraMetadata : {}),
  }

  const stripe = getStripeClient()
  let item
  try {
    item = await stripe.invoiceItems.create({
      customer: customerId,
      // Attaching to a subscription means this item lands on the next
      // upcoming subscription invoice rather than a separate one-off
      // invoice. The subscription fee plus any add-on items bill in
      // one statement.
      subscription: subscriptionId,
      amount: WORKSPACE_ADDON_PRICE_PENCE,
      currency: ADDON_CURRENCY,
      description,
      metadata,
    })
  } catch (err) {
    console.error('[workspace-addon-billing] invoiceItems.create failed', {
      assessmentId, message: err?.message,
    })
    return null
  }

  return {
    invoice_item_id: item.id,
    amount_pence: WORKSPACE_ADDON_PRICE_PENCE,
    currency: ADDON_CURRENCY,
    description,
  }
}
