'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#00BFA5'
const DARK_T = '#009688'
const LIGHT_T = '#e0f2f0'
const F = "'Outfit', system-ui, sans-serif"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (err) { setError(err.message); return }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #0a1929, #0f2137, #0d2a43, #112240)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 14s ease infinite',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: F,
    }}>
      <style>{`@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>

      <div style={{ marginBottom: 32, filter: 'drop-shadow(0 0 10px rgba(0,191,165,0.5))' }}>
        <ProdictaLogo textColor="#ffffff" size={44} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 72px rgba(0,0,0,0.45)', overflow: 'hidden',
      }}>
        <div style={{ padding: '32px 32px 28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: LIGHT_T, display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 18px',
              }}>
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={DARK_T} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: NAVY }}>Check your email</h1>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                We sent a password reset link to <strong>{email}</strong>. Check your inbox and click the link to reset your password.
              </p>
              <button
                onClick={() => router.push('/login')}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
                  color: '#fff', border: 'none', fontFamily: F, fontSize: 15,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: NAVY }}>Reset your password</h1>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                  borderRadius: 8, padding: '10px 13px', fontSize: 13, marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 13px',
                    border: `1.5px solid ${focused ? TEAL : '#d1d5db'}`,
                    borderRadius: 8, fontSize: 14, color: NAVY, background: '#fff',
                    outline: 'none', fontFamily: F,
                    boxShadow: focused ? `0 0 0 3px ${LIGHT_T}` : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: loading ? '#a8d5d4' : `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
                  color: '#fff', border: 'none', fontFamily: F, fontSize: 15,
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', padding: '0 32px 20px' }}>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', color: DARK_T, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            ← Back to sign in
          </button>
        </p>
      </div>
    </div>
  )
}
