'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'

// ── Inline style constants ──────────────────────────────────────────────────

const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const DARK_T = '#009688'
const LIGHT_T = '#e0f2f0'

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(-45deg, #0a1929, #0f2137, #0d2a43, #112240, #091624)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 14s ease infinite',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Outfit', system-ui, sans-serif",
  },

  // ── Logo / brand ──
  logoWrap: {
    marginBottom: '32px',
    textAlign: 'center',
    animation: 'fadeInUp 0.35s ease-out',
  },
  logoMark: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoSquare: {
    width: '38px',
    height: '38px',
    background: `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoSquareInner: {
    width: '16px',
    height: '16px',
    border: '2.5px solid #fff',
    borderRadius: '3px',
    position: 'relative',
  },
  logoText: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  },
  tagline: {
    marginTop: '12px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'Outfit', system-ui, sans-serif",
    textAlign: 'center',
    margin: '10px 0 0',
  },

  // ── Card ──
  card: {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 72px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1)',
    overflow: 'hidden',
    animation: 'fadeInUp 0.45s ease-out',
  },

  // ── Tabs ──
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e8edf2',
  },
  tab: (active) => ({
    flex: 1,
    padding: '16px 0',
    background: active ? '#ffffff' : '#f7f9fb',
    border: 'none',
    borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
    color: active ? NAVY : '#6b7280',
    fontFamily: "'Outfit', system-ui, sans-serif",
    letterSpacing: '0.01em',
    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
    marginBottom: '-1px',
  }),

  // ── Form body ──
  body: {
    padding: '32px 32px 28px',
  },

  heading: {
    fontSize: '20px',
    fontWeight: '700',
    color: NAVY,
    margin: '0 0 4px',
  },
  subheading: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 24px',
  },

  // ── Fields ──
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
    color: '#374151',
    marginBottom: '5px',
  },
  input: (focused) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 13px',
    border: `1.5px solid ${focused ? TEAL : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: NAVY,
    background: '#ffffff',
    outline: 'none',
    fontFamily: "'Outfit', system-ui, sans-serif",
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxShadow: focused ? `0 0 0 3px ${LIGHT_T}` : 'none',
  }),

  // ── Submit ──
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
    transition: 'opacity 0.15s, transform 0.1s',
  }),

  // ── Error / success banners ──
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '10px 13px',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  success: {
    background: LIGHT_T,
    border: `1px solid ${TEAL}`,
    color: DARK_T,
    borderRadius: '8px',
    padding: '10px 13px',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
    fontWeight: '500',
  },

  // ── Footer note ──
  footerNote: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '20px',
    padding: '0 32px 20px',
  },
}

// ── Tiny reusable input with focus state ──────────────────────────────────

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

// ── Logo mark (pure CSS/SVG-free) ────────────────────────────────────────

function Logo() {
  return (
    <div style={styles.logoWrap}>
      <div style={styles.logoMark}>
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(0,191,165,0.55)) drop-shadow(0 0 22px rgba(0,191,165,0.28))' }}>
          <ProdictaLogo textColor="#ffffff" size={52} />
        </div>
      </div>
      <p style={styles.tagline}>Pre-employment intelligence</p>
    </div>
  )
}

// ── Main page component ──────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('signin')   // 'signin' | 'signup'

  // Sign-in state
  const [siEmail, setSiEmail]       = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Sign-up state
  const [suCompany, setSuCompany]   = useState('')
  const [suEmail, setSuEmail]       = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suAccountType, setSuAccountType] = useState('employer')

  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  function resetMessages() {
    setError('')
    setSuccessMsg('')
  }

  function switchTab(t) {
    setTab(t)
    resetMessages()
  }

  // ── Sign in ──────────────────────────────────────────────────────────────

  async function handleSignIn(e) {
    e.preventDefault()
    resetMessages()

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

      // Upsert user record so we always have an up-to-date row
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

  // ── Sign up ──────────────────────────────────────────────────────────────

  async function handleSignUp(e) {
    e.preventDefault()
    resetMessages()

    if (!suCompany.trim()) {
      setError('Please enter your company name.')
      return
    }
    if (!suEmail || !suPassword) {
      setError('Please enter your email address and a password.')
      return
    }
    if (suPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: suEmail.trim(),
        password: suPassword,
        options: {
          data: { company_name: suCompany.trim() },
        },
      })

      if (authError) {
        setError(authError.message || 'Registration failed. Please try again.')
        return
      }

      // Insert into users table if we already have a session (email confirm disabled)
      if (data?.user) {
        await supabase.from('users').upsert(
          {
            id: data.user.id,
            email: data.user.email,
            company_name: suCompany.trim(),
            account_type: suAccountType,
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )

        // If a session was returned, email confirmation is off — go straight to dashboard
        if (data.session) {
          router.push('/dashboard')
          return
        }
      }

      setSuccessMsg(
        'Account created! Please check your email to confirm your address, then sign in.'
      )
      setSuCompany('')
      setSuEmail('')
      setSuPassword('')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <Logo />

      <div style={styles.card}>
        {/* Tab bar */}
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
          {/* ── Error / success banners ── */}
          {error      && <div role="alert" style={styles.error}>{error}</div>}
          {successMsg && <div role="status" style={styles.success}>{successMsg}</div>}

          {/* ── Sign in form ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate>
              <h1 style={styles.heading}>Welcome back</h1>

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

              <button
                type="submit"
                disabled={loading}
                style={styles.btn(loading)}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {/* ── Sign up form ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} noValidate>
              <h1 style={styles.heading}>Create your account</h1>

              <div style={styles.fieldGroup}>
                <Field
                  label="Company name"
                  id="su-company"
                  type="text"
                  value={suCompany}
                  onChange={e => setSuCompany(e.target.value)}
                  placeholder="Acme Ltd"
                  autoComplete="organization"
                />
                {/* Account type */}
                <div>
                  <label style={styles.label}>
                    Are you a direct employer or a recruitment agency?
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { value: 'employer', label: 'Direct Employer' },
                      { value: 'agency',   label: 'Recruitment Agency' },
                    ].map(opt => {
                      const active = suAccountType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSuAccountType(opt.value)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: `1.5px solid ${active ? TEAL : '#d1d5db'}`,
                            background: active ? LIGHT_T : '#f9fafb',
                            color: active ? DARK_T : '#6b7280',
                            fontFamily: "'Outfit', system-ui, sans-serif",
                            fontSize: 13.5,
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

                <Field
                  label="Work email address"
                  id="su-email"
                  type="email"
                  value={suEmail}
                  onChange={e => setSuEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  id="su-password"
                  type="password"
                  value={suPassword}
                  onChange={e => setSuPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={styles.btn(loading)}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}
        </div>

        <p style={styles.footerNote}>
          By continuing you agree to Prodicta's{' '}
          <a href="/terms" style={{ color: DARK_T, textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: DARK_T, textDecoration: 'none' }}>Privacy Policy</a>.
        </p>
      </div>
      <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', system-ui, sans-serif", textAlign: 'center' }}>
        © {new Date().getFullYear()} Prodicta. All rights reserved.
      </p>
    </div>
  )
}
