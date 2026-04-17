'use client'

import { useState, useEffect, useSyncExternalStore, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import { createClient } from '@/lib/supabase'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, F, FM, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const BUNDLES = [
  { id: 'rapid-10', label: '10 Rapid Screens',  credit_type: 'rapid-screen', quantity: 10, priceGBP: 60,  baseline: 60,  note: '5-8 minute assessment per candidate' },
  { id: 'rapid-25', label: '25 Rapid Screens',  credit_type: 'rapid-screen', quantity: 25, priceGBP: 140, baseline: 150, note: '5-8 minute assessment per candidate' },
  { id: 'rapid-50', label: '50 Rapid Screens',  credit_type: 'rapid-screen', quantity: 50, priceGBP: 275, baseline: 300, note: '5-8 minute assessment per candidate' },
  { id: 'speed-10', label: '10 Speed-Fits',     credit_type: 'speed-fit',    quantity: 10, priceGBP: 170, baseline: 180, note: '15 minute assessment per candidate' },
  { id: 'depth-10', label: '10 Depth-Fits',     credit_type: 'depth-fit',    quantity: 10, priceGBP: 330, baseline: 350, note: '25 minute assessment per candidate' },
]

const CREDIT_LABELS = {
  'rapid-screen': 'Rapid Screen',
  'speed-fit':    'Speed-Fit',
  'depth-fit':    'Depth-Fit',
}

export default function CreditsPage() {
  return (
    <Suspense fallback={null}>
      <CreditsPageInner />
    </Suspense>
  )
}

function CreditsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState([])

  const purchaseState = searchParams?.get('purchase')

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data } = await supabase
          .from('assessment_credits')
          .select('credit_type, credits_remaining, credits_purchased, last_purchased_at')
          .eq('user_id', user.id)
        setCredits(data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, purchaseState])

  async function handleBuy(bundleId) {
    setBuying(bundleId)
    setError('')
    try {
      const res = await fetch('/api/stripe/credit-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle_id: bundleId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout. Please try again.')
        return
      }
      window.location.href = data.url
    } catch (err) {
      setError(err?.message || 'Something went wrong starting checkout.')
    } finally {
      setBuying(null)
    }
  }

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="billing" />
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? '72px 16px 32px' : '36px 40px 48px',
        minHeight: '100vh', background: BG, flex: 1,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontFamily: F, fontSize: 24, fontWeight: 800, color: TX, margin: '0 0 6px' }}>
              Buy assessment credits
            </h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Buy assessment credits in bundles. No monthly commitment. Credits do not expire.
            </p>
          </div>

          {purchaseState === 'success' && (
            <div style={{
              background: GRNBG, border: `1px solid ${GRNBD}`, borderLeft: `4px solid ${GRN}`,
              borderRadius: '0 10px 10px 0', padding: '12px 18px', marginBottom: 20,
              fontFamily: F, fontSize: 13, color: '#166534',
            }}>
              Payment received. Your credits will appear shortly after Stripe confirms the charge.
            </div>
          )}
          {purchaseState === 'cancelled' && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fdba74', borderLeft: '4px solid #D97706',
              borderRadius: '0 10px 10px 0', padding: '12px 18px', marginBottom: 20,
              fontFamily: F, fontSize: 13, color: '#9a3412',
            }}>
              Checkout cancelled. No payment was taken.
            </div>
          )}

          {/* Current balance */}
          <div style={{ ...cs, marginBottom: 24 }}>
            <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 14px' }}>Current balance</h2>
            {loading ? (
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>Loading…</p>
            ) : credits.length === 0 ? (
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>No credits yet. Buy a bundle below to get started.</p>
            ) : (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {['rapid-screen', 'speed-fit', 'depth-fit'].map(type => {
                  const c = credits.find(x => x.credit_type === type)
                  const remaining = c?.credits_remaining ?? 0
                  return (
                    <div key={type} style={{
                      flex: 1, minWidth: 140,
                      background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                      padding: '14px 18px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: remaining > 0 ? TEAL : TX3, lineHeight: 1 }}>{remaining}</div>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>
                        {CREDIT_LABELS[type]}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
              fontFamily: F, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Bundles */}
          <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 12px' }}>Available bundles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {BUNDLES.map(b => {
              const saving = b.baseline - b.priceGBP
              const isRapid = b.credit_type === 'rapid-screen'
              return (
                <div key={b.id} style={{
                  ...cs, padding: '20px 22px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>{b.label}</div>
                    {saving > 0 && (
                      <span style={{
                        fontFamily: F, fontSize: 10, fontWeight: 800,
                        color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`,
                        padding: '2px 8px', borderRadius: 50, letterSpacing: '0.04em',
                      }}>
                        SAVE £{saving}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{b.note}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 0 6px' }}>
                    <span style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: NAVY }}>£{b.priceGBP}</span>
                    {saving > 0 && (
                      <span style={{ fontFamily: F, fontSize: 12, color: TX3, textDecoration: 'line-through' }}>£{b.baseline}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuy(b.id)}
                    disabled={!!buying}
                    style={{
                      padding: '10px 0', borderRadius: 9, border: 'none',
                      background: isRapid ? TEAL : NAVY,
                      color: isRapid ? NAVY : '#fff',
                      fontFamily: F, fontSize: 13.5, fontWeight: 800,
                      cursor: buying ? 'wait' : 'pointer',
                      opacity: buying && buying !== b.id ? 0.55 : 1,
                    }}
                  >
                    {buying === b.id ? 'Redirecting…' : 'Buy now'}
                  </button>
                </div>
              )
            })}
          </div>

          <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '22px 0 0', lineHeight: 1.55 }}>
            Secure payment via Stripe. Credits are added to your account as soon as the payment clears.
          </p>

        </div>
      </main>
    </div>
  )
}
