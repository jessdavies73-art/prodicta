'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#00897B'
const BG = '#f7f9fb'
const CARD = '#ffffff'
const BD = '#e4e9f0'
const TX = '#1a202c'
const TX2 = '#4a5568'
const TX3 = '#94a1b3'
const AMB = '#D97706'
const AMBBG = '#fffbeb'
const DRED = '#B91C1C'
const DREDBG = '#fef2f2'
const GRN = '#00BFA5'
const GRNBG = '#E6F7F5'
const F = "'Outfit', system-ui, sans-serif"

/* ── mobile detection ── */
function subscribe(cb) { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
function getSnapshot() { return window.innerWidth <= 768 }
function getServerSnapshot() { return false }

const MILESTONES = [
  { key: 'week1', label: 'Week 1 Check-in' },
  { key: 'week4', label: 'Week 4 Review' },
  { key: 'week8', label: 'Week 8 Review' },
]

function healthColor(h) { return h === 'red' ? DRED : h === 'amber' ? AMB : GRN }
function healthBg(h) { return h === 'red' ? DREDBG : h === 'amber' ? AMBBG : GRNBG }
function healthLabel(h) { return h === 'red' ? 'Critical' : h === 'amber' ? 'At Risk' : 'Healthy' }

export default function PlacementSharePage({ params }) {
  const { token } = params
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return }
    fetch(`/api/placement/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  /* ── loading spinner ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <div style={{
          width: 40, height: 40, border: `3px solid ${BD}`, borderTopColor: TEAL,
          borderRadius: '50%', animation: 'pSpin 0.8s linear infinite',
        }} />
        <style>{`@keyframes pSpin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  /* ── invalid / disabled ── */
  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <div style={{ textAlign: 'center', fontFamily: F }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>&#128279;</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: TX, marginBottom: 8 }}>This link is no longer active.</div>
          <div style={{ fontSize: 14, color: TX3 }}>The placement summary you are looking for is unavailable.</div>
        </div>
      </div>
    )
  }

  const cs = { background: CARD, borderRadius: 12, border: `1px solid ${BD}`, padding: isMobile ? 16 : 20 }
  const health = data.placement_health || 'green'
  const startFormatted = data.assignment_start_date
    ? new Date(data.assignment_start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F }}>
      {/* ── Google Font ── */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: isMobile ? '24px 16px' : '48px 24px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '0.04em',
              background: NAVY, padding: '4px 8px 4px 10px', borderRadius: '6px 0 0 6px',
            }}>PRO</span>
            <span style={{
              fontFamily: F, fontSize: 22, fontWeight: 800, color: TEAL, letterSpacing: '0.04em',
              padding: '4px 10px 4px 8px',
            }}>DICTA</span>
          </div>
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Placement Summary
          </div>
        </div>

        {/* ── Worker & Role ── */}
        <div style={{ ...cs, marginBottom: 16 }}>
          <div style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, marginBottom: 4 }}>
            {data.worker_first_name || 'Worker'}
          </div>
          {data.role_title && (
            <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX2 }}>{data.role_title}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
            {data.client_company && (
              <div>
                <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Client</div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX }}>{data.client_company}</div>
              </div>
            )}
            {startFormatted && (
              <div>
                <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Start Date</div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX }}>{startFormatted}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Health & Reliability row ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Placement Health */}
          <div style={{ ...cs, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Placement Health</div>
            <span style={{
              display: 'inline-block', padding: '6px 20px', borderRadius: 50,
              fontSize: 13, fontWeight: 800, fontFamily: F,
              background: healthBg(health), color: healthColor(health),
            }}>
              {healthLabel(health)}
            </span>
          </div>

          {/* Reliability Score Ring */}
          {data.reliability_score != null && (
            <div style={{ ...cs, flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Reliability Score</div>
              {(() => {
                const rs = data.reliability_score
                const rsColor = rs >= 80 ? GRN : rs >= 60 ? AMB : DRED
                const rsLabel = rs >= 80 ? 'Reliable' : rs >= 60 ? 'Monitor' : 'At Risk'
                const size = 100, sw = 8, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r
                const offset = circ * (1 - rs / 100)
                return (
                  <>
                    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BD} strokeWidth={sw} />
                        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={rsColor} strokeWidth={sw}
                          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontSize: 28, fontWeight: 800, color: rsColor }}>{rs}</div>
                    </div>
                    <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, fontFamily: F, background: rs >= 80 ? GRNBG : rs >= 60 ? AMBBG : DREDBG, color: rsColor }}>
                      {rsLabel}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* ── Review Milestones ── */}
        <div style={{ ...cs, marginBottom: 24 }}>
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Review Progress</div>
          {MILESTONES.map((m, i) => {
            const rev = data.reviews?.[m.key]
            const done = rev?.done
            const rating = rev?.rating
            const notes = rev?.notes
            const ratingColor = rating === 'Concern Raised' ? DRED : rating === 'Below Expectations' ? AMB : rating === 'Exceeding Expectations' ? TEAL : GRN
            return (
              <div key={m.key} style={{
                padding: '12px 0',
                borderBottom: i < MILESTONES.length - 1 ? `1px solid ${BD}` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: done && notes ? 6 : 0 }}>
                  {/* Status dot */}
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, fontFamily: F, flexShrink: 0,
                    background: done ? GRN : BD, color: done ? '#fff' : TX3,
                  }}>
                    {done ? '\u2713' : m.key === 'week1' ? '1' : m.key === 'week4' ? '4' : '8'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{m.label}</span>
                  </div>
                  {done && rating ? (
                    <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: ratingColor }}>{rating}</span>
                  ) : (
                    <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, fontStyle: 'italic' }}>Pending</span>
                  )}
                </div>
                {done && notes && (
                  <div style={{ marginLeft: 38, fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
                    {notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>
            This placement summary is provided by {data.agency_name || 'your agency'} using <span style={{ fontWeight: 700, color: TX2 }}>PRODICTA</span>.
          </div>
        </div>
      </div>
    </div>
  )
}
