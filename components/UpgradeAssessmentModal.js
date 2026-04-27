'use client'
import { useState } from 'react'

// Shared modal for the PAYG "upgrade to a higher tier by paying the difference"
// flow. Used by /assessment/new (when the user picks a mode they don't already
// hold credits for) and the candidate report page's "Upgrade to Speed-Fit"
// button. Posts to /api/billing/upgrade-assessment, which returns a Stripe
// Checkout URL for the diff-only charge; we redirect the browser there.
//
// Props:
// open , boolean
// fromType , 'rapid-screen' | 'speed-fit' | 'depth-fit' | 'strategy-fit'
// toType , same set, must be strictly higher tier than fromType
// assessmentId , optional; if passed the server upgrades the existing
//                    assessment row to the new mode
// onClose , called when the user clicks Cancel / Keep
// onConfirmed , optional callback fired before the browser redirect

const CREDIT_PRICES = { 'rapid-screen': 6, 'speed-fit': 18, 'depth-fit': 35, 'strategy-fit': 65 }
const LABELS = { 'rapid-screen': 'Rapid Screen', 'speed-fit': 'Speed-Fit', 'depth-fit': 'Depth-Fit', 'strategy-fit': 'Strategy-Fit' }
const DESCRIPTIONS = {
  'speed-fit':    '2 work scenarios, a full scored report with strengths, watch-outs, Week 1 interventions, skills breakdown, and interview brief.',
  'depth-fit':    '2 work scenarios, a full narrative report, detailed competency breakdown, Monday Morning Reality, counter-offer resilience score, and tailored coaching notes.',
  'strategy-fit': 'A 45 minute deep assessment with 4 work scenarios, a Day 1 workspace simulation, full narrative report, Strategic Thinking Evaluation, and Executive Summary.',
}

export default function UpgradeAssessmentModal({ open, fromType, toType, assessmentId, onClose, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !toType) return null
  // fromType is optional. When null we render a "buy one credit outright" flow;
  // otherwise the diff-price upgrade flow.
  const isPurchase = !fromType
  const fromPrice = fromType ? (CREDIT_PRICES[fromType] || 0) : 0
  const toPrice   = CREDIT_PRICES[toType]   || 0
  const payAmount = isPurchase ? toPrice : (toPrice - fromPrice)
  if (payAmount <= 0) return null

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    try {
      // Purchase: hit the generic per-unit credit route. Upgrade: hit the
      // diff-only route that also bumps the assessment mode on webhook.
      const res = isPurchase
        ? await fetch('/api/stripe/credit-bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credit_type: toType, quantity: 1 }),
          })
        : await fetch('/api/billing/upgrade-assessment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from_type: fromType, to_type: toType, assessment_id: assessmentId || null }),
          })
      const body = await res.json()
      if (body?.url) {
        if (onConfirmed) onConfirmed()
        window.location.href = body.url
        return
      }
      throw new Error(body?.error || 'Could not start checkout.')
    } catch (err) {
      setError(err?.message || 'Could not start checkout. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={() => !submitting && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(15,33,55,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
          maxWidth: 460, width: '100%', boxShadow: '0 24px 72px rgba(0,0,0,0.25)',
          fontFamily: "'Outfit', system-ui, sans-serif",
        }}
      >
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f2137', margin: '0 0 12px', letterSpacing: '-0.2px' }}>
          {isPurchase ? `Buy a ${LABELS[toType]} credit` : `Upgrade to ${LABELS[toType]}`}
        </h3>
        {!isPurchase && (
          <p style={{ fontSize: 13.5, color: '#5e6b7f', margin: '0 0 12px', lineHeight: 1.6 }}>
            You currently have {LABELS[fromType]} credits (£{fromPrice} each).
          </p>
        )}
        <p style={{ fontSize: 13.5, color: '#5e6b7f', margin: '0 0 14px', lineHeight: 1.6 }}>
          {LABELS[toType]} gives you {DESCRIPTIONS[toType] || 'the full report at this tier.'}
        </p>
        <p style={{ fontSize: 14, color: '#0f2137', margin: '0 0 20px', lineHeight: 1.6, fontWeight: 600 }}>
          {isPurchase
            ? <>Buy <strong style={{ color: '#00BFA5' }}>1 {LABELS[toType]} credit</strong> for <strong style={{ color: '#00BFA5' }}>£{payAmount}</strong>.</>
 : <>Pay just <strong style={{ color: '#00BFA5' }}>£{payAmount}</strong>, the difference in price.</>
          }
        </p>
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
            borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13,
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={submitting}
            style={{
              fontSize: 13.5, fontWeight: 700, color: '#0f2137',
              background: 'transparent', border: '1.5px solid #0f2137',
              padding: '10px 18px', borderRadius: 8, cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {isPurchase ? 'Cancel' : `Keep ${LABELS[fromType]}`}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              fontSize: 13.5, fontWeight: 800, color: '#0f2137',
              background: '#00BFA5', border: 'none',
              padding: '10px 20px', borderRadius: 8,
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? 'Redirecting…'
              : isPurchase
 ? `Buy 1 ${LABELS[toType]} credit, £${payAmount}`
                : `Pay £${payAmount} and upgrade`}
          </button>
        </div>
      </div>
    </div>
  )
}
