'use client'
import { useState } from 'react'
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
  { value: 'starter',  label: 'Starter',  price: '£49/month'  },
  { value: 'growth',   label: 'Growth',   price: '£99/month'  },
  { value: 'scale',    label: 'Scale',    price: '£120/month' },
  { value: 'founding', label: 'Founding', price: '£79/month'  },
]

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
          animation: `floatDot ${d.dur} linear ${d.delay} infinite`,
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
  const [plan,        setPlan]        = useState('growth')
  const [postcode,    setPostcode]    = useState('')
  const [cardFocused, setCardFocused] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!company.trim())     { setError('Please enter your company name.'); return }
    if (!email.trim())       { setError('Please enter your email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!postcode.trim())    { setError('Please enter your postcode.'); return }
    if (!stripe || !elements) { setError('Payment form is loading. Please wait a moment.'); return }

    setLoading(true)
    try {
      const cardElement = elements.getElement(CardElement)
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: email.trim(),
          name: company.trim(),
          address: { postal_code: postcode.trim(), country: 'GB' },
        },
      })

      if (pmError) {
        setError(pmError.message)
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
        }),
      })
      const data = await res.json()

      if (data.error) {
        setError(`${data.error} [step: ${data.step}]`)
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

        // Step 3: Authentication passed — complete account creation on the server
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
          }),
        })
        const confirmData = await confirmRes.json()

        if (confirmData.error) {
          setError(confirmData.error)
          setLoading(false)
          return
        }

        setDone(true)
        return
      }

      // Payment succeeded without SCA
      setDone(true)
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (done) {
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
          Check your email
        </h2>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65 }}>
          We have sent a verification link to{' '}
          <strong style={{ color: '#fff' }}>{email}</strong>.
          Click it to activate your account, then sign in.
        </p>
      </div>
    )
  }

  const planPrice = PLAN_OPTIONS.find(p => p.value === plan)?.price || ''

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 style={styles.heading}>Create your account</h1>
      <p style={styles.subheading}>Payment taken now. Cancel any time.</p>

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
              { value: 'employer', label: 'Direct Employer'      },
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

        <Field
          label="Postcode"
          id="su-postcode"
          value={postcode}
          onChange={e => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          autoComplete="postal-code"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        style={styles.btn(loading)}
      >
        {loading ? 'Processing...' : `Create account and pay ${planPrice}`}
      </button>
    </form>
  )
}

// ── Inner page (uses useRouter — must be inside <Elements> wrapper) ────────

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
        @keyframes floatDot {
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

      <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', system-ui, sans-serif", textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} Prodicta. All rights reserved.
      </p>
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
