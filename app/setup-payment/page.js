'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#00BFA5'
const DARK_T = '#009688'

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
          position: 'absolute', bottom: -20, left: d.left,
          width: d.size, height: d.size, borderRadius: '50%',
          background: d.color, opacity: d.opacity,
          animation: `floatDot ${d.dur} linear ${d.delay} infinite`,
        }} />
      ))}
    </div>
  )
}

export default function SetupPaymentPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [completing, setCompleting] = useState(false)
  const [flowId, setFlowId]         = useState(null)
  const [environment, setEnvironment] = useState('SANDBOX')
  const [planLabel, setPlanLabel]   = useState('')
  const [planPrice, setPlanPrice]   = useState('')
  const scriptReadyRef              = useRef(false)

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const res = await fetch('/api/billing/create-checkout', { method: 'POST' })
        const data = await res.json()

        if (data.alreadyActive) {
          router.push('/dashboard')
          return
        }
        if (data.error) throw new Error(data.error)

        setFlowId(data.flowId)
        setEnvironment(data.environment || 'SANDBOX')
        setPlanLabel(data.planLabel)
        setPlanPrice(data.planPrice)
        setLoading(false)

        // Load GoCardless Drop-in script
        if (!document.getElementById('gc-dropin')) {
          const script = document.createElement('script')
          script.id  = 'gc-dropin'
          script.src = 'https://pay.gocardless.com/billing/static/dropin/v2/initialise.js'
          script.async = true
          script.onload = () => { scriptReadyRef.current = true }
          document.head.appendChild(script)
        } else {
          scriptReadyRef.current = true
        }
      } catch (err) {
        setError(err.message || 'Something went wrong. Please refresh and try again.')
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleOpenDropin() {
    if (!flowId) { setError('Payment form is not ready yet. Please wait a moment.'); return }
    if (!scriptReadyRef.current || !window.GoCardlessDropin) {
      setError('Payment form is still loading. Please wait a moment and try again.')
      return
    }

    setError('')

    const dropin = window.GoCardlessDropin.create({
      billingRequestFlowID: flowId,
      environment,
      onSuccess: async (billingRequest) => {
        setCompleting(true)
        try {
          const res = await fetch('/api/billing/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billingRequestId: billingRequest.id }),
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)

          // Refresh session so middleware reads the updated app_metadata
          const supabase = createClient()
          await supabase.auth.refreshSession()
          router.push('/dashboard')
        } catch (err) {
          setError(err.message || 'Payment confirmation failed. Please contact support at hello@prodicta.co.uk.')
          setCompleting(false)
        }
      },
      onExit: (err) => {
        if (err) setError('Payment setup was cancelled. Please try again when you are ready.')
      },
    })

    dropin.open()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #0a1929, #0f2137, #0d2a43, #112240, #091624)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 14s ease infinite',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
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
        @keyframes floatDot {
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
        marginBottom: 32, textAlign: 'center',
        animation: 'fadeInUp 0.35s ease-out', position: 'relative', zIndex: 1,
      }}>
        <div style={{ filter: 'drop-shadow(0 0 10px rgba(0,191,165,0.55)) drop-shadow(0 0 22px rgba(0,191,165,0.28))' }}>
          <ProdictaLogo textColor="#ffffff" size={52} />
        </div>
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
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ padding: '32px 32px 28px' }}>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            Set up your subscription
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 26px' }}>
            Your account is ready. Complete Direct Debit setup to get started.
          </p>

          {error && (
            <div role="alert" style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5',
              borderRadius: 8,
              padding: '10px 13px',
              fontSize: 13,
              marginBottom: 20,
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Plan summary block */}
          {!loading && planLabel && (
            <div style={{
              background: 'rgba(0,191,165,0.10)',
              border: '1px solid rgba(0,191,165,0.28)',
              borderRadius: 10,
              padding: '16px 18px',
              marginBottom: 24,
            }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 5,
              }}>
                Selected plan
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                {planLabel}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEAL, marginTop: 2 }}>
                {planPrice}
              </div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.38)',
                marginTop: 9, lineHeight: 1.55,
              }}>
                Billed monthly by Direct Debit. Cancel any time.
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.12)',
                borderTopColor: TEAL,
                animation: 'spin 0.75s linear infinite',
                margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                Preparing payment form...
              </p>
            </div>
          ) : (
            <button
              onClick={handleOpenDropin}
              disabled={completing}
              style={{
                width: '100%',
                padding: '12px',
                background: completing
                  ? '#a8d5d4'
                  : `linear-gradient(135deg, ${TEAL} 0%, ${DARK_T} 100%)`,
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: completing ? 'not-allowed' : 'pointer',
                fontFamily: "'Outfit', system-ui, sans-serif",
                letterSpacing: '0.01em',
                transition: 'opacity 0.15s',
              }}
            >
              {completing ? 'Activating your account...' : 'Set up Direct Debit'}
            </button>
          )}
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11.5,
          color: 'rgba(255,255,255,0.22)',
          margin: 0,
          padding: '0 32px 20px',
          lineHeight: 1.5,
        }}>
          Secured by GoCardless. Your bank details are encrypted and never stored by Prodicta.
        </p>
      </div>

      <p style={{
        marginTop: 28, fontSize: 12,
        color: 'rgba(255,255,255,0.28)',
        fontFamily: "'Outfit', system-ui, sans-serif",
        textAlign: 'center',
      }}>
        &copy; {new Date().getFullYear()} Prodicta. All rights reserved.
      </p>
    </div>
  )
}
