'use client'
import { useState, useEffect, useRef, Suspense, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

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
    fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY,
    margin: '0 0 18px', paddingLeft: 14,
    borderLeft: `4px solid ${TEAL}`,
    letterSpacing: '-0.2px',
    display: 'flex', alignItems: 'center', gap: 6,
    lineHeight: 1.3,
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

const EvidenceBox = ({ children, color = TEAL }) => (
  <div style={{
    background: '#f8fafc', border: `1px solid ${BD}`, borderLeft: `3px solid ${color}`,
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
  const [pos, setPos] = useState(null)
  const [pinned, setPinned] = useState(false)
  const ref = useRef(null)
  const tooltipBg = light ? '#1e3a52' : NAVY

  function open() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.top, left: r.left + r.width / 2 })
    }
  }
  function close() { setPos(null); setPinned(false) }

  useEffect(() => {
    if (!pinned) return
    function onDocClick(e) { if (ref.current && !ref.current.contains(e.target)) close() }
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  if (!text) return null

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        ref={ref}
        onMouseEnter={() => { if (!pinned) open() }}
        onMouseLeave={() => { if (!pinned) setPos(null) }}
        onClick={(e) => { e.stopPropagation(); if (pinned) close(); else { open(); setPinned(true) } }}
        role="button"
        tabIndex={0}
        aria-label="Show explanation"
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
      >
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {pos && (
        <span style={{
          position: 'fixed',
          bottom: `calc(100vh - ${pos.top}px + 8px)`,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: tooltipBg, color: '#fff', fontSize: 12, fontFamily: F, fontWeight: 400, lineHeight: 1.55,
          padding: '8px 12px', borderRadius: 6, maxWidth: 220, zIndex: 9999,
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
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e4e9f0" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={drawn ? offset : circ}
          style={{ transition: animate ? 'stroke-dashoffset 0.016s linear' : 'none' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color: NAVY, lineHeight: 1, letterSpacing: '-1px' }}>{display}</span>
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
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e4e9f0" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={drawn ? circ * (1 - score / 100) : circ}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color: NAVY, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  )
}

function RadarChart({ scores }) {
  const entries = Object.entries(scores)
  const n = entries.length
  if (n < 3) return null
  const W = 460, H = 300, cx = 230, cy = 150, r = 85, labelR = 120
  const angle = (i) => -Math.PI / 2 + i * (2 * Math.PI / n)
  const pt = (i, val) => {
    const a = angle(i)
    return [cx + (val / 100) * r * Math.cos(a), cy + (val / 100) * r * Math.sin(a)]
  }
  const dataPts = entries.map(([, s], i) => pt(i, s).join(',')).join(' ')
  const GRID = [25, 50, 75, 100]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block', margin: '0 auto 24px' }}>
      {GRID.map(lv => (
        <polygon key={lv}
          points={entries.map((_, i) => pt(i, lv).join(',')).join(' ')}
          fill={lv === 100 ? 'rgba(0,191,165,0.03)' : 'none'}
          stroke="rgba(0,0,0,0.07)" strokeWidth={1}
        />
      ))}
      {GRID.slice(0, 3).map(lv => {
        const [gx, gy] = pt(0, lv)
        return (
          <text key={lv} x={gx + 5} y={gy + 4} fontSize={9} fill="rgba(0,0,0,0.28)" fontFamily="system-ui, sans-serif">{lv}</text>
        )
      })}
      {entries.map((_, i) => {
        const [ax, ay] = pt(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={ax} y2={ay} stroke="rgba(0,0,0,0.09)" strokeWidth={1} />
      })}
      <polygon points={dataPts} fill="rgba(0,191,165,0.18)" stroke="#00BFA5" strokeWidth={2.5} strokeLinejoin="round" />
      {entries.map(([, s], i) => {
        const [px, py] = pt(i, s)
        return <circle key={i} cx={px} cy={py} r={4.5} fill="#00BFA5" stroke="white" strokeWidth={1.5} />
      })}
      {entries.map(([skill, s], i) => {
        const a = angle(i)
        const lx = cx + labelR * Math.cos(a)
        const ly = cy + labelR * Math.sin(a)
        const ca = Math.cos(a), sa = Math.sin(a)
        const anchor = ca > 0.25 ? 'start' : ca < -0.25 ? 'end' : 'middle'
        const nameY = sa > 0.25 ? ly : sa < -0.25 ? ly - 14 : ly - 6
        const SHORT_LABELS = { 'Technical Communication': 'Technical Comms', 'Execution Reliability': 'Delivers consistently?' }
        const label = SHORT_LABELS[skill] || skill
        return (
          <g key={i}>
            <text x={lx} y={nameY} textAnchor={anchor} fontSize={11} fontWeight="700" fontFamily="Outfit, system-ui, sans-serif" fill="#0f2137">{label}</text>
            <text x={lx} y={nameY + 14} textAnchor={anchor} fontSize={13} fontWeight="800" fontFamily="'IBM Plex Mono', monospace" fill="#00BFA5">{s}</text>
          </g>
        )
      })}
    </svg>
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

function PFSparkline({ dimScore, dimKey, color }) {
  if (dimScore == null) return null
  const adjMap = {
    decision_speed_quality:    [8, -14, 5, -6],
    composure_under_conflict:  [4, -7, -12, 4],
    prioritisation_under_load: [7, -11, 6, -5],
    ownership_accountability:  [6, -5, 5, -10],
  }
  const adj = adjMap[dimKey] || [6, -10, 4, -5]
  const pts = adj.map(a => Math.min(100, Math.max(0, dimScore + a)))
  const labels = ['Core', 'Pressure', 'Judgment', 'Staying']
  const W = 180, H = 52, padX = 10, padY = 8
  const innerW = W - padX * 2, innerH = H - padY * 2
  const gx = i => padX + (i / 3) * innerW
  const gy = v => padY + (1 - v / 100) * innerH
  const pathD = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${gx(i)} ${gy(v)}`).join(' ')
  const spread = Math.max(...pts) - Math.min(...pts)
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontFamily: F, fontSize: 9.5, color: 'rgba(255,255,255,0.28)', marginBottom: 2 }}>
        Across scenarios{spread >= 12 ? ' (variable)' : ' (consistent)'}
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <line x1={padX} y1={gy(50)} x2={W - padX} y2={gy(50)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3,3" />
        <path d={`${pathD} L ${gx(3)} ${H - padY} L ${gx(0)} ${H - padY} Z`} fill={color} opacity={0.08} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((v, i) => <circle key={i} cx={gx(i)} cy={gy(v)} r={2.5} fill={color} />)}
        {labels.map((l, i) => (
          <text key={i} x={gx(i)} y={H + 4} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'} fontSize="8" fill="rgba(255,255,255,0.22)">{l}</text>
        ))}
      </svg>
    </div>
  )
}

const ROLE_BENCHMARKS = {
  office:           { label: 'Office and admin roles',     avg: 65, strong: 76 },
  customer_service: { label: 'Customer service roles',     avg: 62, strong: 74 },
  finance:          { label: 'Finance and accounting roles', avg: 67, strong: 78 },
  sales:            { label: 'Sales roles',                avg: 62, strong: 76 },
  marketing:        { label: 'Marketing roles',            avg: 64, strong: 77 },
  engineering:      { label: 'Engineering and tech roles', avg: 67, strong: 78 },
  hr:               { label: 'HR and people roles',        avg: 64, strong: 76 },
  legal:            { label: 'Legal roles',                avg: 68, strong: 79 },
  healthcare:       { label: 'Healthcare and care roles',  avg: 61, strong: 74 },
  operations:       { label: 'Operations and logistics roles', avg: 63, strong: 75 },
  management:       { label: 'Management and leadership roles', avg: 66, strong: 78 },
  general:          { label: 'Similar roles',              avg: 63, strong: 75 },
}

function detectRoleCategory(roleTitle = '', jd = '') {
  const t = `${roleTitle} ${jd}`.toLowerCase()
  const has = (...words) => words.some(w => t.includes(w))
  if (has('legal counsel', 'solicitor', 'paralegal', 'barrister', 'compliance officer')) return 'legal'
  if (has('nurse', 'carer', 'care worker', 'support worker', 'healthcare', 'clinical', 'midwife', 'safeguarding')) return 'healthcare'
  if (has('finance director', 'accountant', 'bookkeeper', 'accounts assistant', 'finance manager', 'fp&a', 'controller', 'auditor', 'tax ', 'payroll')) return 'finance'
  if (has('sales', 'business development', 'account manager', 'account executive', 'pipeline', 'revenue', 'bdr', 'sdr')) return 'sales'
  if (has('marketing', 'campaign', 'brand', 'content marketing', 'digital marketing', 'seo', 'growth marketing')) return 'marketing'
  if (has('hr ', ' hr', 'people partner', 'people operations', 'talent acquisition', 'recruiter', 'l&d', 'learning and development')) return 'hr'
  if (has('engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'devops', 'data scientist', 'data engineer', 'qa ', 'sre')) return 'engineering'
  if (has('customer service', 'customer support', 'contact centre', 'call centre', 'helpdesk', 'service advisor', 'customer experience')) return 'customer_service'
  if (has('operations manager', 'operations director', 'logistics', 'supply chain', 'warehouse', 'fulfilment', 'dispatch')) return 'operations'
  if (has('director', 'head of', 'chief', 'managing director', 'general manager')) return 'management'
  if (has('office manager', 'office', 'admin', 'administrator', 'receptionist', 'secretary', 'personal assistant', ' pa ', 'executive assistant')) return 'office'
  return 'general'
}

function SectionToggle({ expanded, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: `1px solid ${BD}`,
        borderRadius: 6, cursor: 'pointer', padding: '3px 10px',
        fontFamily: F, fontSize: 11.5, fontWeight: 600, color: TX3, marginTop: 2,
      }}
    >
      {expanded ? 'Collapse' : 'Expand'}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

function ScrollReveal({ children, delay = 0, id }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.04 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  // Once the entrance animation finishes, drop the transform so this element no
  // longer creates a containing block. A persistent transform would trap any
  // position:fixed descendants (like InfoTooltip) inside this element's bounds
  // and place them behind sibling sections.
  return (
    <div
      id={id}
      ref={ref}
      onTransitionEnd={() => { if (visible && !settled) setSettled(true) }}
      style={{
        scrollMarginTop: 56,
        opacity: visible ? 1 : 0,
        ...(settled ? {} : {
          transform: visible ? 'translateY(0)' : 'translateY(14px)',
          transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
        }),
      }}
    >
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
  { id: 'onboarding',    label: 'Success Plan' },
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
  if (severity === 'High')   return { bg: REDBG,      color: '#EF4444', border: REDBD,   tint: `#EF444408` }
  if (severity === 'Medium') return { bg: AMBBG,      color: '#F59E0B', border: AMBBD,   tint: `#F59E0B08` }
  return                            { bg: '#f1f5f9',  color: '#9CA3AF', border: '#e5e7eb', tint: '#f8fafc' }
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

/* ── Locked / blurred premium section ────────────────────────────────────── */
function LockedSection({ title, desc, variant = 'text' }) {
  const B1 = '#b0b8c4'
  const B2 = '#c4cad2'
  const B3 = '#d4d9e0'
  const B4 = '#e2e6ec'
  const BG1 = '#edf0f4'
  const T1 = '#00BFA5'
  const R1 = '#ef4444'
  const A1 = '#f59e0b'

  const blurContent = {
    score: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', border: `8px solid ${T1}55`, background: `${T1}15`, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ height: 24, width: 40, background: B1, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 18, width: '40%', background: B1, borderRadius: 6, marginBottom: 10 }} />
            <div style={{ height: 10, width: '65%', background: B2, borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 8, width: '100%', background: B4, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '72%', background: T1, borderRadius: 4, opacity: 0.5 }} />
            </div>
          </div>
        </div>
        <div style={{ height: 11, width: '90%', background: B3, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 11, width: '75%', background: B4, borderRadius: 4 }} />
      </>
    ),
    timeline: (
      <>
        <div style={{ height: 16, width: '45%', background: B1, borderRadius: 6, marginBottom: 20 }} />
        {[1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16, paddingLeft: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: i <= 2 ? `${T1}40` : B4, border: `3px solid ${i <= 2 ? T1 : B3}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ height: 14, width: 14, background: i <= 2 ? T1 : B2, borderRadius: 3 }} />
            </div>
            <div style={{ flex: 1, borderLeft: `2px solid ${B4}`, paddingLeft: 14, paddingBottom: 4 }}>
              <div style={{ height: 13, width: `${40 + i * 12}%`, background: B2, borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 10, width: `${55 + i * 8}%`, background: B3, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 10, width: `${45 + i * 10}%`, background: B4, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </>
    ),
    cards: (
      <>
        <div style={{ height: 16, width: '38%', background: B1, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {[{ c: T1 }, { c: A1 }, { c: R1 }].map((d, i) => (
            <div key={i} style={{ background: `${d.c}10`, borderRadius: 12, padding: '18px 16px', border: `2px solid ${d.c}30` }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${d.c}25`, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ height: 20, width: 20, background: `${d.c}50`, borderRadius: 4 }} />
              </div>
              <div style={{ height: 20, width: '50%', background: d.c, borderRadius: 4, marginBottom: 8, opacity: 0.4 }} />
              <div style={{ height: 10, width: '80%', background: B3, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 10, width: '60%', background: B4, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </>
    ),
    chart: (
      <>
        <div style={{ height: 16, width: '50%', background: B1, borderRadius: 6, marginBottom: 18 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, marginBottom: 16, padding: '0 8px' }}>
          {[40,72,55,85,30,68,48].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? `${T1}50` : `${A1}40`, borderRadius: '5px 5px 0 0', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', height: 12, width: 24, background: B2, borderRadius: 3 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ height: 10, flex: 1, background: B3, borderRadius: 4 }} />
          <div style={{ height: 10, flex: 1, background: B4, borderRadius: 4 }} />
        </div>
      </>
    ),
    text: (
      <>
        <div style={{ height: 16, width: '50%', background: B1, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ borderLeft: `4px solid ${T1}55`, paddingLeft: 16, marginBottom: 16 }}>
          <div style={{ height: 11, width: '95%', background: B2, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '88%', background: B3, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '92%', background: B2, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '70%', background: B3, borderRadius: 4 }} />
        </div>
        <div style={{ borderLeft: `4px solid ${A1}55`, paddingLeft: 16, marginBottom: 16 }}>
          <div style={{ height: 11, width: '90%', background: B3, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '80%', background: B4, borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '85%', background: B3, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ height: 52, flex: 1, background: BG1, borderRadius: 10, border: `1px solid ${B4}` }} />
          <div style={{ height: 52, flex: 1, background: BG1, borderRadius: 10, border: `1px solid ${B4}` }} />
        </div>
      </>
    ),
    grid: (
      <>
        <div style={{ height: 16, width: '42%', background: B1, borderRadius: 6, marginBottom: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[T1, A1, B1, T1].map((c, i) => (
            <div key={i} style={{ background: `${c}08`, borderRadius: 10, padding: '16px 18px', border: `1.5px solid ${c}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${c}30` }} />
                <div style={{ height: 12, width: '55%', background: B2, borderRadius: 4 }} />
              </div>
              <div style={{ height: 10, width: '85%', background: B3, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 10, width: '70%', background: B4, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ height: 10, width: '60%', background: B4, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </>
    ),
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, marginBottom: 20, border: `1px solid ${BD}`, minHeight: 180 }}>
      <div style={{ filter: 'blur(5px)', WebkitFilter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', padding: '28px 32px', background: '#fff' }}>
        {blurContent[variant] || blurContent.text}
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.45)', zIndex: 2,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '20px 24px', background: 'rgba(255,255,255,0.92)', borderRadius: 14, boxShadow: '0 4px 24px rgba(15,33,55,0.1)', border: `1px solid ${BD}` }}>
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, opacity: 0.7 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{title}</div>
          <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, lineHeight: 1.5, marginBottom: 12 }}>{desc}</div>
          <a href="/login" style={{
            display: 'inline-block', background: '#00BFA5', color: '#0f2137', fontFamily: F,
            fontSize: 13, fontWeight: 800, padding: '10px 24px', borderRadius: 8, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,191,165,0.3)',
          }}>
            Get started
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
function DemoCandidateInner({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const demoType = searchParams.get('type') === 'employer' ? 'employer' : 'agency'
  const isAgency = demoType === 'agency'
  const [activeSection, setActiveSection] = useState('summary')
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [outcomeModal, setOutcomeModal] = useState(false)
  const [demoOutcome, setDemoOutcome] = useState(() => {
    const s = DEMO_RESULTS[params.candidateId]?.overall_score ?? 0
    return s >= 80 ? 'passed_probation' : s >= 70 ? 'still_in_probation' : null
  })
  const [signupPrompt, setSignupPrompt] = useState(false)
  const [evidencePackModal, setEvidencePackModal] = useState(false)
  const [candidatePreview, setCandidatePreview] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [expandedSections, setExpandedSections] = useState({ aiSummary: false, candidateDocs: false, onboarding: false, fairWork: false })
  const [layer2Open, setLayer2Open] = useState(false)
  const [layer3Open, setLayer3Open] = useState(false)
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)
  function toggleSection(key) { setExpandedSections(prev => ({ ...prev, [key]: !prev[key] })) }
  const allExpanded = Object.values(expandedSections).every(Boolean)

  const candidate = DEMO_CANDIDATES.find(c => c.id === params.candidateId)
  const results = DEMO_RESULTS[params.candidateId] || null
  const responses = DEMO_RESPONSES[params.candidateId] || []
  const isTemp = candidate?.assessments?.employment_type === 'temporary'

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

  function fmtTime(s) { if (!s) return 'No data'; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }
  // Derive scenario count from the assessment's scenarios array, falling back to mode, then 4
  const scenariosArray = Array.isArray(candidate?.assessments?.scenarios) ? candidate.assessments.scenarios : null
  const scenarioCount = scenariosArray
    ? scenariosArray.length
    : (candidate?.assessments?.assessment_mode === 'quick' || candidate?.assessments?.assessment_mode === 'rapid' ? 2
       : candidate?.assessments?.assessment_mode === 'standard' ? 3
       : 4)
  const scenarioIndices = Array.from({ length: scenarioCount }, (_, i) => i)
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
        @media print { .ob-detail { display: flex !important; } }
      `}</style>

      {/* Demo banner fixed at top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300 }}>
        <DemoBanner />
      </div>

      <DemoSidebar active={null} />

      <main style={{ marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 96 : 46, padding: isMobile ? '16px 16px 32px' : '32px 40px', maxWidth: 1000, boxSizing: 'border-box' }}>

        {/* Back */}
        <button
          className="no-print"
          onClick={() => router.push('/demo')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX2, padding: '0 0 22px' }}
        >
          <Ic name="left" size={16} color={TX2} />
          Back to dashboard
        </button>

        {/* Demo Redline Alert for James O'Brien */}
        {params.candidateId === 'demo-c4' && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: `1.5px solid #fecaca`,
            borderLeft: `5px solid ${RED}`, borderRadius: '0 12px 12px 0',
            padding: isMobile ? '16px 18px' : '20px 24px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="alert" size={16} color="#fff" />
              </div>
              <span style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: RED }}>Redline Alert</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: RED, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Immediate</span>
            </div>
            <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 6px' }}>
              <strong>Consistent delivery</strong> scored 58 at assessment but check-ins show missed deadlines and task avoidance in the first two weeks.
            </p>
            <p style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55, margin: '0 0 14px' }}>
              Assessment predicted high underperformance risk (74%) and low probation pass probability (27%). Early check-in signals confirm the predicted pattern of accountability avoidance is materialising faster than expected.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: 'none', background: RED, color: '#fff', fontFamily: F, fontSize: 13, fontWeight: 700, opacity: 0.5, cursor: 'default', pointerEvents: 'none' }}>
                Generate Intervention Plan — Available with subscription
              </button>
            </div>

            {/* Sample intervention plan */}
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 22px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Sample Intervention Plan</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Diagnosis</div>
                <p style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.65, margin: 0 }}>
                  James is displaying the accountability avoidance pattern flagged in his assessment. His tendency to deflect responsibility is manifesting as missed deadlines and vague status updates, consistent with the "Confident Talker who Avoids Accountability" profile identified during scoring.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Week 1 Actions</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55, marginBottom: 4 }}>1. Set three specific, measurable deliverables with hard deadlines</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55, marginBottom: 4 }}>2. Daily 10-minute check-in requiring written progress updates</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55 }}>3. Direct conversation about accountability expectations with documented outcomes</div>
                </div>
                <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Week 2 Actions</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55, marginBottom: 4 }}>1. Review week 1 deliverables against agreed standards</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55, marginBottom: 4 }}>2. Introduce client-facing task with clear ownership and reporting line</div>
                  <div style={{ fontSize: 13, color: TX, lineHeight: 1.55 }}>3. Document any further avoidance behaviour for probation review file</div>
                </div>
              </div>
              <div style={{
                background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, padding: '12px 16px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Recommendation: Managed exit</div>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.55 }}>Given the assessment score of 35/100 and the early materialisation of predicted risks, begin preparing a structured exit plan alongside the intervention. If week 2 targets are not met, proceed to formal probation review.</p>
              </div>
              <div style={{ marginTop: 12 }}>
                <button style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: '#fff', color: TX2, fontFamily: F, fontSize: 12, fontWeight: 600, opacity: 0.5, cursor: 'default', pointerEvents: 'none' }}>
                  Email to HR — Available with subscription
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CANDIDATE HEADER — three-column layout ── */}
        <Card style={{ marginBottom: 20, boxShadow: SHADOW_LG }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 16 : 20, flexDirection: isMobile ? 'column' : 'row' }}>

            {/* LEFT COLUMN — candidate info */}
            <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <Avatar name={candidate.name} size={52} />
                <div>
                  <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 2px', letterSpacing: '-0.4px' }}>
                    {candidate.name}
                  </h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0 }}>{candidate.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <Badge label={candidate.assessments.role_title} bg={TEALLT} color={TEALD} border={`${TEAL}55`} />
                {(() => {
                  const m = candidate.assessments?.assessment_mode
                  if (!m || m === 'standard') return null
                  const label = m === 'advanced' ? 'Strategy-Fit' : m === 'rapid' ? 'Rapid Screen' : m === 'quick' ? 'Speed-Fit' : null
                  if (!label) return null
                  return <Badge label={label} bg="#fffbeb" color="#d97706" border="#fcd34d" />
                })()}
              </div>
              {completedDate && <div style={{ fontSize: 12, color: TX3, fontFamily: F, marginBottom: 6 }}>Completed {completedDate}</div>}
              {candidate.rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ fontSize: 14, color: i <= candidate.rating ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>★</span>
                  ))}
                  <span style={{ fontSize: 11.5, color: TX3, marginLeft: 4, fontFamily: F }}>Candidate self-rating</span>
                </div>
              )}
              {results && (results.confidence_level || results.trajectory || results.seniority_fit_score != null) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <ConfidenceBadge level={results.confidence_level} />
                  <TrajectoryBadge trajectory={results.trajectory} />
                  <SeniorityBadge score={results.seniority_fit_score} />
                </div>
              )}
            </div>

            {/* CENTRE COLUMN — score ring (25%) */}
            {results && (
              <div style={{ flexShrink: 0, textAlign: 'center', width: isMobile ? '100%' : 160 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>Overall Score <InfoTooltip text="Comprehensive performance score across all scenarios. 50 is average, 75+ is strong." /></div>
                <ScoreRing score={score} size={130} strokeWidth={9} />
                <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TEAL, marginTop: 8 }}>{slbl(score)}</div>
                {results.percentile && (
                  <div style={{ marginTop: 6, fontFamily: F, fontSize: 11.5, fontWeight: 600, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', display: 'inline-block' }}>
                    {results.percentile} of candidates
                  </div>
                )}
                {(() => {
                  const roleType = detectRoleCategory(candidate?.assessments?.role_title, candidate?.assessments?.job_description)
                  const bm = ROLE_BENCHMARKS[roleType] || ROLE_BENCHMARKS.general
                  const diff = score - bm.avg
                  const titleLabel = candidate?.assessments?.role_title || 'Similar'
                  return (
                    <div style={{ marginTop: 10, textAlign: 'center' }}>
                      <div style={{ fontFamily: F, fontSize: 10.5, color: TX3, marginBottom: 5 }}>
                        {titleLabel} roles avg: {bm.avg}
                      </div>
                      <div style={{ position: 'relative', height: 5, background: '#e4e9f0', borderRadius: 3, width: 120, margin: '0 auto' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(score, 100)}%`, background: TEAL, borderRadius: 3 }} />
                        <div style={{ position: 'absolute', top: -4, left: `${bm.avg}%`, width: 2, height: 13, background: '#94a3b8', borderRadius: 1, transform: 'translateX(-50%)' }} />
                      </div>
                      <div style={{ fontFamily: F, fontSize: 10, color: diff > 0 ? TEAL : diff < 0 ? RED : TX3, marginTop: 4 }}>
                        {diff > 0 ? `+${diff} above average` : diff < 0 ? `${diff} below average` : 'At average'}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* RIGHT COLUMN — actions (35%) */}
            <div className="no-print" style={{ flexShrink: 0, width: isMobile ? '100%' : 220 }}>
              {/* Primary actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {isAgency && (
                <button
                  onClick={() => setSignupPrompt(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: NAVY, border: 'none', borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: '#fff', padding: '10px 16px', cursor: 'pointer', width: '100%' }}
                >
                  <Ic name="file" size={14} color={TEAL} />
                  Manager Brief PDF
                  <InfoTooltip text="A 2-page summary with QR code for line managers who will not read the full report" light />
                </button>
                )}
                <a
                  href="/demo/highlight-reel"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TEAL, border: 'none', borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: '#fff', padding: '10px 16px', textDecoration: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                >
                  <Ic name="zap" size={14} color="#fff" />
                  Highlight Reel
                  <InfoTooltip text="A 60-second animated visual summary with a shareable link — send to clients instead of a PDF" light />
                </a>
              </div>

              {/* More actions toggle */}
              <button
                type="button"
                onClick={() => setMoreActionsOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
                  fontFamily: F, fontSize: 12.5, fontWeight: 600, color: TX3,
                }}
              >
                {moreActionsOpen ? 'Fewer actions' : 'More actions'}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: moreActionsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Secondary actions — categorised */}
              {moreActionsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>

                {/* SHARE */}
                {isAgency && (
                  <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Share</div>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                    <Ic name="file" size={14} color={TEALD} />
                    Send Report to Client
                    <InfoTooltip text="Generate and send a configured version of this report to your client." />
                  </button>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                    <Ic name="send" size={14} color={TEALD} />
                    Send to Client
                    <InfoTooltip text="Email this candidate report directly to your client contact." />
                  </button>
                  </>
                )}

                {/* INTERVIEW */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Interview</div>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                  <Ic name="file" size={14} color={TEALD} />
                  Interview Brief
                  <InfoTooltip text="Targeted interview questions generated from this candidate's specific watch-outs" />
                </button>
                <button onClick={() => setSignupPrompt(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', cursor: 'pointer', width: '100%' }}>
                  <Ic name="sliders" size={14} color={TEALD} />
                  Re-analyse with Context
                  <InfoTooltip text="Add new information and re-analyse the existing responses. The candidate does nothing. Shows a before and after comparison." />
                </button>

                {/* ONBOARDING */}
                {!isAgency && (
                <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Onboarding</div>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                  <Ic name="file" size={14} color={TEALD} />
                  {isTemp ? 'Assignment Success Plan' : '90-Day Manager Coaching Plan'}
                  <InfoTooltip text={isTemp ? 'A structured assignment guide with objectives for the placement period.' : 'A structured probation guide with SMART objectives and Alchemy Training UK coach support.'} />
                </button>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                  <Ic name="award" size={14} color={TEALD} />
                  {isTemp ? 'Open Assignment Tracker' : 'Open Probation Co-pilot'}
                  <InfoTooltip text={isTemp ? 'Track this worker through their assignment period with structured check-ins.' : 'Track this candidate through their probation period with structured check-ins and guidance.'} />
                </button>
                </>
                )}

                {/* COMPLIANCE */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Compliance</div>
                {isTemp ? (
                  <>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                    <Ic name="shield" size={14} color={TEALD} />
                    Fair Work Agency Compliance Pack
                    <InfoTooltip text="Download a compliance pack for Fair Work Agency requirements." />
                  </button>
                  <button onClick={() => setSignupPrompt(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', cursor: 'pointer', width: '100%' }}>
                    <Ic name="shield" size={14} color={TEALD} />
                    SSP Checker
                    <InfoTooltip text="Check SSP eligibility and calculate payments for this worker." />
                  </button>
                  </>
                ) : (
                <>
                {isAgency ? (
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                    <Ic name="shield" size={14} color={TEALD} />
                    Compliance Certificate
                    <InfoTooltip text="Compliance certificate for this assessment." />
                  </button>
                ) : (
                <>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                  <Ic name="shield" size={14} color={TEALD} />
                  ERA 2025 Certificate
                  <InfoTooltip text="ERA 2025 compliance certificate for this assessment. Download for your legal records." />
                </button>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                  <Ic name="alert" size={14} color={AMB} />
                  Confirm Offer Decision
                  <InfoTooltip text="Acknowledge the risks before making an offer. Creates a legal audit trail of your decision." />
                </button>
                </>
                )}
                </>
                )}

                {/* CANDIDATE */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Candidate</div>
                <button onClick={() => setOutcomeModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', cursor: 'pointer', width: '100%' }}>
                  <Ic name="check" size={14} color={TEALD} />
                  {demoOutcome ? 'Update Outcome' : 'Log Outcome'}
                </button>
                <button onClick={() => setCandidatePreview(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', cursor: 'pointer', width: '100%' }}>
                  <Ic name="users" size={14} color={TEALD} />
                  Candidate Preview
                  <InfoTooltip text="See the positive-framed summary the candidate sees after submitting their assessment." />
                </button>
                {!isAgency && (
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', opacity: 0.45, cursor: 'default', pointerEvents: 'none', width: '100%' }}>
                    <Ic name="send" size={14} color={TEALD} />
                    Send Feedback to Candidate
                    <InfoTooltip text="Send the rejected candidate a constructive development plan showing what they could work on." />
                  </button>
                )}

                {/* REPORT SICKNESS (agency + temporary only) */}
                {isAgency && isTemp && (
                  <button onClick={() => setSignupPrompt(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1.5px solid #fbbf24', borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: '#D97706', padding: '9px 16px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                    <Ic name="alert" size={14} color="#D97706" />
                    Report Sickness
                    <InfoTooltip text="Report this worker as sick to trigger SSP eligibility checks and alerts." />
                  </button>
                )}

                {/* WORKSPACE (Strategy-Fit only) */}
                {candidate?.assessments?.assessment_mode === 'advanced' && (
                <>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8, marginBottom: 2, fontFamily: F }}>Workspace</div>
                <a href="/demo/workspace" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1.5px solid ${BD}`, borderRadius: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, padding: '9px 16px', textDecoration: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                  <Ic name="grid" size={14} color={TEALD} />
                  View Day 1 Simulation
                  <InfoTooltip text="See how this candidate performed in the virtual Day 1 workspace — emails, tasks, messages and calendar." />
                </a>
                </>
                )}
              </div>
              )}
              </div>
          </div>
        </Card>

        {/* Family Leave Risk Notice */}
        <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{
            background: TEALLT, borderLeft: `4px solid ${TEAL}`, borderRadius: '0 8px 8px 0',
            padding: '14px 18px',
          }}>
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 4 }}>
              Day-One Family Leave Rights
            </div>
            <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Under the Employment Rights Act 2025 this individual is entitled to Paternity Leave and Unpaid Parental Leave from their first day. There is no qualifying period. If a {isAgency ? 'assignment' : 'probation'} review coincides with or follows a period of family leave, seek independent employment law advice before taking any action.
            </p>
          </div>
        </Card>

        {/* ── Placement Health Score (agency only) ── */}
        {isAgency && (() => {
          const prs = score >= 75 ? 82 : score >= 60 ? 61 : 38
          const prsColor = prs >= 75 ? GRN : prs >= 50 ? AMB : RED
          const prsBg = prs >= 75 ? GRNBG : prs >= 50 ? AMBBG : REDBG
          const prsBd = prs >= 75 ? GRNBD : prs >= 50 ? AMBBD : REDBD
          const prsLabel = prs >= 75 ? 'Low Risk' : prs >= 50 ? 'Medium Risk' : 'High Risk'
          const prsDesc = prs >= 75
            ? 'Strong chance of successful placement. Candidate profile aligns well with role demands.'
            : prs >= 50
            ? 'Moderate placement risk. Review watch-outs and consider probing questions before placing.'
            : 'High placement risk. Significant gaps detected. Discuss concerns with client before proceeding.'
          return (
            <Card style={{ marginBottom: 16, border: `1.5px solid ${prsBd}`, background: `linear-gradient(135deg, ${prsBg} 0%, #fff 60%)` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TX, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Placement Risk Score
                    </span>
                    <InfoTooltip text="Combines assessment score, pressure-fit, seniority fit, industry turnover risk, and response integrity to estimate placement success likelihood." />
                  </div>
                  <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.65 }}>
                    {prsDesc}
                  </p>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: `6px solid ${prsColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 24, fontWeight: 800, color: prsColor }}>{prs}</div>
                  <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', padding: '4px 14px', borderRadius: 50, fontFamily: F, fontSize: 12, fontWeight: 800, background: prsBg, color: prsColor, border: `1px solid ${prsBd}` }}>
                    {prsLabel}
                  </div>
                </div>
              </div>
            </Card>
          )
        })()}

        {/* ── Rebate Period Tracker (agency only) ── */}
        {isAgency && demoOutcome && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="clock" size={14} color={TEAL} />
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TX, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Rebate Period Tracker
              </span>
            </div>
            {(() => {
              const week = 6
              const total = 12
              const pct = Math.round((week / total) * 100)
              return (
                <div style={{ padding: '12px 16px', background: BG, border: `1px solid ${BD}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>{candidate?.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: TEAL, background: `${TEAL}18`, padding: '2px 10px', borderRadius: 20 }}>On track</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 8, background: `${TEAL}22`, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: TEAL, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TX3, flexShrink: 0 }}>Week {week}/{total}</span>
                  </div>
                </div>
              )
            })()}
          </Card>
        )}

        {/* ── Probation Timeline Tracker (employer only) ── */}
        {!isAgency && demoOutcome && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="clock" size={14} color={TEAL} />
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TX, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Probation Timeline
              </span>
            </div>
            {(() => {
              const month = 2
              const total = 6
              const pct = Math.round((month / total) * 100)
              return (
                <div style={{ padding: '12px 16px', background: BG, border: `1px solid ${BD}`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>{candidate?.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: TEAL, background: `${TEAL}18`, padding: '2px 10px', borderRadius: 20 }}>On track</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 8, background: `${TEAL}22`, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: TEAL, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TX3, flexShrink: 0 }}>Month {month}/{total}</span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: TX3, lineHeight: 1.55 }}>
                    Next review: Month 3 check-in. ERA 2025 compliance tracked automatically.
                  </div>
                </div>
              )
            })()}
          </Card>
        )}

        {/* ── Accountability Trail / Document This Assessment (agency only) ── */}
        {isAgency && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="shield" size={14} color={TEAL} />
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TX }}>Document This Assessment</span>
              <InfoTooltip text="Documentation that this assessment was conducted using objective, evidence-based methods in compliance with the Equality Act 2010." />
            </div>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 16px', lineHeight: 1.7 }}>
              Generate a timestamped accountability record containing key findings, watch-outs, and recommended interview questions. Store it for your records and share with clients.
            </p>
            <button onClick={() => setSignupPrompt(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 22px', borderRadius: 9, border: 'none',
              background: TEAL, color: NAVY,
              fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            }}>
              <Ic name="file" size={15} color={NAVY} />
              Generate Accountability Record
            </button>
          </Card>
        )}

        {/* Documents placeholder */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ic name="file" size={14} color={TEALD} />
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>Documents</span>
          </div>
          <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontFamily: F, fontSize: 12.5, color: TX3, fontWeight: 600 }}>Document templates coming soon</span>
          </div>
        </Card>

        {/* ══════════════════════════════════════════════════
            UNIFIED VERDICT + LAYER 1 CARD
        ══════════════════════════════════════════════════ */}
        {results && (() => {
          const isRapidScreen = candidate?.assessments?.assessment_mode === 'rapid'
          const rapidSignal = results.rapid_screen_signal
          const isStrongHire = isRapidScreen
            ? rapidSignal === 'Strong Proceed'
            : score >= 75 && (results.risk_level === 'Low' || results.risk_level === 'Very Low')
          const isDoNotHire = isRapidScreen
            ? rapidSignal === 'High Risk'
            : score < 55 || results.risk_level === 'High'
          const verdictLabel = isRapidScreen
            ? (rapidSignal || (score >= 70 ? 'Strong Proceed' : score >= 50 ? 'Interview Worthwhile' : 'High Risk'))
            : (isStrongHire ? 'Strong Hire' : isDoNotHire ? 'Do Not Hire' : 'Review')
          const verdictSub = isRapidScreen
            ? (results.rapid_screen_reason || 'Rapid screen assessment complete.')
            : (isStrongHire
              ? 'This candidate is predicted to pass probation. Confidence: High.'
              : isDoNotHire
              ? 'This candidate is predicted to struggle in this role. See full report for detail.'
              : 'This candidate has potential with areas to watch. See watch-outs below.')
          const verdictBg = isStrongHire ? '#00BFA5' : isDoNotHire ? '#991B1B' : '#B45309'
          const nextStep = isStrongHire
            ? 'Ready to interview. Use the Interview Brief below.'
            : isDoNotHire
            ? 'We recommend not proceeding. Full detail available below.'
            : 'Proceed with caution. See risks in the detail below.'
          const nextCol = isStrongHire ? TEAL : isDoNotHire ? RED : AMB
          return (
            <div style={{ marginBottom: 20, borderRadius: 14, boxShadow: SHADOW_LG, overflow: 'hidden', border: `1px solid ${BD}` }}>
              {/* Coloured header */}
              <div style={{ background: verdictBg, padding: isMobile ? '24px 20px' : '32px 36px', textAlign: 'center' }}>
                <div style={{ fontFamily: F, fontSize: isMobile ? 30 : 38, fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 8 }}>
                  {verdictLabel}
                </div>
                <div style={{ fontFamily: F, fontSize: isMobile ? 14 : 15, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, maxWidth: 480, margin: '0 auto' }}>
                  {verdictSub}
                </div>
              </div>
              {/* White content (non-rapid only) */}
              {!isRapidScreen && (
                <div style={{ background: '#fff', padding: isMobile ? '20px 20px' : '24px 36px' }}>
                  {/* AI summary overview */}
                  {results.ai_summary && (
                    <div style={{ fontFamily: F, fontSize: 14, fontStyle: 'italic', color: '#5e6b7f', marginBottom: 16, lineHeight: 1.5 }}>
                      {results.ai_summary.split(/[.!?]/)[0].trim().slice(0, 120)}{results.ai_summary.split(/[.!?]/)[0].trim().length > 0 ? '.' : ''}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {(results.strengths || []).length > 0 && (
                      <div>
                        <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Top strengths</div>
                        {(results.strengths || []).slice(0, 2).map((s, i) => (
                          <div key={i} style={{ borderLeft: `4px solid ${TEAL}`, paddingLeft: 12, marginBottom: 8 }}>
                            <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>{typeof s === 'object' ? (s.strength || s.title || '') : s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(results.watchouts || []).length > 0 && (
                      <div>
                        <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Watch-outs</div>
                        {(results.watchouts || []).slice(0, 2).map((w, i) => (
                          <div key={i} style={{ borderLeft: `4px solid ${AMB}`, paddingLeft: 12, marginBottom: 8 }}>
                            <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>{typeof w === 'object' ? (w.watchout || w.title || '') : w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '12px 16px', borderRadius: 8, background: `${nextCol}10`, border: `1px solid ${nextCol}30` }}>
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: nextCol }}>{nextStep}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── RAPID SCREEN SIMPLIFIED REPORT ── */}
        {results && candidate?.assessments?.assessment_mode === 'rapid' && (
          <Card style={{ marginBottom: 20, boxShadow: SHADOW_LG }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              <ScoreRing score={score} size={110} strokeWidth={8} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Rapid Screen Result</div>
                <div style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.65 }}>
                  {results.rapid_screen_reason || results.ai_summary || 'Assessment complete.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {(results.strengths || []).slice(0, 1).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: GRNBG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ic name="check" size={13} color={GRN} />
                  </div>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: GRN, marginBottom: 2 }}>What they did well</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{typeof s === 'object' ? (s.strength || s.title || '') : s}</div>
                  </div>
                </div>
              ))}
              {(results.interview_questions || []).slice(0, 1).map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: AMBBG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ic name="search" size={13} color={AMB} />
                  </div>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: AMB, marginBottom: 2 }}>What to probe at interview</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{typeof q === 'object' ? (q.question || q.text || '') : q}</div>
                  </div>
                </div>
              ))}
              {(results.watchouts || []).slice(0, 1).map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: REDBG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ic name="alert" size={13} color={RED} />
                  </div>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: RED, marginBottom: 2 }}>Risk flag</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{typeof w === 'object' ? (w.watchout || w.title || '') : w}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', paddingTop: 16, borderTop: `1px solid ${BD}` }}>
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 12px' }}>Get the full report for this candidate</p>
              <a href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: TEAL, color: NAVY, border: 'none', borderRadius: 10,
                padding: '12px 28px', fontFamily: F, fontSize: 14, fontWeight: 700,
                textDecoration: 'none', cursor: 'pointer',
              }}>
                Upgrade to Speed-Fit
              </a>
            </div>
          </Card>
        )}

        {/* Layer 2 button */}
        {results && candidate?.assessments?.assessment_mode !== 'rapid' && (
          <button
            onClick={() => setLayer2Open(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: `1.5px solid ${TEAL}`,
              fontFamily: F, fontSize: 14, fontWeight: 700, color: TEALD,
              marginBottom: 20, transition: 'background 0.15s',
            }}
          >
            {layer2Open ? 'Hide detail' : 'See why — pressure-fit, predictions and risks'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: layer2Open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {results && (candidate?.assessments?.assessment_mode === 'rapid' || layer2Open) && (
          <>
            {layer2Open && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <button
                  onClick={() => setExpandedSections(allExpanded
                    ? { aiSummary: false, candidateDocs: false, onboarding: false, fairWork: false }
                    : { aiSummary: true,  candidateDocs: true,  onboarding: true,  fairWork: true  }
                  )}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px solid ${BD}`, borderRadius: 7, cursor: 'pointer', padding: '5px 14px', fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3 }}
                >
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              </div>
            )}
            {layer2Open && <StickyNav active={activeSection} />}

            {/* ── CANDIDATE TYPE SNAPSHOT ── */}
            {results.candidate_type && (() => {
              const pipeIdx = results.candidate_type.indexOf('|')
              const typeLabel = pipeIdx > -1 ? results.candidate_type.slice(0, pipeIdx).trim() : results.candidate_type
              const typeExplanation = pipeIdx > -1 ? results.candidate_type.slice(pipeIdx + 1).trim() : null
              const withIdx = typeLabel.indexOf(' with ')
              const whoIdx = typeLabel.search(/ who /i)
              const splitIdx = withIdx > -1 ? withIdx : whoIdx > -1 ? whoIdx : -1
              const splitWord = withIdx > -1 ? 'with' : whoIdx > -1 ? 'who' : null
              const primary  = splitIdx > -1 ? typeLabel.slice(0, splitIdx) : typeLabel
              const modifier = splitIdx > -1 ? typeLabel.slice(splitIdx + splitWord.length + 2) : null
              return (
                <ScrollReveal delay={60}>
                <div style={{
                  marginBottom: 20,
                  background: 'linear-gradient(135deg, #0a1929 0%, #0f2137 100%)',
                  border: '1px solid rgba(0,191,165,0.22)',
                  borderRadius: 12, padding: '22px 28px', boxShadow: SHADOW_LG,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    Candidate Type Snapshot <InfoTooltip text="A memorable label capturing this candidate's working style, based on their response patterns across all scenarios." light />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: '#00BFA5', lineHeight: 1.2 }}>{primary}</span>
                    {modifier && <>
                      <span style={{ fontFamily: F, fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>{splitWord}</span>
                      <span style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{modifier}</span>
                    </>}
                  </div>
                  {typeExplanation && (
                    <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '10px 0 0', lineHeight: 1.55 }}>
                      {typeExplanation}
                    </p>
                  )}
                </div>
                </ScrollReveal>
              )
            })()}

            {/* ── SUMMARY ── */}
            <ScrollReveal id="summary">
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginBottom: 20 }}>
                <Card topColor={sc(passProbability ?? score)} style={{ textAlign: 'center', padding: '24px 20px', background: `linear-gradient(180deg, ${sbg(passProbability ?? score)} 0%, #fff 60%)` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>Pass Probability <InfoTooltip text="The likelihood this candidate will successfully complete probation, based on scores, pressure-fit, and response quality." /></div>
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
                      <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {(rq === 'Genuine' || rq === 'Likely Genuine') ? 'Verified Human' : 'Response Integrity'}
                        {(rq === 'Genuine' || rq === 'Likely Genuine') && (
                          <span
                            aria-label="Verified human"
                            title="Verified Human"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 16, height: 16, borderRadius: '50%', background: GRN, flexShrink: 0,
                            }}
                          >
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </span>
                        )}
                      </h2>
                      <InfoTooltip text="AI analysis of response authenticity, timing patterns, and consistency across scenarios." light />
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
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(${scenarioCount}, 1fr)`, gap: 10, marginBottom: 18 }}>
                    {scenarioIndices.map(i => {
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

                  {/* Scenario performance timeline */}
                  {(() => {
                    const scenarioTimes = scenarioIndices.map(i => {
                      const resp = responses.find(r => r.scenario_index === i)
                      return resp?.time_taken_seconds ?? null
                    })
                    const validTimes = scenarioTimes.filter(Boolean)
                    if (validTimes.length === 0) return null
                    const maxT = Math.max(...validTimes)
                    return (
                      <div style={{ marginTop: 16, marginBottom: 4 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                          Response time trend
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 72 }}>
                          {scenarioTimes.map((secs, i) => {
                            const tl = timingLabel(secs)
                            const barH = secs ? Math.max(Math.round((secs / maxT) * 50), 6) : 4
                            const timeLabel = secs
                              ? (Math.floor(secs / 60) > 0 ? `${Math.floor(secs / 60)}m${secs % 60 > 0 ? `${secs % 60}s` : ''}` : `${secs}s`)
                              : '-'
                            return (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 800, color: tl.color, lineHeight: 1 }}>
                                  {timeLabel}
                                </div>
                                <div style={{ width: '100%', height: barH, background: tl.color, borderRadius: '3px 3px 0 0', opacity: 0.75 }} />
                                <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                                  S{i + 1}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

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
                        <InfoTooltip text="How this candidate performs under realistic workplace pressure across four dimensions." light />
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
                  <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
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
                          {s != null && (
                            <>
                              <AnimBar pct={s} color={barColor} height={6} delay={idx * 80} />
                              <PFSparkline dimScore={s} dimKey={key} color={barColor} />
                            </>
                          )}
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

            {/* ── END LAYER 2 / LAYER 3 BOUNDARY ── */}

            {/* Layer 3 button — show for Sophie (Strategy-Fit), hide for James (failed) and Alex (rapid) */}
            {candidate?.assessments?.assessment_mode !== 'rapid' && !(score < 55 && results.risk_level === 'High') && (
              <button
                onClick={() => setLayer3Open(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '14px 0', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: `1.5px solid #0f2137`,
                  fontFamily: F, fontSize: 14, fontWeight: 700, color: '#0f2137',
                  marginBottom: 20, transition: 'background 0.15s',
                }}
              >
                {layer3Open ? 'Hide full analysis' : 'Full analysis — onboarding, compliance and everything else'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: layer3Open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

            {layer3Open && (<>

            {/* ── AI SUMMARY ── */}
            {results.ai_summary && (
              <ScrollReveal id="ai-assessment" delay={60}>
                <Card style={{ marginBottom: 20, borderLeft: `4px solid ${TEAL}`, boxShadow: SHADOW_LG }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <SectionHeading tooltip="AI-generated narrative summarising the candidate's overall performance with specific evidence.">AI Hiring Summary</SectionHeading>
                    <SectionToggle expanded={expandedSections.aiSummary} onToggle={() => toggleSection('aiSummary')} />
                  </div>
                  {expandedSections.aiSummary && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {results.ai_summary.split('\n\n').filter(p => p.trim()).map((para, i) => (
                        <p key={i} style={{ fontFamily: F, fontSize: 14.5, color: i === 0 ? TX : TX2, lineHeight: 1.8, margin: 0, fontWeight: i === 0 ? 500 : 400 }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              </ScrollReveal>
            )}

            {/* ── SKILLS ── */}
            {results.scores && Object.keys(results.scores).length > 0 && (
              <ScrollReveal id="skills" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Individual skill scores with detailed narratives referencing specific scenario responses.">Skills Breakdown</SectionHeading>
                  <RadarChart scores={results.scores} />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 16 }}>
                    {Object.entries(results.scores).map(([skill, skillScore]) => {
                      const displaySkill = skill === 'Execution Reliability' ? 'Will they deliver consistently?' : skill
                      const narrative = results.score_narratives?.[skill]
                      return (
                        <div key={skill} style={{ background: BG, border: `1.5px solid ${BD}`, borderRadius: 10, padding: '18px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                            <SmallRing score={skillScore} size={58} strokeWidth={5} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 5 }}>{displaySkill}</div>
                              <Badge label={slbl(skillScore)} bg={sbg(skillScore)} color={sc(skillScore)} border={sbd(skillScore)} />
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


            {/* ── EXECUTION RELIABILITY ── */}
            {typeof results.execution_reliability === 'number' && (
              <ScrollReveal delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Whether the candidate followed instructions, completed every part of each task, avoided overcomplicating things, and stayed consistent across scenarios.">
                    Will they deliver consistently?
                  </SectionHeading>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <SmallRing score={results.execution_reliability} size={68} strokeWidth={6} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: sc(results.execution_reliability) }}>
                          {results.execution_reliability}
                        </span>
                        <Badge label={slbl(results.execution_reliability)} bg={sbg(results.execution_reliability)} color={sc(results.execution_reliability)} border={sbd(results.execution_reliability)} />
                      </div>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.6 }}>
                        {results.execution_reliability >= 80
                          ? 'Followed instructions precisely, completed every section, and stayed consistent across all scenarios.'
                          : results.execution_reliability >= 60
                          ? 'Generally reliable. Missed or shortened parts of one or two task briefs.'
                          : 'Significant reliability concerns. Skipped instructions, left sections unfinished, or wandered off the brief.'}
                      </p>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
            )}

            {/* ── DEVELOPMENT POTENTIAL (junior/mid only) ── */}
            {(() => {
              const roleText = (candidate.assessments?.role_title || '').toLowerCase()
              const isSenior = /\b(director|head of|vp|vice president|chief|cxo|ceo|cto|cfo|coo|senior|principal|lead|staff)\b/.test(roleText)
              if (isSenior) return null
              if (typeof results.training_potential !== 'number') return null
              const tp = results.training_potential
              return (
                <ScrollReveal delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="How developable this candidate is. Looks at improvement across scenarios, adaptability, willingness to learn, and self-awareness about gaps.">
                      How quickly will they grow?
                    </SectionHeading>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>Trainability score</span>
                      <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: sc(tp) }}>{tp}/100</span>
                    </div>
                    <div style={{ position: 'relative', height: 10, background: `${sc(tp)}22`, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${tp}%`, background: sc(tp), borderRadius: 5 }} />
                    </div>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.65 }}>
                      {results.training_potential_narrative || (tp >= 75
                        ? 'Strong development signal. Likely to grow quickly with the right support.'
                        : tp >= 55
                        ? 'Moderate development signal. Will benefit from a structured 30-60-90 plan with regular feedback.'
                        : 'Limited development signal in this assessment. May be a fixed performer at current capability.')}
                    </p>
                  </Card>
                </ScrollReveal>
              )
            })()}

            {/* ── EXPECTATION ALIGNMENT ── */}
            <ScrollReveal delay={60}>
              <Card style={{ marginBottom: 20 }}>
                <SectionHeading tooltip="Signs from the candidate's responses that their expectations of the role do not match what the job description describes.">
                  Do they know what they are getting into?
                </SectionHeading>
                {Array.isArray(results?.expectation_mismatches) && results.expectation_mismatches.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {results.expectation_mismatches.map((m, i) => (
                      <div key={i} style={{
                        background: AMBBG, border: `1px solid ${AMBBD}`,
                        borderLeft: `5px solid ${AMB}`, borderRadius: 10, padding: '14px 18px',
                      }}>
                        <div style={{ fontFamily: F, fontSize: 12, fontWeight: 800, color: AMB, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Mismatch {i + 1}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.65, marginBottom: 6 }}>
                          <strong>Expects:</strong> {m.expects}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.65, marginBottom: 6 }}>
                          <strong>Reality:</strong> {m.reality}
                        </div>
                        {m.why_it_matters && (
                          <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.6 }}>
                            <strong>Why it matters:</strong> {m.why_it_matters}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    background: TEALLT, border: `1px solid ${TEAL}55`,
                    borderLeft: `5px solid ${TEAL}`, borderRadius: 10,
                    padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', background: `${TEAL}22`,
                      border: `1px solid ${TEAL}55`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.6, margin: 0 }}>
                      No expectation mismatches identified. This candidate's responses align with the role requirements described in the job description.
                    </p>
                  </div>
                )}
              </Card>
            </ScrollReveal>

            {/* ── STRENGTHS ── */}
            {results.strengths?.length > 0 && (
              <ScrollReveal id="strengths" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Key strengths identified with direct quotes from the candidate's responses as evidence.">Strengths</SectionHeading>
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
                  <SectionHeading tooltip="Concerns flagged by severity with evidence from the candidate's responses.">Watch-outs</SectionHeading>
                  {(() => {
                    const counts = { High: 0, Medium: 0, Low: 0 }
                    results.watchouts.forEach(w => {
                      const s = typeof w === 'object' ? w.severity : null
                      if (s === 'High') counts.High++
                      else if (s === 'Medium') counts.Medium++
                      else counts.Low++
                    })
                    const parts = []
                    if (counts.High > 0)   parts.push({ n: counts.High,   label: 'High',   color: RED })
                    if (counts.Medium > 0) parts.push({ n: counts.Medium, label: 'Medium', color: AMB })
                    if (counts.Low > 0)    parts.push({ n: counts.Low,    label: 'Low',    color: TX3 })
                    return (
                      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
                        {parts.map(({ n, label, color }) => (
                          <span key={label} style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color }}>
                            {n} {label}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {results.watchouts.map((w, i) => {
                      const title = typeof w === 'object' ? (w.watchout || w.title || w.text) : w
                      const severity = typeof w === 'object' ? w.severity : null
                      const explanation = typeof w === 'object' ? w.explanation : null
                      const evidence = typeof w === 'object' ? w.evidence : null
                      const sev = sevStyle(severity)
                      return (
                        <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderLeft: `4px solid ${sev.color}`, borderRadius: '0 10px 10px 0', padding: '16px 18px' }}>
                          {severity && <div style={{ marginBottom: 10 }}><Badge label={`${severity} severity`} bg={sev.bg} color={sev.color} border={sev.border} /></div>}
                          <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 8px' }}>{title}</p>
                          {explanation && <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.7 }}>{explanation}</p>}
                          {evidence && <EvidenceBox color={sev.color}>{evidence}</EvidenceBox>}
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <SectionHeading tooltip="A structured 90-day success plan with milestones, stakeholder introductions, and early wins.">90-Day Success Plan</SectionHeading>
                    <SectionToggle expanded={expandedSections.onboarding} onToggle={() => toggleSection('onboarding')} />
                  </div>
                  {expandedSections.onboarding && <>
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
                      const isExpanded = !!expandedWeeks[i]
                      return (
                        <div key={i} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,33,55,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: `1px solid ${BD}`, background: '#f8fafc' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: TEAL, boxShadow: `0 0 0 4px ${TEALLT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 14, fontWeight: 800, color: NAVY }}>{item.week}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Week {item.week}</div>
                              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, lineHeight: 1.2 }}>{item.title}</div>
                            </div>
                            <button
                              onClick={() => setExpandedWeeks(prev => ({ ...prev, [i]: !prev[i] }))}
                              style={{ flexShrink: 0, background: 'none', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, cursor: 'pointer' }}
                            >
                              {isExpanded ? 'Hide details' : 'Show details'}
                            </button>
                          </div>
                          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {item.objective && (
                              <div>
                                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Objective</div>
                                <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, margin: 0, lineHeight: 1.65 }}>{item.objective}</p>
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
                          </div>
                          <div className="ob-detail" style={{ display: isExpanded ? 'flex' : 'none', flexDirection: 'column', gap: 16, padding: '0 20px 18px', borderTop: `1px solid ${BD}` }}>
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
                  </>}
                </Card>
              </ScrollReveal>
            )}

            {/* ── INTERVIEW QUESTIONS ── */}
            {results.interview_questions?.length > 0 && (
              <ScrollReveal id="questions" delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Targeted questions designed to probe the specific gaps identified in this assessment. Each includes a follow-up probe.">Suggested Interview Questions</SectionHeading>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <SectionHeading>
                  <Ic name="paperclip" size={15} color={TEAL} />
                  Candidate Documents
                </SectionHeading>
                <SectionToggle expanded={expandedSections.candidateDocs} onToggle={() => toggleSection('candidateDocs')} />
              </div>
              {expandedSections.candidateDocs && <>
              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.6 }}>
                Attach the candidate's CV and cover letter. Uploaded files are included when you use <strong>Send to Client</strong>.
              </p>
              {/* Demo notice */}
              <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ic name="info" size={14} color={AMB} />
                <span style={{ fontFamily: F, fontSize: 12.5, color: '#92400e' }}>Demo preview. Sign up to upload real documents and send candidate packs.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                {/* CV — shown as pre-uploaded to demo the filled state */}
                <div style={{ border: `2px solid ${TEAL}`, borderRadius: 12, padding: '20px 20px', textAlign: 'center', background: TEALLT }}>
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
                <div style={{ border: `2px solid ${BD}`, borderRadius: 12, padding: '20px 20px', textAlign: 'center', background: BG }}>
                  <Ic name="file" size={28} color={TX3} />
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '10px 0 4px' }}>Cover Letter</div>
                  <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginBottom: 14 }}>PDF, DOC or DOCX, max 5MB</div>
                  <button onClick={() => router.push('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, background: NAVY, color: '#fff', fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                    <Ic name="upload" size={13} color={TEAL} />
                    Upload document
                  </button>
                </div>
              </div>
              </>}
            </Card>

            {/* ── FAIR WORK AGENCY READY ── */}
            <ScrollReveal delay={40}>
              <div style={{ border: `1.5px solid ${TEAL}55`, borderRadius: 14, background: TEALLT, padding: '18px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, background: `${TEAL}18`, border: `1.5px solid ${TEAL}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TEALD, letterSpacing: '0.01em' }}>Fair Work Agency Ready</div>
                  </div>
                  <button
                    onClick={() => toggleSection('fairWork')}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: `1px solid ${TEAL}55`, borderRadius: 6, cursor: 'pointer', padding: '3px 10px', fontFamily: F, fontSize: 11.5, fontWeight: 600, color: TEALD }}
                  >
                    {expandedSections.fairWork ? 'Collapse' : 'Expand'}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedSections.fairWork ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
                {expandedSections.fairWork && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontFamily: F, fontSize: 13, color: TEALD, margin: '0 0 12px', lineHeight: 1.7, opacity: 0.9 }}>
                      This assessment was conducted using PRODICTA, an AI-powered pre-employment assessment platform. The following compliance standards were applied:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {[
                        'Scoring is based on decisions, actions, and reasoning only.',
                        'No candidate was penalised for spelling, grammar, or writing style (Equality Act 2010).',
                        'All scenarios were generated from the specific job description provided.',
                        'Response timing and integrity were independently verified.',
                        `Assessment date: ${completedDate || 'Not recorded'}.`,
                        `Report generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                      ].map((point, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <svg style={{ flexShrink: 0, marginTop: 2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span style={{ fontFamily: F, fontSize: 13, color: TEALD, lineHeight: 1.6, opacity: 0.9 }}>{point}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, margin: 0, lineHeight: 1.6, opacity: 0.75, borderTop: `1px solid ${TEAL}33`, paddingTop: 12 }}>
                      This record may be used as evidence of a fair and objective assessment process.
                    </p>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* ── SPOKEN DELIVERY (demo for Sophie Chen) ── */}
            {params.candidateId === 'demo-c1' && (
              <ScrollReveal delay={60}>
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20, borderTop: `3px solid ${TEAL}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 4px' }}>How they sound under pressure</h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                    How this candidate communicates under pressure in their own voice
                  </p>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', marginBottom: 18 }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width={72} height={72} viewBox="0 0 72 72">
                        <circle cx={36} cy={36} r={30} fill="none" stroke={BD} strokeWidth={6} />
                        <circle cx={36} cy={36} r={30} fill="none" stroke={TEAL} strokeWidth={6}
                          strokeDasharray={`${0.87 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                          strokeLinecap="round" transform="rotate(-90 36 36)"
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>87</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 10px' }}>
                        Sophie's spoken delivery was assured and well-paced. Her tone remained calm and authoritative throughout, and she structured her verbal response with clear signposting. No hesitation patterns detected.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Confident', 'Measured', 'Clear', 'Authoritative'].map(t => (
                          <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}44`, padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '14px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, borderRadius: 8, backdropFilter: 'blur(3px)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, display: 'block', marginBottom: 8 }}>Voice recording available with subscription</span>
                        <button
                          onClick={() => setSignupPrompt(true)}
                          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Get started
                        </button>
                      </div>
                    </div>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Scenario 1</div>
                    <div style={{ height: 40, background: BD, borderRadius: 4, opacity: 0.5 }} />
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── DAY ONE PLANNING (demo for Sophie Chen) ── */}
            {params.candidateId === 'demo-c1' && (
              <ScrollReveal delay={60}>
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20, borderTop: `3px solid ${TEAL}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 4px' }}>How they would organise their first day</h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                    How this candidate structured their first Monday
                  </p>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', marginBottom: 18 }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width={72} height={72} viewBox="0 0 72 72">
                        <circle cx={36} cy={36} r={30} fill="none" stroke={BD} strokeWidth={6} />
                        <circle cx={36} cy={36} r={30} fill="none" stroke={TEAL} strokeWidth={6}
                          strokeDasharray={`${0.82 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                          strokeLinecap="round" transform="rotate(-90 36 36)"
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>82</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 10px' }}>
                        Sophie showed strong awareness of deadlines, completing the campaign report task well before the 2pm cut-off and leaving herself time to review it. She grouped her email responses into one focused block rather than stopping and starting throughout the morning. When the unexpected budget update landed she adjusted her lunch break to fit it in rather than letting it push other tasks off course.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Deadline-aware', 'Focused blocks', 'Pragmatic'].map(t => (
                          <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}44`, padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Read-only timeline */}
                  <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Her planned day</div>
                    {[
                      { time: '08:30', title: 'Review team briefing documents', note: 'Want to be prepared before standup' },
                      { time: '09:00', title: 'Team standup', fixed: true },
                      { time: '09:30', title: 'Respond to 3 urgent client emails', note: 'Batching emails into one block' },
                      { time: '10:30', title: 'Client strategy call', fixed: true },
                      { time: '11:00', title: 'MD budget update', fixed: true },
                      { time: '11:30', title: 'Prepare agenda for planning session' },
                      { time: '13:15', title: 'Campaign report deadline task', note: '45 min buffer before 2pm deadline' },
                      { time: '14:00', title: 'Campaign report deadline', fixed: true },
                      { time: '15:30', title: '1-to-1 with line manager', fixed: true },
                    ].map((e, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${BD}` }}>
                        <span style={{ fontFamily: FM, fontSize: 11, color: TX3, width: 40, flexShrink: 0 }}>{e.time}</span>
                        <span style={{ fontFamily: F, fontSize: 13, color: TX, fontWeight: e.fixed ? 600 : 500 }}>{e.title}</span>
                        {e.note && <span style={{ fontFamily: F, fontSize: 11, color: TEALD, fontStyle: 'italic' }}>"{e.note}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── INBOX OVERLOAD (demo for Sophie Chen) ── */}
            {params.candidateId === 'demo-c1' && (
              <ScrollReveal delay={60}>
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20, borderTop: `3px solid ${NAVY}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 4px' }}>How they handle it when everything hits at once</h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                    How this candidate handles competing demands under pressure
                  </p>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', marginBottom: 18 }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width={72} height={72} viewBox="0 0 72 72">
                        <circle cx={36} cy={36} r={30} fill="none" stroke={BD} strokeWidth={6} />
                        <circle cx={36} cy={36} r={30} fill="none" stroke={TEAL} strokeWidth={6}
                          strokeDasharray={`${0.79 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                          strokeLinecap="round" transform="rotate(-90 36 36)"
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>79</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 10px' }}>
                        Sophie correctly identified the client complaint as the highest priority item and deferred the internal team request to end of day. When the manager interruption arrived she chose to note it for later rather than break her focus mid-scenario, a pragmatic and professional response. Her main scenario answer quality remained high despite the additional pressure, indicating strong cognitive load management.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Client-first', 'Deadline-aware', 'Focused under pressure'].map(t => (
                          <span key={t} style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}44`, padding: '3px 10px', borderRadius: 20 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Inbox decisions summary */}
                  <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Her triage decisions</div>
                    {[
                      { item: 'Client complaint about campaign delays', action: 'Handle now', urgent: true },
                      { item: 'Budget reallocation approval needed', action: 'Handle now', urgent: false },
                      { item: 'Team member asking about Friday social', action: 'Deferred', urgent: false },
                    ].map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${BD}` }}>
                        <span style={{ fontFamily: F, fontSize: 13, color: TX }}>{d.item}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: d.action === 'Handle now' ? TEALLT : '#FEF3C7',
                          color: d.action === 'Handle now' ? TEALD : '#92400E',
                          border: `1px solid ${d.action === 'Handle now' ? `${TEAL}55` : '#FCD34D'}`,
                        }}>{d.action}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Interruption handling</div>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0 }}>Manager asked for a quick budget update mid-scenario. Sophie chose <strong>Note for later</strong> — maintained focus on the current task.</p>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── TEAM FIT (demo for Sophie Chen) ── */}
            {params.candidateId === 'demo-c1' && (
              <ScrollReveal delay={60}>
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20, borderTop: `3px solid ${TEAL}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 4px' }}>How they will work with your team</h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>How this candidate will work with your existing team</p>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', marginBottom: 18 }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width={72} height={72} viewBox="0 0 72 72">
                        <circle cx={36} cy={36} r={30} fill="none" stroke={BD} strokeWidth={6} />
                        <circle cx={36} cy={36} r={30} fill="none" stroke={TEAL} strokeWidth={6} strokeDasharray={`${0.78 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`} strokeLinecap="round" transform="rotate(-90 36 36)" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>78</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: 0 }}>
                      Sophie is a strong overall fit for this team. Her data-driven decision making and direct communication style will complement the team's fast-moving culture. The most likely friction point is with Marcus, the operations lead, whose consensus-seeking approach may feel slow to Sophie under pressure. The biggest gap she fills is strategic thinking — the team currently lacks someone who naturally zooms out to see the bigger picture.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: GRNBG, border: `1px solid ${GRNBD}`, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: GRN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Best match</div>
                      <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 4 }}>Jamie — Sales Director</div>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.5 }}>Both move fast, communicate directly, and are outcome-focused.</div>
                    </div>
                    <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Watch this relationship</div>
                      <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 4 }}>Marcus — Operations Lead</div>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.5 }}>Different decision speeds. Manage expectations in week one.</div>
                    </div>
                    <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${NAVY}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Gap filled</div>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX, lineHeight: 1.5 }}>Strategic communication. The team has strong executors but lacks a senior voice who can translate strategy to stakeholders.</div>
                    </div>
                  </div>
                  <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>First 30 days management advice</div>
                    {['Set up a 1-to-1 between Sophie and Marcus in week one to align on communication expectations.', 'Give Sophie a visible quick-win project in the first fortnight to build credibility with the team.', 'Brief the team on Sophie\'s data-driven approach before she starts so they know what to expect.'].map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TEALD, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.55 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                  {/* Per-member scores (locked) */}
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, backdropFilter: 'blur(2px)' }}>
                      <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2 }}>Per-member detail available with subscription</span>
                    </div>
                    {[{ name: 'Jamie', score: 88 }, { name: 'Marcus', score: 54 }, { name: 'Priya', score: 72 }, { name: 'Alex', score: 81 }].map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: `1px solid ${BD}` }}>
                        <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, minWidth: 70 }}>{m.name}</span>
                        <div style={{ flex: 1, height: 6, background: BG, borderRadius: 3 }}><div style={{ height: '100%', width: `${m.score}%`, background: TEAL, borderRadius: 3 }} /></div>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TEAL }}>{m.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── WORKSPACE PERFORMANCE (demo for Sophie Chen) ── */}
            {params.candidateId === 'demo-c1' && (
              <ScrollReveal delay={60}>
                <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20, borderTop: `3px solid ${NAVY}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: '0 0 4px' }}>How they handled their first morning</h2>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>How this candidate handled their first morning on the job</p>
                  <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 16 : 24, flexDirection: isMobile ? 'column' : 'row', marginBottom: 14 }}>
                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                      <svg width={72} height={72} viewBox="0 0 72 72">
                        <circle cx={36} cy={36} r={30} fill="none" stroke={BD} strokeWidth={6} />
                        <circle cx={36} cy={36} r={30} fill="none" stroke={TEAL} strokeWidth={6}
                          strokeDasharray={`${0.84 * 2 * Math.PI * 30} ${2 * Math.PI * 30}`}
                          strokeLinecap="round" transform="rotate(-90 36 36)"
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>84</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 10px' }}>
                        Sophie handled her morning inbox with clear prioritisation, addressing the client escalation first and delegating the internal budget query to her finance contact. Her task management showed strong strategic awareness, deferring the agency briefing to the afternoon to protect her focus for the high-priority stakeholder update. When the unexpected message from the MD arrived she responded promptly with a clear status update rather than ignoring it or over-explaining.
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Client-first', 'Strategic delegator', 'Deadline-aware', 'Clear communicator'].map(s => (
                          <span key={s} style={{ fontSize: 11.5, fontWeight: 700, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}44`, padding: '3px 10px', borderRadius: 20 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a href="/demo/workspace" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: F, fontSize: 13, fontWeight: 600, color: TEALD, textDecoration: 'none' }}>
                    Try the workspace demo
                  </a>
                </div>
              </ScrollReveal>
            )}

            {/* ── BLURRED / LOCKED PREMIUM SECTIONS ── */}
            {[
              { title: 'Predicted Outcomes', desc: 'See the probability of passing probation, churn risk, and top performer likelihood with dynamic colour-coded bars.', variant: 'cards' },
              { title: '90-Day Reality Timeline', desc: 'See what the first three months will actually look like for this hire, phase by phase.', variant: 'timeline' },
              { title: 'Hiring Confidence Score', desc: 'A single go/stop number with detailed rationale and confidence tier breakdown.', variant: 'score' },
              { title: 'Decision Alerts', desc: 'Consequence predictions on every watch-out showing the real cost of ignoring each one.', variant: 'grid' },
              { title: 'What the Assessment Revealed', desc: 'Side-by-side comparison of what the CV claimed versus what the candidate actually demonstrated.', variant: 'grid' },
              { title: 'Candidate Responses', desc: 'Full scenario replay with every answer the candidate wrote, detailed timing, and integrity signals.', variant: 'text' },
              { title: 'What managing them actually looks like', desc: 'What managing this person actually looks like on a normal Monday morning when everything is happening at once.', variant: 'text' },
              { title: '90-Day Hiring Manager Coaching Plan', desc: 'A structured probation guide with SMART objectives, weekly check-ins, and Alchemy Training UK coach sign-off at each phase.', variant: 'timeline' },
              { title: 'Key Stakeholder Mapping', desc: 'Who this hire will work with, the pressure points in each relationship, and what to watch for.', variant: 'grid' },
              { title: 'Will they fit the culture?', desc: 'Five-dimension working style analysis showing how this candidate\'s natural approach matches the role environment.', variant: 'chart' },
              { title: 'Will they accept the offer?', desc: 'How likely this candidate is to accept a counter-offer from their current employer.', variant: 'score' },
              { title: 'How quickly will they grow?', desc: 'How quickly this candidate will develop with the right support.', variant: 'score' },
              { title: 'What could make them leave', desc: 'A specific prediction of what would cause this hire to leave within 6 months, with prevention actions.', variant: 'text' },
              { title: 'Simple View', desc: 'A plain English version of this report for line managers, with no jargon and no technical scoring language.', variant: 'text' },
            ].map(({ title, desc, variant }) => (
              <ScrollReveal key={title} delay={60}>
                <LockedSection title={title} desc={desc} variant={variant} />
              </ScrollReveal>
            ))}

            {/* ── DASHBOARD TEASER BANNER ── */}
            <div style={{ background: '#0f2137', borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
                Plus more features on your dashboard
              </h3>
              <p style={{ fontFamily: F, fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 auto 24px', maxWidth: 600 }}>
                {isAgency
                  ? 'Auto Shortlist with AI-ranked candidates. Configurable Client Reports. Rebate Period Tracker. Placement Risk Calculator. Outcome Tracking with automatic check-ins. Bulk Screening for high-volume roles. Hiring Cost Saved Calculator. Cost of Wrong Hire Calculator. Red Flag Email Alerts. Decision Override Tracking. Candidate Development Portal. And more.'
                  : 'Probation Co-pilot with live monitoring. Probation Timeline Tracker. Probation Review Generator. ERA 2025 Risk Calculator. Outcome Tracking with automatic check-ins. Rejected Candidate Development Plan. Red Flag Email Alerts. Decision Override Tracking. Bulk Screening. Hiring Cost Saved Calculator. Cost of Wrong Hire Calculator. Candidate Development Portal. Configurable Reports. And more.'
                }
              </p>
              <a href="/login" style={{
                display: 'inline-block', background: '#00BFA5', color: '#0f2137', fontFamily: F,
                fontWeight: 800, padding: '14px 32px', borderRadius: 10, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(0,191,165,0.3)',
              }}>
                Get started
              </a>
            </div>

            </>)}
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

      {/* ── EVIDENCE PACK MODAL (James O'Brien demo) ── */}
      {evidencePackModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.6)', zIndex: 1300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}
          onClick={() => setEvidencePackModal(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 620, width: '100%', boxShadow: '0 24px 72px rgba(15,33,55,0.3)', overflow: 'hidden' }}>
            <div style={{ background: NAVY, padding: '24px 28px', position: 'relative' }}>
              <button onClick={() => setEvidencePackModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <Ic name="x" size={18} color="rgba(255,255,255,0.6)" />
              </button>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Fair Dismissal Audit Trail</div>
              <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.4px' }}>Probation Evidence Pack</h2>
              <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.55 }}>
                A legally-structured document combining the original assessment and probation data for ERA 2025 compliance.
              </p>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.65 }}>
                When an employer hires through PRODICTA and later needs to end employment during probation, the Evidence Pack consolidates every step of the process into a single downloadable PDF. It demonstrates that the decision was based on documented, objective performance, not on any protected characteristic.
              </p>

              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 18px', marginBottom: 18 }}>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>What is included</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {[
                    'Cover page with reference number, candidate, role, and key dates',
                    'Assessment summary: score, hiring confidence, strengths, watch-outs, Pressure-Fit and Response Integrity',
                    'Probation co-pilot evidence: check-in entries, watch-out tracking, and 90-Day Coaching Plan adherence',
                    'Redline alert history with intervention plans and whether they were actioned',
                    'Side-by-side performance deviation analysis (predicted vs observed)',
                    'Compliance statement covering Equality Act 2010 and ERA 2025',
                    'Recommendation for legal use, signed off with timestamp and pack reference',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <Ic name="check" size={13} color={TEAL} />
                      <span style={{ fontFamily: F, fontSize: 12.5, color: TX, lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: TEALLT, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 22 }}>
                <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, margin: 0, lineHeight: 1.55 }}>
                  <strong>Why it matters:</strong> the Employment Rights Act 2025 strengthens protections during the probation period. The Evidence Pack gives employers an objective, contemporaneous record to support a fair dismissal.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => router.push('/login')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px 0', borderRadius: 9, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                >
                  Get started
                </button>
                <button
                  onClick={() => setEvidencePackModal(false)}
                  style={{ padding: '12px 22px', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Self-Preview Modal */}
      {candidatePreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, padding: '32px 20px', overflowY: 'auto' }} onClick={() => setCandidatePreview(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 600, width: '100%', boxShadow: '0 24px 72px rgba(15,33,55,0.3)', overflow: 'hidden' }}>
            <div style={{ background: NAVY, padding: '24px 28px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px', background: `linear-gradient(135deg, ${TEAL}, #009688)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>Your Assessment is Complete</h2>
              <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>This is what {candidate?.name || 'the candidate'} sees after submitting</p>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Strengths</div>
              {(results?.strengths || []).slice(0, 3).map((s, i) => (
                <div key={i} style={{ background: BG, borderLeft: `4px solid ${TEAL}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 8 }}>
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 4 }}>{s.strength || s.text || s.title}</div>
                  {s.evidence && <div style={{ fontFamily: F, fontSize: 12, color: TEALD, fontStyle: 'italic' }}>"{s.evidence}"</div>}
                </div>
              ))}

              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 10px' }}>One area to develop</div>
              <div style={{ position: 'relative', background: BG, borderLeft: '4px solid #E8B84B', borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 4 }}>
                  {results?.watchouts?.[0]?.watchout || 'Growth opportunity identified'}
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 8px 8px 0', backdropFilter: 'blur(2px)' }}>
                  <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2 }}>Available with subscription</span>
                </div>
              </div>

              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What to expect in this role</div>
              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.65 }}>
                  Your responses showed how you approach real work situations. The hiring team uses this alongside the rest of their process to understand how you are likely to perform.
                </p>
              </div>

              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 16px', textAlign: 'center', lineHeight: 1.6 }}>
                Thank you for completing your assessment. The hiring team will be in touch.
              </p>
            </div>
            <div style={{ padding: '12px 28px 20px', borderTop: `1px solid ${BD}`, textAlign: 'center' }}>
              <button onClick={() => setCandidatePreview(false)} style={{ padding: '10px 28px', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <Ic name="x" size={13} color={TX3} /> Cover Letter (not attached)
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

export default function DemoCandidatePage({ params }) {
  return <Suspense><DemoCandidateInner params={params} /></Suspense>
}
