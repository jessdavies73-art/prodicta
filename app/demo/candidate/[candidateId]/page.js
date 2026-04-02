'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import ProdictaLogo from '@/components/ProdictaLogo'
import { DemoBanner, DemoSidebar, SignUpModal } from '@/components/DemoShell'
import { DEMO_CANDIDATES, DEMO_RESULTS, DEMO_RESPONSES } from '@/lib/demo-data'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, riskBg, riskCol, riskBd, bs,
} from '@/lib/constants'

/* ── Score colour helpers ─────────────────────────────────────────────────── */
const sc   = s => s >= 85 ? GRN  : s >= 70 ? TEAL : s >= 50 ? AMB  : RED
const sbg  = s => s >= 85 ? GRNBG : s >= 70 ? TEALLT : s >= 50 ? AMBBG : REDBG
const sbd  = s => s >= 85 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 50 ? AMBBD : REDBD
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'

const pfColor = s => s == null ? TX3  : s >= 80 ? GRN  : s >= 55 ? TEALD : RED
const pfLbl   = s => s == null ? ','  : s >= 80 ? 'Strong' : s >= 55 ? 'Moderate' : 'Concern'

const dL  = s => s >= 80 ? 'Strong hire' : s >= 70 ? 'Hire with plan' : s >= 55 ? 'Proceed with caution' : 'Not recommended'
const dC  = s => s >= 80 ? GRN : s >= 70 ? TEAL : s >= 55 ? AMB : RED
const dBg = s => s >= 80 ? GRNBG : s >= 70 ? TEALLT : s >= 55 ? AMBBG : REDBG

const SHADOW = '0 2px 12px rgba(15,33,55,0.08), 0 1px 3px rgba(15,33,55,0.05)'
const SHADOW_LG = '0 4px 24px rgba(15,33,55,0.10), 0 1px 4px rgba(15,33,55,0.06)'

/* ── Reusable primitives ──────────────────────────────────────────────────── */
const Card = ({ children, style = {}, topColor }) => (
  <div className="card-hover" style={{
    background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
    padding: '24px 28px', boxShadow: SHADOW,
    ...(topColor ? { borderTop: `3px solid ${topColor}` } : {}),
    ...style,
  }}>
    {children}
  </div>
)

const SectionHeading = ({ children, tooltip }) => (
  <h2 style={{
    fontFamily: F, fontSize: 15, fontWeight: 800, color: TX,
    margin: '0 0 18px', paddingBottom: 10,
    borderBottom: `2px solid ${TEAL}`,
    letterSpacing: '-0.2px',
    display: 'flex', alignItems: 'center', gap: 6,
  }}>
    {children}
    {tooltip && <InfoTooltip text={tooltip} />}
  </h2>
)

const Badge = ({ label, bg, color, border }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 50,
    fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${border || 'transparent'}`,
  }}>
    {label}
  </span>
)

const EvidenceBox = ({ children }) => (
  <div style={{
    background: '#f8fafc', border: `1px solid ${BD}`, borderLeft: `3px solid ${TEAL}`,
    borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 10,
  }}>
    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
      &ldquo;{children}&rdquo;
    </p>
  </div>
)

const ActionBox = ({ children }) => (
  <div style={{
    background: '#f8fafc', border: `1px solid ${BD}`, borderLeft: `3px solid ${TX3}`,
    borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start',
  }}>
    <Ic name="zap" size={13} color={TX3} />
    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
      <strong>Recommended action:</strong> {children}
    </p>
  </div>
)

function InfoTooltip({ text, light = false }) {
  const [visible, setVisible] = useState(false)
  const tooltipBg = light ? '#1e3a52' : NAVY
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}>
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {visible && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          background: tooltipBg, color: '#fff', fontSize: 12, fontFamily: F, fontWeight: 400, lineHeight: 1.55,
          padding: '9px 13px', borderRadius: 8, width: 240, zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)', pointerEvents: 'none', textAlign: 'left',
          whiteSpace: 'normal', border: light ? '1px solid rgba(255,255,255,0.15)' : 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: `6px solid ${tooltipBg}`,
          }} />
        </span>
      )}
    </span>
  )
}

/* ── Animated score ring ──────────────────────────────────────────────────── */
function ScoreRing({ score, size = 140, strokeWidth = 10, animate = true }) {
  const [display, setDisplay] = useState(0)
  const [drawn, setDrawn] = useState(false)
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - display / 100)
  const color = sc(score)

  useEffect(() => {
    if (!animate) { setDisplay(score); setDrawn(true); return }
    const target = score || 0
    const duration = 1400
    const fps = 60
    const steps = duration / (1000 / fps)
    let step = 0
    setDrawn(true)
    const t = setInterval(() => {
      step++
      const eased = 1 - Math.pow(1 - Math.min(step / steps, 1), 3)
      setDisplay(Math.round(target * eased))
      if (step >= steps) clearInterval(t)
    }, 1000 / fps)
    return () => clearInterval(t)
  }, [score, animate])

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 ${Math.round(size * 0.06)}px ${color}55)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={drawn ? offset : circ}
          style={{ transition: animate ? 'stroke-dashoffset 0.016s linear' : 'none' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>{display}</span>
        <span style={{ fontFamily: F, fontSize: size * 0.08, fontWeight: 700, color: TX3, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>/100</span>
      </div>
    </div>
  )
}

function SmallRing({ score, size = 60, strokeWidth = 5 }) {
  const [drawn, setDrawn] = useState(false)
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const color = sc(score)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 ${Math.round(size * 0.07)}px ${color}50)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={drawn ? circ * (1 - score / 100) : circ}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  )
}

function PFRing({ score, size = 110 }) {
  const [display, setDisplay] = useState(0)
  const [drawn, setDrawn] = useState(false)
  const strokeWidth = 9
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const color = score >= 75 ? GRN : score >= 50 ? AMB : RED
  const offset = circ * (1 - display / 100)
  useEffect(() => {
    const target = score || 0
    const duration = 1300
    const fps = 60
    const steps = duration / (1000 / fps)
    let step = 0
    setDrawn(true)
    const t = setInterval(() => {
      step++
      const eased = 1 - Math.pow(1 - Math.min(step / steps, 1), 3)
      setDisplay(Math.round(target * eased))
      if (step >= steps) clearInterval(t)
    }, 1000 / fps)
    return () => clearInterval(t)
  }, [score])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 ${Math.round(size * 0.07)}px ${color}55)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={drawn ? offset : circ}
          style={{ transition: 'stroke-dashoffset 0.016s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>{display}</span>
        <span style={{ fontFamily: F, fontSize: size * 0.09, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>/100</span>
      </div>
    </div>
  )
}

function AnimBar({ pct, color, height = 6, delay = 0 }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 120 + delay); return () => clearTimeout(t) }, [pct, delay])
  return (
    <div style={{ height, borderRadius: 99, background: `${color}20`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 99, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)', opacity: 0.9 }} />
    </div>
  )
}

function ScrollReveal({ children, delay = 0, id }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.04 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div id={id} ref={ref} style={{ scrollMarginTop: 56, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms` }}>
      {children}
    </div>
  )
}

