'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, { locale: 'en-GB' })

// ── Constants ──────────────────────────────────────────────────────────────

const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const DARK_T = '#009688'

const PLAN_OPTIONS = [
  { value: 'starter',      label: 'Starter',         price: '£99/month',  promo: '£49 first 30 days',  sub: 'Up to 2 users, 10 assessments per month' },
  { value: 'professional', label: 'Professional',    price: '£299/month', promo: '£149 first 30 days', sub: 'Up to 5 users, 30 assessments per month' },
  { value: 'business',     label: 'Business',        price: '£499/month', promo: '£249 first 30 days', sub: 'Up to 15 users, 100 assessments per month' },
]

// Per-assessment pricing. Unit price in GBP. Matches server CREDIT_PRICES.
const PAYG_ASSESSMENT_TYPES = [
  {
    id:          'rapid-screen',
    label:       'Rapid Screen',
    unitPrice:   6,
    duration:    '5-8 minutes, 1 scenario + prioritisation test',
    description: 'For high volume screening of operational roles',
  },
  {
    id:          'speed-fit',
    label:       'Speed-Fit',
    unitPrice:   18,
    duration:    '15 minutes, 2 scenarios',
    description: 'For urgent hires and high volume roles',
  },
  {
    id:          'depth-fit',
    label:       'Depth-Fit',
    unitPrice:   35,
    duration:    '25 minutes, 3 scenarios',
    description: 'For most roles',
  },
  {
    id:          'strategy-fit',
    label:       'Strategy-Fit',
    unitPrice:   65,
    duration:    '45 minutes, 4 scenarios + Workspace',
    description: 'For senior and high stakes hires',
  },
]

// Per-type cap. Mirrors MAX_QTY_PER_TYPE on the server. Higher quantities
// suggest a subscription is the right fit and are caught with a tooltip
// before the user can submit.
const PAYG_MAX_QTY_PER_TYPE = 50

function paygTotalQty(quantities) {
  return PAYG_ASSESSMENT_TYPES.reduce((sum, t) => sum + (quantities[t.id] || 0), 0)
}
function paygTotalGBP(quantities) {
  return PAYG_ASSESSMENT_TYPES.reduce((sum, t) => sum + ((quantities[t.id] || 0) * t.unitPrice), 0)
}
function paygPurchasesArray(quantities) {
  return PAYG_ASSESSMENT_TYPES
    .filter(t => (quantities[t.id] || 0) > 0)
    .map(t => ({ credit_type: t.id, quantity: quantities[t.id] }))
}


const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: NAVY,
      fontFamily: 'Outfit, system-ui, sans-serif',
      fontSize: '14px',
      '::placeholder': { color: '#94a1b3' },
    },
    invalid: { color: '#ef4444' },
  },
  hidePostalCode: true,
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(-45deg, #0f2137, #1a3a5c, #0a2a2e, #0f2137)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 12s ease infinite',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Outfit', system-ui, sans-serif",
  },
  logoWrap: {
    marginBottom: '32px',
    textAlign: 'center',
    animation: 'fadeInUp 0.35s ease-out',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 24px 72px rgba(0,0,0,0.45)',
    overflow: 'hidden',
    animation: 'fadeInUp 0.45s ease-out',
    position: 'relative',
    zIndex: 1,
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  tab: (active) => ({
    flex: 1,
    padding: '16px 0',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    border: 'none',
    borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
    fontFamily: "'Outfit', system-ui, sans-serif",
    letterSpacing: '0.01em',
    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
    marginBottom: '-1px',
  }),
  body: {
    padding: '32px 32px 28px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 4px',
  },
  subheading: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    margin: '0 0 24px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '5px',
  },
  input: (focused) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 13px',
    border: `1.5px solid ${focused ? TEAL : 'rgba(255,255,255,0.18)'}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: NAVY,
    background: 'rgba(255,255,255,0.92)',
    outline: 'none',
    fontFamily: "'Outfit', system-ui, sans-serif",
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focused ? '0 0 0 3px rgba(0,191,165,0.2)' : 'none',
  }),
  cardInput: (focused) => ({
    padding: '10px 13px',
    border: `1.5px solid ${focused ? TEAL : 'rgba(255,255,255,0.18)'}`,
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.92)',
    boxShadow: focused ? '0 0 0 3px rgba(0,191,165,0.2)' : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }),
  btn: (loading) => ({
    width: '100%',
    padding: '12px',
    background: loading
      ? '#a8d5d4'
      : `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: "'Outfit', system-ui, sans-serif",
    letterSpacing: '0.01em',
    transition: 'opacity 0.15s',
  }),
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#fca5a5',
    borderRadius: '8px',
    padding: '10px 13px',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '20px',
    padding: '0 32px 20px',
  },
}

