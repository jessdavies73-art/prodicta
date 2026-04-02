'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { DEMO_CANDIDATES, DEMO_ASSESSMENTS } from '@/lib/demo-data'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, scolor, sbg, slabel, riskCol, riskBg, riskBd, cs, bs,
} from '@/lib/constants'

function CountUp({ target }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number') return
    let frame = 0; const total = 36
    if (ref.current) clearInterval(ref.current)
    ref.current = setInterval(() => {
      frame++
      setVal(Math.round(target * (1 - Math.pow(1 - frame / total, 3))))
      if (frame >= total) { clearInterval(ref.current); setVal(target) }
    }, 14)
    return () => clearInterval(ref.current)
  }, [target])
  return typeof target === 'number' ? val : target
}

function fmt(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function StatCard({ icon, label, value, sub, accent = TEAL }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        background: '#fff',
        border: `1px solid ${BD}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: hovered
          ? '0 8px 24px rgba(15,33,55,0.13), 0 2px 8px rgba(15,33,55,0.07)'
          : '0 2px 8px rgba(15,33,55,0.06), 0 1px 3px rgba(15,33,55,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Ic name={icon} size={14} color={accent} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: accent, fontFamily: FM, lineHeight: 1, letterSpacing: '-1.5px', marginBottom: 8 }}>
        {typeof value === 'number' ? <CountUp target={value} /> : value}
      </div>
      {sub && <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed:      { label: 'Completed',      bg: GRNBG,     color: GRN, bd: GRNBD },
    pending:        { label: 'Pending',         bg: AMBBG,     color: AMB, bd: '#fde68a' },
    sent:           { label: 'Sent',            bg: '#f1f5f9', color: TX3, bd: BD },
    scoring_failed: { label: 'Scoring failed',  bg: REDBG,     color: RED, bd: '#fecaca' },
  }
  const s = map[status] || map.sent
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 50, fontSize: 11, fontWeight: 700, fontFamily: F, background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function RiskBadge({ risk }) {
  if (!risk) return <span style={{ color: TX3, fontSize: 12 }}>-</span>
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 50, fontSize: 11, fontWeight: 700, fontFamily: F, background: riskBg(risk), color: riskCol(risk), border: `1px solid ${riskBd(risk)}`, whiteSpace: 'nowrap' }}>{risk}</span>
  )
}

function RiskCalculator() {
  const [salary, setSalary] = useState('35000')
  const [hires, setHires] = useState('8')
  const [salFocused, setSalFocused] = useState(false)
  const [hiresFocused, setHiresFocused] = useState(false)

  const sal = Math.max(0, parseInt(salary.replace(/[^0-9]/g, '')) || 0)
  const h   = Math.max(1, parseInt(hires.replace(/[^0-9]/g, '')) || 1)
  const recruitment  = Math.round(sal * 0.15)
  const training     = 3000
  const productivity = Math.round(sal * 0.25)
  const tribunal     = Math.round(sal * 0.75)
  const totalPerHire = recruitment + training + productivity + tribunal
  const failCount    = Math.max(1, Math.round(h * 0.2))
  const totalExposure = totalPerHire * failCount
  const gbp = n => '£' + n.toLocaleString('en-GB')
  const inp = focused => ({ fontFamily: F, fontSize: 15, fontWeight: 700, width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${focused ? TEAL : BD}`, background: CARD, color: NAVY, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' })

  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ background: NAVY, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `${TEAL}22`, border: `1px solid ${TEAL}55`, fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.04em' }}>ERA 2025</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `${RED}22`, border: `1px solid ${RED}55`, fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.04em' }}>RISK CALCULATOR</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>What does a bad hire actually cost you?</h2>
        </div>
        <Ic name="shield" size={28} color={`${TEAL}88`} />
      </div>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Average salary for your hires</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: TX3, pointerEvents: 'none' }}>£</span>
              <input type="text" value={salary} onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setSalFocused(true)} onBlur={() => setSalFocused(false)} style={{ ...inp(salFocused), paddingLeft: 26 }} placeholder="35000" />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Hires planned this year</label>
            <input type="text" value={hires} onChange={e => setHires(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setHiresFocused(true)} onBlur={() => setHiresFocused(false)} style={inp(hiresFocused)} placeholder="8" />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Cost breakdown per failed hire</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Recruitment cost',       value: recruitment,  note: '15% of salary',          color: AMB, bg: AMBBG },
              { label: 'Training & onboarding',  value: training,     note: 'Average cost per hire',   color: AMB, bg: AMBBG },
              { label: 'Lost productivity',      value: productivity, note: '~3 months in role',       color: AMB, bg: AMBBG },
              { label: 'ERA 2025 tribunal risk', value: tribunal,     note: 'Uncapped from Jan 2027',  color: RED, bg: REDBG },
            ].map(({ label, value, note, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: bg, border: `1px solid ${color}33`, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: TX3, marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color, flexShrink: 0 }}>{gbp(value)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 220, background: `linear-gradient(135deg, ${AMBBG}, #fff8ed)`, border: `1.5px solid ${AMB}66`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Total exposure: 1 bad hire</div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: AMB, lineHeight: 1, marginBottom: 4 }}>{gbp(totalPerHire)}</div>
            <div style={{ fontSize: 12.5, color: TX2 }}>Recruitment + training + lost productivity + tribunal</div>
          </div>
          <div style={{ flex: 1, minWidth: 220, background: `linear-gradient(135deg, ${REDBG}, #fff5f5)`, border: `1.5px solid ${RED}66`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Total exposure: 20% failure rate</div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: RED, lineHeight: 1, marginBottom: 4 }}>{gbp(totalExposure)}</div>
            <div style={{ fontSize: 12.5, color: TX2 }}>{failCount} of {h} hire{h !== 1 ? 's' : ''} failing · industry average risk</div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 8, background: NAVY, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Ic name="alert" size={15} color={TEAL} />
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, fontFamily: F }}>
            <strong style={{ color: '#fff' }}>From January 2027,</strong> unfair dismissal claims can be made after just 6 months of employment, with no compensation cap.{' '}
            <strong style={{ color: TEAL }}>PRODICTA</strong> helps you identify high-risk hires before they start, reducing your ERA 2025 exposure.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DemoDashboard() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterAssessmentId, setFilterAssessmentId] = useState(null)
  const [modal, setModal] = useState(false)

  // Exclude archived from main view
  const activeCandidates = DEMO_CANDIDATES.filter(c => c.status !== 'archived')
  const completed = activeCandidates.filter(c => c.status === 'completed')
  const pendingCandidates = activeCandidates.filter(c => c.status === 'pending')

  const avgScore = completed.length
    ? Math.round(completed.reduce((s, c) => s + (c.results?.[0]?.overall_score ?? 0), 0) / completed.length)
    : null
  const recommendedCount = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length

  // Filter by assessment tab + search
  const byAssessment = filterAssessmentId
    ? activeCandidates.filter(c => c.assessments?.id === filterAssessmentId)
    : activeCandidates
  const filtered = search.trim()
    ? byAssessment.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : byAssessment

  const passRate = completed.length ? Math.round((recommendedCount / completed.length) * 100) : null
  const highRisk = completed.filter(c => (c.results?.[0]?.risk_level ?? '').toLowerCase().includes('high'))

  return (
    <DemoLayout active="dashboard">
      {modal && <SignUpModal onClose={() => setModal(false)} />}

      <main style={{ marginLeft: 220, marginTop: 46, padding: '32px 40px', minHeight: '100vh', background: BG, flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px', flexShrink: 0 }}>Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Ic name="search" size={15} color={searchFocused ? TEALD : TX3} />
              </div>
              <input
                type="text" placeholder="Search candidates…" value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                style={{ fontFamily: F, fontSize: 13.5, padding: '9px 14px 9px 36px', borderRadius: 8, border: `1.5px solid ${searchFocused ? TEAL : BD}`, background: CARD, color: TX, outline: 'none', width: 220, transition: 'border-color 0.15s' }}
              />
            </div>
            <button onClick={() => setModal(true)} style={{ ...bs('primary', 'md') }}>
              <Ic name="plus" size={15} color={NAVY} />
              New assessment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          <StatCard icon="check" label="Completed" value={completed.length} sub="Completed assessments" accent={TEAL} />
          <StatCard icon="clock" label="Pending" value={pendingCandidates.length} sub="Awaiting completion" accent={AMB} />
          <StatCard icon="bar" label="Avg score" value={avgScore !== null ? avgScore : '-'} sub={avgScore !== null ? slabel(avgScore) : 'No data yet'} accent={avgScore !== null ? (avgScore >= 75 ? GRN : avgScore >= 50 ? AMB : RED) : TX3} />
          <StatCard icon="award" label="Recommended" value={recommendedCount} sub="Scoring 70 or above" accent={TEAL} />
        </div>

        {/* Pipeline health */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 2px', fontSize: 15.5, fontWeight: 700, color: TX }}>Hiring Pipeline Health</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: TX3 }}>Quality snapshot across all active assessments.</p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: TEALLT, border: `1px solid ${TEAL}55`, fontSize: 12, fontWeight: 700, color: TEALD }}>
              <Ic name="calendar" size={12} color={TEALD} />March 2024
            </span>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Assessed', value: completed.length, sub: 'Completed', color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
              { label: 'Pass rate', value: `${passRate}%`, sub: `${recommendedCount} of ${completed.length} scored 70+`, color: passRate >= 70 ? '#22C55E' : passRate >= 50 ? '#F59E0B' : '#EF4444', bg: passRate >= 70 ? GRNBG : passRate >= 50 ? AMBBG : REDBG, bd: passRate >= 70 ? GRNBD : passRate >= 50 ? '#fde68a' : '#fecaca' },
              { label: 'Average score', value: avgScore ?? '-', sub: avgScore >= 70 ? 'Above threshold' : 'Below threshold', color: avgScore >= 70 ? '#22C55E' : avgScore >= 50 ? '#F59E0B' : '#EF4444', bg: avgScore >= 70 ? GRNBG : avgScore >= 50 ? AMBBG : REDBG, bd: `${avgScore >= 70 ? '#22C55E' : avgScore >= 50 ? '#F59E0B' : '#EF4444'}55` },
            ].map(({ label, value, sub, color, bg, bd }) => (
              <div key={label} style={{ flex: 1, minWidth: 140, background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 11.5, color: TX3 }}>{sub}</div>
              </div>
            ))}
            <div style={{ flex: '1 1 180px', background: highRisk.length > 0 ? `linear-gradient(135deg, ${REDBG}, #fff5f5)` : GRNBG, border: `1.5px solid ${highRisk.length > 0 ? '#fecaca' : GRNBD}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>High risk</div>
              <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: highRisk.length > 0 ? '#EF4444' : '#22C55E', lineHeight: 1, marginBottom: 4 }}>{highRisk.length}</div>
              <div style={{ fontSize: 11.5, color: TX3 }}>{highRisk.length > 0 ? 'Candidates flagged' : 'No high-risk candidates'}</div>
            </div>
          </div>
        </div>

        {/* Risk Calculator */}
        <RiskCalculator />

        {/* Candidates table + assessments panel */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>All Candidates</h2>
                  {(search || filterAssessmentId) && <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {filterAssessmentId && (
                    <button onClick={() => setFilterAssessmentId(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${TEAL}55`, background: TEALLT, color: TEALD, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
                      {DEMO_ASSESSMENTS.find(a => a.id === filterAssessmentId)?.role_title}
                      <Ic name="x" size={11} color={TEALD} />
                    </button>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: TX3, background: BG, border: `1px solid ${BD}`, borderRadius: 6, padding: '3px 10px' }}>{activeCandidates.length} total</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '24%' }} /><col style={{ width: '18%' }} /><col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} /><col style={{ width: '8%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BD}` }}>
                    {['Candidate', 'Role', 'Status', 'Score', 'Pressure', 'Risk', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG }}>{h}</th>
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
                        style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none', background: isHovered && isCompleted ? '#f0fdfb' : CARD, cursor: isCompleted ? 'pointer' : 'default', transition: 'background 0.15s', boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none' }}
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
                          <span style={{ fontSize: 12, color: TX2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.assessments?.role_title || '-'}</span>
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
                          <span style={{ fontSize: 11.5, color: TX3, whiteSpace: 'nowrap' }}>{isCompleted ? fmt(c.completed_at) : fmt(c.invited_at)}</span>
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
                <span style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, borderRadius: 6, padding: '2px 8px' }}>{DEMO_ASSESSMENTS.length}</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_ASSESSMENTS.map(a => {
                  const forA = activeCandidates.filter(c => c.assessments?.id === a.id)
                  const doneCount = forA.filter(c => c.status === 'completed').length
                  const isActive = filterAssessmentId === a.id
                  return (
                    <button
                      key={a.id}
                      onClick={() => setFilterAssessmentId(isActive ? null : a.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                        border: `1.5px solid ${isActive ? TEAL : BD}`,
                        background: isActive ? TEALLT : BG,
                        display: 'flex', flexDirection: 'column', gap: 8,
                        cursor: 'pointer', transition: 'all 0.15s', width: '100%',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? TEALD : TX, lineHeight: 1.3 }}>{a.role_title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11.5, color: TX3 }}>{doneCount}/{forA.length} completed</span>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: isActive ? TEAL : TEALLT, color: isActive ? '#fff' : TEALD, border: `1px solid ${TEAL}40` }}>
                          {isActive ? 'Filtered' : 'Active'}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: `${TEAL}18`, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: forA.length > 0 ? `${Math.round((doneCount / forA.length) * 100)}%` : '0%', background: TEAL, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                    </button>
                  )
                })}

                <button
                  onClick={() => router.push('/demo/compare')}
                  style={{ ...bs('secondary', 'sm'), width: '100%', justifyContent: 'center', marginTop: 4 }}
                >
                  <Ic name="sliders" size={13} color={TX2} />
                  Compare candidates
                </button>
                <button
                  onClick={() => setModal(true)}
                  style={{ ...bs('secondary', 'sm'), width: '100%', justifyContent: 'center' }}
                >
                  <Ic name="plus" size={13} color={TX2} />
                  New assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DemoLayout>
  )
}
