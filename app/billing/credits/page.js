'use client'

import { useState, useEffect, useSyncExternalStore, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, F, FM, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

// Per-unit prices. Must stay in sync with CREDIT_PRICES in lib/stripe.js and
// the PAYG tab in app/settings/page.js.
const PAYG_TYPES = [
  {
    type: 'rapid-screen', label: 'Rapid Screen', unit: 6,
    description: 'A 5-8 minute work simulation. Gives a Strong Proceed, Interview Worthwhile, or High Risk signal with a Placement Survival Score, top strengths, and key watch-outs. 1 scenario. No full narrative report.',
  },
  {
    type: 'speed-fit', label: 'Speed-Fit', unit: 18,
    description: 'A 15 minute assessment with 2 work scenarios and a full scored report including strengths, watch-outs with Week 1 interventions, skills breakdown, and interview brief. Recommended for most roles.',
  },
  {
    type: 'depth-fit', label: 'Depth-Fit', unit: 35,
    description: 'A 25 minute deep assessment with 3 work scenarios and a full narrative report, detailed competency breakdown, Monday Morning Reality, counter-offer resilience score, and tailored coaching notes.',
  },
  {
    type: 'strategy-fit', label: 'Strategy-Fit', unit: 65,
    description: 'A 45 minute leadership assessment with 4 work scenarios, a Day 1 workspace simulation, full narrative report, strategic thinking evaluation, stakeholder management brief, and executive summary.',
  },
]

const PLANS = [
  { key: 'starter',      plan: 'Starter',         price: '£49/mo',  priceNum: 49,  limit: '10 assessments per month' },
  { key: 'professional', plan: 'Professional',    price: '£120/mo', priceNum: 120, limit: '30 assessments per month' },
  { key: 'unlimited',    plan: 'Unlimited',       price: '£159/mo', priceNum: 159, limit: 'Unlimited assessments' },
  { key: 'founding',     plan: 'Founding Member', price: '£79/mo',  priceNum: 79,  limit: 'Unlimited for 3 months, then 20/month' },
]

// Subscription users still see bundles (they aren't billed per-unit).
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
  'strategy-fit': 'Strategy-Fit',
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
  const [profile, setProfile] = useState(null)
  const [credits, setCredits] = useState([])

  const [paygTab, setPaygTab] = useState('credits') // 'credits' | 'subscription'
  const [buyQty, setBuyQty] = useState({})
  const [buyingType, setBuyingType] = useState(null)
  const [buyingBundle, setBuyingBundle] = useState(null)
  const [switchConfirm, setSwitchConfirm] = useState(null)
  const [switchSubmitting, setSwitchSubmitting] = useState(false)
  const [error, setError] = useState('')

  const purchaseState = searchParams?.get('purchase')
  const preselectType = searchParams?.get('type')
  const upgradeFrom = searchParams?.get('upgrade_from')
  const upgradeDiff = parseInt(searchParams?.get('diff'), 10)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const [{ data: profileRow }, { data: creditsRows }] = await Promise.all([
          supabase.from('users').select('plan, plan_type, subscription_status').eq('id', user.id).maybeSingle(),
          supabase.from('assessment_credits').select('credit_type, credits_remaining').eq('user_id', user.id),
        ])
        setProfile(profileRow)
        setCredits(creditsRows || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, purchaseState])

  // Deep-link support: if the URL has ?type=speed-fit&upgrade_from=rapid (from
  // the candidate page's "Upgrade to Speed-Fit" button), start with a sensible
  // default quantity set on that credit type.
  useEffect(() => {
    if (preselectType && PAYG_TYPES.some(t => t.type === preselectType)) {
      setBuyQty(q => (q[preselectType] != null ? q : { ...q, [preselectType]: 1 }))
    }
  }, [preselectType])

  const isPaygUser = profile?.plan_type === 'payg' || profile?.plan === 'payg'

  async function handleBuyUnit(credit_type) {
    const quantity = Math.max(1, parseInt(buyQty[credit_type], 10) || 1)
    setBuyingType(credit_type)
    setError('')
    try {
      const res = await fetch('/api/stripe/credit-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_type, quantity }),
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
      setBuyingType(null)
    }
  }

  async function handleBuyBundle(bundleId) {
    setBuyingBundle(bundleId)
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
      setBuyingBundle(null)
    }
  }

  async function handleConfirmSwitch() {
    if (!switchConfirm) return
    setSwitchSubmitting(true)
    try {
      const res = await fetch('/api/billing/switch-to-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: switchConfirm.key }),
      })
      const body = await res.json()
      if (body?.url) { window.location.href = body.url; return }
      throw new Error(body?.error || 'Could not start checkout.')
    } catch (err) {
      setError(err?.message || 'Could not start checkout. Please try again.')
      setSwitchSubmitting(false)
      setSwitchConfirm(null)
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
              {isPaygUser ? 'Buy assessment credits' : 'Top up assessment credits'}
            </h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.55 }}>
              {isPaygUser
                ? 'Pay per assessment. No monthly fee. Credits never expire.'
                : 'Add one-off credits to supplement your monthly allowance. Credits never expire.'}
            </p>
          </div>

          {upgradeFrom && preselectType && Number.isFinite(upgradeDiff) && upgradeDiff > 0 && (() => {
            const CREDIT_LABELS_LOCAL = { 'rapid-screen': 'Rapid Screen', 'speed-fit': 'Speed-Fit', 'depth-fit': 'Depth-Fit', 'strategy-fit': 'Strategy-Fit' }
            const fromLabel = CREDIT_LABELS_LOCAL[upgradeFrom] || upgradeFrom
            const toLabel = CREDIT_LABELS_LOCAL[preselectType] || preselectType
            return (
              <div style={{
                background: '#fffef5', border: '1.5px solid #fde68a', borderLeft: '4px solid #F59E0B',
                borderRadius: 10, padding: '12px 18px', marginBottom: 20,
                fontFamily: F, fontSize: 13, color: '#92400e', lineHeight: 1.55,
              }}>
 Upgrading from {fromLabel}, pay just £{upgradeDiff} for 1 {toLabel} credit.
              </div>
            )
          })()}

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
            ) : (
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {PAYG_TYPES.map(t => {
                  const c = credits.find(x => x.credit_type === t.type)
                  const remaining = c?.credits_remaining ?? 0
                  return (
                    <div key={t.type} style={{
                      flex: 1, minWidth: 140,
                      background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                      padding: '14px 18px', textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: remaining > 0 ? TEAL : TX3, lineHeight: 1 }}>{remaining}</div>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 6 }}>
                        {CREDIT_LABELS[t.type]}
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

          {loading ? null : isPaygUser ? (
            <div style={{ ...cs }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 28, borderBottom: `1px solid ${BD}`, marginBottom: 22 }}>
                {[
                  { key: 'credits',      label: 'Pay As You Go' },
                  { key: 'subscription', label: 'Monthly Subscription' },
                ].map(t => {
                  const active = paygTab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setPaygTab(t.key)}
                      style={{
                        fontFamily: F, fontSize: 14, fontWeight: active ? 700 : 500,
                        color: active ? TEALD : TX2,
                        background: 'transparent', border: 'none', padding: '10px 0',
                        borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                        marginBottom: -1, cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {paygTab === 'credits' && (
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: TX, fontFamily: F }}>Buy more credits</h3>
                  <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: '0 0 16px', lineHeight: 1.55 }}>
 The higher the assessment level the more detailed the report. Rapid Screen gives a quick signal, Speed-Fit and above give the full picture.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PAYG_TYPES.map(t => {
                      const qty = Math.max(1, parseInt(buyQty[t.type], 10) || 1)
                      const total = qty * t.unit
                      const busy = buyingType === t.type
                      const highlight = preselectType === t.type
                      return (
                        <div key={t.type} style={{
                          padding: '16px 18px', borderRadius: 10,
                          border: `1.5px solid ${highlight ? TEAL : BD}`,
                          background: highlight ? TEALLT : '#fff',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                            <div style={{ minWidth: 180 }}>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{t.label} · £{t.unit}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input
                                type="number" min={1} max={100}
                                value={buyQty[t.type] ?? 1}
                                onChange={e => setBuyQty(prev => ({ ...prev, [t.type]: e.target.value }))}
                                style={{
                                  width: 70, padding: '8px 10px', borderRadius: 7,
                                  border: `1.5px solid ${BD}`, background: CARD,
                                  fontFamily: FM, fontSize: 14, fontWeight: 700, color: TX, textAlign: 'right',
                                  outline: 'none',
                                }}
                              />
                              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY, minWidth: 64, textAlign: 'right' }}>£{total}</span>
                              <button
                                onClick={() => handleBuyUnit(t.type)}
                                disabled={busy || !!buyingType}
                                style={{
                                  fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY,
                                  background: TEAL, border: 'none', padding: '8px 18px', borderRadius: 7,
                                  cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
                                }}
                              >
                                {busy ? 'Opening…' : 'Buy'}
                              </button>
                            </div>
                          </div>
                          <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
                            {t.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '18px 0 0', lineHeight: 1.55 }}>
                    Secure payment via Stripe. Credits are added to your account as soon as the payment clears.
                  </p>
                </div>
              )}

              {paygTab === 'subscription' && (
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: TX, fontFamily: F }}>Switch to a monthly subscription</h3>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                    Get a bundle of assessments each month.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {PLANS.map(p => (
                      <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${BD}`, background: '#fff' }}>
                        <div>
                          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{p.plan}</div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX3 }}>{p.limit}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{p.price}</span>
                          <button
                            onClick={() => setSwitchConfirm(p)}
                            style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, background: TEAL, border: 'none', padding: '8px 18px', borderRadius: 7, cursor: 'pointer' }}
                          >
                            Switch
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
 /* Subscription users, keep bundle top-ups */
            <>
              <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 12px' }}>Available bundles</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {BUNDLES.map(b => {
                  const saving = b.baseline - b.priceGBP
                  const isRapid = b.credit_type === 'rapid-screen'
                  return (
                    <div key={b.id} style={{ ...cs, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>{b.label}</div>
                        {saving > 0 && (
                          <span style={{ fontFamily: F, fontSize: 10, fontWeight: 800, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`, padding: '2px 8px', borderRadius: 50, letterSpacing: '0.04em' }}>
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
                        onClick={() => handleBuyBundle(b.id)}
                        disabled={!!buyingBundle}
                        style={{
                          padding: '10px 0', borderRadius: 9, border: 'none',
                          background: isRapid ? TEAL : NAVY,
                          color: isRapid ? NAVY : '#fff',
                          fontFamily: F, fontSize: 13.5, fontWeight: 800,
                          cursor: buyingBundle ? 'wait' : 'pointer',
                          opacity: buyingBundle && buyingBundle !== b.id ? 0.55 : 1,
                        }}
                      >
                        {buyingBundle === b.id ? 'Redirecting…' : 'Buy now'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '22px 0 0', lineHeight: 1.55 }}>
                Secure payment via Stripe. Credits are added to your account as soon as the payment clears.
              </p>
            </>
          )}

        </div>

        {/* Switch-to-subscription confirmation modal */}
        {switchConfirm && (
          <div
            onClick={() => !switchSubmitting && setSwitchConfirm(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1500,
              background: 'rgba(15,33,55,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: CARD, borderRadius: 14, padding: '28px 28px 24px',
                maxWidth: 440, width: '100%', boxShadow: '0 24px 72px rgba(0,0,0,0.25)',
              }}
            >
              <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 10px' }}>
                Switch to {switchConfirm.plan} at £{switchConfirm.priceNum}/month?
              </h3>
              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 22px', lineHeight: 1.6 }}>
                Your Pay As You Go credits will remain available.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSwitchConfirm(null)}
                  disabled={switchSubmitting}
                  style={{
                    fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX2,
                    background: 'transparent', border: `1.5px solid ${BD}`,
                    padding: '9px 18px', borderRadius: 8, cursor: switchSubmitting ? 'default' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSwitch}
                  disabled={switchSubmitting}
                  style={{
                    fontFamily: F, fontSize: 13.5, fontWeight: 800, color: NAVY,
                    background: TEAL, border: 'none',
                    padding: '9px 20px', borderRadius: 8,
                    cursor: switchSubmitting ? 'default' : 'pointer', opacity: switchSubmitting ? 0.7 : 1,
                  }}
                >
                  {switchSubmitting ? 'Redirecting…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
