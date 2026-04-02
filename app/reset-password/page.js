'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const DARK_T = '#009688'
const LIGHT_T = '#e0f2f0'
const F = "'Outfit', system-ui, sans-serif"

function PasswordInput({ label, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
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
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase emails a link with a code; the client SDK exchanges it for a session
  useEffect(() => {
    const supabase = createClient()
    // Listen for the PASSWORD_RECOVERY event which fires when user arrives via reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    // Also check if already signed in (handles page reload after following link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) { setError(err.message); return }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
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
          {done ? (
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
              <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: NAVY }}>Password updated</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Redirecting you to the dashboard…</p>
            </div>
          ) : !sessionReady ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Verifying your reset link…
              </div>
              <p style={{ fontSize: 12.5, color: '#9ca3af' }}>
                If nothing happens, <button onClick={() => router.push('/forgot-password')} style={{ background: 'none', border: 'none', color: DARK_T, cursor: 'pointer', fontSize: 12.5, fontFamily: F, fontWeight: 600 }}>request a new link</button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: NAVY }}>Set new password</h1>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>Choose a strong password for your account.</p>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                  borderRadius: 8, padding: '10px 13px', fontSize: 13, marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <PasswordInput label="New password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
              <PasswordInput label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: loading ? '#a8d5d4' : `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
                  color: '#fff', border: 'none', fontFamily: F, fontSize: 15,
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                }}
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