const NAV_SECTIONS = [
  { id: 'summary',       label: 'Summary' },
  { id: 'integrity',     label: 'Integrity' },
  { id: 'pressure-fit',  label: 'Pressure-Fit' },
  { id: 'ai-assessment', label: 'AI Assessment' },
  { id: 'skills',        label: 'Skills' },
  { id: 'strengths',     label: 'Strengths' },
  { id: 'watchouts',     label: 'Watch-outs' },
  { id: 'onboarding',    label: 'Onboarding' },
  { id: 'questions',     label: 'Questions' },
]

function StickyNav({ active }) {
  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return (
    <div className="no-print" style={{
      position: 'sticky', top: 46, zIndex: 80,
      background: 'rgba(243,245,248,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${BD}`, marginLeft: -40, marginRight: -40, paddingLeft: 40, paddingRight: 40, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV_SECTIONS.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => scrollTo(id)} data-no-lift style={{
              padding: '12px 14px', background: 'transparent', border: 'none',
              borderBottom: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
              cursor: 'pointer', fontFamily: F, fontSize: 12.5,
              fontWeight: isActive ? 700 : 500, color: isActive ? TEAL : TX3,
              whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s', flexShrink: 0, marginBottom: -1,
            }}>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function sevStyle(severity) {
  if (severity === 'High')   return { bg: REDBG,  color: RED,   border: REDBD,  tint: `${RED}08` }
  if (severity === 'Medium') return { bg: AMBBG,  color: AMB,   border: AMBBD,  tint: `${AMB}08` }
  return                            { bg: '#f1f5f9', color: TX3, border: BD,     tint: '#f8fafc' }
}

function ConfidenceBadge({ level }) {
  const map = {
    High:   { color: GRN,  bg: GRNBG,  bd: GRNBD },
    Medium: { color: AMB,  bg: AMBBG,  bd: AMBBD },
    Low:    { color: RED,  bg: REDBG,  bd: REDBD },
  }
  const s = map[level]
  if (!s) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>{level} confidence</span>
}

function TrajectoryBadge({ trajectory }) {
  const map = {
    Improving: { arrow: '↑', color: GRN,  bg: GRNBG,  bd: GRNBD },
    Stable:    { arrow: '→', color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
    Declining: { arrow: '↓', color: RED,  bg: REDBG,  bd: REDBD },
  }
  const s = map[trajectory]
  if (!s) return null
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>{s.arrow} {trajectory} trajectory</span>
}

function SeniorityBadge({ score }) {
  if (score == null) return null
  const color = score >= 75 ? GRN : score >= 50 ? AMB : RED
  const bg    = score >= 75 ? GRNBG : score >= 50 ? AMBBG : REDBG
  const bd    = score >= 75 ? GRNBD : score >= 50 ? AMBBD : REDBD
  const label = score >= 75 ? 'Seniority matched' : score >= 50 ? 'Partial seniority match' : 'Below expected seniority'
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${bd}` }}><Ic name={score >= 65 ? 'check' : 'alert'} size={11} color={color} /> {label}</span>
}


/* ── Main page ────────────────────────────────────────────────────────────── */
export default function DemoCandidatePage({ params }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('summary')
  const [outcomeModal, setOutcomeModal] = useState(false)
  const [demoOutcome, setDemoOutcome] = useState(() => {
    const s = DEMO_RESULTS[params.candidateId]?.overall_score ?? 0
    return s >= 80 ? 'passed_probation' : s >= 70 ? 'still_in_probation' : null
  })
  const [signupPrompt, setSignupPrompt] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')

  const candidate = DEMO_CANDIDATES.find(c => c.id === params.candidateId)
  const results = DEMO_RESULTS[params.candidateId] || null
  const responses = DEMO_RESPONSES[params.candidateId] || []

  // IntersectionObserver for sticky nav
  useEffect(() => {
    if (!results) return
    const ids = ['summary','integrity','pressure-fit','ai-assessment','skills','strengths','watchouts','onboarding','questions']
    const observers = []
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setActiveSection(id) }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 })
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [results])

  if (!candidate) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: F, color: TX2 }}>
        Candidate not found.{' '}
        <button onClick={() => router.push('/demo')} style={{ marginLeft: 8, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 14 }}>
          Back to demo
        </button>
      </div>
    )
  }

  const score = results?.overall_score ?? 0
  const passProbability = results?.pass_probability ?? null
  const completedDate = candidate.completed_at
    ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const DIMENSIONS = [
    { key: 'decision_speed_quality',   label: 'Decision Speed & Quality',   icon: 'zap',     desc: 'Decisiveness and commitment when no perfect answer exists' },
    { key: 'composure_under_conflict',  label: 'Composure Under Conflict',   icon: 'alert',   desc: 'Emotional regulation when facing difficult conversations' },
    { key: 'prioritisation_under_load', label: 'Prioritisation Under Load',  icon: 'sliders', desc: 'Framework and trade-off awareness when demands compete' },
    { key: 'ownership_accountability',  label: 'Ownership & Accountability', icon: 'award',   desc: 'Personal responsibility, active language, and specific commitments' },
  ]

  function vStyle(v) {
    if (v === 'Strength') return { bg: GRNBG, color: GRN, bd: GRNBD }
    if (v === 'Concern')  return { bg: REDBG, color: RED, bd: REDBD }
    return { bg: TEALLT, color: TEALD, bd: `${TEAL}55` }
  }

  function fmtTime(s) { if (!s) return ','; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }
  function timingLabel(s) {
    if (!s) return { label: 'No data', color: TX3, bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.1)' }
    if (s < 90)   return { label: 'Rushed',   color: RED,   bg: `${RED}18`,   bd: `${RED}40` }
    if (s < 180)  return { label: 'Fast',     color: AMB,   bg: `${AMB}18`,   bd: `${AMB}40` }
    if (s > 1200) return { label: 'Extended', color: TEAL,  bg: `${TEAL}18`,  bd: `${TEAL}40` }
    return               { label: 'Normal',   color: GRN,   bg: `${GRN}18`,   bd: `${GRN}40` }
  }

  const integrity = results?.integrity || {}
  const rq = integrity.response_quality
  const qColor = !rq ? TX3 : rq === 'Genuine' ? GRN : rq === 'Likely Genuine' ? TEAL : rq === 'Possibly AI-Assisted' ? AMB : RED
  const qBg    = !rq ? BG : rq === 'Genuine' ? GRNBG : rq === 'Likely Genuine' ? TEALLT : rq === 'Possibly AI-Assisted' ? AMBBG : REDBG
  const qBd    = !rq ? BD : rq === 'Genuine' ? GRNBD : rq === 'Likely Genuine' ? `${TEAL}55` : rq === 'Possibly AI-Assisted' ? AMBBD : REDBD
  const qIcon  = !rq ? 'eye' : (rq === 'Genuine' || rq === 'Likely Genuine') ? 'check' : 'alert'
  const glowStyle = rq ? { animation: 'glow 2.5s ease-in-out infinite' } : {}
  const redFlags = integrity.red_flags || []
  const consistencyRating = integrity.consistency_rating
  const cColor = !consistencyRating ? TX3 : consistencyRating === 'High' ? GRN : consistencyRating === 'Medium' ? AMB : RED

  const pf = results?.pressure_fit_score ?? null
  const dims = results?.pressure_fit ?? {}

  return (
    <div style={{ background: '#f3f5f8', minHeight: '100vh', fontFamily: F }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.55}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px 2px rgba(0,191,165,0.25)}50%{box-shadow:0 0 18px 5px rgba(0,191,165,0.45)}}
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Demo banner fixed at top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300 }}>
        <DemoBanner />
      </div>

      <DemoSidebar active={null} />

      <main style={{ marginLeft: 220, marginTop: 46, padding: '32px 40px', maxWidth: 1000, boxSizing: 'border-box' }}>

        {/* Back */}
        <button
          className="no-print"
          onClick={() => router.push('/demo')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX2, padding: '0 0 22px' }}
        >
          <Ic name="left" size={16} color={TX2} />
          Back to dashboard
        </button>

        {/* ── CANDIDATE HEADER ── */}
        <Card style={{ marginBottom: 20, boxShadow: SHADOW_LG }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 240 }}>
              <Avatar name={candidate.name} size={52} />
              <div>
                <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 3px', letterSpacing: '-0.4px' }}>
                  {candidate.name}
                </h2>
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px' }}>{candidate.email}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge label={candidate.assessments.role_title} bg={TEALLT} color={TEALD} border={`${TEAL}55`} />
                  {completedDate && <span style={{ fontSize: 12, color: TX3, fontFamily: F }}>Completed {completedDate}</span>}
                  {candidate.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {[1,2,3,4,5].map(i => (
                        <span key={i} style={{ fontSize: 14, color: i <= candidate.rating ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>★</span>
                      ))}
                      <span style={{ fontSize: 11.5, color: TX3, marginLeft: 4, fontFamily: F }}>Candidate self-rating</span>
                    </div>
                  )}
                </div>
                {results && (results.confidence_level || results.trajectory || results.seniority_fit_score != null) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    <ConfidenceBadge level={results.confidence_level} />
                    <TrajectoryBadge trajectory={results.trajectory} />
                    <SeniorityBadge score={results.seniority_fit_score} />
                  </div>
                )}
              </div>
            </div>

            {results && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Overall Score</div>
                  <ScoreRing score={score} size={130} strokeWidth={9} />
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: sc(score), marginTop: 8 }}>{slbl(score)}</div>
                  {results.percentile && (
                    <div style={{ marginTop: 6, fontFamily: F, fontSize: 11.5, fontWeight: 600, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {results.percentile} of candidates
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => setOutcomeModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: demoOutcome ? GRNBG : TEALLT, border: `1.5px solid ${demoOutcome ? GRNBD : `${TEAL}55`}`, borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: demoOutcome ? GRN : TEALD, padding: '9px 16px' }}
                  >
                    <Ic name="check" size={14} color={demoOutcome ? GRN : TEALD} />
                    {demoOutcome ? 'Update Outcome' : 'Log Outcome'}
                  </button>
                  <button
                    onClick={() => setSignupPrompt(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: NAVY, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: '#fff', padding: '9px 16px' }}
                  >
                    <Ic name="file" size={14} color={TEAL} />
                    Export Client Report
                  </button>
                  <button
                    onClick={() => setSendModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TEAL, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, padding: '9px 16px' }}
                  >
                    <Ic name="send" size={14} color={NAVY} />
                    Send to Client
                  </button>
                  <button
                    onClick={() => setSignupPrompt(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: CARD, border: `1.5px solid ${BD}`, borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, padding: '9px 16px' }}
                  >
                    <Ic name="download" size={14} color={TX2} />
                    Export PDF
                  </button>
                  <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1.5px solid ${TEAL}55`, borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: TEALD, padding: '9px 16px' }}>
                    Sign up →
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {results && (
          <>
            <StickyNav active={activeSection} />

            {/* ── SUMMARY ── */}
            <ScrollReveal id="summary">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                <Card topColor={sc(passProbability ?? score)} style={{ textAlign: 'center', padding: '24px 20px', background: `linear-gradient(180deg, ${sbg(passProbability ?? score)} 0%, #fff 60%)` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Pass Probability</div>
                  <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                    <SmallRing score={passProbability ?? score} size={80} strokeWidth={7} />
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 32, fontWeight: 800, color: sc(passProbability ?? score), lineHeight: 1, marginBottom: 6 }}>{passProbability ?? score}%</div>
                  <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>predicted probation success</div>
                </Card>

                <Card topColor={dC(score)} style={{ textAlign: 'center', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(180deg, ${dBg(score)} 0%, #fff 60%)` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Hiring Decision</div>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: dC(score), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: `0 4px 14px ${dC(score)}44` }}>
                    <Ic name="award" size={24} color="#fff" />
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 20px', borderRadius: 50, background: dC(score), boxShadow: `0 3px 12px ${dC(score)}44` }}>
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{dL(score)}</span>
                  </div>
                </Card>

                <Card topColor={riskCol(results.risk_level)} style={{ padding: '24px 22px', background: `linear-gradient(180deg, ${riskBg(results.risk_level)} 0%, #fff 60%)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Risk Level</span>
                    <InfoTooltip text="Likelihood of this candidate struggling during probation based on their responses" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: riskCol(results.risk_level), display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${riskCol(results.risk_level)}44` }}>
                      <Ic name="alert" size={18} color="#fff" />
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: riskCol(results.risk_level), letterSpacing: '-0.3px' }}>
                      {results.risk_level}
                    </span>
                  </div>
                  {results.risk_reason && (
                    <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
                      {results.risk_reason.slice(0, 160)}{results.risk_reason.length > 160 ? '…' : ''}
                    </p>
                  )}
                </Card>
              </div>
            </ScrollReveal>

            {/* ── INTEGRITY ── */}
            <ScrollReveal id="integrity" delay={60}>
              <div style={{ marginBottom: 20, background: `linear-gradient(135deg, #0a1929 0%, #0f2137 60%, #0d2b45 100%)`, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12, overflow: 'hidden', boxShadow: SHADOW_LG }}>
                <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ic name="eye" size={14} color={TEAL} />
                      </div>
                      <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Response Integrity</h2>
                      <InfoTooltip text="Analysis of response timing, authenticity, and consistency across scenarios" light />
                    </div>
                    <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, paddingLeft: 36 }}>AI analysis of authenticity, timing, and engagement signals.</p>
                  </div>
                  {rq && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: qBg, border: `1.5px solid ${qBd}`, flexShrink: 0, ...glowStyle }}>
                      <Ic name={qIcon} size={15} color={qColor} />
                      <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 800, color: qColor }}>{rq}</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '18px 28px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Time per scenario</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                    {[0, 1, 2, 3].map(i => {
                      const resp = responses.find(r => r.scenario_index === i)
                      const secs = resp?.time_taken_seconds ?? null
                      const tl = timingLabel(secs)
                      return (
                        <div key={i} style={{ background: tl.bg, border: `1px solid ${tl.bd}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Scenario {i + 1}</div>
                          <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: tl.color, lineHeight: 1, marginBottom: 4 }}>{fmtTime(secs)}</div>
                          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: tl.color, background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 7px' }}>{tl.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {integrity.quality_notes && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${qColor}55`, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                      <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>{integrity.quality_notes}</p>
                    </div>
                  )}

                  {consistencyRating && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: redFlags.length > 0 ? 12 : 0 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', paddingTop: 2 }}>Consistency:</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 20, background: cColor === GRN ? GRNBG : cColor === AMB ? AMBBG : REDBG, color: cColor, border: `1px solid ${cColor === GRN ? GRNBD : cColor === AMB ? AMBBD : REDBD}` }}>{consistencyRating}</span>
                      {integrity.consistency_notes && <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>{integrity.consistency_notes}</span>}
                    </div>
                  )}

                  {redFlags.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: `${RED}cc`, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Red flags detected</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {redFlags.map((flag, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: `${RED}14`, border: `1px solid ${RED}35`, borderRadius: 8, padding: '9px 12px' }}>
                            <Ic name="alert" size={13} color={RED} />
                            <span style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>{flag}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* ── PRESSURE-FIT ── */}
            {pf != null && (
              <ScrollReveal id="pressure-fit" delay={60}>
                <div style={{ marginBottom: 20, background: 'linear-gradient(135deg, #0a1929 0%, #0f2137 60%, #0d2b45 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW_LG }}>
                  {/* Header */}
                  <div style={{ padding: '28px 32px 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Ic name="sliders" size={15} color={TEAL} />
                        </div>
                        <span style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pressure-Fit Assessment</span>
                        <InfoTooltip text="How this candidate handles pressure, conflict, and competing priorities" light />
                      </div>
                      <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.25 }}>How this candidate performs<br />when it matters most</h2>
                      <div style={{ height: 3, width: 48, borderRadius: 99, background: TEAL }} />
                    </div>
                    {pf != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <PFRing score={pf} size={110} />
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: pf >= 75 ? GRN : pf >= 50 ? AMB : RED, textAlign: 'center', fontFamily: F }}>{pfLbl(pf)}</div>
                      </div>
                    )}
                  </div>
                  {/* 2×2 grid */}
                  <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {DIMENSIONS.map(({ key, label, icon, desc }, idx) => {
                      const dim = dims[key] ?? {}
                      const s = dim.score ?? null
                      const v = dim.verdict ?? null
                      const n = dim.narrative ?? null
                      const vs = vStyle(v)
                      const barColor = v === 'Strength' ? GRN : v === 'Concern' ? RED : AMB
                      return (
                        <div key={key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Ic name={icon} size={16} color={TEAL} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{desc}</div>
                            </div>
                            {s != null && <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: barColor, flexShrink: 0, lineHeight: 1 }}>{s}</div>}
                          </div>
                          {v && <div><span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 50, fontSize: 11.5, fontWeight: 700, background: vs.bg, color: vs.color, border: `1px solid ${vs.bd}` }}>{v}</span></div>}
                          {s != null && <AnimBar pct={s} color={barColor} height={6} delay={idx * 80} />}
                          <div style={{ borderLeft: `3px solid ${n ? barColor : 'rgba(255,255,255,0.15)'}`, paddingLeft: 14 }}>
                            <p style={{ fontFamily: F, fontSize: 13, lineHeight: 1.75, margin: 0, color: n ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)', fontStyle: n ? 'normal' : 'italic' }}>
                              {n || 'Detailed narrative available for newly scored assessments.'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── AI SUMMARY ── */}
            {results.ai_summary && (
              <ScrollReveal id="ai-assessment" delay={60}>
                <Card style={{ marginBottom: 20, borderLeft: `4px solid ${TEAL}`, boxShadow: SHADOW_LG }}>
                  <SectionHeading>AI Hiring Summary</SectionHeading>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {results.ai_summary.split('\n\n').filter(p => p.trim()).map((para, i) => (
                      <p key={i} style={{ fontFamily: F, fontSize: 14.5, color: i === 0 ? TX : TX2, lineHeight: 1.8, margin: 0, fontWeight: i === 0 ? 500 : 400 }}>
                        {para}
                      </p>
                    ))}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── SKILLS ── */}
            {results.scores && Object.keys(results.scores).length > 0 && (
              <ScrollReveal id="skills" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Individual scores for core workplace skills based on scenario responses">Skills Breakdown</SectionHeading>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                    {Object.entries(results.scores).map(([skill, skillScore]) => {
                      const narrative = results.score_narratives?.[skill]
                      return (
                        <div key={skill} style={{ background: BG, border: `1.5px solid ${BD}`, borderRadius: 10, padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                            <SmallRing score={skillScore} size={58} strokeWidth={5} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 5 }}>{skill}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: sc(skillScore) }}>{skillScore}</span>
                                <Badge label={slbl(skillScore)} bg={sbg(skillScore)} color={sc(skillScore)} border={sbd(skillScore)} />
                              </div>
                            </div>
                          </div>
                          <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.7 }}>{narrative || 'Assessment based on scenario responses.'}</p>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── STRENGTHS ── */}
            {results.strengths?.length > 0 && (
              <ScrollReveal id="strengths" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Specific behaviours the candidate demonstrated well, with direct evidence">Strengths</SectionHeading>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {results.strengths.map((s, i) => {
                      const title = typeof s === 'object' ? (s.strength || s.title || s.text) : s
                      const explanation = typeof s === 'object' ? s.explanation : null
                      const evidence = typeof s === 'object' ? s.evidence : null
                      return (
                        <div key={i} style={{ background: GRNBG, border: `1px solid ${GRNBD}`, borderLeft: `4px solid ${GRN}`, borderRadius: '0 10px 10px 0', padding: '16px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: explanation || evidence ? 8 : 0 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: `${GRN}20`, border: `1px solid ${GRNBD}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Ic name="check" size={13} color={GRN} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width={14} height={14} viewBox="0 0 24 24" fill={GRN} style={{ flexShrink: 0 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: 0, lineHeight: 1.4 }}>{title}</p>
                            </div>
                          </div>
                          {explanation && <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.7, paddingLeft: 34 }}>{explanation}</p>}
                          {evidence && <div style={{ paddingLeft: 34 }}><EvidenceBox>{evidence}</EvidenceBox></div>}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── WATCH-OUTS ── */}
            {results.watchouts?.length > 0 && (
              <ScrollReveal id="watchouts" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Areas of concern with severity rating and recommended management actions">Watch-outs</SectionHeading>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {results.watchouts.map((w, i) => {
                      const title = typeof w === 'object' ? (w.watchout || w.title || w.text) : w
                      const severity = typeof w === 'object' ? w.severity : null
                      const explanation = typeof w === 'object' ? w.explanation : null
                      const evidence = typeof w === 'object' ? w.evidence : null
                      const action = typeof w === 'object' ? w.action : null
                      const sev = sevStyle(severity)
                      return (
                        <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderLeft: `4px solid ${sev.color}`, borderRadius: '0 10px 10px 0', padding: '16px 18px' }}>
                          {severity && <div style={{ marginBottom: 10 }}><Badge label={`${severity} severity`} bg={sev.bg} color={sev.color} border={sev.border} /></div>}
                          <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 8px' }}>{title}</p>
                          {explanation && <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.7 }}>{explanation}</p>}
                          {evidence && <EvidenceBox>{evidence}</EvidenceBox>}
                          {action && <ActionBox>{action}</ActionBox>}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── ONBOARDING ── */}
            {results.onboarding_plan?.length > 0 && (
              <ScrollReveal id="onboarding" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading>Personalised Onboarding Plan</SectionHeading>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '-6px 0 20px', lineHeight: 1.55 }}>
                    Tailored to this candidate's specific gaps. Designed to be handed directly to the line manager.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {results.onboarding_plan.map((item, i) => {
                      const isStructured = typeof item === 'object' && item !== null && item.objective
                      if (!isStructured) {
                        const text = typeof item === 'object' ? (item.text || item.title || '') : (item || '')
                        const match = text.match(/^(Week\s*\d+):/i)
                        const weekLabel = match ? match[1] : `Week ${i + 1}`
                        const body = match ? text.slice(match[0].length).trim() : text
                        return (
                          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 13, fontWeight: 800, color: NAVY }}>{i + 1}</div>
                            <div style={{ flex: 1, paddingTop: 8 }}>
                              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{weekLabel}</div>
                              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.7 }}>{body}</p>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,33,55,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: `1px solid ${BD}`, background: '#f8fafc' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: TEAL, boxShadow: `0 0 0 4px ${TEALLT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 14, fontWeight: 800, color: NAVY }}>{item.week}</div>
                            <div>
                              <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Week {item.week}</div>
                              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, lineHeight: 1.2 }}>{item.title}</div>
                            </div>
                          </div>
                          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {item.objective && (
                              <div>
                                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Objective</div>
                                <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, margin: 0, lineHeight: 1.65 }}>{item.objective}</p>
                              </div>
                            )}
                            {item.activities?.length > 0 && (
                              <div>
                                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Activities</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {item.activities.map((act, ai) => (
                                    <div key={ai} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: TEALLT, border: `1.5px solid ${TEAL}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 10, fontWeight: 800, color: TEALD }}>{ai + 1}</div>
                                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.65 }}>{act}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.checkpoint && (
                              <div style={{ background: TEALLT, border: `1px solid ${TEAL}40`, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <Ic name="check" size={14} color={TEALD} />
                                <div>
                                  <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Checkpoint</div>
                                  <p style={{ fontFamily: F, fontSize: 13, color: TEALD, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{item.checkpoint}</p>
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              {item.involves?.length > 0 && (
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Who's Involved</div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {item.involves.map((role, ri) => (
                                      <span key={ri} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 50, fontFamily: F, fontSize: 11.5, fontWeight: 600, background: '#f1f5f9', color: TX2, border: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{role}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {item.notes && (
                                <div style={{ flexShrink: 0, maxWidth: 340 }}>
                                  <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>UK Best Practice</div>
                                  <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── INTERVIEW QUESTIONS ── */}
            {results.interview_questions?.length > 0 && (
              <ScrollReveal id="questions" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading>Suggested Interview Questions</SectionHeading>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '-6px 0 20px', lineHeight: 1.55 }}>
                    Designed to probe the specific gaps identified in this assessment. Each includes a follow-up probe.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {results.interview_questions.map((q, i) => {
                      const text = typeof q === 'object' ? (q.question || q.text || JSON.stringify(q)) : q
                      const followUpMatch = text.match(/\(Follow-up probe:\s*([\s\S]*?)\)\s*$/)
                      const followUp = followUpMatch ? followUpMatch[1].trim() : null
                      const mainQ = followUpMatch ? text.slice(0, followUpMatch.index).trim() : text
                      return (
                        <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,33,55,0.05)' }}>
                          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: TEALLT, border: `1.5px solid ${TEAL}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 13, fontWeight: 800, color: TEALD }}>{i + 1}</div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: 0, lineHeight: 1.65 }}>{mainQ}</p>
                              {followUp && (
                                <div style={{ marginTop: 12, background: '#f8fafc', border: `1px solid ${BD}`, borderLeft: `3px solid ${AMB}`, borderRadius: '0 8px 8px 0', padding: '9px 14px' }}>
                                  <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
                                    <span style={{ fontWeight: 700, color: AMB }}>Follow-up probe: </span>{followUp}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── CANDIDATE DOCUMENTS (agency feature demo) ── */}
            <Card style={{ marginBottom: 20 }} className="no-print">
              <SectionHeading>
                <Ic name="paperclip" size={15} color={TEAL} />
                Candidate Documents
              </SectionHeading>
              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.6 }}>
                Attach the candidate's CV and cover letter. Uploaded files are included when you use <strong>Send to Client</strong>.
              </p>
              {/* Demo notice */}
              <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ic name="info" size={14} color={AMB} />
                <span style={{ fontFamily: F, fontSize: 12.5, color: '#92400e' }}>Demo preview. Sign up to upload real documents and send candidate packs.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* CV — shown as pre-uploaded to demo the filled state */}
                <div style={{ border: `2px dashed ${TEAL}`, borderRadius: 12, padding: '20px 20px', textAlign: 'center', background: TEALLT }}>
                  <Ic name="file" size={28} color={TEAL} />
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '10px 0 4px' }}>CV / Résumé</div>
                  <div style={{ fontFamily: F, fontSize: 12, color: TX2, marginBottom: 14 }}>
                    {candidate?.name?.split(' ')[0] || 'Candidate'}_CV.pdf<br />
                    <span style={{ color: TX3 }}>142KB</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: TEAL, color: NAVY, fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                      <Ic name="download" size={12} color={NAVY} /> View
                    </button>
                    <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: REDBG, color: RED, border: `1px solid ${REDBD}`, fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                      <Ic name="trash" size={12} color={RED} /> Remove
                    </button>
                  </div>
                </div>
                {/* Cover Letter — shown as empty to demo the upload state */}
                <div style={{ border: `2px dashed ${BD}`, borderRadius: 12, padding: '20px 20px', textAlign: 'center', background: BG }}>
                  <Ic name="file" size={28} color={TX3} />
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '10px 0 4px' }}>Cover Letter</div>
                  <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginBottom: 14 }}>PDF only, max 10MB</div>
                  <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, background: NAVY, color: '#fff', fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                    <Ic name="upload" size={13} color={TEAL} />
                    Upload PDF
                  </button>
                </div>
              </div>
            </Card>

            {/* ── DEMO CTA ── */}
            <div style={{ marginBottom: 40, background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, borderRadius: 14, padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', boxShadow: SHADOW_LG }}>
              <div>
                <h3 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                  Ready to assess your own candidates?
                </h3>
                <p style={{ fontFamily: F, fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.6 }}>
                  Create your first assessment in under 5 minutes. No CV filtering, just real-world scenario testing.
                </p>
              </div>
              <button
                onClick={() => router.push('/login')}
                style={{ background: TEAL, color: NAVY, border: 'none', borderRadius: 10, padding: '14px 28px', fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: `0 4px 18px ${TEAL}44` }}
              >
                Sign up →
              </button>
            </div>
          </>
        )}

        {/* ── LOG OUTCOME MODAL ── */}
        {outcomeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setOutcomeModal(false)}>
            <div style={{ background: CARD, borderRadius: 16, padding: '32px 32px 28px', maxWidth: 480, width: '100%', boxShadow: '0 24px 64px rgba(15,33,55,0.22)', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setOutcomeModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: TX3, padding: 4, display: 'flex', alignItems: 'center' }}><Ic name="x" size={18} color={TX3} /></button>
              <h2 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 6px' }}>Log Hire Outcome</h2>
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 20px', lineHeight: 1.5 }}>Track what happened after this candidate was hired. Used for ROI reporting and benchmarking.</p>
              {/* Demo banner */}
              <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ic name="info" size={14} color={AMB} />
                <span style={{ fontFamily: F, fontSize: 12.5, color: '#92400e' }}>Demo data. Sign up to log real outcomes and track hiring ROI.</span>
              </div>
              {/* Outcome options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { value: 'passed_probation',  label: 'Passed probation',        color: GRN,  bg: GRNBG,  bd: GRNBD },
                  { value: 'still_in_probation', label: 'Still in probation',      color: TEAL, bg: TEALLT, bd: `${TEAL}55` },
                  { value: 'failed_probation',   label: 'Failed probation',        color: RED,  bg: REDBG,  bd: REDBD },
                  { value: 'left_probation',     label: 'Left during probation',   color: AMB,  bg: AMBBG,  bd: AMBBD },
                ].map(({ value, label, color, bg, bd }) => (
                  <button
                    key={value}
                    onClick={() => setDemoOutcome(value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, border: `2px solid ${demoOutcome === value ? color : BD}`, background: demoOutcome === value ? bg : CARD, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${demoOutcome === value ? color : BD}`, background: demoOutcome === value ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {demoOutcome === value && <Ic name="check" size={10} color="#fff" />}
                    </div>
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: demoOutcome === value ? 700 : 500, color: demoOutcome === value ? color : TX }}>{label}</span>
                  </button>
                ))}
              </div>
              {/* Date */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Outcome date (optional)</label>
                <input type="date" defaultValue={new Date().toISOString().slice(0,10)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, background: BG, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6 }}>Notes (optional)</label>
                <textarea rows={2} placeholder="Any context about this outcome..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 13, color: TX, background: BG, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push('/login')} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                  Sign up to save →
                </button>
                <button onClick={() => setOutcomeModal(false)} style={{ padding: '11px 20px', borderRadius: 8, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {signupPrompt && <SignUpModal onClose={() => setSignupPrompt(false)} />}

      {/* ── SEND TO CLIENT MODAL ── */}
      {sendModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setSendModal(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 16, padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: '0 16px 48px rgba(15,33,55,0.22)', position: 'relative' }}>
            <button onClick={() => setSendModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Ic name="x" size={18} color={TX3} />
            </button>

            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 5px' }}>Send Candidate Pack</h3>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 16px', lineHeight: 1.55 }}>
              Send {candidate?.name || 'this candidate'}'s full report to a client. Attached documents are included automatically.
            </p>

            {/* Demo notice */}
            <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic name="info" size={14} color={AMB} />
              <span style={{ fontFamily: F, fontSize: 12.5, color: '#92400e' }}>Demo preview. Sign up to send real candidate packs via email.</span>
            </div>

            {/* What's included */}
            <div style={{ background: TEALLT, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>What's included</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: TEALD }}>
                  <Ic name="check" size={13} color={GRN} /> Full candidate report (score, strengths, watch-outs, questions)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: TEALD }}>
                  <Ic name="check" size={13} color={GRN} /> CV / Résumé ({candidate?.name?.split(' ')[0] || 'Candidate'}_CV.pdf)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: TX3 }}>
                  <Ic name="x" size={13} color={TX3} /> Cover Letter — not attached
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Client email address</label>
              <input
                type="email"
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                placeholder="client@company.com"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, background: BG, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = BD}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Personal message (optional)</label>
              <textarea
                placeholder="Add a note to the client…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 13.5, color: TX, background: BG, outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = BD}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.push('/login')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 0', borderRadius: 9, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                <Ic name="send" size={15} color={NAVY} />
                Sign up to send →
              </button>
              <button
                onClick={() => setSendModal(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
