'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'

// ── Constants ──────────────────────────────────────────────────────────────

const TEAL   = '#00BFA5'
const DARK_T = '#009688'

// ── Floating background dots ───────────────────────────────────────────────

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

// ── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.12)',
        borderTopColor: TEAL,
        animation: 'spin 0.75s linear infinite',
        margin: '0 auto 16px',
      }} />
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        Confirming your email...
      </p>
    </div>
  )
}

// ── Inner component (uses useSearchParams, must be inside Suspense) ───────

function ConfirmationHandler() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus]   = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function confirm() {
      const tokenHash = searchParams.get('token_hash')
      const type      = searchParams.get('type')

      if (!tokenHash || !type) {
        setErrorMsg('This confirmation link is invalid or incomplete. Please request a new verification email.')
        setStatus('error')
        return
      }

      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

      if (error) {
        const msg = error.message || ''
        if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
          setErrorMsg('This confirmation link has expired. Please sign up again or contact support.')
        } else {
          setErrorMsg(msg || 'Confirmation failed. Please try again or contact support at hello@prodicta.co.uk.')
        }
        setStatus('error')
        return
      }

      // Sign out so the user goes through a clean sign-in flow
      await supabase.auth.signOut()
      setStatus('success')
    }

    confirm()
  }, [])

  return (
    <div style={{
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
    }}>
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <FloatingDots />

      {/* Logo */}
      <div style={{
        marginBottom: 32,
        animation: 'fadeInUp 0.35s ease-out',
        position: 'relative',
        zIndex: 1,
        filter: 'drop-shadow(0 0 10px rgba(0,191,165,0.55)) drop-shadow(0 0 22px rgba(0,191,165,0.28))',
      }}>
        <ProdictaLogo textColor="#ffffff" size={52} />
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 420,
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 24px 72px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.45s ease-out',
        position: 'relative',
        zIndex: 1,
        padding: '40px 32px 36px',
      }}>
        {status === 'loading' && <Spinner />}

        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            {/* Checkmark icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(0,191,165,0.12)',
              border: `2px solid rgba(0,191,165,0.45)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 10px',
              letterSpacing: '-0.2px',
            }}>
              Email confirmed
            </h1>

            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
              margin: '0 0 28px',
              lineHeight: 1.65,
            }}>
              Welcome to PRODICTA. You can now sign in to your account.
            </p>

            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '12px',
                background: `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', system-ui, sans-serif",
                letterSpacing: '0.01em',
                transition: 'opacity 0.15s',
              }}
            >
              Sign in
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            {/* Error icon */}
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '2px solid rgba(239,68,68,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 10px',
            }}>
              Confirmation failed
            </h1>

            <p style={{
              fontSize: 13.5,
              color: 'rgba(255,255,255,0.55)',
              margin: '0 0 28px',
              lineHeight: 1.65,
            }}>
              {errorMsg}
            </p>

            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', system-ui, sans-serif",
                letterSpacing: '0.01em',
                transition: 'background 0.15s',
              }}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 28,
        fontFamily: "'Outfit', system-ui, sans-serif",
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
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

// ── Default export: Suspense wrapper required for useSearchParams ──────────

export default function AuthConfirmedPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#0f2137',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.12)',
          borderTopColor: '#00BFA5',
          animation: 'spin 0.75s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ConfirmationHandler />
    </Suspense>
  )
}