// ── Shared components ──────────────────────────────────────────────────────

function Field({ label, id, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} style={styles.label}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input(focused)}
      />
    </div>
  )
}

function FloatingDots() {
  const dots = [
    { size: 5,  left: '8%',  delay: '0s',   dur: '14s', opacity: 0.14, color: TEAL   },
    { size: 3,  left: '22%', delay: '3s',   dur: '18s', opacity: 0.09, color: '#fff' },
    { size: 7,  left: '37%', delay: '6s',   dur: '12s', opacity: 0.12, color: TEAL   },
    { size: 4,  left: '52%', delay: '1.5s', dur: '20s', opacity: 0.08, color: '#fff' },
    { size: 6,  left: '67%', delay: '4s',   dur: '15s', opacity: 0.13, color: TEAL   },
    { size: 3,  left: '80%', delay: '7s',   dur: '16s', opacity: 0.08, color: '#fff' },
    { size: 5,  left: '92%', delay: '2s',   dur: '19s', opacity: 0.11, color: TEAL   },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: -20,
          left: d.left,
          width: d.size,
          height: d.size,
          borderRadius: '50%',
          background: d.color,
          opacity: d.opacity,
          ['--op']: d.opacity,
          animation: `pdFloatDot ${d.dur} linear ${d.delay} infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Sign-up form (must be inside <Elements> to use useStripe/useElements) ──

function SignUpForm() {
  const stripe   = useStripe()
  const elements = useElements()
  const router   = useRouter()

  const [company,     setCompany]     = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [accountType, setAccountType] = useState('employer')
  const [planPath,    setPlanPath]    = useState('monthly') // 'monthly' | 'payg'
  // Per-type quantities for the PAYG mixed cart. Each key is a credit_type id;
  // missing or zero values mean "not in the cart". Submit button is disabled
  // until at least one quantity is positive.
  const [quantities, setQuantities] = useState({
    'rapid-screen': 0,
    'speed-fit': 0,
    'depth-fit': 0,
    'strategy-fit': 0,
  })
  // Captured from the API response on successful payment so the success
  // screen can list what the candidate just bought (skipping zero rows).
  const [purchasedSummary, setPurchasedSummary] = useState(null)
  // Stripe idempotency key. Generated lazily on first render of this form
  // (SSR-safe: useState initialiser only runs on the client because the
  // file is 'use client'). Sent in the x-idempotency-key header on every
  // PAYG submit attempt; if the user retries after a network blip, the
  // same key is sent and Stripe deduplicates the PaymentIntent rather
  // than creating a duplicate charge.
  const [idempotencyKey] = useState(() => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
      return `payg-${globalThis.crypto.randomUUID()}`
    }
    return `payg-${Date.now()}-${Math.random().toString(36).slice(2)}`
  })
  // Synchronous double-click / double-submit guard. A ref (not state) so
  // the value is observable inside the same event tick before React has
  // had a chance to render the disabled-button state from setLoading(true).
  const submittingRef = useRef(false)
  const [plan,        setPlan]        = useState('professional')
  const [postcode,    setPostcode]    = useState('')
  const [promoCode,   setPromoCode]   = useState('')
  const [promoMessage,setPromoMessage]= useState('')
  const [cardFocused, setCardFocused] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    // Synchronous double-submit guard. setLoading(true) further down also
    // disables the button via the disabled prop, but React state updates
    // are batched and a fast double-click can re-enter this handler before
    // React has rendered the disabled state. The ref is observable in the
    // same tick. The finally block always unlocks; the top-of-handler
    // check is what blocks concurrent re-entry.
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      await runHandleSubmit(e)
    } finally {
      submittingRef.current = false
    }
  }

  async function runHandleSubmit(_e) {
    setError('')

    if (!company.trim())     { setError('Please enter your company name.'); return }
    if (!email.trim())       { setError('Please enter your email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

 // Pay-as-you-go, mixed-cart assessment credit purchase. Quantities object
    // is converted to a purchases array of { credit_type, quantity } that the
    // server normalises and prices.
    if (planPath === 'payg') {
      const purchases = paygPurchasesArray(quantities)
      if (purchases.length === 0) { setError('Add at least one assessment to continue.'); return }
      if (!stripe || !elements) { setError('Payment form is loading. Please wait a moment.'); return }
      const totalGBP = paygTotalGBP(quantities)

      // Safely parse a fetch response; surface server errors even when the
      // response isn't JSON (e.g. Vercel 500 HTML page).
      const readJson = async (res) => {
        let body = null
        try { body = await res.json() } catch { body = null }
        if (!res.ok && !body?.error) {
          body = { error: `Server returned ${res.status}. Please try again or contact support.` }
        }
        return body || {}
      }

      setLoading(true)
      try {
        const cardElement = elements.getElement(CardElement)
        const { error: pmErr, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            email: email.trim(),
            name: company.trim(),
          },
        })
        if (pmErr) { setError(pmErr.message || 'Card details invalid.'); setLoading(false); return }

        const res = await fetch('/api/billing/create-payg-with-bundle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            email:          email.trim(),
            password,
            companyName:    company.trim(),
            accountType,
            promoCode:      promoCode.trim() || null,
            paymentMethodId: paymentMethod.id,
            purchases,
          }),
        })
        const data = await readJson(res)
        if (data.error) {
          console.error('[signup] create-payg-with-bundle error', { step: data.step, error: data.error, status: res.status })
          setError(data.error); setLoading(false); return
        }

        if (data.requiresAction) {
          const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret)
          if (confirmErr) {
            console.error('[signup] confirmCardPayment error', confirmErr)
            setError(confirmErr.message || 'Card authentication failed. Please try again.')
            setLoading(false)
            return
          }
          if (paymentIntent?.status !== 'succeeded') {
            console.warn('[signup] SCA did not succeed', { status: paymentIntent?.status })
            setError('Card authentication was not completed. Please try again.')
            setLoading(false)
            return
          }
          const confirmRes = await fetch('/api/billing/confirm-payg-bundle', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-idempotency-key': idempotencyKey,
            },
            body: JSON.stringify({
              paymentIntentId: data.paymentIntentId,
              email:           email.trim(),
              password,
              companyName:     company.trim(),
              accountType,
              promoCode:       promoCode.trim() || null,
              purchases,
            }),
          })
          const confirmData = await readJson(confirmRes)
          if (confirmData.error) {
            console.error('[signup] confirm-payg-bundle error', { step: confirmData.step, error: confirmData.error, status: confirmRes.status })
            setError(confirmData.error); setLoading(false); return
          }
          if (confirmData.promoMessage) setPromoMessage(confirmData.promoMessage)
          setPurchasedSummary(confirmData.purchases || purchases)
          setDone(true)
          return
        }

        if (data.promoMessage) setPromoMessage(data.promoMessage)
        setPurchasedSummary(data.purchases || purchases)
        setDone(true)
      } catch (err) {
        console.error('[signup] payg flow threw', err)
        setError(err?.message || 'An unexpected error occurred. Please try again.')
        setLoading(false)
      }
      return
    }

    if (!postcode.trim())    { setError('Please enter your postcode.'); return }
    if (!stripe || !elements) { setError('Payment form is loading. Please wait a moment.'); return }

    setLoading(true)
    try {
      const cardElement = elements.getElement(CardElement)
      let paymentMethod
      try {
        const result = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            email: email.trim(),
            name: company.trim(),
            address: { postal_code: postcode.trim(), country: 'GB' },
          },
        })
        if (result.error) {
          setError(`createPaymentMethod error: ${result.error.message} [${result.error.type || 'unknown'} / ${result.error.code || 'unknown'}]`)
          setLoading(false)
          return
        }
        paymentMethod = result.paymentMethod
      } catch (pmEx) {
        setError(`createPaymentMethod threw: ${pmEx?.message || String(pmEx)}`)
        setLoading(false)
        return
      }

      // Step 1: Create the Stripe subscription
      const res  = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:           email.trim(),
          password,
          companyName:     company.trim(),
          accountType,
          plan,
          paymentMethodId: paymentMethod.id,
          promoCode:       promoCode.trim() || null,
        }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      // Step 2: If 3D Secure / SCA is required, open the authentication popup
      if (data.requiresAction) {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret)

        if (confirmError) {
          setError(confirmError.message || 'Card authentication failed. Please try again.')
          setLoading(false)
          return
        }

        if (paymentIntent?.status !== 'succeeded') {
          setError('Card authentication was not completed. Please try again.')
          setLoading(false)
          return
        }

 // Step 3: Authentication passed, complete account creation on the server
        const confirmRes  = await fetch('/api/billing/confirm-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptionId: data.subscriptionId,
            email:          email.trim(),
            password,
            companyName:    company.trim(),
            accountType,
            plan,
            promoCode:      promoCode.trim() || null,
          }),
        })
        const confirmData = await confirmRes.json()

        if (confirmData.error) {
          setError(confirmData.error)
          setLoading(false)
          return
        }

        if (confirmData.promoMessage) setPromoMessage(confirmData.promoMessage)
        setDone(true)
        return
      }

      if (data.promoMessage) setPromoMessage(data.promoMessage)
      // Payment succeeded without SCA
      setDone(true)
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (done) {
    const summary = Array.isArray(purchasedSummary) ? purchasedSummary.filter(p => (p?.quantity || 0) > 0) : []
    return (
      <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(0,191,165,0.15)',
          border: '2px solid rgba(0,191,165,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
          {summary.length > 0 ? 'Welcome to PRODICTA' : 'Check your email'}
        </h2>
        {summary.length > 0 && (
          <div style={{
            margin: '0 auto 16px',
            maxWidth: 320,
            padding: '14px 16px',
            borderRadius: 10,
            background: 'rgba(0,191,165,0.10)',
            border: '1px solid rgba(0,191,165,0.3)',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: TEAL, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              You have:
            </p>
            {summary.map(p => {
              const meta = PAYG_ASSESSMENT_TYPES.find(t => t.id === p.credit_type)
              const label = meta?.label || p.credit_type
              return (
                <div key={p.credit_type} style={{ fontSize: 13.5, color: '#fff', lineHeight: 1.7 }}>
                  {label} credits: <strong>{p.quantity}</strong>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65 }}>
          We have sent a verification link to{' '}
          <strong style={{ color: '#fff' }}>{email}</strong>.
          Click it to activate your account, then sign in.
        </p>
        {promoMessage && (
          <p style={{ fontSize: 13, color: TEAL, margin: '14px 0 0', lineHeight: 1.6, fontWeight: 600 }}>
            {promoMessage}
          </p>
        )}
      </div>
    )
  }

  const planPrice = PLAN_OPTIONS.find(p => p.value === plan)?.price || ''

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 style={styles.heading}>Create your account</h1>
      <p style={styles.subheading}>
        {planPath === 'payg'
          ? 'One-off payment. Credits do not expire.'
          : 'Payment taken now. Cancel any time.'}
      </p>

      {error && <div role="alert" style={styles.error}>{error}</div>}

      <div style={styles.fieldGroup}>
        <Field
          label="Company name"
          id="su-company"
          value={company}
          onChange={e => setCompany(e.target.value)}
          placeholder="Acme Ltd"
          autoComplete="organization"
        />

        <div>
          <label style={styles.label}>Account type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'employer', label: 'HR & Direct Employer' },
              { value: 'agency',   label: 'Recruitment Agency'   },
            ].map(opt => {
              const active = accountType === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccountType(opt.value)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1.5px solid ${active ? TEAL : 'rgba(255,255,255,0.18)'}`,
                    background: active ? 'rgba(0,191,165,0.15)' : 'rgba(255,255,255,0.06)',
                    color: active ? TEAL : 'rgba(255,255,255,0.55)',
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label style={styles.label}>How would you like to pay?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { value: 'monthly', label: 'Monthly subscription', sub: 'Includes assessments each month' },
              { value: 'payg',    label: 'Pay as you go',        sub: 'No monthly fee, pay per assessment' },
            ].map(opt => {
              const active = planPath === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlanPath(opt.value)}
                  style={{
                    padding: '11px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${active ? TEAL : 'rgba(255,255,255,0.18)'}`,
                    background: active ? 'rgba(0,191,165,0.15)' : 'rgba(255,255,255,0.06)',
                    color: active ? TEAL : 'rgba(255,255,255,0.6)',
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{opt.sub}</div>
                </button>
              )
            })}
          </div>
        </div>

        {planPath === 'monthly' && (
          <div>
            <label style={styles.label}>Choose your plan</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PLAN_OPTIONS.map(opt => {
                const active = plan === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlan(opt.value)}
                    style={{
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: `1.5px solid ${active ? TEAL : 'rgba(255,255,255,0.18)'}`,
                      background: active ? 'rgba(0,191,165,0.15)' : 'rgba(255,255,255,0.06)',
                      color: active ? TEAL : 'rgba(255,255,255,0.55)',
                      fontFamily: "'Outfit', system-ui, sans-serif",
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 1 }}>{opt.price}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {planPath === 'payg' && (() => {
          const totalQty = paygTotalQty(quantities)
          const totalGBP = paygTotalGBP(quantities)
          const setQty = (id, next) => {
            const clamped = Math.max(0, Math.min(PAYG_MAX_QTY_PER_TYPE, parseInt(next, 10) || 0))
            setQuantities(prev => ({ ...prev, [id]: clamped }))
          }
          return (
            <div>
              <label style={styles.label}>Choose your assessments</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {PAYG_ASSESSMENT_TYPES.map(t => {
                  const qty = quantities[t.id] || 0
                  const subtotal = qty * t.unitPrice
                  const atMax = qty >= PAYG_MAX_QTY_PER_TYPE
                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: `1.5px solid ${qty > 0 ? TEAL : 'rgba(255,255,255,0.18)'}`,
                        background: qty > 0 ? 'rgba(0,191,165,0.10)' : 'rgba(255,255,255,0.06)',
                        fontFamily: "'Outfit', system-ui, sans-serif",
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{t.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>£{t.unitPrice} each</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>{t.duration}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>{t.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            aria-label={`Decrease ${t.label}`}
                            onClick={() => setQty(t.id, qty - 1)}
                            disabled={qty <= 0}
                            style={{
                              width: 44, height: 44, minWidth: 44, borderRadius: 8,
                              border: `1.5px solid rgba(255,255,255,0.25)`,
                              background: qty <= 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)',
                              color: qty <= 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                              fontSize: 20, fontWeight: 700, cursor: qty <= 0 ? 'not-allowed' : 'pointer',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                          >−</button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={PAYG_MAX_QTY_PER_TYPE}
                            step={1}
                            value={qty}
                            onChange={e => setQty(t.id, e.target.value)}
                            aria-label={`${t.label} quantity`}
                            style={{
                              width: 64, height: 44, borderRadius: 8,
                              border: '1.5px solid rgba(255,255,255,0.25)',
                              background: 'rgba(255,255,255,0.06)',
                              color: '#fff', fontFamily: "'Outfit', system-ui, sans-serif",
                              fontSize: 16, fontWeight: 700, textAlign: 'center', outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${t.label}`}
                            onClick={() => setQty(t.id, qty + 1)}
                            disabled={atMax}
                            title={atMax ? 'Maximum 50 per assessment type. Need more? Contact us about a subscription.' : undefined}
                            style={{
                              width: 44, height: 44, minWidth: 44, borderRadius: 8,
                              border: `1.5px solid ${atMax ? 'rgba(255,255,255,0.18)' : TEAL}`,
                              background: atMax ? 'rgba(255,255,255,0.04)' : 'rgba(0,191,165,0.18)',
                              color: atMax ? 'rgba(255,255,255,0.3)' : TEAL,
                              fontSize: 20, fontWeight: 700, cursor: atMax ? 'not-allowed' : 'pointer',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                          >+</button>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: qty > 0 ? TEAL : 'rgba(255,255,255,0.55)' }}>
                          {qty > 0 ? `${t.label} × ${qty} = £${subtotal}` : 'Not in cart'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{
                marginTop: 14, padding: '14px 16px', borderRadius: 10,
                background: totalQty > 0 ? 'rgba(0,191,165,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${totalQty > 0 ? 'rgba(0,191,165,0.4)' : 'rgba(255,255,255,0.12)'}`,
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontSize: 14, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <span style={{ fontWeight: 600, color: totalQty > 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                  {totalQty === 0 ? 'Add at least one assessment to continue' : `${totalQty} assessment${totalQty === 1 ? '' : 's'}`}
                </span>
                <strong style={{ color: TEAL, fontSize: 18 }}>Total: £{totalGBP}</strong>
              </div>
            </div>
          )
        })()}

        <Field
          label="Work email"
          id="su-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          id="su-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />

        {(planPath === 'monthly' || (planPath === 'payg' && paygTotalQty(quantities) > 0)) && (
          <div>
            <label style={styles.label}>Card details</label>
            <div style={styles.cardInput(cardFocused)}>
              <CardElement
                options={CARD_ELEMENT_OPTIONS}
                onFocus={() => setCardFocused(true)}
                onBlur={() => setCardFocused(false)}
              />
            </div>
          </div>
        )}

        {planPath === 'monthly' && (
          <Field
            label="Postcode"
            id="su-postcode"
            value={postcode}
            onChange={e => setPostcode(e.target.value)}
            placeholder="SW1A 1AA"
            autoComplete="postal-code"
          />
        )}

        <Field
          label="Promo code (optional)"
          id="su-promo"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Enter promo code"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !stripe || (planPath === 'payg' && paygTotalQty(quantities) === 0)}
        style={styles.btn(loading)}
      >
        {(() => {
          if (loading) return 'Processing...'
          if (planPath === 'payg') {
            const totalGBP = paygTotalGBP(quantities)
            if (totalGBP === 0) return 'Add at least one assessment to continue'
            return `Create account and pay £${totalGBP}`
          }
          return `Create account and pay ${planPrice}`
        })()}
      </button>
    </form>
  )
}

// ── Inner page (uses useRouter, must be inside <Elements> wrapper) ────────

function LoginPageInner() {
  const router = useRouter()
  const [tab, setTab]             = useState('signin')
  const [siEmail, setSiEmail]     = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function switchTab(t) {
    setTab(t)
    setError('')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')

    if (!siEmail || !siPassword) {
      setError('Please enter your email address and password.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: siEmail.trim(),
        password: siPassword,
      })

      if (authError) {
        setError(authError.message || 'Sign-in failed. Please check your credentials.')
        return
      }

      if (data?.user) {
        await supabase.from('users').upsert(
          { id: data.user.id, email: data.user.email },
          { onConflict: 'id', ignoreDuplicates: false }
        )
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pdFloatDot {
          0%   { transform: translateY(0) scale(1);       opacity: var(--op, 0.1); }
          50%  { transform: translateY(-55vh) scale(1.1); opacity: calc(var(--op, 0.1) * 0.5); }
          100% { transform: translateY(-110vh) scale(0.8); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <FloatingDots />

      <div style={{ ...styles.logoWrap }}>
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(0,191,165,0.55)) drop-shadow(0 0 22px rgba(0,191,165,0.28))' }}>
          <ProdictaLogo textColor="#ffffff" size={52} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tabBar}>
          <button
            type="button"
            style={styles.tab(tab === 'signin')}
            onClick={() => switchTab('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            style={styles.tab(tab === 'signup')}
            onClick={() => switchTab('signup')}
          >
            Create account
          </button>
        </div>

        <div style={styles.body}>
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate>
              <h1 style={styles.heading}>Welcome back</h1>

              {error && <div role="alert" style={styles.error}>{error}</div>}

              <div style={styles.fieldGroup}>
                <Field
                  label="Email address"
                  id="si-email"
                  type="email"
                  value={siEmail}
                  onChange={e => setSiEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  id="si-password"
                  type="password"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => router.push('/forgot-password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: TEAL,
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={styles.btn(loading)}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {tab === 'signup' && <SignUpForm />}
        </div>

        {tab === 'signin' && (
          <div style={{ padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: "'Outfit', system-ui, sans-serif", whiteSpace: 'nowrap' }}>
                or explore first
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>
            <button
              onClick={() => router.push('/demo')}
              style={{
                width: '100%',
                padding: '11px 20px',
                background: 'rgba(0,191,165,0.08)',
                border: '1.5px solid rgba(0,191,165,0.35)',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: "'Outfit', system-ui, sans-serif",
                fontSize: 13.5,
                fontWeight: 700,
                color: '#00BFA5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s, border-color 0.15s',
                marginBottom: 20,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,191,165,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,191,165,0.6)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,191,165,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,191,165,0.35)' }}
            >
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#00BFA5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={10} />
                <polygon points="10 8 16 12 10 16 10 8" fill="#00BFA5" stroke="none" />
              </svg>
              Try Demo, no account needed
            </button>
          </div>
        )}

        <p style={styles.footerNote}>
          By continuing you agree to Prodicta's{' '}
          <a href="/terms" style={{ color: DARK_T, textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: DARK_T, textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>

      <div style={{ marginTop: 28, textAlign: 'center', fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          &copy; 2026 PRODICTA. All rights reserved.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '4px 0 0' }}>
          Powered by AIAURA Group Ltd
        </p>
      </div>
    </div>
  )
}

// ── Default export: wrap everything in <Elements> ─────────────────────────

export default function LoginPage() {
  return (
    <Elements stripe={stripePromise} options={{ locale: 'en-GB' }}>
      <LoginPageInner />
    </Elements>
  )
}
