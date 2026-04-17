'use client'
import { useState, useEffect, useRef, Suspense, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { DEMO_CANDIDATES, DEMO_ASSESSMENTS } from '@/lib/demo-data'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, scolor, sbg, slabel, riskCol, riskBg, riskBd, cs, bs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

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

function StatRing({ value, accent = '#00BFA5', size = 140, fillPercent = 100 }) {
  const sw = 10
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 200); return () => clearTimeout(t) }, [])
  const target = Math.min(100, Math.max(0, fillPercent))
  const offset = drawn ? circ * (1 - target / 100) : circ
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', filter: `drop-shadow(0 0 10px ${accent}55)` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={`${accent}0F`} stroke="#e4e9f0" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={sw} strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 32, fontWeight: 800, color: '#0F2137' }}>
        {typeof value === 'number' ? <CountUp target={value} /> : value}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent = TEAL, fillPercent = 100 }) {
  return (
    <div style={{ flex: '1 1 120px', textAlign: 'center', padding: '8px 0' }}>
      <StatRing value={value} accent={accent} fillPercent={fillPercent} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a1b3', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 12 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B7280', fontFamily: F, marginTop: 4 }}>{sub}</div>}
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

function RiskCalculator({ isAgency }) {
  const [salary, setSalary] = useState(isAgency ? '30000' : '35000')
  const [count, setCount] = useState(isAgency ? '12' : '8')
  const [rebateWeeks, setRebateWeeks] = useState('12')
  const [salFocused, setSalFocused] = useState(false)
  const [countFocused, setCountFocused] = useState(false)
  const [rebateFocused, setRebateFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const sal = Math.max(0, parseInt(salary.replace(/[^0-9]/g, '')) || 0)
  const c   = Math.max(1, parseInt(count.replace(/[^0-9]/g, '')) || 1)
  const gbp = n => '£' + n.toLocaleString('en-GB')
  const inp = focused => ({ fontFamily: F, fontSize: 15, fontWeight: 700, width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${focused ? TEAL : BD}`, background: '#fff', color: NAVY, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' })

  if (isAgency) {
    const fee = Math.round(sal * 0.18)
    const rw = Math.max(1, parseInt(rebateWeeks.toString().replace(/[^0-9]/g, '')) || 12)
    const rebateCost = fee
    const adminCost = 2500
    const reputationCost = Math.round(fee * 0.5)
    const totalPerFail = rebateCost + adminCost + reputationCost
    const failCount = Math.max(1, Math.round(c * 0.15))
    const totalExposure = totalPerFail * failCount

    const BREAK = [
      { label: 'Fee rebate',              value: rebateCost,     note: `Full fee refund within ${rw}-week rebate window`, color: RED, bg: REDBG },
      { label: 'Replacement admin cost',   value: adminCost,      note: 'Re-sourcing, re-screening, re-presenting',       color: AMB, bg: AMBBG },
      { label: 'Reputation and repeat risk', value: reputationCost, note: 'Client confidence impact on future fees',       color: AMB, bg: AMBBG },
    ]

    return (
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
            Placement risk calculator
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Average placement salary</label>
              <div style={{ position: 'relative', width: 160 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: TX3, pointerEvents: 'none' }}>£</span>
                <input type="text" value={salary} onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setSalFocused(true)} onBlur={() => setSalFocused(false)} style={{ ...inp(salFocused), paddingLeft: 26 }} placeholder="30000" />
              </div>
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Placements this year</label>
              <input type="text" value={count} onChange={e => setCount(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setCountFocused(true)} onBlur={() => setCountFocused(false)} style={{ ...inp(countFocused), width: 100 }} placeholder="12" />
            </div>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Rebate window (weeks)</label>
              <input type="text" value={rebateWeeks} onChange={e => setRebateWeeks(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setRebateFocused(true)} onBlur={() => setRebateFocused(false)} style={{ ...inp(rebateFocused), width: 100 }} placeholder="12" />
            </div>
            <div style={{ paddingBottom: 2 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
              <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: RED, lineHeight: 1 }}>{gbp(totalExposure)}</div>
              <div style={{ fontSize: 11.5, color: TX3, marginTop: 3 }}>{failCount} of {c} placement{c !== 1 ? 's' : ''} failing, 15% industry average</div>
            </div>
          </div>
          <button onClick={() => setShowBreakdown(!showBreakdown)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F, padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showBreakdown && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BREAK.map(({ label, value, note, color, bg }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: bg, border: `1px solid ${color}33`, gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{label}</div>
                    <div style={{ fontSize: 11.5, color: TX3, marginTop: 1 }}>{note}</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>{gbp(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Employer: ERA 2025 tribunal risk calculator
  const recruitment  = Math.round(sal * 0.15)
  const training     = 3000
  const productivity = Math.round(sal * 0.25)
  const tribunal     = Math.round(sal * 0.75)
  const totalPerHire = recruitment + training + productivity + tribunal
  const failCount    = Math.max(1, Math.round(c * 0.2))
  const totalExposure = totalPerHire * failCount

  const BREAK = [
    { label: 'Recruitment cost',       value: recruitment,  note: '15% of salary',          color: AMB, bg: AMBBG },
    { label: 'Training and onboarding', value: training,    note: 'Average cost per hire',   color: AMB, bg: AMBBG },
    { label: 'Lost productivity',      value: productivity, note: 'Roughly 3 months in role', color: AMB, bg: AMBBG },
    { label: 'ERA 2025 tribunal risk', value: tribunal,     note: 'Uncapped from Jan 2027',  color: RED, bg: REDBG },
  ]

  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          ERA 2025 risk calculator
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Average salary</label>
            <div style={{ position: 'relative', width: 160 }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: TX3, pointerEvents: 'none' }}>£</span>
              <input type="text" value={salary} onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setSalFocused(true)} onBlur={() => setSalFocused(false)} style={{ ...inp(salFocused), paddingLeft: 26 }} placeholder="35000" />
            </div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>Hires this year</label>
            <input type="text" value={count} onChange={e => setCount(e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setCountFocused(true)} onBlur={() => setCountFocused(false)} style={{ ...inp(countFocused), width: 100 }} placeholder="8" />
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: RED, lineHeight: 1 }}>{gbp(totalExposure)}</div>
            <div style={{ fontSize: 11.5, color: TX3, marginTop: 3 }}>{failCount} of {c} hire{c !== 1 ? 's' : ''} failing, 20% industry average</div>
          </div>
        </div>
        <button onClick={() => setShowBreakdown(!showBreakdown)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F, padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BREAK.map(({ label, value, note, color, bg }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: bg, border: `1px solid ${color}33`, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: TX3, marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>{gbp(value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DemoDashboardInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [demoType, setDemoType] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prodicta_demo_account_type')
      if (saved === 'employer' || saved === 'agency') return saved
    }
    return searchParams.get('type') === 'employer' ? 'employer' : 'agency'
  })
  const isAgency = demoType === 'agency'
  const [demoEmploymentType, setDemoEmploymentTypeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('prodicta_demo_employment_type')
        if (saved === 'temporary' || saved === 'permanent' || saved === 'both') return saved
      } catch {}
    }
    return 'both'
  })
  const setDemoEmploymentType = (value) => {
    setDemoEmploymentTypeState(value)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('prodicta_demo_employment_type', value) } catch {}
    }
  }
  const demoHasTempWork = demoEmploymentType === 'temporary' || demoEmploymentType === 'both'
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterAssessmentId, setFilterAssessmentId] = useState(null)
  const [modal, setModal] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState(new Set())
  const [activeFilter, setActiveFilter] = useState(null) // { type: 'health', value: 'GREEN' } | { type: 'verdict', value: 'strong' } | null
  const [demoHealthTooltip, setDemoHealthTooltip] = useState(null)

  // Demo placement health: traffic light per candidate id
  // James O'Brien (demo-c4) is one of the AMBER cases as per the brief.
  const DEMO_PLACEMENT_HEALTH = {
    'demo-c1':  { health_status: 'GREEN', health_reason: 'Co-pilot check-ins on track. Performing as predicted.' },
    'demo-c2':  { health_status: 'GREEN', health_reason: 'Within rebate period. No concerns recorded.' },
    'demo-c3':  { health_status: 'AMBER', health_reason: 'Manager review positive overall but flagged occasional missed deadlines in week 3 check-in.' },
    'demo-c4':  { health_status: 'AMBER', health_reason: "James O'Brien, early signs of accountability avoidance. Predicted in assessment." },
    'demo-c5':  { health_status: 'GREEN', health_reason: 'Steady performer. No deviation from prediction.' },
    'demo-c10': { health_status: 'GREEN', health_reason: 'Strong placement. Hire confidence confirmed in practice.' },
    'demo-c11': { health_status: 'RED',   health_reason: 'Redline alert: significant deviation from prediction. Intervention not yet actioned.' },
  }

  // Demo attendance risk data for temp workers
  const DEMO_ATTENDANCE_RISK = {
    'demo-c4': { reliability_score: 75, attendance_risk: 'monitor' },  // James O'Brien, 2 lates
    'demo-c11': { reliability_score: 55, attendance_risk: 'high' },    // Alex Turner, absences
  }

  // Demo client share data
  const DEMO_CLIENT_SHARE = {
    'demo-c4': true,  // James O'Brien has a share link active
  }

  // Demo EDI certified assessments
  const DEMO_EDI_CERTIFIED = new Set(['demo-assess-1', 'demo-assess-2'])

  // Exclude archived from main view
  const allActiveCandidates = DEMO_CANDIDATES.filter(c => c.status !== 'archived')
  const activeCandidates = demoEmploymentType === 'both'
    ? allActiveCandidates
    : allActiveCandidates.filter(c => c.assessments?.employment_type === demoEmploymentType)
  const completed = activeCandidates.filter(c => c.status === 'completed')
  const pendingCandidates = activeCandidates.filter(c => c.status === 'pending')

  const avgScore = completed.length
    ? Math.round(completed.reduce((s, c) => s + (c.results?.[0]?.overall_score ?? 0), 0) / completed.length)
    : null
  const recommendedCount = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length

  // Verdict classification
  function getVerdict(c) {
    const r = Array.isArray(c.results) ? c.results[0] : c.results
    if (!r || r.overall_score == null) return null
    const s = r.overall_score
    const rl = r.risk_level
    if (s >= 75 && (rl === 'Low' || rl === 'Very Low')) return 'strong'
    if (s < 55 || rl === 'High') return 'risk'
    return 'maybe'
  }

  const verdictCounts = { strong: 0, maybe: 0, risk: 0 }
  activeCandidates.forEach(c => {
    const v = getVerdict(c)
    if (v) verdictCounts[v]++
  })

  // Filter by assessment tab + search
  const byAssessment = filterAssessmentId
    ? activeCandidates.filter(c => c.assessments?.id === filterAssessmentId)
    : activeCandidates
  const searchedDemo = search.trim()
    ? byAssessment.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : byAssessment
  const filtered = activeFilter?.type === 'verdict'
    ? searchedDemo.filter(c => getVerdict(c) === activeFilter.value)
    : searchedDemo

  // Separate list for Placement Health filtered view (agency only, replaces main table)
  const healthFilteredCandidates = activeFilter?.type === 'health'
    ? activeCandidates.filter(c => DEMO_PLACEMENT_HEALTH[c.id]?.health_status === activeFilter.value)
    : []
  const healthFilterLabel = activeFilter?.type === 'health'
    ? { GREEN: 'Healthy Placements', AMBER: 'At Risk Placements', RED: 'Critical Placements' }[activeFilter.value]
    : ''

  // Separate list for Candidate Pipeline filtered view (replaces main table)
  const verdictFilteredCandidates = activeFilter?.type === 'verdict'
    ? activeCandidates.filter(c => getVerdict(c) === activeFilter.value)
    : []
  const verdictFilterLabel = activeFilter?.type === 'verdict'
    ? { strong: 'Strong Hire Candidates', maybe: 'Review Candidates', risk: 'High Risk Candidates' }[activeFilter.value]
    : ''

  useEffect(() => { setSelectedCandidates(new Set()) }, [activeFilter])

  const flaggedCandidates = activeCandidates.filter(c => {
    const r = Array.isArray(c.results) ? c.results[0] : c.results
    if (!r) return false
    return (r.overall_score != null && r.overall_score < 55) || r.risk_level === 'High'
  })

  return (
    <DemoLayout active="dashboard" demoEmploymentType={demoEmploymentType}>
      {modal && <SignUpModal onClose={() => setModal(false)} />}

      <main style={{ marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 96 : 46, padding: isMobile ? '16px 16px 32px' : '32px 40px', minHeight: '100vh', background: BG, flex: 1, minWidth: 0 }}>

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

        {/* Account type toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, background: CARD, borderRadius: 10, border: `1.5px solid ${BD}`, padding: 3, width: 'fit-content' }}>
          {[{ key: 'agency', label: 'Recruitment Agency' }, { key: 'employer', label: 'Direct Employer' }].map(opt => (
            <button
              key={opt.key}
              onClick={() => { setDemoType(opt.key); localStorage.setItem('prodicta_demo_account_type', opt.key); window.history.replaceState(null, '', `/demo?type=${opt.key}`) }}
              style={{
                fontFamily: F, fontSize: 13.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                padding: '9px 22px', borderRadius: 8, transition: 'all 0.15s',
                background: demoType === opt.key ? TEAL : 'transparent',
                color: demoType === opt.key ? NAVY : TX3,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Employment type toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
          <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, marginRight: 8 }}>Default to:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: CARD, borderRadius: 10, border: `1.5px solid ${BD}`, padding: 3 }}>
            {[{ key: 'permanent', label: 'Permanent' }, { key: 'temporary', label: 'Temporary' }, { key: 'both', label: 'Both' }].map(opt => (
              <button
                key={opt.key}
                onClick={() => setDemoEmploymentType(opt.key)}
                style={{
                  fontFamily: F, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  padding: '8px 18px', borderRadius: 8, transition: 'all 0.15s',
                  background: demoEmploymentType === opt.key ? (opt.key === 'temporary' ? TEAL : NAVY) : 'transparent',
                  color: demoEmploymentType === opt.key ? '#fff' : TX3,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Proof statement banner (both) ── */}
        {!(() => { try { return localStorage.getItem('prodicta_demo_proof_dismissed') } catch { return false } })() && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '12px 20px', marginBottom: 16,
            background: NAVY, borderRadius: 10, borderLeft: `4px solid ${TEAL}`,
          }}>
            <p style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
              Most hiring decisions are based on opinion. <span style={{ fontWeight: 700, color: TEAL }}>PRODICTA gives you proof.</span>
            </p>
            <button onClick={e => { e.currentTarget.parentElement.style.display = 'none'; try { localStorage.setItem('prodicta_demo_proof_dismissed', '1') } catch {} }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <Ic name="x" size={16} color="rgba(255,255,255,0.35)" />
            </button>
          </div>
        )}

        {/* ── Motivational line (persona-specific) ── */}
        {!(() => { try { return localStorage.getItem(isAgency ? 'prodicta_demo_motto_dismissed' : 'prodicta_demo_employer_motto_dismissed') } catch { return false } })() && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '14px 20px', marginBottom: 20,
            background: NAVY, borderRadius: 10, borderLeft: `4px solid ${TEAL}`,
          }}>
            <p style={{ fontFamily: F, fontSize: 16, fontWeight: 500, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
              {isAgency
                ? 'We told you this placement could fail. Now you can stop it.'
                : 'You knew before you hired them. That is the difference.'}
            </p>
            <button onClick={e => { e.currentTarget.parentElement.style.display = 'none'; try { localStorage.setItem(isAgency ? 'prodicta_demo_motto_dismissed' : 'prodicta_demo_employer_motto_dismissed', '1') } catch {} }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
              <Ic name="x" size={16} color="rgba(255,255,255,0.35)" />
            </button>
          </div>
        )}

        {/* ── Today's Actions (agency only) ── */}
        {isAgency && (() => {
          const demoActions = [
            { priority: 'urgent', text: "James O'Brien at DemoRecruit is critical. Placement health RED.", link: '/demo/candidate/demo-c4?type=agency' },
            { priority: 'today', text: 'SSP check needed for Tom Fletcher.', link: '/ssp' },
            { priority: 'today', text: 'Week 4 review overdue for Aisha Johnson.', link: '/demo/candidate/demo-c7?type=agency' },
            { priority: 'week', text: 'Rebate period ends Friday for Sophie Chen.', link: '/demo/candidate/demo-c1?type=agency' },
            { priority: 'week', text: 'Pre-start check needed for Ryan Murphy starting Thursday.', link: '/demo/candidate/demo-c8?type=agency' },
          ]
          return (
            <div style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
              padding: isMobile ? '18px 16px' : '22px 26px', marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    Today's Actions
                    <InfoTooltip text="A prioritised list of everything that needs your attention today. URGENT actions need immediate response. TODAY actions should be handled before end of day." />
                  </h2>
                  <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '4px 0 0' }}>
                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. Here is what needs your attention.
                  </p>
                </div>
                <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: RED, background: REDBG, padding: '3px 10px', borderRadius: 50 }}>
                  {demoActions.length} actions
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {demoActions.map((a, i) => {
                  const pc = a.priority === 'urgent' ? RED : a.priority === 'today' ? AMB : GRN
                  const pbg = a.priority === 'urgent' ? REDBG : a.priority === 'today' ? AMBBG : GRNBG
                  const plabel = a.priority === 'urgent' ? 'URGENT' : a.priority === 'today' ? 'TODAY' : 'THIS WEEK'
                  return (
                    <div key={i} onClick={() => router.push(a.link)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      background: CARD, border: `1px solid ${BD}`,
                      borderLeft: `4px solid ${pc}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = BG}
                    onMouseLeave={e => e.currentTarget.style.background = CARD}
                    >
                      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, flexShrink: 0, background: pbg, color: pc }}>{plabel}</span>
                      <span style={{ fontFamily: F, fontSize: 13, color: TX, flex: 1, lineHeight: 1.4 }}>{a.text}</span>
                      <Ic name="right" size={14} color={TX3} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard icon="check" label="Completed" value={completed.length} sub="Completed assessments" accent={TEAL} fillPercent={activeCandidates.length > 0 ? Math.round((completed.length / activeCandidates.length) * 100) : 0} />
          <StatCard icon="clock" label="Pending" value={pendingCandidates.length} sub="Awaiting completion" accent={AMB} fillPercent={activeCandidates.length > 0 ? Math.round((pendingCandidates.length / activeCandidates.length) * 100) : 0} />
          <StatCard icon="bar" label="Avg score" value={avgScore !== null ? avgScore : '-'} sub={avgScore !== null ? slabel(avgScore) : 'No data yet'} accent="#6366F1" fillPercent={avgScore ?? 0} />
          <StatCard icon="award" label="Recommended" value={recommendedCount} sub="Scoring 70 or above" accent={TEAL} fillPercent={completed.length > 0 ? Math.round((recommendedCount / completed.length) * 100) : 0} />
        </div>


        {/* ── Quick Actions (agency only) ── */}
        {isAgency && (() => {
          return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
              {(demoHasTempWork ? [
                { icon: 'alert', label: 'Report Sickness', desc: 'Create SSP alert', color: AMB, bg: AMBBG },
                { icon: 'clock', label: 'Log Attendance', desc: 'Daily attendance', color: GRN, bg: GRNBG },
                { icon: 'users', label: 'Replace Worker', desc: 'Find a replacement', color: RED, bg: REDBG },
                { icon: 'send', label: 'Client Update', desc: 'Share placement link', color: NAVY, bg: BG },
              ] : [
                { icon: 'alert', label: 'Report Sickness', desc: 'Create SSP alert', color: AMB, bg: AMBBG },
                { icon: 'send', label: 'Client Update', desc: 'Share report with client', color: NAVY, bg: BG },
                { icon: 'file-text', label: 'Interview Brief', desc: 'Generate interview brief', color: GRN, bg: GRNBG },
                { icon: 'zap', label: 'Highlight Reel', desc: 'Copy shareable link', color: GRN, bg: GRNBG },
              ]).map(a => (
                <button key={a.label} onClick={() => setModal(true)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: isMobile ? '18px 12px' : '20px 16px', borderRadius: 12,
                  border: `1.5px solid ${BD}`, background: CARD, cursor: 'pointer',
                  transition: 'all 0.15s', textAlign: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = a.bg; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = CARD; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ic name={a.icon} size={20} color={a.color} />
                  </div>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>{a.label}</div>
                  <div style={{ fontFamily: F, fontSize: 11, color: TX3 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>
          )
        })()}

        {/* Red flag banner */}
        {flaggedCandidates.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: `1.5px solid #fecaca`,
            borderLeft: `4px solid ${RED}`, borderRadius: '0 12px 12px 0',
            padding: isMobile ? '14px 16px' : '16px 24px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ic name="alert" size={16} color={RED} />
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: RED }}>
                {flaggedCandidates.length} candidate{flaggedCandidates.length !== 1 ? 's' : ''} flagged for review
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {flaggedCandidates.map(c => {
                const r = Array.isArray(c.results) ? c.results[0] : c.results
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 6 : 12, padding: '10px 14px',
                    background: '#fff', border: `1px solid #fecaca`, borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>{c.name}</span>
                      <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: RED }}>{r?.overall_score ?? '-'}/100</span>
                      {r?.risk_level === 'High' && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: RED, background: REDBG, border: `1px solid #fecaca`, padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase' }}>High risk</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/demo/candidate/${c.id}?type=${demoType}`)
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                        background: '#fff', color: TX2, fontFamily: F, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      View report
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Risk Calculator */}
        <RiskCalculator isAgency={isAgency} />

        {/* Hiring Cost Saved + Cost of Vacancy */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: NAVY, borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Hiring cost saved</div>
            <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, color: TEAL, lineHeight: 1, marginBottom: 6 }}>£86,400</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>Estimated savings this quarter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Bad hires avoided', value: '3', note: 'Candidates scored below threshold and not hired' },
                { label: 'Avg cost per bad hire', value: '£28,800', note: 'Recruitment, training, lost productivity' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.note}</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: TEAL }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: NAVY, borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Cost of vacancy</div>
            <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, color: AMB, lineHeight: 1, marginBottom: 6 }}>£4,800</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>Average cost per week a role stays unfilled</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Open roles', value: '2', note: 'Currently unfilled positions' },
                { label: 'Avg weeks open', value: '6.5', note: 'Time from vacancy to offer' },
                { label: 'Total vacancy cost', value: '£62,400', note: 'Across all open roles this quarter' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.note}</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: AMB }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Speed to Offer */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Speed to offer</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, color: TX2, marginBottom: 4 }}>With PRODICTA</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: TEAL }}>5.2</span>
                <span style={{ fontSize: 12, color: TX3 }}>days avg from assessment to offer</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: TX2, marginBottom: 4 }}>Traditional process</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: TX3 }}>18.4</span>
                <span style={{ fontSize: 12, color: TX3 }}>days avg industry benchmark</span>
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: TEALD, fontWeight: 700 }}>72% faster time to offer</div>
          </div>
        </div>

        {/* Candidate Pipeline (employer only, after Speed to Offer / before Prediction Accuracy) */}
        {!isAgency && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Candidate Pipeline
            </div>
            <div style={{ display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
              {[
                { key: 'strong', count: verdictCounts.strong, label: 'Strong Hire', sub: 'Ready to interview', accent: '#00BFA5' },
                { key: 'maybe', count: verdictCounts.maybe, label: 'Review', sub: 'Needs a closer look', accent: '#D97706' },
                { key: 'risk', count: verdictCounts.risk, label: 'High Risk', sub: 'Proceed with caution', accent: '#B91C1C' },
              ].map(v => {
                const active = activeFilter?.type === 'verdict' && activeFilter.value === v.key
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => { if (activeFilter?.type === 'verdict' && activeFilter.value === v.key) { setActiveFilter(null) } else { setActiveFilter({ type: 'verdict', value: v.key }) } }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)' } }}
                    style={{
                      flex: isMobile ? undefined : 1,
                      width: isMobile ? '100%' : undefined,
                      background: active ? `${v.accent}14` : '#fff',
                      border: '1px solid #E5E7EB',
                      borderLeft: `${active ? 6 : 4}px solid ${v.accent}`,
                      borderRadius: 12, padding: '20px 22px', textAlign: 'left',
                      cursor: 'pointer', fontFamily: F,
                      boxShadow: active ? '0 8px 24px rgba(0,0,0,0.13)' : '0 4px 16px rgba(0,0,0,0.10)',
                      transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
                      transform: active ? 'translateY(-2px)' : 'none',
                      opacity: activeFilter?.type === 'verdict' && !active ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: v.accent }}>{v.count}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color: NAVY }}>{v.label}</div>
                    <div style={{ fontSize: 12, color: TX3 }}>{v.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Employer: verdict filtered results (directly after employer pipeline cards) */}
        {!isAgency && activeFilter?.type === 'verdict' && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>{verdictFilterLabel}</h2>
                <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{verdictFilteredCandidates.length} candidate{verdictFilteredCandidates.length !== 1 ? 's' : ''}</div>
              </div>
              <button type="button" onClick={() => setActiveFilter(null)} style={{ background: 'none', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 14px', fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'pointer' }}>
                Clear filter
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: isMobile ? '45%' : '28%' }} />
                <col style={{ width: '20%', display: isMobile ? 'none' : undefined }} />
                <col style={{ width: isMobile ? '25%' : '14%' }} />
                <col style={{ width: isMobile ? '30%' : '10%' }} />
                <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
                <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BD}` }}>
                  {[{ h: 'Candidate', hide: false }, { h: 'Role', hide: true }, { h: 'Status', hide: false }, { h: 'Score', hide: false }, { h: 'Pressure', hide: true }, { h: 'Risk', hide: true }].map(({ h, hide }) => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG, display: hide && isMobile ? 'none' : 'table-cell' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verdictFilteredCandidates.map((c, i) => {
                  const result = c.results?.[0]; const score = result?.overall_score ?? null; const pf = result?.pressure_fit_score ?? null; const risk = result?.risk_level ?? null
                  const isCompleted = c.status === 'completed'; const isHovered = hoveredRow === c.id
                  return (
                    <tr key={c.id} onClick={() => { if (isCompleted) router.push(`/demo/candidate/${c.id}?type=${demoType}`) }} onMouseEnter={() => setHoveredRow(c.id)} onMouseLeave={() => setHoveredRow(null)} style={{ borderBottom: i < verdictFilteredCandidates.length - 1 ? `1px solid ${BD}` : 'none', background: isHovered && isCompleted ? '#f0fdfb' : CARD, cursor: isCompleted ? 'pointer' : 'default', transition: 'background 0.15s', boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none' }}>
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={c.name} size={28} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: TX, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span><span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: c.assessments?.employment_type === 'temporary' ? TEALLT : '#f0f4f8', color: c.assessments?.employment_type === 'temporary' ? TEALD : NAVY, letterSpacing: '0.04em' }}>{c.assessments?.employment_type === 'temporary' ? 'TEMP' : 'PERM'}</span>{isAgency && c.assessments?.employment_type === 'temporary' && DEMO_ATTENDANCE_RISK[c.id] && (() => { const att = DEMO_ATTENDANCE_RISK[c.id]; const attColor = att.attendance_risk === 'high' ? RED : att.attendance_risk === 'monitor' ? AMB : GRN; const attLabel = att.attendance_risk === 'high' ? 'At Risk' : att.attendance_risk === 'monitor' ? 'Monitor' : 'Reliable'; return <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.04em', padding: '1px 5px', borderRadius: 4, flexShrink: 0, background: `${attColor}18`, color: attColor, border: `1px solid ${attColor}44` }} title={`Reliability: ${att.reliability_score}/100`}>{attLabel}</span> })()}{isAgency && c.assessments?.employment_type === 'temporary' && DEMO_CLIENT_SHARE[c.id] && <span style={{ fontSize: 8, flexShrink: 0 }} title="Client share link active"><Ic name="send" size={10} color={TEALD} /></span>}</div><div style={{ fontSize: 11, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div></div></div></td>
                      <td style={{ padding: '10px 8px', overflow: 'hidden', display: isMobile ? 'none' : 'table-cell' }}><span style={{ fontSize: 12, color: TX2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.assessments?.role_title || '-'}</span></td>
                      <td style={{ padding: '10px 8px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '10px 8px' }}>{isCompleted && score !== null ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}><span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>{score}</span><span style={{ fontSize: 10, color: TX3 }}>/100</span></div> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                      <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>{isCompleted && pf !== null ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}><span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1, color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED }}>{pf}</span><span style={{ fontSize: 10, color: TX3 }}>/100</span></div> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                      <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>{isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Prediction Accuracy */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px', marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Prediction accuracy</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '18px 0' }}>
            <Ic name="bar" size={28} color={BD} />
            <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '12px 0 0', lineHeight: 1.55 }}>Available when 3+ outcomes are logged. Track whether PRODICTA predictions matched real hiring outcomes.</p>
          </div>
        </div>

        {/* Agency-only sections */}
        {isAgency && (
          <>
            {/* Placement Health (traffic light) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Placement Health
                <InfoTooltip text="A live traffic light showing the health of every active placement. Green means on track. Amber means at risk. Red means critical action needed." />
              </div>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
                {[
                  { key: 'GREEN', label: 'Healthy',  count: 4, accent: '#00BFA5', sub: 'Performing as predicted' },
                  { key: 'AMBER', label: 'At Risk',  count: 2, accent: '#D97706', sub: 'Early warning signals' },
                  { key: 'RED',   label: 'Critical', count: 1, accent: '#B91C1C', sub: 'Immediate action required' },
                ].map(c => {
                  const isActive = activeFilter?.type === 'health' && activeFilter.value === c.key
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => { if (activeFilter?.type === 'health' && activeFilter.value === c.key) { setActiveFilter(null) } else { setActiveFilter({ type: 'health', value: c.key }) } }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)' } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)' } }}
                      style={{
                        flex: isMobile ? undefined : 1,
                        width: isMobile ? '100%' : undefined,
                        background: isActive ? `${c.accent}14` : '#fff',
                        border: '1px solid #E5E7EB',
                        borderLeft: `${isActive ? 6 : 4}px solid ${c.accent}`,
                        borderRadius: 12, padding: '20px 22px', textAlign: 'left',
                        cursor: 'pointer', fontFamily: F,
                        boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.13)' : '0 4px 16px rgba(0,0,0,0.10)',
                        transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
                        transform: isActive ? 'translateY(-2px)' : 'none',
                        opacity: activeFilter?.type === 'health' && !isActive ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: c.accent }}>{c.count}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color: NAVY }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: TX3 }}>{c.sub}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 14, fontSize: 12.5, color: TX3, fontFamily: F }}>
                <strong style={{ color: TX2 }}>7</strong> placements active.{' '}
                <strong style={{ color: TX2 }}>2</strong> rebate periods ending this month.
              </div>
            </div>

            {/* Placement Health filtered results (replaces All Candidates table) */}
            {activeFilter?.type === 'health' && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>{healthFilterLabel}</h2>
                    <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{healthFilteredCandidates.length} candidate{healthFilteredCandidates.length !== 1 ? 's' : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFilter(null)}
                    style={{ background: 'none', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 14px', fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'pointer' }}
                  >
                    Clear filter
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: isMobile ? '45%' : '28%' }} />
                    <col style={{ width: '20%', display: isMobile ? 'none' : undefined }} />
                    <col style={{ width: isMobile ? '25%' : '14%' }} />
                    <col style={{ width: isMobile ? '30%' : '10%' }} />
                    <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
                    <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BD}` }}>
                      {[
                        { h: 'Candidate', hide: false },
                        { h: 'Role', hide: true },
                        { h: 'Status', hide: false },
                        { h: 'Score', hide: false },
                        { h: 'Risk', hide: true },
                        { h: 'Health', hide: true },
                      ].map(({ h, hide }) => (
                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG, display: hide && isMobile ? 'none' : 'table-cell' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {healthFilteredCandidates.map((c, i) => {
                      const result = c.results?.[0]
                      const score = result?.overall_score ?? null
                      const risk = result?.risk_level ?? null
                      const isCompleted = c.status === 'completed'
                      const isHovered = hoveredRow === c.id
                      const h = DEMO_PLACEMENT_HEALTH[c.id]
                      const healthColor = h?.health_status === 'GREEN' ? '#16a34a' : h?.health_status === 'AMBER' ? '#E8B84B' : h?.health_status === 'RED' ? '#dc2626' : '#cbd5e1'
                      return (
                        <tr
                          key={c.id}
                          onClick={() => { if (isCompleted) router.push(`/demo/candidate/${c.id}?type=${demoType}`) }}
                          onMouseEnter={() => setHoveredRow(c.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ borderBottom: i < healthFilteredCandidates.length - 1 ? `1px solid ${BD}` : 'none', background: isHovered && isCompleted ? '#f0fdfb' : CARD, cursor: isCompleted ? 'pointer' : 'default', transition: 'background 0.15s', boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none' }}
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
                          <td style={{ padding: '10px 8px', overflow: 'hidden', display: isMobile ? 'none' : 'table-cell' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                              <span style={{ fontSize: 12, color: TX2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.assessments?.role_title || '-'}</span>
                              {c.assessments?.id && DEMO_EDI_CERTIFIED.has(c.assessments.id) && (
                                <span title="Bias-Free Certificate" style={{ flexShrink: 0 }}><Ic name="shield" size={12} color={GRN} /></span>
                              )}
                            </div>
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
                          <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>
                            {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                          </td>
                          <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 11.5, color: TX2, fontWeight: 600 }}>{h?.health_reason ? h.health_reason.split('.')[0] : '-'}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic name="award" size={16} color={TEAL} />
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>Auto Shortlist</h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: TX3 }}>AI-ranked top candidates for Marketing Manager</p>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { rank: 1, name: 'Sophie Chen', score: 92, reason: 'Strongest pressure-fit. Handled every scenario with clear priorities and structured responses. Top performer likelihood 94%.' },
                  { rank: 2, name: 'David Park', score: 81, reason: 'Strong communication and stakeholder management. Slight hesitation under time pressure but self-corrected effectively.' },
                  { rank: 3, name: 'Rachel Adams', score: 74, reason: 'Solid technical skills. Development area around delegation, but high training potential score suggests rapid improvement.' },
                ].map(c => (
                  <div key={c.rank} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px', background: c.rank === 1 ? TEALLT : BG, border: `1px solid ${c.rank === 1 ? `${TEAL}55` : BD}`, borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.rank === 1 ? TEAL : BD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 14, fontWeight: 800, color: c.rank === 1 ? NAVY : TX3, flexShrink: 0 }}>{c.rank}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TX }}>{c.name}</span>
                        <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: scolor(c.score) }}>{c.score}/100</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>{c.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rebate Period Tracker */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic name="clock" size={16} color={TEAL} />
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>Rebate Period Tracker</h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: TX3 }}>Active placements tracked through their rebate window</p>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { name: 'Sophie Chen', client: 'Acme Corp', role: 'Marketing Manager', week: 6, total: 12, status: 'On track' },
                  { name: 'David Park', client: 'Nexus Ltd', role: 'Sales Executive', week: 10, total: 12, status: 'Nearing end' },
                  { name: 'Tom Walsh', client: 'Bright HR', role: 'Customer Service Team Leader', week: 12, total: 12, status: 'Rebate cleared' },
                ].map(p => {
                  const pct = Math.round((p.week / p.total) * 100)
                  const col = p.status === 'Rebate cleared' ? GRN : p.status === 'Nearing end' ? AMB : TEAL
                  return (
                    <div key={p.name} style={{ padding: '12px 16px', background: BG, border: `1px solid ${BD}`, borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: TX }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: TX3, marginLeft: 8 }}>{p.role} at {p.client}</span>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: col, background: `${col}18`, padding: '2px 10px', borderRadius: 20 }}>{p.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 8, background: `${col}22`, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TX3, flexShrink: 0 }}>Week {p.week}/{p.total}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Agency: Outcome Tracking + Red Flag Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Outcome tracking</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: TEAL }}>3</span>
                  <span style={{ fontSize: 13, color: TX2 }}>check-ins pending</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { name: 'Sophie Chen', due: '3-month check-in', client: 'Acme Corp' },
                    { name: 'David Park', due: '6-month check-in', client: 'Nexus Ltd' },
                    { name: 'Rachel Adams', due: '12-month check-in', client: 'Bright HR' },
                  ].map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: TX3 }}>{c.due} at {c.client}</div>
                      </div>
                      <Ic name="chevron-right" size={14} color={TEALD} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Red flag email alerts</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 8, marginBottom: 10 }}>
                  <Ic name="alert" size={16} color={RED} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>1 candidate scored below threshold this week</div>
                    <div style={{ fontSize: 11.5, color: TX3 }}>Tom Walsh, Customer Service Team Leader, scored 47/100</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: TX3, margin: 0, lineHeight: 1.5 }}>Automatic notifications when a candidate scores below your threshold. Configure thresholds in Settings.</p>
              </div>
            </div>

            {/* Pre-Start Risk panel (agency + temporary only) */}
            {demoHasTempWork && (
            <div style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
              borderTop: '3px solid #D97706', padding: isMobile ? '14px 16px' : '20px 24px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ic name="shield" size={15} color={AMB} />
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TX }}>Pre-Start Checks</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: AMB, background: AMBBG, border: `1px solid ${AMBBD}`, padding: '1px 8px', borderRadius: 50 }}>1</span>
              </div>
              <div style={{
                display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 6 : 12, padding: '10px 14px',
                background: BG, border: `1px solid ${BD}`, borderRadius: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>Aisha Johnson</div>
                  <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>Sales Executive</div>
                  <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginTop: 2 }}>Starts 19 Apr (3 days)</div>
                </div>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, fontFamily: F, background: AMBBG, color: AMB, border: `1px solid ${AMBBD}` }}>Medium Risk</span>
                <button onClick={() => setModal(true)} style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${TEAL}`, background: TEALLT, fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, cursor: 'pointer', flexShrink: 0 }}>
                  View Check
                </button>
              </div>
            </div>
            )}

            {/* Pre-Start Engagement panel (agency + temporary, demo) */}
            {demoHasTempWork && (
            <div style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
              borderTop: `3px solid ${TEAL}`, padding: isMobile ? '14px 16px' : '20px 24px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ic name="pulse" size={15} color={TEAL} />
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TX }}>Pre-Start Engagement</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, background: TEALLT, border: `1px solid ${TEAL}55`, padding: '1px 8px', borderRadius: 50 }}>1</span>
                <InfoTooltip text="Tracks candidate engagement between offer and start date. Three automated pulses are sent to the candidate. Low engagement signals ghosting or counter-offer risk." />
              </div>
              <div style={{
                display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 6 : 12, padding: '10px 14px',
                background: BG, border: `1px solid ${BD}`, borderRadius: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>Aisha Johnson</div>
                  <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>Sales Executive</div>
                  <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginTop: 2 }}>Starts 19 Apr (3 days)</div>
                  {/* Pulse status indicators */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {[
                      { num: 1, label: 'Confirmed', color: GRN },
                      { num: 2, label: 'No response', color: RED },
                      { num: 3, label: 'Pending', color: BD },
                    ].map(p => (
                      <div key={p.num} title={`Pulse ${p.num}: ${p.label}`} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                        borderRadius: 50, background: `${p.color}14`, border: `1px solid ${p.color}44`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                        <span style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: p.color }}>P{p.num}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 50,
                  fontSize: 10, fontWeight: 800, fontFamily: F, flexShrink: 0,
                  background: AMBBG, color: AMB, border: `1px solid ${AMBBD}`,
                }}>
                  Medium Risk
                </span>
                <button onClick={() => router.push('/demo/candidate/demo-c7?type=agency')} style={{
                  padding: '6px 14px', borderRadius: 7, border: `1px solid ${TEAL}`,
                  background: TEALLT, fontFamily: F, fontSize: 12, fontWeight: 700,
                  color: NAVY, cursor: 'pointer', flexShrink: 0,
                }}>
                  View Tracker
                </button>
              </div>
            </div>
            )}

            {/* SSP Alerts panel (agency + temporary) */}
            {demoHasTempWork && (
            <div style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
              borderTop: '3px solid #D97706', padding: isMobile ? '14px 16px' : '20px 24px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ic name="alert" size={15} color="#D97706" />
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TX }}>SSP Alerts</span>
                <InfoTooltip text="Workers reported sick who need an SSP eligibility check. PRODICTA sends automatic reminders if the check is not completed within 24 hours." />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', background: '#fffbeb', border: '1px solid #fbbf24', padding: '1px 8px', borderRadius: 50 }}>1</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 6 : 12, padding: '10px 14px',
                  background: BG, border: `1px solid ${BD}`, borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>James O'Brien</div>
                    <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>Sales Executive</div>
                    <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginTop: 2 }}>Reported sick 14 Apr (2 days ago)</div>
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, fontFamily: F, background: '#fffbeb', color: '#D97706', border: '1px solid #fbbf24' }}>Pending</span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => router.push('/ssp')} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #00BFA5', background: '#e0f7f1', fontFamily: F, fontSize: 12, fontWeight: 700, color: '#0F2137', cursor: 'pointer' }}>
                      Complete SSP Check
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

          </>
        )}

        {/* Bulk Screening + Candidate Pipeline (both agency and employer) */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '16px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic name="sliders" size={16} color={TEAL} />
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>Bulk Screening Mode</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: TX3 }}>{completed.length} candidate{completed.length !== 1 ? 's' : ''} assessed</p>
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 14, marginTop: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            {[
              { key: 'strong', count: verdictCounts.strong, label: 'Strong Hire', sub: 'Ready to interview', accent: '#00BFA5' },
              { key: 'maybe', count: verdictCounts.maybe, label: 'Review', sub: 'Needs a closer look', accent: '#D97706' },
              { key: 'risk', count: verdictCounts.risk, label: 'High Risk', sub: 'Proceed with caution', accent: '#B91C1C' },
            ].map(v => {
              const active = activeFilter?.type === 'verdict' && activeFilter.value === v.key
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => { if (activeFilter?.type === 'verdict' && activeFilter.value === v.key) { setActiveFilter(null) } else { setActiveFilter({ type: 'verdict', value: v.key }) } }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)' } }}
                  style={{
                    flex: isMobile ? undefined : 1,
                    width: isMobile ? '100%' : undefined,
                    background: active ? `${v.accent}14` : '#fff',
                    border: '1px solid #E5E7EB',
                    borderLeft: `${active ? 6 : 4}px solid ${v.accent}`,
                    borderRadius: 12, padding: '20px 22px', textAlign: 'left',
                    cursor: 'pointer', fontFamily: F,
                    boxShadow: active ? '0 8px 24px rgba(0,0,0,0.13)' : '0 4px 16px rgba(0,0,0,0.10)',
                    transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
                    transform: active ? 'translateY(-2px)' : 'none',
                    opacity: activeFilter?.type === 'verdict' && !active ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 6, color: v.accent }}>{v.count}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2, color: NAVY }}>{v.label}</div>
                  <div style={{ fontSize: 12, color: TX3 }}>{v.sub}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Candidate Pipeline filtered results (directly after pipeline cards) */}
        {activeFilter?.type === 'verdict' && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>{verdictFilterLabel}</h2>
                <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{verdictFilteredCandidates.length} candidate{verdictFilteredCandidates.length !== 1 ? 's' : ''}</div>
              </div>
              <button type="button" onClick={() => setActiveFilter(null)} style={{ background: 'none', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 14px', fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'pointer' }}>
                Clear filter
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: isMobile ? '45%' : '28%' }} />
                <col style={{ width: '20%', display: isMobile ? 'none' : undefined }} />
                <col style={{ width: isMobile ? '25%' : '14%' }} />
                <col style={{ width: isMobile ? '30%' : '10%' }} />
                <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
                <col style={{ width: '10%', display: isMobile ? 'none' : undefined }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BD}` }}>
                  {[{ h: 'Candidate', hide: false }, { h: 'Role', hide: true }, { h: 'Status', hide: false }, { h: 'Score', hide: false }, { h: 'Pressure', hide: true }, { h: 'Risk', hide: true }].map(({ h, hide }) => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG, display: hide && isMobile ? 'none' : 'table-cell' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verdictFilteredCandidates.map((c, i) => {
                  const result = c.results?.[0]; const score = result?.overall_score ?? null; const pf = result?.pressure_fit_score ?? null; const risk = result?.risk_level ?? null
                  const isCompleted = c.status === 'completed'; const isHovered = hoveredRow === c.id
                  return (
                    <tr key={c.id} onClick={() => { if (isCompleted) router.push(`/demo/candidate/${c.id}?type=${demoType}`) }} onMouseEnter={() => setHoveredRow(c.id)} onMouseLeave={() => setHoveredRow(null)} style={{ borderBottom: i < verdictFilteredCandidates.length - 1 ? `1px solid ${BD}` : 'none', background: isHovered && isCompleted ? '#f0fdfb' : CARD, cursor: isCompleted ? 'pointer' : 'default', transition: 'background 0.15s', boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none' }}>
                      <td style={{ padding: '10px 8px', overflow: 'hidden' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={c.name} size={28} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12.5, fontWeight: 600, color: TX, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span><span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: c.assessments?.employment_type === 'temporary' ? TEALLT : '#f0f4f8', color: c.assessments?.employment_type === 'temporary' ? TEALD : NAVY, letterSpacing: '0.04em' }}>{c.assessments?.employment_type === 'temporary' ? 'TEMP' : 'PERM'}</span>{isAgency && c.assessments?.employment_type === 'temporary' && DEMO_ATTENDANCE_RISK[c.id] && (() => { const att = DEMO_ATTENDANCE_RISK[c.id]; const attColor = att.attendance_risk === 'high' ? RED : att.attendance_risk === 'monitor' ? AMB : GRN; const attLabel = att.attendance_risk === 'high' ? 'At Risk' : att.attendance_risk === 'monitor' ? 'Monitor' : 'Reliable'; return <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.04em', padding: '1px 5px', borderRadius: 4, flexShrink: 0, background: `${attColor}18`, color: attColor, border: `1px solid ${attColor}44` }} title={`Reliability: ${att.reliability_score}/100`}>{attLabel}</span> })()}{isAgency && c.assessments?.employment_type === 'temporary' && DEMO_CLIENT_SHARE[c.id] && <span style={{ fontSize: 8, flexShrink: 0 }} title="Client share link active"><Ic name="send" size={10} color={TEALD} /></span>}</div><div style={{ fontSize: 11, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div></div></div></td>
                      <td style={{ padding: '10px 8px', overflow: 'hidden', display: isMobile ? 'none' : 'table-cell' }}><span style={{ fontSize: 12, color: TX2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.assessments?.role_title || '-'}</span></td>
                      <td style={{ padding: '10px 8px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '10px 8px' }}>{isCompleted && score !== null ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}><span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>{score}</span><span style={{ fontSize: 10, color: TX3 }}>/100</span></div> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                      <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>{isCompleted && pf !== null ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}><span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1, color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED }}>{pf}</span><span style={{ fontSize: 10, color: TX3 }}>/100</span></div> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                      <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>{isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Employer-only: Probation Tracker + Decision Overrides + Pending Check-ins */}
        {!isAgency && (
          <>
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ic name="clock" size={16} color={TEAL} />
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>Probation Tracker</h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: TX3 }}>Active probation periods for recent hires</p>
              </div>
              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { name: 'Sophie Chen', role: 'Marketing Manager', week: 8, total: 26, status: 'On track' },
                  { name: 'David Park', role: 'Sales Executive', week: 3, total: 26, status: 'On track' },
                  { name: 'Tom Walsh', role: 'Customer Service Team Leader', week: 18, total: 26, status: 'Extended' },
                ].map(p => {
                  const pct = Math.round((p.week / p.total) * 100)
                  const col = p.status === 'Extended' ? AMB : TEAL
                  return (
                    <div key={p.name} style={{ padding: '12px 16px', background: BG, border: `1px solid ${BD}`, borderRadius: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: TX }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: TX3, marginLeft: 8 }}>{p.role}</span>
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: col, background: `${col}18`, padding: '2px 10px', borderRadius: 20 }}>{p.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 8, background: `${col}22`, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TX3, flexShrink: 0 }}>Week {p.week}/{p.total}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Decision overrides</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: AMB }}>1</span>
                  <span style={{ fontSize: 13, color: TX2 }}>override tracked this quarter</span>
                </div>
                <p style={{ fontSize: 12, color: TX3, margin: 0, lineHeight: 1.5 }}>When you hire against the PRODICTA recommendation, the decision is documented for your records.</p>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Pending check-ins</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: TEAL }}>2</span>
                  <span style={{ fontSize: 13, color: TX2 }}>check-ins due this week</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { name: 'Sophie Chen', role: 'Marketing Manager' },
                    { name: 'David Park', role: 'Sales Executive' },
                  ].map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: TX3 }}>{c.role}</div>
                      </div>
                      <Ic name="chevron-right" size={14} color={TEALD} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employer: Probation Co-pilot + Probation Review Generator */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Probation co-pilot</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                  <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: TEALD }}>2</span>
                  <span style={{ fontSize: 13, color: TX2 }}>hires being monitored</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: GRNBG, border: `1px solid ${GRNBD}`, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>Sophie Chen</div>
                      <div style={{ fontSize: 11, color: TX3 }}>Marketing Manager</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: GRN, background: `${GRN}18`, padding: '2px 10px', borderRadius: 20 }}>On track</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>Tom Walsh</div>
                      <div style={{ fontSize: 11, color: TX3 }}>Customer Service Team Leader</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: AMB, background: `${AMB}18`, padding: '2px 10px', borderRadius: 20 }}>At risk</span>
                  </div>
                </div>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Probation review generator</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, marginBottom: 10 }}>
                  <Ic name="calendar" size={16} color={AMB} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>Month 1 review due for Sophie Chen</div>
                    <div style={{ fontSize: 11.5, color: TX3 }}>Marketing Manager, started 12 Mar 2026</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: TX3, margin: 0, lineHeight: 1.5 }}>Auto-generated structured reviews at month 1, 3, and 5, cross-checked against the original PRODICTA assessment.</p>
              </div>
            </div>

            {/* Employer: Red Flag Alerts */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Red flag email alerts</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 8, marginBottom: 10 }}>
                  <Ic name="alert" size={16} color={RED} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>1 candidate scored below threshold this week</div>
                    <div style={{ fontSize: 11.5, color: TX3 }}>Tom Walsh, Customer Service Team Leader, scored 47/100</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: TX3, margin: 0, lineHeight: 1.5 }}>Automatic notifications when a candidate scores below your threshold. Configure thresholds in Settings.</p>
              </div>
            </div>
          </>
        )}

        {/* Candidates table + assessments panel (hidden when any filter card is active) */}
        <div style={{ display: activeFilter ? 'none' : 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined, order: isMobile ? 2 : 1 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>All Candidates</h2>
                  {(search || filterAssessmentId || activeFilter) && <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>}
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
                  <col style={{ width: isMobile ? '8%' : '4%' }} />
                  <col style={{ width: isMobile ? '45%' : '24%' }} />
                  <col style={{ width: '18%', display: isMobile ? 'none' : undefined }} />
                  <col style={{ width: isMobile ? '25%' : '11%' }} />
                  <col style={{ width: isMobile ? '30%' : '8%' }} />
                  <col style={{ width: '8%', display: isMobile ? 'none' : undefined }} />
                  <col style={{ width: '9%', display: isMobile ? 'none' : undefined }} />
                  <col style={{ width: '9%', display: isMobile ? 'none' : undefined }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BD}` }}>
                    <th style={{ padding: '10px 4px', width: 32, background: BG }}>
                      <input
                        type="checkbox"
                        checked={selectedCandidates.size > 0 && filtered.every(c => selectedCandidates.has(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCandidates(new Set(filtered.map(c => c.id)))
                          else setSelectedCandidates(new Set())
                        }}
                        style={{ cursor: 'pointer', accentColor: TEAL }}
                      />
                    </th>
                    {[
                      { h: 'Candidate', hide: false },
                      { h: 'Role', hide: true },
                      { h: 'Status', hide: false },
                      { h: 'Score', hide: false },
                      { h: 'Pressure', hide: true },
                      { h: 'Risk', hide: true },
                      { h: 'Date', hide: true },
                    ].map(({ h, hide }) => (
                      <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: TX3, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', background: BG, display: hide && isMobile ? 'none' : 'table-cell' }}>{h}</th>
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
                        onClick={() => { if (isCompleted) router.push(`/demo/candidate/${c.id}?type=${demoType}`) }}
                        onMouseEnter={() => setHoveredRow(c.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none', background: isHovered && isCompleted ? '#f0fdfb' : CARD, cursor: isCompleted ? 'pointer' : 'default', transition: 'background 0.15s', boxShadow: isHovered && isCompleted ? `inset 3px 0 0 ${TEAL}` : 'none' }}
                      >
                        <td style={{ padding: '10px 4px', width: 32 }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(c.id)}
                            onChange={() => {
                              setSelectedCandidates(prev => {
                                const next = new Set(prev)
                                if (next.has(c.id)) next.delete(c.id)
                                else next.add(c.id)
                                return next
                              })
                            }}
                            style={{ cursor: 'pointer', accentColor: TEAL }}
                          />
                        </td>
                        <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={c.name} size={28} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: TX, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isAgency && (() => {
                                  const h = DEMO_PLACEMENT_HEALTH[c.id]
                                  const palette = h?.health_status === 'GREEN' ? '#16a34a'
                                    : h?.health_status === 'AMBER' ? '#E8B84B'
                                    : h?.health_status === 'RED' ? '#dc2626'
                                    : '#cbd5e1'
                                  const label = h?.health_status === 'GREEN' ? 'Healthy'
                                    : h?.health_status === 'AMBER' ? 'At Risk'
                                    : h?.health_status === 'RED' ? 'Critical'
                                    : 'No probation data yet'
                                  const reason = h?.health_reason || 'No probation data has been recorded for this candidate yet.'
                                  const open = demoHealthTooltip === c.id
                                  return (
                                    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setDemoHealthTooltip(prev => prev === c.id ? null : c.id) }}
                                        title={`${label}: ${reason}`}
                                        aria-label={`Placement health ${label}`}
                                        style={{ width: 10, height: 10, borderRadius: '50%', background: palette, border: 'none', padding: 0, cursor: 'pointer', boxShadow: `0 0 0 2px ${palette}22` }}
                                      />
                                      {open && (
                                        <span style={{ position: 'absolute', top: 16, left: -6, zIndex: 50, background: NAVY, color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, width: 220, fontFamily: F, boxShadow: '0 8px 24px rgba(15,33,55,0.25)', whiteSpace: 'normal' }}>
                                          <div style={{ fontWeight: 700, color: palette, marginBottom: 3, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>{label}</div>
                                          {reason}
                                        </span>
                                      )}
                                    </span>
                                  )
                                })()}
                                {c.name}
                              </div>
                              <div style={{ fontSize: 11, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', overflow: 'hidden', display: isMobile ? 'none' : 'table-cell' }}>
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
                        <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>
                          {isCompleted && pf !== null ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                              <span style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1, color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED }}>{pf}</span>
                              <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                            </div>
                          ) : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>
                          {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '10px 8px', display: isMobile ? 'none' : 'table-cell' }}>
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
          <div style={{ width: isMobile ? '100%' : 268, flexShrink: 0, order: isMobile ? 1 : 2 }}>
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
        {/* Prediction Accuracy */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
          borderTop: `3px solid ${TEAL}`, padding: '20px 24px', marginTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Ic name="shield" size={14} color={TEAL} />
            <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Prediction Accuracy
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
              <svg width={64} height={64} viewBox="0 0 64 64">
                <circle cx={32} cy={32} r={28} fill="none" stroke={BD} strokeWidth={6} />
                <circle cx={32} cy={32} r={28} fill="none" stroke={TEAL} strokeWidth={6}
                  strokeDasharray={`${0.8 * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                  strokeDashoffset={0} strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: TEAL }}>80%</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, marginBottom: 4 }}>
                4 of your last 5 hires matched our prediction
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: TX3, lineHeight: 1.55 }}>
                PRODICTA tracks whether your actual hire outcomes align with our initial assessment predictions.
              </div>
              <a href="/demo" onClick={e => { e.preventDefault(); setModal(true) }} style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TEALD, textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
                Update outcomes
              </a>
            </div>
          </div>
        </div>

        {/* SSP Module Demo (agency + temp only) */}
        {isAgency && demoHasTempWork && (
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
          padding: '20px 24px', marginTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic name="shield" size={14} color={TEAL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SSP Module</span>
            </div>
            <button onClick={() => router.push('/ssp')} style={{ ...bs('secondary', 'sm') }}>
              Open SSP Checker
            </button>
          </div>
          <div style={{ background: BG, borderRadius: 8, padding: '14px 16px', marginBottom: 12, borderLeft: `3px solid ${TEAL}` }}>
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, marginBottom: 4 }}>James O'Brien, Temp Customer Service Advisor</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: F, fontSize: 12, color: TX2 }}>
              <span>Sick date: 8 Apr 2026</span>
              <span>Status: <strong style={{ color: TEAL }}>Eligible from day one</strong></span>
              <span>Weekly SSP: <strong>&pound;98.60</strong></span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/ssp/records')} style={{ ...bs('secondary', 'sm') }}>SSP Records</button>
            <button onClick={() => router.push('/ssp/linked-periods')} style={{ ...bs('secondary', 'sm') }}>Linked Periods</button>
          </div>
        </div>
        )}

        {/* Holiday Pay Tracker Demo */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
          padding: '20px 24px', marginTop: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic name="calendar" size={14} color={TEAL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Holiday Pay Tracker</span>
            </div>
            <button onClick={() => router.push('/holiday')} style={{ ...bs('secondary', 'sm') }}>
              Open Holiday Tracker
            </button>
          </div>
          <div style={{ background: BG, borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${TEAL}` }}>
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, marginBottom: 6 }}>Sophie Chen, Marketing Manager</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: F, fontSize: 12, color: TX2 }}>
              <span>8 of 28 days used</span>
              <span style={{ fontWeight: 700, color: TX }}>20 remaining</span>
            </div>
            <div style={{ width: '100%', height: 6, background: '#e4e9f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '28.6%', height: '100%', background: TEAL, borderRadius: 3 }} />
            </div>
            <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginTop: 6 }}>
              Holiday year: 1 Apr 2026 to 31 Mar 2027 | Records retained for 6 years (HMRC)
            </div>
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedCandidates.size > 0 && (
          <div style={{
            position: 'fixed', bottom: 0, left: isMobile ? 0 : 220, right: 0,
            background: NAVY, padding: isMobile ? '12px 16px' : '14px 32px',
            display: 'flex', alignItems: isMobile ? 'stretch' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12, zIndex: 200,
            boxShadow: '0 -4px 24px rgba(15,33,55,0.25)',
            borderTop: `2px solid ${TEAL}`,
          }}>
            <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {selectedCandidates.size} selected
            </span>
            <div style={{ display: 'flex', gap: 10, flex: 1, justifyContent: isMobile ? 'stretch' : 'flex-end', flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={() => setModal(true)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: TEAL, color: NAVY, opacity: 0.5, cursor: 'default',
                  fontFamily: F, fontSize: 13, fontWeight: 700,
                }}
                disabled
              >
                Copy Shortlist. Available with subscription
              </button>
              <button
                onClick={() => setSelectedCandidates(new Set())}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: `1.5px solid rgba(255,255,255,0.25)`,
                  background: 'transparent', color: '#fff',
                  fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Clear selection
              </button>
            </div>
          </div>
        )}
      </main>
    </DemoLayout>
  )
}

export default function DemoDashboard() {
  return <Suspense><DemoDashboardInner /></Suspense>
}

