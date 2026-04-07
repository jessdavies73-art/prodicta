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
        return (
          <g key={i}>
            <text x={lx} y={nameY} textAnchor={anchor} fontSize={11} fontWeight="700" fontFamily="Outfit, system-ui, sans-serif" fill="#0f2137">{skill}</text>
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


/* ── Main page ────────────────────────────────────────────────────────────── */
export default function DemoCandidatePage({ params }) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('summary')
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [outcomeModal, setOutcomeModal] = useState(false)
  const [demoOutcome, setDemoOutcome] = useState(() => {
    const s = DEMO_RESULTS[params.candidateId]?.overall_score ?? 0
    return s >= 80 ? 'passed_probation' : s >= 70 ? 'still_in_probation' : null
  })
  const [signupPrompt, setSignupPrompt] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [expandedSections, setExpandedSections] = useState({ aiSummary: false, candidateDocs: false, onboarding: false, fairWork: false })
  function toggleSection(key) { setExpandedSections(prev => ({ ...prev, [key]: !prev[key] })) }
  const allExpanded = Object.values(expandedSections).every(Boolean)

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
        @media print { .ob-detail { display: flex !important; } }
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
                  {(() => {
                    const m = candidate.assessments?.assessment_mode
                    if (!m || m === 'standard') return null
                    const label = m === 'advanced' ? 'Advanced Assessment' : m === 'quick' || m === 'rapid' ? 'Quick Assessment' : null
                    if (!label) return null
                    return <Badge label={label} bg="#fffbeb" color="#d97706" border="#fcd34d" />
                  })()}
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
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>Overall Score <InfoTooltip text="Comprehensive performance score across all 4 scenarios. 50 is average, 75+ is strong. Calibrated to role seniority." /></div>
                  <ScoreRing score={score} size={130} strokeWidth={9} />
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: sc(score), marginTop: 8 }}>{slbl(score)}</div>
                  {results.percentile && (
                    <div style={{ marginTop: 6, fontFamily: F, fontSize: 11.5, fontWeight: 600, color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {results.percentile} of candidates
                    </div>
                  )}
                  {(() => {
                    const roleType = detectRoleCategory(candidate?.assessments?.role_title, candidate?.assessments?.job_description)
                    const bm = ROLE_BENCHMARKS[roleType] || ROLE_BENCHMARKS.general
                    const diff = score - bm.avg
                    return (
                      <div style={{ marginTop: 10, textAlign: 'center' }}>
                        <div style={{ fontFamily: F, fontSize: 10.5, color: TX3, marginBottom: 5 }}>
                          {bm.label} avg: {bm.avg}
                        </div>
                        <div style={{ position: 'relative', height: 5, background: '#e4e9f0', borderRadius: 3, width: 120, margin: '0 auto' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(score, 100)}%`, background: sc(score), borderRadius: 3 }} />
                          <div style={{ position: 'absolute', top: -4, left: `${bm.avg}%`, width: 2, height: 13, background: '#94a3b8', borderRadius: 1, transform: 'translateX(-50%)' }} />
                        </div>
                        <div style={{ fontFamily: F, fontSize: 10, color: diff > 0 ? GRN : diff < 0 ? RED : TX3, marginTop: 4 }}>
                          {diff > 0 ? `+${diff} above average` : diff < 0 ? `${diff} below average` : 'At average'}
                        </div>
                      </div>
                    )
                  })()}
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TEALLT, border: `1.5px solid ${TEAL}`, borderRadius: 8, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: TEALD, padding: '9px 16px' }}
                  >
                    <Ic name="file" size={14} color={TEALD} />
                    Interview Brief
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {results && (
          <>
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
            <StickyNav active={activeSection} />

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
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
                      <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Response Integrity</h2>
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

                  {/* Scenario performance timeline */}
                  {(() => {
                    const scenarioTimes = [0, 1, 2, 3].map(i => {
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


            {/* ── EXECUTION RELIABILITY ── */}
            {typeof results.execution_reliability === 'number' && (
              <ScrollReveal delay={60}>
                <Card style={{ marginBottom: 20 }}>
                  <SectionHeading tooltip="Whether the candidate followed instructions, completed every part of each task, avoided overcomplicating things, and stayed consistent across scenarios.">
                    Execution Reliability
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
                      Development Potential
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
                    <SectionHeading tooltip="A structured 6-week plan tailored to this candidate's specific gaps. Designed to be handed directly to the line manager.">Personalised Onboarding Plan</SectionHeading>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

            {/* ── LOCKED FEATURES TEASER ── */}
            <div style={{ marginBottom: 40, borderRadius: 14, overflow: 'hidden', boxShadow: SHADOW_LG }}>
              {/* Blurred preview strip */}
              <div style={{ position: 'relative', background: NAVY, overflow: 'hidden', padding: '28px 32px 0' }}>
                <div style={{ filter: 'blur(4px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                    {[
                      { label: 'Probability of passing probation', val: 78, color: TEAL },
                      { label: 'Top performer likelihood',         val: 42, color: AMB  },
                      { label: 'Churn risk',                       val: 18, color: GRN  },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</span>
                          <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 800, color }}>{val}%</span>
                        </div>
                        <div style={{ height: 6, background: `${color}22`, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Fade overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, transparent, #0f2137)`, pointerEvents: 'none' }} />
              </div>

              {/* Lock header */}
              <div style={{ background: '#0f2137', padding: '24px 32px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${TEAL}20`, border: `1px solid ${TEAL}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>
                    Included in your subscription
                  </h3>
                </div>
                <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 22px', lineHeight: 1.6 }}>
                  The demo shows a sample of the PRODICTA report. A full subscription includes these additional features on every candidate.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 28 }}>
                  {[
                    { title: 'Predicted Outcome Panel', desc: 'Probability of passing probation, churn risk, and top performer likelihood.' },
                    { title: '90-Day Reality Timeline', desc: 'What the first three months will actually look like for this hire.' },
                    { title: 'Hiring Confidence Score', desc: 'A single go/stop number for decision makers, with supporting rationale.' },
                    { title: 'Decision Alerts', desc: 'Consequence predictions on every watch-out so you know the real cost of ignoring each one.' },
                    { title: 'What the Assessment Revealed', desc: 'A side-by-side view of what the CV claimed versus what the candidate actually demonstrated.' },
                    { title: 'Candidate Responses', desc: 'Full scenario replay with every answer, timing, and integrity signal for each question.' },
                    { title: 'Cost of Wrong Hire calculator', desc: 'Live calculator showing your ERA 2025 tribunal exposure based on salary and hire volume.' },
                    { title: 'Document This Assessment', desc: 'One-click compliance record ready for Fair Work Agency audit or employment tribunal.' },
                    { title: 'Red Flag email alerts', desc: 'Automatic notifications when a candidate scores below your threshold.' },
                    { title: 'Smart Role Context', desc: 'AI asks follow-up questions about your role to generate more accurate scenarios.' },
                    { title: 'Interview Brief', desc: 'A one-page printable brief prepared for the interview room.' },
                    { title: 'Auto Shortlist', desc: 'AI-ranked top three candidates with a written justification for each.' },
                    { title: 'Rapid Assessment', desc: 'A 15-minute compressed assessment for urgent or volume hiring.' },
                    { title: 'Probation Timeline Tracker', desc: 'Visual tracker with automated reminders throughout the probation period.' },
                    { title: 'Hiring Cost Saved calculator', desc: 'Track the financial value of every hiring decision PRODICTA informed.' },
                    { title: 'Candidate Expectation Mismatch Detection', desc: 'Flags when a candidate\'s expectations of the role do not match the reality described in the JD.' },
                    { title: 'Why They Might Leave Analysis', desc: 'A specific narrative prediction of what would cause this hire to leave within 6 months, with prevention actions.' },
                    { title: 'Probation Review Generator', desc: 'Auto-generated structured probation reviews at month 1, 3, and 5, cross-checked against the original assessment.' },
                    { title: 'Simple View toggle', desc: 'A plain-English version of the report for line managers, with no jargon and no technical scoring language.' },
                    { title: 'Bulk Screening Mode', desc: 'Ranked Recommended / Review / Not Recommended tiers across the full candidate pool for high-volume roles.' },
                  ].map(({ title, desc }) => (
                    <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <div>
                        <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{title}</div>
                        <div style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/login')}
                  style={{ background: TEAL, color: NAVY, border: 'none', borderRadius: 10, padding: '14px 32px', fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 18px ${TEAL}44` }}
                >
                  Get started
                </button>
              </div>
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
