'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import ProdictaLogo from '@/components/ProdictaLogo'
import { DEMO_CANDIDATES, DEMO_ASSESSMENTS } from '@/lib/demo-data'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, RED, REDBG,
  F, FM, scolor, sbg, slabel, riskCol, riskBg, riskBd, cs, bs,
} from '@/lib/constants'

// ── CountUp ───────────────────────────────────────────────────────────────────
function CountUp({ target }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number') return
    let frame = 0
    const total = 36
    if (ref.current) clearInterval(ref.current)
    ref.current = setInterval(() => {
      frame++
      const eased = 1 - Math.pow(1 - frame / total, 3)
      setVal(Math.round(target * eased))
      if (frame >= total) { clearInterval(ref.current); setVal(target) }
    }, 14)
    return () => clearInterval(ref.current)
  }, [target])
  return typeof target === 'number' ? val : target
}

function fmt(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Demo banner ───────────────────────────────────────────────────────────────
function DemoBanner({ router }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${NAVY} 0%, #1a3a5c 100%)`,
      borderBottom: `2px solid ${TEAL}`,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      zIndex: 200,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: TEAL, color: NAVY, fontSize: 10, fontWeight: 800,
          letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4,
          textTransform: 'uppercase', flexShrink: 0,
        }}>
          DEMO
        </div>
        <span style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
          You're viewing a demo with sample data. Sign up to assess your own candidates.
        </span>
      </div>
      <button
        onClick={() => router.push('/login')}
        style={{
          background: TEAL, color: NAVY, border: 'none', borderRadius: 7,
          padding: '8px 18px', fontFamily: F, fontSize: 13, fontWeight: 800,
          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        Sign up free →
      </button>
    </div>
  )
}

// ── Demo sidebar ──────────────────────────────────────────────────────────────
function DemoSidebar() {
  const router = useRouter()
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: NAVY,
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 100, fontFamily: F,
    }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <ProdictaLogo textColor="#ffffff" size={32} />
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { label: 'Dashboard', icon: 'grid', active: true },
          { label: 'Compare', icon: 'sliders', disabled: true },
          { label: 'Benchmarks', icon: 'layers', disabled: true },
          { label: 'Archive', icon: 'archive', disabled: true },
          { label: 'How It Works', icon: 'info', disabled: true },
        ].map(({ label, icon, active, disabled }) => (
          <div
            key={label}
            title={disabled ? 'Sign up to access this feature' : ''}
            style={{
              display: 'flex', alignItems: 'center', gap: 11,
              width: '100%', padding: '10px 12px',
              paddingLeft: active ? 9 : 12,
              borderRadius: 8,
              borderLeft: active ? `3px solid ${TEAL}` : '3px solid transparent',
              fontFamily: F, fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              background: active ? 'rgba(0,191,165,0.12)' : 'transparent',
              color: active ? TEAL : disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
              cursor: disabled ? 'default' : 'pointer',
              userSelect: 'none',
            }}
          >
            <Ic name={icon} size={17} color={active ? TEAL : disabled ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)'} />
            {label}
            {disabled && (
              <span style={{
                marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                locked
              </span>
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: '14px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: `${TEAL}18`, border: `1px solid ${TEAL}30`,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: NAVY, flexShrink: 0,
          }}>D</div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: TEAL }}>Demo Account</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: `1px solid ${TEAL}40`, cursor: 'pointer', fontFamily: F,
            fontSize: 13, fontWeight: 700, textAlign: 'left',
            background: `${TEAL}10`, color: TEAL,
          }}
        >
          <Ic name="award" size={16} color={TEAL} />
          Sign up free
        </button>
      </div>
    </aside>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = TEAL }) {
  return (
    <div style={{ ...cs, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TX2, fontFamily: F }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name={icon} size={16} color={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 800, color: NAVY, fontFamily: FM, lineHeight: 1, letterSpacing: '-1px' }}>
          {typeof value === 'number' ? <CountUp target={value} /> : value}
        </div>
        {sub && <div style={{ fontSize: 12, color: TX3, marginTop: 6, fontFamily: F }}>{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed:      { label: 'Completed',       bg: GRNBG,    color: GRN, bd: GRNBD },
    pending:        { label: 'Pending',          bg: AMBBG,    color: AMB, bd: '#fde68a' },
    sent:           { label: 'Sent',             bg: '#f1f5f9', color: TX3, bd: BD },
    scoring_failed: { label: 'Scoring failed',   bg: REDBG,    color: RED, bd: '#fecaca' },
  }
  const s = map[status] || map.sent
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 50,
      fontSize: 11, fontWeight: 700, fontFamily: F,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function RiskBadge({ risk }) {
  if (!risk) return <span style={{ color: TX3, fontSize: 12 }}>-</span>
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 50,
      fontSize: 11, fontWeight: 700, fontFamily: F,
      background: riskBg(risk), color: riskCol(risk), border: `1px solid ${riskBd(risk)}`, whiteSpace: 'nowrap',
    }}>
      {risk}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DemoDashboard() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)

  const candidates = DEMO_CANDIDATES
  const completed = candidates.filter(c => c.status === 'completed')
  const pendingCandidates = candidates.filter(c => c.status === 'pending')

  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, c) => sum + (c.results?.[0]?.overall_score ?? 0), 0) / completed.length)
    : null

  const recommendedCount = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length

  const filtered = search.trim()
    ? candidates.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      )
    : candidates

  // Pipeline health
  const passRate = completed.length ? Math.round((recommendedCount / completed.length) * 100) : null
  const highRisk = completed.filter(c => (c.results?.[0]?.risk_level ?? '').toLowerCase().includes('high'))

  return (
    <div style={{ display: 'flex', fontFamily: F, flexDirection: 'column', minHeight: '100vh' }}>
      {/* Demo banner — above sidebar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300 }}>
        <DemoBanner router={router} />
      </div>

      <DemoSidebar />

      <main style={{
        marginLeft: 220,
        marginTop: 46, // banner height
        padding: '32px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px', flexShrink: 0 }}>
            Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Ic name="search" size={15} color={searchFocused ? TEALD : TX3} />
              </div>
              <input
                type="text"
                placeholder="Search candidates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  fontFamily: F, fontSize: 13.5, padding: '9px 14px 9px 36px',
                  borderRadius: 8, border: `1.5px solid ${searchFocused ? TEAL : BD}`,
                  background: CARD, color: TX, outline: 'none', width: 220,
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
            <div
              title="Sign up to create assessments"
              style={{
                ...bs('primary', 'md'),
                opacity: 0.45,
                cursor: 'not-allowed',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <Ic name="plus" size={15} color={NAVY} />
              New assessment
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <StatCard icon="check" label="Completed" value={completed.length} sub="Completed assessments" />
          <StatCard icon="clock" label="Pending" value={pendingCandidates.length} sub="Awaiting completion" />
          <StatCard icon="bar" label="Avg score" value={avgScore !== null ? `${avgScore}` : '-'} sub={avgScore !== null ? slabel(avgScore) : 'No data yet'} />
          <StatCard icon="award" label="Recommended" value={recommendedCount} sub="Scoring 70 or above" />
        </div>

        {/* Pipeline health */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 2px', fontSize: 15.5, fontWeight: 700, color: TX }}>Hiring Pipeline Health</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: TX3, fontFamily: F }}>Quality snapshot across all active assessments.</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: TEALLT, border: `1px solid ${TEAL}55`, fontSize: 12, fontWeight: 700, color: TEALD }}>
              <Ic name="calendar" size={12} color={TEALD} />
              March 2024
            </span>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Assessed', value: completed.length, sub: 'Completed', color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
              { label: 'Pass rate', value: passRate !== null ? `${passRate}%` : '-', sub: `${recommendedCount} of ${completed.length} scored 70+`, color: passRate >= 70 ? GRN : passRate >= 50 ? AMB : RED, bg: passRate >= 70 ? GRNBG : passRate >= 50 ? AMBBG : REDBG, bd: passRate >= 70 ? GRNBD : passRate >= 50 ? '#fde68a' : '#fecaca' },
              { label: 'Average score', value: avgScore ?? '-', sub: avgScore >= 70 ? 'Above threshold' : 'Below threshold', color: avgScore >= 70 ? GRN : avgScore >= 50 ? AMB : RED, bg: avgScore >= 70 ? GRNBG : avgScore >= 50 ? AMBBG : REDBG, bd: `${avgScore >= 70 ? GRN : avgScore >= 50 ? AMB : RED}55` },
            ].map(({ label, value, sub, color, bg, bd }) => (
              <div key={label} style={{ flex: 1, minWidth: 140, background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11.5, color: TX3 }}>{sub}</div>
              </div>
            ))}
            <div style={{
              flex: '1 1 180px',
              background: highRisk.length > 0 ? `linear-gradient(135deg, ${REDBG}, #fff5f5)` : GRNBG,
              border: `1.5px solid ${highRisk.length > 0 ? '#fecaca' : GRNBD}`,
              borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>High risk</div>
              <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: highRisk.length > 0 ? RED : GRN, lineHeight: 1, marginBottom: 4 }}>{highRisk.length}</div>
              <div style={{ fontSize: 11.5, color: TX3 }}>{highRisk.length > 0 ? 'Candidates flagged' : 'No high-risk candidates'}</div>
            </div>
          </div>
        </div>

        {/* Candidates table + assessments panel */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>All Candidates</h2>
                  {search && <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</div>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: TX3, background: BG, border: `1px solid ${BD}`, borderRadius: 6, padding: '3px 10px' }}>
                  {candidates.length} total
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BD}` }}>
                    {['Candidate', 'Role', 'Status', 'Score', 'Pressure', 'Risk', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => {
                    const result = c.results?.[0]
                    const score = result?.overall_score ?? null
                    const pf = result?.pressure_fit_score ?? null
                    const risk = result?.risk_level ?? null
                    const isCompleted = c.status === 'completed'
                    const isHovered = hoveredRow === c.id

                    return (
                      <tr
                        key={c.id}
                        onClick={() => { if (isCompleted) router.push(`/demo/candidate/${c.id}`) }}
                        onMouseEnter={() => setHoveredRow(c.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none',
                          background: isHovered && isCompleted ? '#f0fdfb' : CARD,
                          cursor: isCompleted ? 'pointer' : 'default',
                          transition: 'background 0.15s',
                          boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none',
                        }}
                      >
                        <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={c.name} size={28} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: TX, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: 12, color: TX2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {c.assessments?.role_title || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px' }}><StatusBadge status={c.status} /></td>
                        <td style={{ padding: '10px 8px' }}>
                          {isCompleted && score !== null ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                              <span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>{score}</span>
                              <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                            </div>
                          ) : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {isCompleted && pf !== null ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                              <span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1, color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED }}>{pf}</span>
                              <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                            </div>
                          ) : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ fontSize: 11.5, color: TX3, whiteSpace: 'nowrap' }}>
                            {isCompleted ? fmt(c.completed_at) : fmt(c.invited_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assessments panel */}
          <div style={{ width: 268, flexShrink: 0 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: TX }}>Active Assessments</h2>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, borderRadius: 6, padding: '2px 8px' }}>
                  {DEMO_ASSESSMENTS.length}
                </span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_ASSESSMENTS.map(a => {
                  const forAssessment = candidates.filter(c => c.assessments?.id === a.id)
                  const doneCount = forAssessment.filter(c => c.status === 'completed').length
                  return (
                    <div key={a.id} style={{
                      padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${BD}`, background: BG,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TX, lineHeight: 1.3 }}>{a.role_title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11.5, color: TX3 }}>{doneCount}/{forAssessment.length} completed</span>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: TEALLT, color: TEALD, border: `1px solid ${TEAL}40` }}>
                          Active
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: `${TEAL}18`, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: forAssessment.length > 0 ? `${Math.round((doneCount / forAssessment.length) * 100)}%` : '0%', background: TEAL, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
