'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM,
  riskBg, riskCol, riskBd,
} from '@/lib/constants'

/* ─────────────────────────────────────────────────────────────
   Score colour helpers , updated thresholds
   <50 red · 50,69 amber · 70,84 jade · 85+ green
───────────────────────────────────────────────────────────── */
const sc   = s => s >= 85 ? GRN  : s >= 70 ? TEAL : s >= 50 ? AMB  : RED
const sbg  = s => s >= 85 ? GRNBG : s >= 70 ? TEALLT : s >= 50 ? AMBBG : REDBG
const sbd  = s => s >= 85 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 50 ? AMBBD : REDBD
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'

const pfColor = s => s == null ? TX3  : s >= 80 ? GRN  : s >= 55 ? TEALD : RED
const pfBg    = s => s == null ? BG   : s >= 80 ? GRNBG : s >= 55 ? TEALLT : REDBG
const pfBd    = s => s == null ? BD   : s >= 80 ? GRNBD : s >= 55 ? `${TEAL}55` : REDBD
const pfLbl   = s => s == null ? ','  : s >= 80 ? 'Strong' : s >= 55 ? 'Moderate' : 'Concern'

/* hiring decision from score */
const dL = s => s >= 80 ? 'Strong hire' : s >= 70 ? 'Hire with plan' : s >= 55 ? 'Proceed with caution' : 'Not recommended'
const dC = s => s >= 80 ? GRN : s >= 70 ? TEAL : s >= 55 ? AMB : RED
const dBg = s => s >= 80 ? GRNBG : s >= 70 ? TEALLT : s >= 55 ? AMBBG : REDBG
const dBd = s => s >= 80 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 55 ? AMBBD : REDBD

/* ─────────────────────────────────────────────────────────────
   Reusable primitives
───────────────────────────────────────────────────────────── */
const SHADOW = '0 2px 12px rgba(15,33,55,0.08), 0 1px 3px rgba(15,33,55,0.05)'
const SHADOW_LG = '0 4px 24px rgba(15,33,55,0.10), 0 1px 4px rgba(15,33,55,0.06)'

const Card = ({ children, style = {}, className = '', topColor }) => (
  <div className={`card-hover ${className}`} style={{
    background: CARD,
    border: `1px solid ${BD}`,
    borderRadius: 12,
    padding: '24px 28px',
    boxShadow: SHADOW,
    ...(topColor ? { borderTop: `3px solid ${topColor}` } : {}),
    ...style,
  }}>
    {children}
  </div>
)

const SectionHeading = ({ children, tooltip }) => (
  <h2 style={{
    fontFamily: F,
    fontSize: 15,
    fontWeight: 800,
    color: TX,
    margin: '0 0 18px',
    paddingBottom: 10,
    borderBottom: `2px solid ${TEAL}`,
    letterSpacing: '-0.2px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }}>
    {children}
    {tooltip && <InfoTooltip text={tooltip} />}
  </h2>
)

const Badge = ({ label, bg, color, border }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 50,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
    border: `1px solid ${border || 'transparent'}`,
    letterSpacing: '0.01em',
  }}>
    {label}
  </span>
)

const EvidenceBox = ({ children, color = TEAL }) => (
  <div style={{
    background: '#f8fafc',
    border: `1px solid ${BD}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '0 8px 8px 0',
    padding: '10px 14px',
    marginTop: 10,
  }}>
    <p style={{
      fontFamily: F,
      fontSize: 13,
      color: TX2,
      margin: 0,
      lineHeight: 1.7,
      fontStyle: 'italic',
    }}>
      &ldquo;{children}&rdquo;
    </p>
  </div>
)

const ActionBox = ({ children }) => (
  <div style={{
    background: '#f8fafc',
    border: `1px solid ${BD}`,
    borderLeft: `3px solid ${TX3}`,
    borderRadius: '0 8px 8px 0',
    padding: '10px 14px',
    marginTop: 10,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
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
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
      >
        <Ic name="info" size={14} color={light ? 'rgba(255,255,255,0.45)' : TX3} />
      </span>
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: tooltipBg,
          color: '#fff',
          fontSize: 12,
          fontFamily: F,
          fontWeight: 400,
          lineHeight: 1.55,
          padding: '9px 13px',
          borderRadius: 8,
          width: 240,
          zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          textAlign: 'left',
          whiteSpace: 'normal',
          border: light ? '1px solid rgba(255,255,255,0.15)' : 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)', width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: `6px solid ${tooltipBg}`,
          }} />
        </span>
      )}
    </span>
  )
}

/* Animated SVG score ring with count-up */
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
      const progress = Math.min(step / steps, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * eased))
      if (progress >= 1) clearInterval(t)
    }, 1000 / fps)
    return () => clearInterval(t)
  }, [score, animate])

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 ${Math.round(size * 0.06)}px ${color}55)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}18`} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={drawn ? offset : circ}
          style={{ transition: animate ? 'stroke-dashoffset 0.016s linear' : 'none' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>
          {display}
        </span>
        <span style={{ fontFamily: F, fontSize: size * 0.08, fontWeight: 700, color: TX3, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          /100
        </span>
      </div>
    </div>
  )
}

/* Small ring for skill cards */
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
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={drawn ? circ * (1 - score / 100) : circ}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.26, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  )
}

/* Pressure-Fit score ring , colour: green 75+, amber 50-74, red below 50 */
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
      const progress = Math.min(step / steps, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * eased))
      if (progress >= 1) clearInterval(t)
    }, 1000 / fps)
    return () => clearInterval(t)
  }, [score])
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 ${Math.round(size * 0.07)}px ${color}55)` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={drawn ? offset : circ}
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

/* Animated bar (fills when mounted) */
function AnimBar({ pct, color, height = 6, delay = 0 }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(pct), 120 + delay); return () => clearTimeout(t) }, [pct, delay])
  return (
    <div style={{ height, borderRadius: 99, background: `${color}20`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 99, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)', opacity: 0.9 }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Loading skeleton
───────────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[200, 96, 320, 200, 160].map((h, i) => (
        <div key={i} style={{ height: h, background: BD, borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.55}}`}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Pending state
───────────────────────────────────────────────────────────── */
function PendingState({ candidate }) {
  return (
    <Card style={{ textAlign: 'center', padding: '56px 32px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', background: AMBBG, border: `1px solid ${AMBBD}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
      }}>
        <Ic name="clock" size={28} color={AMB} />
      </div>
      <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 8px' }}>Results pending</h3>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 6px' }}>
        {candidate?.name ? `${candidate.name} hasn't completed the assessment yet, or scoring is still in progress.` : 'This candidate has not completed the assessment yet.'}
      </p>
      <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>
        AI analysis typically takes under two minutes once the candidate finishes.
      </p>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────────
   Confidence / Trajectory / Seniority badges
───────────────────────────────────────────────────────────── */
function ConfidenceBadge({ level }) {
  const map = {
    High:   { color: GRN,  bg: GRNBG,  bd: GRNBD,  tooltip: 'Responses were detailed enough for reliable assessment' },
    Medium: { color: AMB,  bg: AMBBG,  bd: AMBBD,  tooltip: 'Some responses were brief, reducing scoring certainty' },
    Low:    { color: RED,  bg: REDBG,  bd: REDBD,  tooltip: 'Multiple responses too short for high-confidence scoring' },
  }
  const s = map[level]
  if (!s) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>
      {level} confidence <InfoTooltip text={s.tooltip} />
    </span>
  )
}

function TrajectoryBadge({ trajectory }) {
  const map = {
    Improving: { arrow: '↑', color: GRN,  bg: GRNBG,  bd: GRNBD },
    Stable:    { arrow: '→', color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
    Declining: { arrow: '↓', color: RED,  bg: REDBG,  bd: REDBD },
  }
  const s = map[trajectory]
  if (!s) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.bd}` }}>
      {s.arrow} {trajectory} trajectory
    </span>
  )
}

function SeniorityBadge({ score }) {
  if (score == null) return null
  const color = score >= 75 ? GRN : score >= 50 ? AMB : RED
  const bg    = score >= 75 ? GRNBG : score >= 50 ? AMBBG : REDBG
  const bd    = score >= 75 ? GRNBD : score >= 50 ? AMBBD : REDBD
  const label = score >= 75 ? 'Seniority matched' : score >= 50 ? 'Partial seniority match' : 'Below expected seniority'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${bd}` }}>
      <Ic name={score >= 65 ? 'check' : 'alert'} size={11} color={color} /> {label}
    </span>
  )
}

/* Fade-in-up on scroll */
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
    <div
      id={id}
      ref={ref}
      style={{
        scrollMarginTop: 56,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* Sticky section navigation */
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
  function scrollTo(id) {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 56
    window.scrollTo({ top, behavior: 'smooth' })
  }
  return (
    <div className="no-print" style={{
      position: 'sticky', top: 0, zIndex: 80,
      background: 'rgba(243,245,248,0.95)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderBottom: `1px solid ${BD}`,
      marginLeft: -40, marginRight: -40,
      paddingLeft: 40, paddingRight: 40,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {NAV_SECTIONS.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              data-no-lift
              style={{
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: F,
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? TEAL : TX3,
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
                flexShrink: 0,
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* Generate a default sliding-scale rebate schedule for N weeks */
function defaultRebateSchedule(weeks) {
  return Array.from({ length: weeks }, (_, i) =>
    i === weeks - 1 ? 0 : Math.round(100 - (i / Math.max(1, weeks - 1)) * 100)
  )
}

/* ─────────────────────────────────────────────────────────────
   Rebate Period Timeline (agency)
───────────────────────────────────────────────────────────── */
function RebateTimeline({ outcome, candidateName }) {
  const { placement_date, rebate_weeks, rebate_schedule } = outcome || {}
  if (!placement_date || !rebate_weeks) return null

  const start      = new Date(placement_date)
  const totalDays  = rebate_weeks * 7
  const now        = new Date()
  const elapsed    = Math.max(0, Math.floor((now - start) / 86400000))
  const progress   = Math.min(100, (elapsed / totalDays) * 100)
  const ended      = elapsed >= totalDays
  const fmtDate    = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const schedule   = (rebate_schedule && rebate_schedule.length === rebate_weeks)
    ? rebate_schedule
    : defaultRebateSchedule(rebate_weeks)

  const milestones = Array.from({ length: rebate_weeks }, (_, i) => {
    const w        = i + 1
    const isLast   = w === rebate_weeks
    const pct      = schedule[i] ?? 0
    const dayOff   = w * 7
    const passed   = elapsed >= dayOff
    const date     = fmtDate(new Date(start.getTime() + dayOff * 86400000))
    return { w, pct, dayOff, passed, date, isLast }
  })

  const currentPct = ended ? 0
    : milestones[Math.min(Math.floor(elapsed / 7), rebate_weeks - 1)]?.pct ?? 100
  const weeksLeft  = Math.max(0, rebate_weeks - Math.ceil(elapsed / 7))

  return (
    <div style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
      padding: '24px 28px', boxShadow: '0 2px 12px rgba(15,33,55,0.08)', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic name="clock" size={16} color={ended ? GRN : AMB} />
          Rebate Period Tracker
        </h2>
        <span style={{
          fontFamily: F, fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
          background: ended ? GRNBG : AMBBG,
          color: ended ? GRN : AMB,
          border: `1px solid ${ended ? GRNBD : AMBBD}`,
        }}>
          {ended ? 'Fee Secured' : `${currentPct}% rebate available`}
        </span>
      </div>

      <div style={{ fontFamily: F, fontSize: 13, color: TX2, marginBottom: 20 }}>
        Placed on <strong>{fmtDate(start)}</strong> &middot; {rebate_weeks}-week rebate
        {!ended && <> &middot; <strong style={{ color: AMB }}>{weeksLeft} week{weeksLeft !== 1 ? 's' : ''} remaining</strong></>}
        {ended && <> &middot; <strong style={{ color: GRN }}>Rebate period complete</strong></>}
      </div>

      {/* Track — padded so labels at 0% and 100% never clip */}
      <div style={{ padding: '0 20px', marginBottom: 52 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ height: 6, background: BD, borderRadius: 3 }} />
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: `${progress}%`, height: 6,
            background: ended ? GRN : TEAL, borderRadius: 3, transition: 'width 0.4s',
          }} />

          {/* Milestone dots */}
          {milestones.map(m => {
            const pos       = (m.dayOff / totalDays) * 100
            const dotBorder = m.passed ? TEAL : BD
            const dotFill   = m.passed ? TEAL : CARD
            const lblColor  = m.passed ? TEALD : TX3
            return (
              <div key={m.w} style={{ position: 'absolute', left: `${pos}%`, top: -5, transform: 'translateX(-50%)' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${dotBorder}`,
                  background: dotFill, zIndex: 1, position: 'relative',
                  boxShadow: m.isLast && m.passed ? `0 0 0 3px ${TEAL}22` : 'none',
                }}>
                  {m.isLast && m.passed && (
                    <div style={{ position: 'absolute', inset: -1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Ic name="check" size={8} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: lblColor }}>
                    {m.isLast ? 'Fee secured' : `Week ${m.w}`}
                  </div>
                  {!m.isLast && (
                    <div style={{ fontFamily: FM, fontSize: 9, fontWeight: 600, color: m.passed ? TEAL : TX3 }}>{m.pct}%</div>
                  )}
                  <div style={{ fontFamily: F, fontSize: 9, color: TX3 }}>{m.date}</div>
                </div>
              </div>
            )
          })}

          {/* Current position cursor */}
          {!ended && elapsed > 0 && (
            <div style={{
              position: 'absolute', left: `${progress}%`, top: -7, transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: TEAL, border: `3px solid #fff`,
              boxShadow: `0 2px 8px ${TEAL}66`, zIndex: 2,
            }} />
          )}
        </div>
      </div>

      {/* Reminder note */}
      {!ended && weeksLeft <= 2 && (
        <div style={{ background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 8, padding: '10px 14px', fontFamily: F, fontSize: 13, color: RED, fontWeight: 600 }}>
          Rebate period ends {weeksLeft === 0 ? 'this week' : `in ${weeksLeft} week${weeksLeft > 1 ? 's' : ''}`}. Log the final outcome now.
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Probation Timeline (employer)
───────────────────────────────────────────────────────────── */
function ProbationTimeline({ outcome }) {
  const { placement_date, probation_months = 6 } = outcome || {}
  if (!placement_date) return null

  const start     = new Date(placement_date)
  const now       = new Date()
  const elapsed   = Math.max(0, Math.floor((now - start) / 86400000))
  const totalDays = Math.round(probation_months * 30.44)
  const eraDays   = 183 // 6 months
  const progress  = Math.min(100, (elapsed / totalDays) * 100)
  const ended     = elapsed >= totalDays
  const fmtDate   = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  // Fixed check-in milestones (months 1, 3, 5 and the ERA line)
  const checkIns = [
    { month: 1, day: 30,  label: 'Month 1', sub: 'Check-in' },
    { month: 3, day: 91,  label: 'Month 3', sub: 'Mid-point review' },
    { month: 5, day: 152, label: 'Month 5', sub: 'Final review' },
  ].filter(m => m.day < totalDays)

  const eraShown  = eraDays <= totalDays || probation_months >= 6
  const eraPos    = Math.min(100, (eraDays / totalDays) * 100)
  const monthsLeft = Math.max(0, probation_months - Math.floor(elapsed / 30.44))

  return (
    <div style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
      padding: '24px 28px', boxShadow: '0 2px 12px rgba(15,33,55,0.08)', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic name="clock" size={16} color={ended ? GRN : elapsed >= 152 ? RED : TEAL} />
          Probation Timeline
        </h2>
        <span style={{
          fontFamily: F, fontSize: 13, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
          background: ended ? GRNBG : elapsed >= 152 ? REDBG : TEALLT,
          color: ended ? GRN : elapsed >= 152 ? RED : TEALD,
          border: `1px solid ${ended ? GRNBD : elapsed >= 152 ? REDBD : `${TEAL}55`}`,
        }}>
          {ended ? 'Probation complete' : elapsed >= 152 ? 'ERA danger zone' : `${Math.round(monthsLeft)} months remaining`}
        </span>
      </div>

      <div style={{ fontFamily: F, fontSize: 13, color: TX2, marginBottom: 20 }}>
        Hired on <strong>{fmtDate(start)}</strong> &middot; {probation_months}-month probation
        {elapsed >= 152 && !ended && (
          <strong style={{ color: RED }}> &middot; Unfair dismissal rights apply at 6 months</strong>
        )}
      </div>

      {/* Track — padded so labels at 0 % and 100 % never clip */}
      <div style={{ padding: '0 20px', marginBottom: 64 }}>
        <div style={{ position: 'relative' }}>

          {/* Bar background */}
          <div style={{ height: 6, background: BD, borderRadius: 3 }} />

          {/* Progress fill */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: `${progress}%`, height: 6,
            background: ended ? GRN : elapsed >= 152 ? RED : TEAL,
            borderRadius: 3, transition: 'width 0.4s',
          }} />

          {/* Start milestone — left-aligned label */}
          <div style={{ position: 'absolute', left: 0, top: -5 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${TEAL}`, background: TEAL, zIndex: 1,
            }} />
            <div style={{ position: 'absolute', top: 22, left: 0, whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: TEALD }}>Start</div>
              <div style={{ fontFamily: F, fontSize: 9, color: TX3 }}>{fmtDate(start)}</div>
            </div>
          </div>

          {/* Check-in milestones */}
          {checkIns.map((m) => {
            const pos       = (m.day / totalDays) * 100
            const passed    = elapsed >= m.day
            const dotBorder = passed ? TEAL : BD
            const dotFill   = passed ? TEAL : CARD
            const lblColor  = passed ? TEALD : TX3
            return (
              <div key={m.month} style={{ position: 'absolute', left: `${pos}%`, top: -5, transform: 'translateX(-50%)' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${dotBorder}`,
                  background: dotFill, zIndex: 1,
                }} />
                <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: lblColor }}>{m.label}</div>
                  <div style={{ fontFamily: F, fontSize: 9, color: TX3 }}>{m.sub}</div>
                </div>
              </div>
            )
          })}

          {/* ERA 2025 danger line — right-aligned label so it never clips */}
          {eraShown && (
            <div style={{ position: 'absolute', left: `${eraPos}%`, top: -14, transform: 'translateX(-50%)', zIndex: 3 }}>
              <div style={{ width: 2, height: 34, background: RED, margin: '0 auto' }} />
              <div style={{ position: 'absolute', top: 36, right: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: FM, fontSize: 9.5, fontWeight: 800, color: RED, background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 4, padding: '1px 5px', display: 'inline-block' }}>ERA LINE</div>
                <div style={{ fontFamily: F, fontSize: 8.5, color: RED, marginTop: 2 }}>{fmtDate(new Date(start.getTime() + eraDays * 86400000))}</div>
              </div>
            </div>
          )}

          {/* Current position cursor */}
          {!ended && elapsed > 0 && (
            <div style={{
              position: 'absolute', left: `${progress}%`, top: -7, transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: elapsed >= 152 ? RED : TEAL, border: `3px solid #fff`,
              boxShadow: `0 2px 8px ${elapsed >= 152 ? RED : TEAL}66`, zIndex: 2,
            }} />
          )}

        </div>
      </div>

      {/* ERA warning */}
      {elapsed >= 152 && !ended && (
        <div style={{ background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 8, padding: '10px 14px', fontFamily: F, fontSize: 13, color: RED, fontWeight: 600 }}>
          One month until unfair dismissal rights apply under ERA 2025. Log the probation outcome now.
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Role colour helpers
───────────────────────────────────────────────────────────── */
const ROLE_PALETTE = ['#00BFA5', '#0f2137', '#E8B84B', '#E87461', '#7C5CFC', '#4FC3F7']
function roleColor(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ROLE_PALETTE[h % ROLE_PALETTE.length]
}

/* ─────────────────────────────────────────────────────────────
   Severity helpers
───────────────────────────────────────────────────────────── */
function sevStyle(severity) {
  if (severity === 'High')   return { bg: REDBG,  color: RED,   border: REDBD,  tint: `${RED}08` }
  if (severity === 'Medium') return { bg: AMBBG,  color: AMB,   border: AMBBD,  tint: `${AMB}08` }
  return                            { bg: '#f1f5f9', color: '#9CA3AF', border: '#e5e7eb', tint: '#f8fafc' }
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function CandidateReportPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [results, setResults] = useState(null)
  const [benchmarks, setBenchmarks] = useState([])
  const [responses, setResponses] = useState([])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('summary')

  // Outcome Tracking (employer only)
  const [outcomeModal, setOutcomeModal] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState('')
  const [outcomeDate, setOutcomeDate] = useState('')
  const [outcomeNoteText, setOutcomeNoteText] = useState('')
  const [outcomeClientName, setOutcomeClientName] = useState('')
  const [placementDate, setPlacementDate] = useState('')
  const [rebateWeeks, setRebateWeeks] = useState(6)
  const [rebateSchedule, setRebateSchedule] = useState(() => defaultRebateSchedule(6))
  const [useCustomRebate, setUseCustomRebate] = useState(false)
  const [customRebateInput, setCustomRebateInput] = useState('')
  const [probationMonths, setProbationMonths] = useState(6)
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [outcomeError, setOutcomeError] = useState(null)
  const [existingOutcome, setExistingOutcome] = useState(null)

  // Accountability Trail (agency only)
  const [accountRecord, setAccountRecord] = useState(null)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordSharedDate, setRecordSharedDate] = useState('')
  const [savingSharedDate, setSavingSharedDate] = useState(false)
  const [recordError, setRecordError] = useState(null)

  // Documents (agency only)
  const [documents, setDocuments] = useState({})
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [deletingDoc, setDeletingDoc] = useState(null)
  const [sendModal, setSendModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Report section prefs (agency , Feature 6)
  const DEFAULT_SECTIONS = { overall_score: true, pressure_fit: true, ai_summary: true, skills: true, strengths: true, watchouts: true, interview_questions: true, candidate_type: true, predicted_outcomes: true, reality_timeline: true, hiring_confidence: true, cv_comparison: true }
  const [reportSections, setReportSections] = useState(DEFAULT_SECTIONS)
  const [reportSectionsModal, setReportSectionsModal] = useState(false)
  const [savingReportPrefs, setSavingReportPrefs] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) { router.push('/login'); return }
        setUser(u)

        const [{ data: cand, error: cErr }, { data: res }, { data: bm }, { data: resps }, { data: prof }] = await Promise.all([
          supabase.from('candidates').select('*, assessments(role_title, job_description, skill_weights)').eq('id', params.candidateId).single(),
          supabase.from('results').select('*').eq('candidate_id', params.candidateId).maybeSingle(),
          supabase.from('benchmarks').select('*').eq('user_id', u.id),
          supabase.from('responses').select('scenario_index, time_taken_seconds').eq('candidate_id', params.candidateId).order('scenario_index'),
          supabase.from('users').select('company_name, account_type, report_sections').eq('id', u.id).maybeSingle(),
        ])

        if (cErr) throw cErr
        setCandidate(cand)
        setResults(res || null)
        setBenchmarks(bm || [])
        setResponses(resps || [])
        setProfile(prof || null)
        if (prof?.report_sections) setReportSections({ ...DEFAULT_SECTIONS, ...prof.report_sections })

        const { data: nts } = await supabase.from('candidate_notes').select('*').eq('candidate_id', params.candidateId).order('created_at', { ascending: false })
        setNotes(nts || [])

        if (prof?.account_type === 'agency') {
          const { data: docList } = await supabase.from('candidate_documents').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id)
          const docMap = {}
          ;(docList || []).forEach(d => { docMap[d.doc_type] = d })
          setDocuments(docMap)
        }

        const [{ data: outcome }, { data: acRec }] = await Promise.all([
          supabase.from('candidate_outcomes').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
          supabase.from('accountability_records').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
        ])
        setExistingOutcome(outcome || null)
        if (outcome) {
          setSelectedOutcome(outcome.outcome)
          setOutcomeDate(outcome.outcome_date || '')
          setOutcomeNoteText(outcome.notes || '')
          setOutcomeClientName(outcome.client_name || '')
          setPlacementDate(outcome.placement_date || '')
          if (outcome.rebate_weeks) {
            setRebateWeeks(outcome.rebate_weeks)
            setRebateSchedule(outcome.rebate_schedule?.length === outcome.rebate_weeks
              ? outcome.rebate_schedule
              : defaultRebateSchedule(outcome.rebate_weeks))
          }
          if (outcome.probation_months) setProbationMonths(outcome.probation_months)
        }
        setAccountRecord(acRec || null)
        if (acRec?.shared_with_client_at) setRecordSharedDate(acRec.shared_with_client_at)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.candidateId])

  // Scroll listener for sticky nav active section tracking
  useEffect(() => {
    if (!results) return
    const ids = ['summary','integrity','pressure-fit','ai-assessment','skills','strengths','watchouts','onboarding','questions']
    function onScroll() {
      const offset = 80
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top + window.scrollY <= window.scrollY + offset) {
          current = id
        }
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [results])

  const score = results?.overall_score ?? 0
  const passProbability = results?.pass_probability ?? null
  const completedDate = candidate?.completed_at
    ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const bmMap = {}
  benchmarks.forEach(b => { if (b.skill_name) bmMap[b.skill_name.toLowerCase()] = b.threshold })

  async function handleDocUpload(docType, file) {
    if (!file || !user) return
    setUploadingDoc(docType)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('candidateId', params.candidateId)
      formData.append('docType', docType)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDocuments(prev => ({ ...prev, [docType]: data.document }))
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploadingDoc(null)
    }
  }

  async function handleDocDelete(docId, docType) {
    setDeletingDoc(docType)
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDocuments(prev => ({ ...prev, [docType]: null }))
    } catch (e) {
      console.error('Delete error:', e)
    } finally {
      setDeletingDoc(null)
    }
  }

  async function sendCandidatePack() {
    if (!sendEmail.trim() || !user) return
    setSending(true)
    try {
      const res = await fetch('/api/send-candidate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: params.candidateId, clientEmail: sendEmail.trim(), message: sendMessage.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSendSuccess(true)
      setTimeout(() => { setSendModal(false); setSendSuccess(false); setSendEmail(''); setSendMessage('') }, 2800)
    } catch (e) {
      console.error('Send error:', e)
      setSending(false)
    }
  }

  function handlePrint() { window.print() }
  function doClientPrint() {
    document.body.classList.add('client-print')
    window.print()
    window.addEventListener('afterprint', function cleanup() {
      document.body.classList.remove('client-print')
      window.removeEventListener('afterprint', cleanup)
    })
  }
  function handleClientExport() {
    if (profile?.account_type === 'agency') { setReportSectionsModal(true) } else { doClientPrint() }
  }
  async function saveReportPrefsAndExport() {
    setSavingReportPrefs(true)
    if (user) {
      const supabase = createClient()
      await supabase.from('users').update({ report_sections: reportSections }).eq('id', user.id)
    }
    setSavingReportPrefs(false)
    setReportSectionsModal(false)

    const el = document.querySelector('.client-report-container')
    if (!el) return

    // Make the hidden container renderable off-screen
    const prev = el.style.cssText
    el.style.cssText = 'display:block!important;position:fixed;left:-9999px;top:0;width:800px;background:#fff;'

    try {
      const { default: html2pdf } = await import('html2pdf.js')
      const safeName = s => (s || '').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const filename = `PRODICTA-Report-${safeName(candidate?.name)}-${safeName(candidate?.assessments?.role_title)}.pdf`
      await html2pdf().set({
        margin:      [12, 12],
        filename,
        image:       { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:   { mode: ['css', 'legacy'] },
      }).from(el).save()
    } catch (err) {
      console.error('[pdf] Generation failed:', err)
    } finally {
      el.style.cssText = prev
    }
  }

  async function addNote() {
    if (!newNote.trim() || !user) return
    setNoteSaving(true)
    const supabase = createClient()
    const { data: inserted } = await supabase.from('candidate_notes').insert({
      candidate_id: params.candidateId,
      user_id: user.id,
      author_name: profile?.company_name || user.email,
      note_text: newNote.trim(),
    }).select().single()
    if (inserted) { setNotes(prev => [inserted, ...prev]); setNewNote('') }
    setNoteSaving(false)
  }

  async function deleteNote(noteId) {
    const supabase = createClient()
    await supabase.from('candidate_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  async function logOutcome() {
    if (!selectedOutcome || !user) return
    setSavingOutcome(true)
    setOutcomeError(null)
    const supabase = createClient()
    const payload = {
      candidate_id: params.candidateId,
      user_id: user.id,
      outcome: selectedOutcome,
      outcome_date: outcomeDate || null,
      notes: outcomeNoteText.trim() || null,
      client_name: profile?.account_type === 'agency' ? (outcomeClientName.trim() || null) : null,
      placement_date: placementDate || null,
      rebate_weeks: profile?.account_type === 'agency' && placementDate
        ? (useCustomRebate ? (parseInt(customRebateInput) || null) : rebateWeeks)
        : null,
      rebate_schedule: profile?.account_type === 'agency' && placementDate && rebateSchedule.length > 0
        ? rebateSchedule
        : null,
      probation_months: profile?.account_type === 'employer' && placementDate ? probationMonths : null,
    }
    let saved, dbError
    if (existingOutcome) {
      const { data, error } = await supabase.from('candidate_outcomes').update(payload).eq('id', existingOutcome.id).select().single()
      saved = data; dbError = error
    } else {
      const { data, error } = await supabase.from('candidate_outcomes').insert(payload).select().single()
      saved = data; dbError = error
    }
    if (dbError) {
      setOutcomeError(dbError.message || 'Failed to save outcome. Please check the database schema.')
    } else if (saved) {
      setExistingOutcome(saved)
      setOutcomeModal(false)
    }
    setSavingOutcome(false)
  }

  async function generateAccountabilityRecord() {
    if (!user || !results) return
    setSavingRecord(true)
    setRecordError(null)
    const supabase = createClient()
    try {
      const roleTitle = candidate?.assessments?.role_title || ''
      const assessmentDate = candidate?.completed_at
        ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

      const keyFindings = [
        `Candidate: ${candidate?.name || 'Unknown'}`,
        roleTitle ? `Role: ${roleTitle}` : null,
        `Assessment Date: ${assessmentDate}`,
        '',
        `Overall Score: ${results.overall_score}/100 (${slbl(results.overall_score)})`,
        results.pressure_fit_score != null ? `Pressure-Fit Score: ${results.pressure_fit_score}/100` : null,
        `Hiring Decision: ${dL(results.overall_score)}`,
        results.risk_level ? `Risk Level: ${results.risk_level}` : null,
        results.trajectory ? `Performance Trajectory: ${results.trajectory}` : null,
        results.confidence_level ? `Confidence Level: ${results.confidence_level}` : null,
      ].filter(v => v !== null).join('\n')

      const watchOuts = (results.watchouts || []).map(w => {
        if (typeof w !== 'object') return w
        const sev = w.severity || 'Medium'
        const title = w.title || w.text || ''
        const detail = w.text && w.text !== title ? `  Detail: ${w.text}` : null
        const action = w.action || w.recommended_action || null
        return [
          `[${sev}] ${title}`,
          detail,
          action ? `  Recommended action: ${action}` : null,
        ].filter(Boolean).join('\n')
      }).join('\n\n')

      const questions = (results.interview_questions || []).map((q, i) =>
        `${i + 1}. ${typeof q === 'object' ? (q.question || q.text || '') : q}`
      ).join('\n')

      const payload = {
        candidate_id: params.candidateId,
        user_id: user.id,
        generated_at: new Date().toISOString(),
        key_findings: keyFindings,
        watch_outs: watchOuts,
        recommended_actions: questions,
      }

      let saved
      if (accountRecord) {
        const { data, error: err } = await supabase.from('accountability_records').update(payload).eq('id', accountRecord.id).select().single()
        if (err) throw err
        saved = data
      } else {
        const { data, error: err } = await supabase.from('accountability_records').insert(payload).select().single()
        if (err) throw err
        saved = data
      }
      if (saved) setAccountRecord(saved)
    } catch (err) {
      setRecordError(err.message || 'Failed to generate record')
    } finally {
      setSavingRecord(false)
    }
  }

  async function saveSharedDate() {
    if (!accountRecord || !user) return
    setSavingSharedDate(true)
    const supabase = createClient()
    const { data } = await supabase.from('accountability_records').update({ shared_with_client_at: recordSharedDate || null }).eq('id', accountRecord.id).select().single()
    if (data) setAccountRecord(data)
    setSavingSharedDate(false)
  }

  function handleAccountabilityPrint() {
    document.body.classList.add('accountability-print')
    window.print()
    window.addEventListener('afterprint', function cleanup() {
      document.body.classList.remove('accountability-print')
      window.removeEventListener('afterprint', cleanup)
    })
  }

  function calcPlacementRisk(res, roleTitle) {
    if (!res) return null
    const assessmentScore = res.overall_score ?? 0
    const pressureFit = res.pressure_fit_score ?? 50
    const seniorityFit = res.seniority_fit_score ?? 50
    const integrityMap = { 'Genuine': 95, 'Likely Genuine': 80, 'Adequate': 65, 'Possibly AI-Assisted': 40, 'Suspect': 20 }
    const integrityScore = integrityMap[res.integrity?.response_quality] ?? 65
    const rt = (roleTitle || '').toLowerCase()
    let industrySafety = 65
    if (/finance|legal|engineer|software|tech|consult|analy|account/.test(rt)) industrySafety = 80
    if (/sales|retail|hospitality|customer|support|call centre/.test(rt)) industrySafety = 45
    return Math.min(100, Math.max(0, Math.round(
      assessmentScore * 0.40 + pressureFit * 0.25 + seniorityFit * 0.15 + industrySafety * 0.10 + integrityScore * 0.10
    )))
  }

  function formatNoteDate(str) {
    if (!str) return ''
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  /* ── render ── */
  return (
    <div style={{ background: '#f3f5f8', minHeight: '100vh', fontFamily: F }}>
      <style>{`
        @media print {
          aside { display: none !important; }
          main { margin-left: 0 !important; padding: 16px !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .client-report-container { display: none; }
        .accountability-record-print { display: none; }
        @media print {
          body.client-print aside { display: none !important; }
          body.client-print main { display: none !important; }
          body.client-print .client-report-container { display: block !important; }
          body.accountability-print aside { display: none !important; }
          body.accountability-print main { display: none !important; }
          body.accountability-print .client-report-container { display: none !important; }
          body.accountability-print .accountability-record-print { display: block !important; }
        }
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:.55}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px 2px rgba(0,191,165,0.25)}50%{box-shadow:0 0 18px 5px rgba(0,191,165,0.45)}}
        html { scroll-behavior: smooth; }
      `}</style>
      <Sidebar active="assessment" />

      <main style={{ marginLeft: 220, padding: '32px 40px', maxWidth: 1000, boxSizing: 'border-box' }}>

        {/* Back */}
        <button
          className="no-print"
          onClick={() => router.push(`/assessment/${params.id}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX2, padding: '0 0 22px',
          }}
        >
          <Ic name="left" size={16} color={TX2} />
          Back to assessment
        </button>

        {loading && <LoadingState />}
        {!loading && error && (
          <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: RED, fontFamily: F, fontSize: 14 }}>{error}</p>
          </Card>
        )}

        {!loading && !error && candidate && (
          <>

            {/* ══════════════════════════════════════════════════
                CANDIDATE HEADER
            ══════════════════════════════════════════════════ */}
            <Card style={{ marginBottom: 20, boxShadow: SHADOW_LG }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                {/* Avatar + meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 240 }}>
                  <Avatar name={candidate.name || 'Candidate'} size={52} />
                  <div>
                    <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 3px', letterSpacing: '-0.4px' }}>
                      {candidate.name || 'Unknown Candidate'}
                    </h2>
                    {candidate.email && (
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px' }}>{candidate.email}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {candidate.assessments?.role_title && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: roleColor(candidate.assessments?.id || ''),
                            flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                            </svg>
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: TX2, fontFamily: F }}>{candidate.assessments.role_title}</span>
                        </div>
                      )}
                      {completedDate && (
                        <span style={{ fontSize: 12, color: TX3, fontFamily: F }}>Completed {completedDate}</span>
                      )}
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

                {/* Score ring + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexShrink: 0, flexWrap: 'wrap' }}>
                  {results && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                        Overall Score <InfoTooltip text="Comprehensive performance score across all 4 scenarios. 50 is average, 75+ is strong. Calibrated to role seniority." />
                      </div>
                      <ScoreRing score={score} size={130} strokeWidth={9} />
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: sc(score), marginTop: 8 }}>
                        {slbl(score)}
                      </div>
                      {results.percentile && (
                        <div style={{
                          marginTop: 6, fontFamily: F, fontSize: 11.5, fontWeight: 600,
                          color: TEALD, background: TEALLT, border: `1px solid ${TEAL}55`,
                          borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
                        }}>
                          {results.percentile} of candidates
                        </div>
                      )}
                    </div>
                  )}

                  <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {results && (profile?.account_type === 'employer' || profile?.account_type === 'agency') && (
                      <button onClick={() => setOutcomeModal(true)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: existingOutcome ? GRNBG : TEALLT,
                        border: `1.5px solid ${existingOutcome ? GRNBD : `${TEAL}55`}`,
                        borderRadius: 8, cursor: 'pointer',
                        fontFamily: F, fontSize: 13, fontWeight: 700,
                        color: existingOutcome ? GRN : TEALD, padding: '9px 16px',
                      }}>
                        <Ic name="check" size={15} color={existingOutcome ? GRN : TEALD} />
                        {existingOutcome ? 'Update Outcome' : 'Log Outcome'}
                      </button>
                    )}
                    {results && (
                      <button onClick={handleClientExport} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: NAVY, border: 'none', borderRadius: 8, cursor: 'pointer',
                        fontFamily: F, fontSize: 13, fontWeight: 700, color: '#fff', padding: '9px 16px',
                      }}>
                        <Ic name="file" size={15} color={TEAL} />
                        Export Client Report
                      </button>
                    )}
                    {results && profile?.account_type === 'agency' && (
                      <button onClick={() => setSendModal(true)} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: TEAL, border: 'none', borderRadius: 8, cursor: 'pointer',
                        fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, padding: '9px 16px',
                      }}>
                        <Ic name="send" size={15} color={NAVY} />
                        Send to Client
                      </button>
                    )}
                    {profile?.account_type !== 'agency' && (
                      <button onClick={handlePrint} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'transparent', border: `1.5px solid ${BD}`, borderRadius: 8,
                        cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, padding: '9px 16px',
                      }}>
                        <Ic name="download" size={15} color={TX2} />
                        Export PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline trackers */}
            {existingOutcome?.placement_date && profile?.account_type === 'agency' && (
              <RebateTimeline outcome={existingOutcome} candidateName={candidate?.name} />
            )}
            {existingOutcome?.placement_date && profile?.account_type === 'employer' && (
              <ProbationTimeline outcome={existingOutcome} />
            )}

            {!results && <PendingState candidate={candidate} />}

            {results && (
              <>

                <StickyNav active={activeSection} />

                {/* ══════════════════════════════════════════════════
                    HIRING CONFIDENCE BANNER
                ══════════════════════════════════════════════════ */}
                {results.hiring_confidence && (() => {
                  const hc = results.hiring_confidence
                  const hcScore = hc.score ?? hc
                  const hcExplanation = hc.explanation || null
                  const hcColor = hcScore >= 70 ? TEAL : hcScore >= 55 ? AMB : RED
                  const hcBg    = hcScore >= 70 ? TEALLT : hcScore >= 55 ? AMBBG : REDBG
                  const hcBd    = hcScore >= 70 ? `${TEAL}55` : hcScore >= 55 ? AMBBD : REDBD
                  const hcLabel = hcScore >= 85 ? 'Strong confidence' : hcScore >= 70 ? 'Good confidence' : hcScore >= 55 ? 'Moderate confidence' : hcScore >= 40 ? 'Low confidence' : 'Very low confidence'
                  return (
                    <ScrollReveal delay={0}>
                    <div style={{
                      marginBottom: 20,
                      background: CARD,
                      border: `1.5px solid ${hcBd}`,
                      borderLeft: `5px solid ${hcColor}`,
                      borderRadius: '0 12px 12px 0',
                      padding: '20px 28px',
                      boxShadow: SHADOW,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 28,
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontFamily: FM, fontSize: 48, fontWeight: 800, color: hcColor, lineHeight: 1 }}>
                          {hcScore}%
                        </span>
                        <div>
                          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            Hiring Confidence <InfoTooltip text="A single decision-ready percentage combining all assessment data. Use this as your go/stop indicator for hiring decisions." />
                          </div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '3px 10px', borderRadius: 20,
                            background: hcBg, border: `1px solid ${hcBd}`,
                          }}>
                            <span style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: hcColor }}>{hcLabel}</span>
                          </div>
                        </div>
                      </div>
                      {hcExplanation && (
                        <div style={{ flex: 1, minWidth: 200, borderLeft: `1px solid ${BD}`, paddingLeft: 24 }}>
                          <p style={{ fontFamily: F, fontSize: 14.5, fontWeight: 600, color: TX, margin: 0, lineHeight: 1.5 }}>
                            {hcExplanation}
                          </p>
                          <p style={{ fontFamily: F, fontSize: 11.5, color: TX3, margin: '4px 0 0', lineHeight: 1.4 }}>
                            Composite of assessment score, pressure-fit, integrity, seniority, and watch-out severity.
                          </p>
                        </div>
                      )}
                    </div>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    TOP SUMMARY ROW , Pass Probability · Hiring Decision · Risk Level
                ══════════════════════════════════════════════════ */}
                <ScrollReveal id="summary">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>

                  {/* Pass Probability */}
                  <Card topColor={sc(passProbability ?? score)} style={{ textAlign: 'center', padding: '24px 20px', background: `linear-gradient(180deg, ${sbg(passProbability ?? score)} 0%, #fff 60%)` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                      Pass Probability <InfoTooltip text="The likelihood this candidate will successfully complete probation, based on scores, pressure-fit, and response quality." />
                    </div>
                    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                      <SmallRing score={passProbability ?? score} size={80} strokeWidth={7} />
                    </div>
                    <div style={{ fontFamily: FM, fontSize: 32, fontWeight: 800, color: sc(passProbability ?? score), lineHeight: 1, marginBottom: 6 }}>
                      {passProbability ?? score}%
                    </div>
                    <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>predicted probation success</div>
                  </Card>

                  {/* Hiring Decision */}
                  <Card topColor={dC(score)} style={{ textAlign: 'center', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(180deg, ${dBg(score)} 0%, #fff 60%)` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Hiring Decision
                    </div>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: dC(score),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                      boxShadow: `0 4px 14px ${dC(score)}44`,
                    }}>
                      <Ic name="award" size={24} color="#fff" />
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '8px 20px', borderRadius: 50,
                      background: dC(score),
                      boxShadow: `0 3px 12px ${dC(score)}44`,
                    }}>
                      <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>
                        {dL(score)}
                      </span>
                    </div>
                  </Card>

                  {/* Risk Level */}
                  <Card topColor={riskCol(results.risk_level)} style={{ padding: '24px 22px', background: `linear-gradient(180deg, ${riskBg(results.risk_level)} 0%, #fff 60%)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Risk Level</span>
                      <InfoTooltip text="Likelihood of this candidate struggling during probation based on their responses" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: riskCol(results.risk_level),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 3px 10px ${riskCol(results.risk_level)}44`,
                      }}>
                        <Ic name="alert" size={18} color="#fff" />
                      </div>
                      <span style={{
                        fontFamily: FM, fontSize: 20, fontWeight: 800, color: riskCol(results.risk_level),
                        letterSpacing: '-0.3px',
                      }}>
                        {results.risk_level || 'Unknown'}
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

                {/* ══════════════════════════════════════════════════
                    CANDIDATE TYPE SNAPSHOT
                ══════════════════════════════════════════════════ */}
                {results.candidate_type && (() => {
                  const withIdx = results.candidate_type.indexOf(' with ')
                  const primary  = withIdx > -1 ? results.candidate_type.slice(0, withIdx) : results.candidate_type
                  const modifier = withIdx > -1 ? results.candidate_type.slice(withIdx + 6) : null
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
                          <span style={{ fontFamily: F, fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>with</span>
                          <span style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{modifier}</span>
                        </>}
                      </div>
                    </div>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    PREDICTED OUTCOME PANEL
                ══════════════════════════════════════════════════ */}
                {results.predictions && (() => {
                  const p = results.predictions
                  const panels = [
                    { label: 'Pass probation',        key: 'pass_probation',        color: '#00BFA5', bg: 'rgba(0,191,165,0.07)', bd: 'rgba(0,191,165,0.22)' },
                    { label: 'Become top performer',  key: 'top_performer',          color: '#00BFA5', bg: 'rgba(0,191,165,0.07)', bd: 'rgba(0,191,165,0.22)' },
                    { label: 'Churn within 6 months', key: 'churn_risk',             color: AMB,       bg: AMBBG,                  bd: AMBBD                  },
                    { label: 'Underperformance risk', key: 'underperformance_risk',  color: '#EF4444', bg: '#fef2f2',              bd: '#fecaca'               },
                  ]
                  return (
                    <ScrollReveal delay={60}>
                    <Card style={{ marginBottom: 20 }}>
                      <SectionHeading tooltip="Probability predictions for this candidate's first 6 months, calibrated to the role and seniority level.">
                        Predicted Outcome Panel
                      </SectionHeading>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {panels.map(({ label, key, color, bg, bd }) => {
                          const val = p[key] ?? 0
                          const r = 22
                          const circ = 2 * Math.PI * r
                          const dash = (val / 100) * circ
                          return (
                            <div key={key} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '18px 12px', textAlign: 'center' }}>
                              <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 12px' }}>
                                <svg width={60} height={60} viewBox="0 0 60 60">
                                  <circle cx={30} cy={30} r={r} fill="none" stroke={`${color}22`} strokeWidth={5} />
                                  <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={5}
                                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                                    transform="rotate(-90 30 30)" />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 800, color }}>{val}%</span>
                                </div>
                              </div>
                              <div style={{ fontFamily: F, fontSize: 11.5, color: TX2, lineHeight: 1.4 }}>{label}</div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    PLACEMENT RISK SCORE , agency only
                ══════════════════════════════════════════════════ */}
                {profile?.account_type === 'agency' && (() => {
                  const prs = calcPlacementRisk(results, candidate?.assessments?.role_title)
                  if (prs == null) return null
                  const prsColor = prs >= 75 ? GRN : prs >= 50 ? AMB : RED
                  const prsBg    = prs >= 75 ? GRNBG : prs >= 50 ? AMBBG : REDBG
                  const prsBd    = prs >= 75 ? GRNBD : prs >= 50 ? AMBBD : REDBD
                  const prsLabel = prs >= 75 ? 'Low Risk' : prs >= 50 ? 'Medium Risk' : 'High Risk'
                  const prsDesc  = prs >= 75
                    ? 'Strong chance of successful placement. Candidate profile aligns well with role demands.'
                    : prs >= 50
                    ? 'Moderate placement risk. Review watch-outs and consider probing questions before placing.'
                    : 'High placement risk. Significant gaps detected. Discuss concerns with client before proceeding.'
                  return (
                    <ScrollReveal delay={60}>
                    <Card style={{ marginBottom: 20, border: `1.5px solid ${prsBd}`, background: `linear-gradient(135deg, ${prsBg} 0%, #fff 60%)` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TX, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Placement Risk Score
                            </span>
                            <InfoTooltip text="Combines assessment score (40%), pressure-fit (25%), seniority fit (15%), industry turnover risk (10%), and response integrity (10%) to estimate placement success likelihood." />
                          </div>
                          <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 14px', lineHeight: 1.65 }}>
                            {prsDesc}
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11.5, fontWeight: 600, color: TX3, fontFamily: F }}>
                            <span>Assessment score ×0.40</span>
                            <span>·</span>
                            <span>Pressure-fit ×0.25</span>
                            <span>·</span>
                            <span>Seniority fit ×0.15</span>
                            <span>·</span>
                            <span>Industry risk ×0.10</span>
                            <span>·</span>
                            <span>Integrity ×0.10</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <SmallRing score={prs} size={80} strokeWidth={7} />
                          <div style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center',
                            padding: '4px 14px', borderRadius: 50, fontFamily: F,
                            fontSize: 12, fontWeight: 800, background: prsBg,
                            color: prsColor, border: `1px solid ${prsBd}`,
                          }}>
                            {prsLabel}
                          </div>
                        </div>
                      </div>
                    </Card>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    CANDIDATE DOCUMENTS , agency only
                ══════════════════════════════════════════════════ */}
                {profile?.account_type === 'agency' && (
                  <Card style={{ marginBottom: 20 }} className="no-print">
                    <SectionHeading>
                      <Ic name="paperclip" size={15} color={TEAL} />
                      Candidate Documents
                    </SectionHeading>
                    <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.6 }}>
                      Attach the candidate's CV and cover letter. Uploaded files are included when you use <strong>Send to Client</strong>.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {['cv', 'cover_letter'].map(docType => {
                        const doc = documents[docType]
                        const label = docType === 'cv' ? 'CV / Résumé' : 'Cover Letter'
                        const isUploading = uploadingDoc === docType
                        const isDeleting  = deletingDoc  === docType
                        return (
                          <div key={docType} style={{
                            border: `2px dashed ${doc ? TEAL : BD}`,
                            borderRadius: 12, padding: '20px 20px', textAlign: 'center',
                            background: doc ? TEALLT : BG, transition: 'all 0.15s',
                          }}>
                            <Ic name="file" size={28} color={doc ? TEAL : TX3} />
                            <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '10px 0 4px' }}>{label}</div>
                            {doc ? (
                              <>
                                <div style={{ fontFamily: F, fontSize: 12, color: TX2, marginBottom: 14 }}>
                                  {doc.file_name}<br />
                                  <span style={{ color: TX3 }}>{Math.round((doc.file_size || 0) / 1024)}KB</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                  <a
                                    href={`/api/documents/${doc.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: TEAL, color: NAVY, fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                                  >
                                    <Ic name="download" size={12} color={NAVY} /> View
                                  </a>
                                  <button
                                    onClick={() => handleDocDelete(doc.id, docType)}
                                    disabled={isDeleting}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, background: REDBG, color: RED, border: `1px solid ${REDBD}`, fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                                  >
                                    <Ic name="trash" size={12} color={RED} /> {isDeleting ? 'Removing…' : 'Remove'}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginBottom: 14 }}>PDF, DOC or DOCX, max 5MB</div>
                                <label style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '8px 18px', borderRadius: 7,
                                  background: isUploading ? BD : NAVY, color: isUploading ? TX3 : '#fff',
                                  fontFamily: F, fontSize: 13, fontWeight: 700,
                                  cursor: isUploading ? 'not-allowed' : 'pointer',
                                }}>
                                  <Ic name="upload" size={13} color={isUploading ? TX3 : TEAL} />
                                  {isUploading ? 'Uploading...' : 'Upload File'}
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                    onChange={e => {
                                      const f = e.target.files?.[0]
                                      if (f) handleDocUpload(docType, f)
                                      e.target.value = ''
                                    }}
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ══════════════════════════════════════════════════
                    ACCOUNTABILITY TRAIL , agency only
                ══════════════════════════════════════════════════ */}
                {profile?.account_type === 'agency' && (
                  <Card style={{ marginBottom: 20 }} className="no-print">
                    <SectionHeading tooltip="Documentation that this assessment was conducted using objective, evidence-based methods in compliance with the Equality Act 2010.">
                      Document This Assessment
                    </SectionHeading>
                    {!accountRecord ? (
                      <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                        <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 16px', lineHeight: 1.7 }}>
                          Generate a timestamped accountability record containing key findings, watch-outs, and recommended interview questions. Store it for your records and share with clients.
                        </p>
                        <button
                          onClick={generateAccountabilityRecord}
                          disabled={savingRecord || !results}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '10px 22px', borderRadius: 9, border: 'none',
                            background: results && !savingRecord ? TEAL : BD,
                            color: results && !savingRecord ? NAVY : TX3,
                            fontFamily: F, fontSize: 13.5, fontWeight: 700,
                            cursor: results && !savingRecord ? 'pointer' : 'not-allowed',
                          }}
                        >
                          <Ic name="file" size={15} color={results && !savingRecord ? NAVY : TX3} />
                          {savingRecord ? 'Generating…' : 'Generate Accountability Record'}
                        </button>
                        {recordError && (
                          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: REDBG, border: `1px solid ${REDBD}`, fontFamily: F, fontSize: 13, color: RED, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Ic name="alert" size={14} color={RED} />
                            {recordError}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* Record header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 9,
                              background: TEALLT, border: `1px solid ${TEAL}55`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Ic name="check" size={16} color={TEALD} />
                            </div>
                            <div>
                              <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX }}>Record generated</div>
                              <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>
                                {new Date(accountRecord.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={handleAccountabilityPrint}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8,
                                background: NAVY, border: 'none', cursor: 'pointer',
                                fontFamily: F, fontSize: 12.5, fontWeight: 700, color: '#fff',
                              }}
                            >
                              <Ic name="download" size={14} color={TEAL} />
                              Download Record
                            </button>
                            <button
                              onClick={generateAccountabilityRecord}
                              disabled={savingRecord}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8,
                                background: 'transparent', border: `1.5px solid ${BD}`,
                                cursor: savingRecord ? 'not-allowed' : 'pointer',
                                fontFamily: F, fontSize: 12.5, fontWeight: 600, color: TX2,
                              }}
                            >
                              {savingRecord ? 'Regenerating…' : 'Regenerate'}
                            </button>
                          </div>
                        </div>

                        {/* Key findings */}
                        {accountRecord.key_findings && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Key Findings</div>
                            <div style={{ background: BG, border: `1px solid ${BD}`, borderLeft: `3px solid ${TEAL}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                              {accountRecord.key_findings.split('\n').filter(Boolean).map((line, i) => (
                                <div key={i} style={{ fontFamily: FM, fontSize: 12.5, color: TX, lineHeight: 1.7 }}>{line}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Watch-outs */}
                        {accountRecord.watch_outs && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Watch-outs</div>
                            <div style={{ background: REDBG, border: `1px solid ${REDBD}`, borderLeft: `3px solid ${RED}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                              {accountRecord.watch_outs.split('\n').filter(Boolean).map((line, i) => (
                                <div key={i} style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.7 }}>{line}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended actions */}
                        {accountRecord.recommended_actions && (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Recommended Interview Questions</div>
                            <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderLeft: `3px solid ${AMB}`, borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                              {accountRecord.recommended_actions.split('\n').filter(Boolean).map((line, i) => (
                                <div key={i} style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.7 }}>{line}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Shared with client date */}
                        <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <label style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX2 }}>
                            Date shared with client:
                          </label>
                          <input
                            type="date"
                            value={recordSharedDate}
                            onChange={e => setRecordSharedDate(e.target.value)}
                            style={{
                              padding: '7px 12px', borderRadius: 7, border: `1px solid ${BD}`,
                              fontFamily: FM, fontSize: 13, color: TX, outline: 'none',
                              background: CARD,
                            }}
                            onFocus={e => e.target.style.borderColor = TEAL}
                            onBlur={e => e.target.style.borderColor = BD}
                          />
                          <button
                            onClick={saveSharedDate}
                            disabled={savingSharedDate}
                            style={{
                              padding: '7px 16px', borderRadius: 7, border: 'none',
                              background: TEAL, color: NAVY,
                              fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {savingSharedDate ? 'Saving…' : 'Save'}
                          </button>
                          {accountRecord.shared_with_client_at && (
                            <span style={{ fontFamily: F, fontSize: 12.5, color: GRN, fontWeight: 600 }}>
                              Shared {new Date(accountRecord.shared_with_client_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* ══════════════════════════════════════════════════
                    RESPONSE INTEGRITY , dark navy
                ══════════════════════════════════════════════════ */}
                <ScrollReveal id="integrity" delay={60}>
                {(() => {
                  const integrity = results.integrity || {}
                  const rq = integrity.response_quality
                  const hasIntegrity = !!rq

                  const qColor = !rq ? TX3 : rq === 'Genuine' ? GRN : rq === 'Likely Genuine' ? TEAL : rq === 'Possibly AI-Assisted' ? AMB : RED
                  const qBg    = !rq ? BG : rq === 'Genuine' ? GRNBG : rq === 'Likely Genuine' ? TEALLT : rq === 'Possibly AI-Assisted' ? AMBBG : REDBG
                  const qBd    = !rq ? BD : rq === 'Genuine' ? GRNBD : rq === 'Likely Genuine' ? `${TEAL}55` : rq === 'Possibly AI-Assisted' ? AMBBD : REDBD
                  const qIcon  = !rq ? 'eye' : (rq === 'Genuine' || rq === 'Likely Genuine') ? 'check' : 'alert'
                  const glowStyle = hasIntegrity ? { animation: 'glow 2.5s ease-in-out infinite' } : {}

                  function fmtTime(s) { if (!s) return ','; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }
                  function timingLabel(s) {
                    if (!s) return { label: 'No data', color: TX3, bg: 'rgba(255,255,255,0.05)', bd: 'rgba(255,255,255,0.1)' }
                    if (s < 90)   return { label: 'Rushed',   color: RED,   bg: `${RED}18`,   bd: `${RED}40` }
                    if (s < 180)  return { label: 'Fast',     color: AMB,   bg: `${AMB}18`,   bd: `${AMB}40` }
                    if (s > 1200) return { label: 'Extended', color: TEAL,  bg: `${TEAL}18`,  bd: `${TEAL}40` }
                    return               { label: 'Normal',   color: GRN,   bg: `${GRN}18`,   bd: `${GRN}40` }
                  }

                  const redFlags = integrity.red_flags || []
                  const consistencyRating = integrity.consistency_rating
                  const cColor = !consistencyRating ? TX3 : consistencyRating === 'High' ? GRN : consistencyRating === 'Medium' ? AMB : RED

                  return (
                    <div style={{
                      marginBottom: 20,
                      background: `linear-gradient(135deg, #0a1929 0%, #0f2137 60%, #0d2b45 100%)`,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: SHADOW_LG,
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '22px 28px 18px',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Ic name="eye" size={14} color={TEAL} />
                            </div>
                            <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>
                              Response Integrity
                            </h2>
                            <InfoTooltip text="AI analysis of response authenticity, timing patterns, and consistency across scenarios." light />
                          </div>
                          <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, paddingLeft: 36 }}>
                            AI analysis of authenticity, timing, and engagement signals.
                          </p>
                        </div>
                        {hasIntegrity ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 10,
                            background: qBg, border: `1.5px solid ${qBd}`,
                            flexShrink: 0, ...glowStyle,
                          }}>
                            <Ic name={qIcon} size={15} color={qColor} />
                            <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 800, color: qColor }}>{rq}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                            Integrity data available for new assessments
                          </span>
                        )}
                      </div>

                      {/* Timing tiles */}
                      <div style={{ padding: '18px 28px' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                          Time per scenario
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
                          {[0, 1, 2, 3].map(i => {
                            const resp = responses.find(r => r.scenario_index === i)
                            const secs = resp?.time_taken_seconds ?? null
                            const tl = timingLabel(secs)
                            return (
                              <div key={i} style={{
                                background: tl.bg, border: `1px solid ${tl.bd}`,
                                borderRadius: 10, padding: '12px 14px',
                              }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>
                                  Scenario {i + 1}
                                </div>
                                <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: tl.color, lineHeight: 1, marginBottom: 4 }}>
                                  {fmtTime(secs)}
                                </div>
                                <span style={{
                                  display: 'inline-block', fontSize: 10, fontWeight: 700,
                                  color: tl.color, background: 'rgba(255,255,255,0.1)',
                                  borderRadius: 4, padding: '2px 7px',
                                }}>
                                  {tl.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* Quality notes */}
                        {integrity.quality_notes && (
                          <div style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderLeft: `3px solid ${qColor}55`, borderRadius: '0 8px 8px 0',
                            padding: '10px 14px', marginBottom: 12,
                          }}>
                            <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
                              {integrity.quality_notes}
                            </p>
                          </div>
                        )}

                        {/* Consistency + notes */}
                        {consistencyRating && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: redFlags.length > 0 ? 12 : 0 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', paddingTop: 2 }}>Consistency:</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 20,
                              background: cColor === GRN ? GRNBG : cColor === AMB ? AMBBG : REDBG,
                              color: cColor,
                              border: `1px solid ${cColor === GRN ? GRNBD : cColor === AMB ? AMBBD : REDBD}`,
                            }}>
                              {consistencyRating}
                            </span>
                            {integrity.consistency_notes && (
                              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>{integrity.consistency_notes}</span>
                            )}
                          </div>
                        )}

                        {/* Red flags */}
                        {redFlags.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: `${RED}cc`, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                              Red flags detected
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {redFlags.map((flag, i) => (
                                <div key={i} style={{
                                  display: 'flex', gap: 8, alignItems: 'flex-start',
                                  background: `${RED}14`, border: `1px solid ${RED}35`,
                                  borderRadius: 8, padding: '9px 12px',
                                }}>
                                  <Ic name="alert" size={13} color={RED} />
                                  <span style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55 }}>
                                    {typeof flag === 'string' ? flag : JSON.stringify(flag)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                </ScrollReveal>

                {/* ══════════════════════════════════════════════════
                    PRESSURE-FIT , dark navy, 2×2 grid
                ══════════════════════════════════════════════════ */}
                <ScrollReveal id="pressure-fit" delay={60}>
                {(results.pressure_fit_score != null || results.pressure_fit) && (() => {
                  const pf = results.pressure_fit_score ?? null
                  const dims = results.pressure_fit ?? {}
                  const pfRingColor = pf == null ? TX3 : pf >= 75 ? GRN : pf >= 50 ? AMB : RED

                  const DIMENSIONS = [
                    { key: 'decision_speed_quality',    label: 'Decision Speed & Quality',   icon: 'zap',     desc: 'Decisiveness and commitment when no perfect answer exists' },
                    { key: 'composure_under_conflict',  label: 'Composure Under Conflict',   icon: 'alert',   desc: 'Emotional regulation when facing difficult conversations' },
                    { key: 'prioritisation_under_load', label: 'Prioritisation Under Load',  icon: 'sliders', desc: 'Framework and trade-off awareness when demands compete' },
                    { key: 'ownership_accountability',  label: 'Ownership & Accountability', icon: 'award',   desc: 'Personal responsibility, active language, and specific commitments' },
                  ]

                  function vStyle(v) {
                    if (v === 'Strength') return { bg: GRNBG, color: GRN, bd: GRNBD }
                    if (v === 'Concern')  return { bg: REDBG,  color: RED, bd: REDBD }
                    return { bg: AMBBG, color: AMB, bd: AMBBD }
                  }

                  return (
                    <div style={{
                      marginBottom: 20,
                      background: 'linear-gradient(135deg, #0a1929 0%, #0f2137 60%, #0d2b45 100%)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      boxShadow: SHADOW_LG,
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '28px 32px 26px',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Ic name="sliders" size={15} color={TEAL} />
                            </div>
                            <span style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Pressure-Fit Assessment
                            </span>
                            <InfoTooltip text="How this candidate performs under realistic workplace pressure across four dimensions." light />
                          </div>
                          <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.25 }}>
                            How this candidate performs<br />when it matters most
                          </h2>
                          <div style={{ height: 3, width: 48, borderRadius: 99, background: TEAL }} />
                        </div>
                        {pf != null && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <PFRing score={pf} size={110} />
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: pfRingColor, textAlign: 'center', fontFamily: F }}>
                              {pfLbl(pf)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2×2 Dimension grid */}
                      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {DIMENSIONS.map(({ key, label, icon, desc }, idx) => {
                          const dim = dims[key] ?? {}
                          const s = dim.score ?? null
                          const v = dim.verdict ?? null
                          const n = dim.narrative ?? null
                          const vs = vStyle(v)
                          const barColor = v === 'Strength' ? GRN : v === 'Concern' ? RED : AMB

                          return (
                            <div key={key} style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 12,
                              padding: '20px 20px',
                              display: 'flex', flexDirection: 'column', gap: 14,
                            }}>
                              {/* Label row */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{
                                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                                  background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Ic name={icon} size={16} color={TEAL} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{desc}</div>
                                </div>
                                {s != null && (
                                  <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: barColor, flexShrink: 0, lineHeight: 1 }}>{s}</div>
                                )}
                              </div>

                              {/* Verdict badge */}
                              {v && (
                                <div>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '4px 12px', borderRadius: 50,
                                    fontSize: 11.5, fontWeight: 700,
                                    background: vs.bg, color: vs.color, border: `1px solid ${vs.bd}`,
                                  }}>
                                    {v}
                                  </span>
                                </div>
                              )}

                              {/* Progress bar */}
                              {s != null && (
                                <AnimBar pct={s} color={barColor} height={6} delay={idx * 80} />
                              )}

                              {/* Narrative , always shown */}
                              <div style={{
                                borderLeft: `3px solid ${n ? barColor : 'rgba(255,255,255,0.15)'}`,
                                paddingLeft: 14,
                              }}>
                                <p style={{
                                  fontFamily: F, fontSize: 13, lineHeight: 1.75, margin: 0,
                                  color: n ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)',
                                  fontStyle: n ? 'normal' : 'italic',
                                }}>
                                  {n || 'Detailed narrative available for newly scored assessments.'}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                </ScrollReveal>

                {/* ══════════════════════════════════════════════════
                    AI HIRING SUMMARY
                ══════════════════════════════════════════════════ */}
                {results.ai_summary && (
                  <ScrollReveal id="ai-assessment" delay={60}>
                  <Card style={{ marginBottom: 20, borderLeft: `4px solid ${TEAL}`, boxShadow: SHADOW_LG }}>
                    <SectionHeading tooltip="AI-generated narrative summarising the candidate's overall performance with specific evidence.">AI Hiring Summary</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {results.ai_summary.split('\n\n').filter(p => p.trim()).map((para, i) => (
                        <p key={i} style={{
                          fontFamily: F,
                          fontSize: 14.5,
                          color: i === 0 ? TX : TX2,
                          lineHeight: 1.8,
                          margin: 0,
                          fontWeight: i === 0 ? 500 : 400,
                        }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </Card>
                  </ScrollReveal>
                )}

                {/* ══════════════════════════════════════════════════
                    REALITY TIMELINE
                ══════════════════════════════════════════════════ */}
                {results.reality_timeline && (() => {
                  const { week1, month1, month3 } = results.reality_timeline
                  const phases = [
                    { label: 'Week 1-2', sub: 'Onboarding', text: week1 },
                    { label: 'Month 1',  sub: 'Settling in', text: month1 },
                    { label: 'Month 2-3', sub: 'Consolidation', text: month3 },
                  ].filter(ph => ph.text)
                  if (!phases.length) return null
                  return (
                    <ScrollReveal delay={60}>
                    <div style={{
                      marginBottom: 20,
                      background: 'linear-gradient(135deg, #0a1929 0%, #0f2137 60%, #0d2b45 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, padding: '24px 28px', boxShadow: SHADOW_LG,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,191,165,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Ic name="clock" size={14} color="#00BFA5" />
                        </div>
                        <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>Reality Timeline <InfoTooltip text="A prediction of how this candidate's first 90 days will unfold, based on what they showed in their assessment responses." light /></h2>
                        <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>First 90 days prediction</span>
                      </div>
                      <div style={{ position: 'relative', paddingLeft: 32 }}>
                        <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: 'rgba(0,191,165,0.2)', borderRadius: 1 }} />
                        {phases.map((ph, i) => (
                          <div key={i} style={{ position: 'relative', marginBottom: i < phases.length - 1 ? 28 : 0 }}>
                            <div style={{
                              position: 'absolute', left: -32, top: 4,
                              width: 14, height: 14, borderRadius: '50%',
                              background: '#00BFA5', boxShadow: '0 0 0 3px rgba(0,191,165,0.18)', zIndex: 1,
                            }} />
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 800, color: '#00BFA5' }}>{ph.label}</span>
                              <span style={{ fontFamily: F, fontSize: 11.5, color: 'rgba(255,255,255,0.32)', marginLeft: 8 }}>{ph.sub}</span>
                            </div>
                            <p style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.70)', margin: 0, lineHeight: 1.75 }}>{ph.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    SKILLS BREAKDOWN , 2×2 grid with small rings
                ══════════════════════════════════════════════════ */}
                {results.scores && Object.keys(results.scores).length > 0 && (
                  <ScrollReveal id="skills" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="Individual skill scores with detailed narratives referencing specific scenario responses.">
                      Skills Breakdown
                    </SectionHeading>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      {Object.entries(results.scores).map(([skill, skillScore]) => {
                        const narrative = results.score_narratives?.[skill]
                        const bmThreshold = bmMap[skill.toLowerCase()]
                        const belowBenchmark = bmThreshold != null && skillScore < bmThreshold
                        return (
                          <div key={skill} style={{
                            background: BG,
                            border: `1.5px solid ${belowBenchmark ? REDBD : BD}`,
                            borderRadius: 10,
                            padding: '18px 20px',
                          }}>
                            {/* Top row: ring + title + badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                              <SmallRing score={skillScore} size={58} strokeWidth={5} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 5 }}>
                                  {skill}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: sc(skillScore) }}>{skillScore}</span>
                                  <Badge label={slbl(skillScore)} bg={sbg(skillScore)} color={sc(skillScore)} border={sbd(skillScore)} />
                                </div>
                              </div>
                            </div>

                            {/* Below benchmark flag */}
                            {belowBenchmark && (
                              <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: REDBG, border: `1px solid ${REDBD}`,
                                borderRadius: 6, padding: '3px 9px', marginBottom: 10,
                              }}>
                                <Ic name="alert" size={11} color={RED} />
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: RED }}>
                                  Below benchmark (threshold: {bmThreshold})
                                </span>
                              </div>
                            )}

                            <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.7 }}>
                              {narrative || 'Assessment based on scenario responses.'}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                  </ScrollReveal>
                )}

                {/* ══════════════════════════════════════════════════
                    WHAT THE ASSESSMENT REVEALED
                ══════════════════════════════════════════════════ */}
                {(() => {
                  const cvItems = Array.isArray(results.cv_comparison) ? results.cv_comparison : []

                  // Assemble PRODICTA findings from existing data
                  const findings = []
                  if (results.scores) {
                    const entries = Object.entries(results.scores).sort((a, b) => b[1] - a[1])
                    if (entries.length > 0) {
                      const [topSkill, topScore] = entries[0]
                      findings.push({ text: `${topSkill} scored ${topScore} (${slbl(topScore)})`, type: 'score', score: topScore })
                    }
                    if (entries.length > 1) {
                      const [lowSkill, lowScore] = entries[entries.length - 1]
                      findings.push({ text: `${lowSkill} scored ${lowScore} (${slbl(lowScore)})`, type: 'score', score: lowScore })
                    }
                  }
                  const highWo = (results.watchouts || []).filter(w => typeof w === 'object' && w.severity === 'High').slice(0, 2)
                  highWo.forEach(w => findings.push({ text: `High severity watch-out: ${w.text || w.title || ''}`, type: 'watchout_high' }))
                  if (findings.length < 4) {
                    const medWo = (results.watchouts || []).filter(w => typeof w === 'object' && w.severity === 'Medium').slice(0, 1)
                    medWo.forEach(w => findings.push({ text: `Watch-out: ${w.text || w.title || ''}`, type: 'watchout_medium' }))
                  }
                  if (findings.length < 4 && results.strengths?.length > 0) {
                    const s = results.strengths[0]
                    const title = typeof s === 'object' ? (s.text || s.strength || s.title) : s
                    findings.push({ text: `Strength: ${title}`, type: 'strength' })
                  }
                  const displayFindings = findings.slice(0, 4)

                  if (cvItems.length === 0 && displayFindings.length === 0) return null
                  return (
                    <ScrollReveal id="cv-comparison" delay={60}>
                    <div style={{
                      background: '#f8fafc',
                      border: `1.5px solid ${BD}`,
                      borderRadius: 12,
                      padding: '24px 28px',
                      marginBottom: 20,
                    }}>
                      <h2 style={{
                        fontFamily: F, fontSize: 15, fontWeight: 800, color: TX,
                        margin: '0 0 6px', paddingBottom: 10,
                        borderBottom: `2px solid ${TEAL}`,
                        letterSpacing: '-0.2px',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        What the Assessment Revealed <InfoTooltip text="Side-by-side comparison of what a CV would show versus what PRODICTA's assessment actually found." />
                      </h2>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 20px', lineHeight: 1.55 }}>
                        A side-by-side view of typical CV claims versus what this candidate actually demonstrated.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                        {/* Left: CV column */}
                        <div style={{
                          background: CARD,
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '18px 20px',
                        }}>
                          <div style={{
                            fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TX3,
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                            </svg>
                            What a CV would tell you
                          </div>
                          {cvItems.length > 0 ? cvItems.map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 9,
                              paddingBottom: i < cvItems.length - 1 ? 11 : 0,
                              marginBottom: i < cvItems.length - 1 ? 11 : 0,
                              borderBottom: i < cvItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                            }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#cbd5e1', marginTop: 7, flexShrink: 0 }} />
                              <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{item}</span>
                            </div>
                          )) : (
                            <span style={{ fontFamily: F, fontSize: 13, color: TX3, fontStyle: 'italic' }}>Not available for this assessment.</span>
                          )}
                        </div>

                        {/* Right: PRODICTA findings */}
                        <div style={{
                          background: CARD,
                          border: `1.5px solid ${TEAL}`,
                          borderRadius: 10,
                          padding: '18px 20px',
                        }}>
                          <div style={{
                            fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEALD,
                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            What PRODICTA found
                          </div>
                          {displayFindings.map((item, i) => {
                            const dotColor = item.type === 'watchout_high' ? RED
                              : item.type === 'watchout_medium' ? AMB
                              : item.type === 'strength' ? GRN
                              : item.score != null ? sc(item.score)
                              : TEAL
                            return (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 9,
                                paddingBottom: i < displayFindings.length - 1 ? 11 : 0,
                                marginBottom: i < displayFindings.length - 1 ? 11 : 0,
                                borderBottom: i < displayFindings.length - 1 ? `1px solid ${TEALLT}` : 'none',
                              }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, marginTop: 7, flexShrink: 0 }} />
                                <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{item.text}</span>
                              </div>
                            )
                          })}
                        </div>

                      </div>
                    </div>
                    </ScrollReveal>
                  )
                })()}

                {/* ══════════════════════════════════════════════════
                    STRENGTHS
                ══════════════════════════════════════════════════ */}
                {results.strengths?.length > 0 && (
                  <ScrollReveal id="strengths" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="Key strengths identified with direct quotes from the candidate's responses as evidence.">
                      Strengths
                    </SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.strengths.map((s, i) => {
                        const title = typeof s === 'object' ? (s.strength || s.title || s.text) : s
                        const explanation = typeof s === 'object' ? s.explanation : null
                        const evidence = typeof s === 'object' ? s.evidence : null
                        return (
                          <div key={i} style={{
                            background: GRNBG,
                            border: `1px solid ${GRNBD}`,
                            borderLeft: `4px solid ${GRN}`,
                            borderRadius: '0 10px 10px 0',
                            padding: '16px 18px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: explanation || evidence ? 8 : 0 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                                background: `${GRN}20`, border: `1px solid ${GRNBD}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Ic name="check" size={13} color={GRN} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width={14} height={14} viewBox="0 0 24 24" fill={GRN} style={{ flexShrink: 0 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: 0, lineHeight: 1.4 }}>
                                  {title}
                                </p>
                              </div>
                            </div>
                            {explanation && (
                              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.7, paddingLeft: 34 }}>
                                {explanation}
                              </p>
                            )}
                            {evidence && (
                              <div style={{ paddingLeft: 34 }}>
                                <EvidenceBox>{evidence}</EvidenceBox>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                  </ScrollReveal>
                )}

                {/* ══════════════════════════════════════════════════
                    WATCH-OUTS
                ══════════════════════════════════════════════════ */}
                {results.watchouts?.length > 0 && (
                  <ScrollReveal id="watchouts" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="Concerns flagged by severity with evidence, recommended actions, and consequence predictions if ignored.">
                      Watch-outs
                    </SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.watchouts.map((w, i) => {
                        const title = typeof w === 'object' ? (w.watchout || w.title || w.text) : w
                        const severity = typeof w === 'object' ? w.severity : null
                        const explanation = typeof w === 'object' ? w.explanation : null
                        const evidence = typeof w === 'object' ? w.evidence : null
                        const action = typeof w === 'object' ? w.action : null
                        const ifIgnored = typeof w === 'object' ? w.if_ignored : null
                        const alertFromStore = results.decision_alerts?.[i] || null
                        const alertText = ifIgnored || alertFromStore
                        const sev = sevStyle(severity)
                        const alertColor = severity === 'High' ? RED : AMB
                        const alertBg    = severity === 'High' ? REDBG : AMBBG
                        const alertBd    = severity === 'High' ? REDBD : AMBBD
                        return (
                          <div key={i} style={{
                            background: sev.bg,
                            border: `1px solid ${sev.border}`,
                            borderLeft: `4px solid ${sev.color}`,
                            borderRadius: '0 10px 10px 0',
                            padding: '16px 18px',
                          }}>
                            {severity && (
                              <div style={{ marginBottom: 10 }}>
                                <Badge label={`${severity} severity`} bg={sev.bg} color={sev.color} border={sev.border} />
                              </div>
                            )}
                            <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 8px' }}>
                              {title}
                            </p>
                            {explanation && (
                              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.7 }}>
                                {explanation}
                              </p>
                            )}
                            {evidence && <EvidenceBox color={sev.color}>{evidence}</EvidenceBox>}
                            {action && <ActionBox>{action}</ActionBox>}
                            {alertText && (
                              <div style={{
                                background: alertBg, border: `1px solid ${alertBd}`,
                                borderLeft: `3px solid ${alertColor}`,
                                borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 10,
                                display: 'flex', gap: 8, alignItems: 'flex-start',
                              }}>
                                <Ic name="alert" size={13} color={alertColor} />
                                <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.55 }}>
                                  <strong style={{ color: alertColor }}>If ignored:</strong> {alertText}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                  </ScrollReveal>
                )}

                {/* ══════════════════════════════════════════════════
                    ONBOARDING PLAN , structured week cards
                ══════════════════════════════════════════════════ */}
                {results.onboarding_plan?.length > 0 && (
                  <ScrollReveal id="onboarding" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="A structured 6-week plan tailored to this candidate's specific gaps. Designed to be handed directly to the line manager.">Personalised Onboarding Plan</SectionHeading>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '-6px 0 20px', lineHeight: 1.55 }}>
                      Tailored to this candidate's specific gaps. Designed to be handed directly to the line manager.
                    </p>

                    {profile?.account_type === 'employer' && (
                      <div style={{
                        background: AMBBG,
                        border: `1.5px solid ${AMBBD}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                        marginBottom: 20,
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                      }}>
                        <div style={{ flexShrink: 0, marginTop: 1 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={AMB} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: AMB, marginBottom: 6 }}>Day-One Rights Reminder</div>
                          <p style={{ fontFamily: F, fontSize: 13, color: AMB, margin: 0, lineHeight: 1.6, opacity: 0.9 }}>
                            From January 2027, unfair dismissal protection applies from day one. PRODICTA's Probation Timeline Tracker helps you monitor every hire.
                          </p>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {results.onboarding_plan.map((item, i) => {
                        // Support both new structured objects and legacy plain strings
                        const isStructured = typeof item === 'object' && item !== null && item.objective
                        if (!isStructured) {
                          // Legacy fallback: plain string
                          const text = typeof item === 'object' ? (item.text || item.title || '') : (item || '')
                          const match = text.match(/^(Week\s*\d+):/i)
                          const weekLabel = match ? match[1] : `Week ${i + 1}`
                          const body = match ? text.slice(match[0].length).trim() : text
                          return (
                            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FM, fontSize: 13, fontWeight: 800, color: NAVY,
                              }}>{i + 1}</div>
                              <div style={{ flex: 1, paddingTop: 8 }}>
                                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{weekLabel}</div>
                                <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.7 }}>{body}</p>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={i} style={{
                            background: CARD,
                            border: `1px solid ${BD}`,
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow: '0 1px 4px rgba(15,33,55,0.05)',
                          }}>
                            {/* Card header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '16px 20px',
                              borderBottom: `1px solid ${BD}`,
                              background: BG,
                            }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                background: TEAL, boxShadow: `0 0 0 4px ${TEALLT}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FM, fontSize: 14, fontWeight: 800, color: NAVY,
                              }}>
                                {item.week}
                              </div>
                              <div>
                                <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                                  Week {item.week}
                                </div>
                                <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX, lineHeight: 1.2 }}>
                                  {item.title}
                                </div>
                              </div>
                            </div>

                            {/* Card body */}
                            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                              {/* Objective */}
                              {item.objective && (
                                <div>
                                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Objective</div>
                                  <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, margin: 0, lineHeight: 1.65 }}>
                                    {item.objective}
                                  </p>
                                </div>
                              )}

                              {/* Activities */}
                              {item.activities?.length > 0 && (
                                <div>
                                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Activities</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {item.activities.map((act, ai) => (
                                      <div key={ai} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <div style={{
                                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                                          background: TEALLT, border: `1.5px solid ${TEAL}55`,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontFamily: FM, fontSize: 10, fontWeight: 800, color: TEALD,
                                        }}>
                                          {ai + 1}
                                        </div>
                                        <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.65 }}>{act}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Checkpoint */}
                              {item.checkpoint && (
                                <div style={{
                                  background: TEALLT, border: `1px solid ${TEAL}40`,
                                  borderRadius: 8, padding: '12px 14px',
                                  display: 'flex', gap: 10, alignItems: 'flex-start',
                                }}>
                                  <Ic name="check" size={14} color={TEALD} style={{ flexShrink: 0, marginTop: 1 }} />
                                  <div>
                                    <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Checkpoint</div>
                                    <p style={{ fontFamily: F, fontSize: 13, color: TEALD, fontWeight: 600, margin: 0, lineHeight: 1.6 }}>{item.checkpoint}</p>
                                  </div>
                                </div>
                              )}

                              {/* Bottom row: involves + notes */}
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                {item.involves?.length > 0 && (
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Who's Involved</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {item.involves.map((role, ri) => (
                                        <span key={ri} style={{
                                          display: 'inline-flex', alignItems: 'center',
                                          padding: '3px 10px', borderRadius: 50,
                                          fontFamily: F, fontSize: 11.5, fontWeight: 600,
                                          background: BG, color: TX2, border: `1px solid ${BD}`,
                                          whiteSpace: 'nowrap',
                                        }}>
                                          {role}
                                        </span>
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

                {/* ══════════════════════════════════════════════════
                    INTERVIEW QUESTIONS
                ══════════════════════════════════════════════════ */}
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
                        // Parse (Follow-up probe: ...) or [Follow-up: ...]
                        const followUpMatch = text.match(/\(Follow-up probe:\s*([\s\S]*?)\)\s*$/) || text.match(/\[Follow-up:\s*([\s\S]*?)\]\s*$/)
                        const followUp = followUpMatch ? followUpMatch[1].trim() : null
                        const mainQ = followUpMatch ? text.slice(0, followUpMatch.index).trim() : text
                        return (
                          <div key={i} style={{
                            background: CARD,
                            border: `1px solid ${BD}`,
                            borderRadius: 10,
                            padding: '18px 20px',
                            boxShadow: '0 1px 4px rgba(15,33,55,0.05)',
                          }}>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                                background: TEALLT, border: `1.5px solid ${TEAL}55`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FM, fontSize: 13, fontWeight: 800, color: TEALD,
                              }}>
                                {i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 (followUp ? 12 : 0)', lineHeight: 1.65 }}>
                                  {mainQ}
                                </p>
                                {followUp && (
                                  <div style={{
                                    marginTop: 12,
                                    background: '#f8fafc',
                                    border: `1px solid ${BD}`,
                                    borderLeft: `3px solid ${AMB}`,
                                    borderRadius: '0 8px 8px 0',
                                    padding: '9px 14px',
                                  }}>
                                    <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
                                      <span style={{ fontWeight: 700, color: AMB }}>Follow-up probe: </span>
                                      {followUp}
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

                {/* ══════════════════════════════════════════════════
                    TEAM NOTES
                ══════════════════════════════════════════════════ */}
                <Card style={{ marginBottom: 40 }} className="no-print">
                  <SectionHeading>Team Notes</SectionHeading>
                  <div style={{ marginBottom: 20 }}>
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      placeholder="Add a note visible to your team…"
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 14px', borderRadius: 8,
                        border: `1px solid ${BD}`, fontFamily: F,
                        fontSize: 13.5, color: TX, lineHeight: 1.6,
                        resize: 'vertical', outline: 'none', background: CARD,
                      }}
                      onFocus={e => e.target.style.borderColor = TEAL}
                      onBlur={e => e.target.style.borderColor = BD}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim() || noteSaving}
                        style={{
                          padding: '8px 20px', borderRadius: 8, border: 'none',
                          background: newNote.trim() && !noteSaving ? TEAL : BD,
                          color: newNote.trim() && !noteSaving ? '#fff' : TX3,
                          fontSize: 13, fontWeight: 700, fontFamily: F,
                          cursor: newNote.trim() && !noteSaving ? 'pointer' : 'not-allowed',
                          transition: 'background 0.15s',
                        }}
                      >
                        {noteSaving ? 'Saving…' : 'Add note'}
                      </button>
                    </div>
                  </div>
                  {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: TX3, fontSize: 13 }}>No notes yet. Add one above.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {notes.map(n => (
                        <div key={n.id} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={n.author_name || '?'} size={28} />
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: TX }}>{n.author_name || 'Team member'}</div>
                                <div style={{ fontSize: 11, color: TX3 }}>{formatNoteDate(n.created_at)}</div>
                              </div>
                            </div>
                            {n.user_id === user?.id && (
                              <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TX3, padding: 4, display: 'flex', alignItems: 'center' }}>
                                <Ic name="x" size={13} color={TX3} />
                              </button>
                            )}
                          </div>
                          <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                            {n.note_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* ══════════════════════════════════════════════════
                    COMPLIANCE STATEMENT
                ══════════════════════════════════════════════════ */}
                <ScrollReveal delay={40}>
                {(() => {
                  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  const compliancePoints = [
                    'Scoring is based on decisions, actions, and reasoning only.',
                    'No candidate was penalised for spelling, grammar, or writing style (Equality Act 2010).',
                    'All scenarios were generated from the specific job description provided.',
                    'Response timing and integrity were independently verified.',
                    `Assessment date: ${completedDate || 'Not recorded'}.`,
                    `Report generated: ${reportDate}.`,
                  ]
                  return (
                    <div style={{
                      border: `1.5px solid ${TEAL}55`,
                      borderRadius: 14,
                      background: TEALLT,
                      padding: '22px 28px',
                      marginBottom: 40,
                      display: 'flex',
                      gap: 18,
                      alignItems: 'flex-start',
                    }}>
                      <div style={{
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `${TEAL}18`,
                        border: `1.5px solid ${TEAL}44`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: TEALD, marginBottom: 6, letterSpacing: '0.01em' }}>Fair Work Agency Ready</div>
                        <p style={{ fontFamily: F, fontSize: 13, color: TEALD, margin: '0 0 12px', lineHeight: 1.7, opacity: 0.9 }}>
                          This assessment was conducted using PRODICTA, an AI-powered pre-employment assessment platform. The following compliance standards were applied:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                          {compliancePoints.map((point, i) => (
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
                    </div>
                  )
                })()}
                </ScrollReveal>

              </>
            )}
          </>
        )}
      </main>

      {/* ── SEND TO CLIENT MODAL (agency only) ── */}
      {sendModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,33,55,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => { if (!sending) setSendModal(false) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 16, padding: '28px 32px', maxWidth: 480, width: '100%', boxShadow: '0 16px 48px rgba(15,33,55,0.22)', position: 'relative' }}>
            <button onClick={() => setSendModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Ic name="x" size={18} color={TX3} />
            </button>

            {sendSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: GRNBG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Ic name="check" size={24} color={GRN} />
                </div>
                <div style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: TX, marginBottom: 6 }}>Sent successfully</div>
                <div style={{ fontFamily: F, fontSize: 13.5, color: TX2 }}>The candidate pack has been delivered to {sendEmail}</div>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 5px' }}>Send Candidate Pack</h3>
                <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.55 }}>
                  Send {candidate?.name || 'this candidate'}'s full report to a client. Attached documents are included automatically.
                </p>

                {/* What's included */}
                <div style={{ background: TEALLT, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>What's included</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: TEALD }}>
                      <Ic name="check" size={13} color={GRN} /> Full candidate report (score, strengths, watch-outs, questions)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: documents.cv ? TEALD : TX3 }}>
                      <Ic name={documents.cv ? 'check' : 'x'} size={13} color={documents.cv ? GRN : TX3} />
                      CV / Résumé {documents.cv ? `(${documents.cv.file_name})` : '(not attached)'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 13, color: documents.cover_letter ? TEALD : TX3 }}>
                      <Ic name={documents.cover_letter ? 'check' : 'x'} size={13} color={documents.cover_letter ? GRN : TX3} />
                      Cover Letter {documents.cover_letter ? `(${documents.cover_letter.file_name})` : '(not attached)'}
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
                    value={sendMessage}
                    onChange={e => setSendMessage(e.target.value)}
                    placeholder="Add a note to the client…"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 13.5, color: TX, background: BG, outline: 'none', resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = TEAL}
                    onBlur={e => e.target.style.borderColor = BD}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={sendCandidatePack}
                    disabled={!sendEmail.trim() || sending}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '11px 0', borderRadius: 9, border: 'none',
                      background: sendEmail.trim() && !sending ? TEAL : BD,
                      color: sendEmail.trim() && !sending ? NAVY : TX3,
                      fontFamily: F, fontSize: 14, fontWeight: 700,
                      cursor: sendEmail.trim() && !sending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Ic name="send" size={15} color={sendEmail.trim() && !sending ? NAVY : TX3} />
                    {sending ? 'Sending…' : 'Send candidate pack'}
                  </button>
                  <button
                    onClick={() => setSendModal(false)}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REPORT SECTIONS MODAL (agency only , Feature 6) ── */}
      {reportSectionsModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,33,55,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setReportSectionsModal(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 16, padding: '28px 32px', maxWidth: 440, width: '100%', boxShadow: '0 16px 48px rgba(15,33,55,0.22)' }}>
            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 6px' }}>Configure Client Report</h3>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.6 }}>
              Choose which sections to include. Your preference is saved for next time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { key: 'overall_score',       label: 'Overall Score & Recommendation' },
                { key: 'hiring_confidence',   label: 'Hiring Confidence Score' },
                { key: 'pressure_fit',        label: 'Pressure-Fit Assessment' },
                { key: 'ai_summary',          label: 'AI Hiring Summary' },
                { key: 'candidate_type',      label: 'Candidate Type' },
                { key: 'predicted_outcomes',  label: 'Predicted Outcomes' },
                { key: 'reality_timeline',    label: 'Reality Timeline' },
                { key: 'skills',              label: 'Skills Breakdown' },
                { key: 'cv_comparison',       label: 'What the Assessment Revealed' },
                { key: 'strengths',           label: 'Strengths' },
                { key: 'watchouts',           label: 'Watch-outs' },
                { key: 'interview_questions', label: 'Interview Questions' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${reportSections[key] ? `${TEAL}55` : BD}`, background: reportSections[key] ? TEALLT : BG, transition: 'all 0.12s' }}>
                  <input
                    type="checkbox"
                    checked={!!reportSections[key]}
                    onChange={e => setReportSections(prev => ({ ...prev, [key]: e.target.checked }))}
                    style={{ width: 15, height: 15, accentColor: TEAL, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: reportSections[key] ? TEALD : TX2 }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveReportPrefsAndExport}
                disabled={savingReportPrefs}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
                  background: TEAL, color: NAVY,
                  fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {savingReportPrefs ? 'Saving…' : 'Export Report'}
              </button>
              <button
                onClick={() => setReportSectionsModal(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOG OUTCOME MODAL (employer only) ── */}
      {outcomeModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,33,55,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setOutcomeModal(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: CARD, borderRadius: 16,
            maxWidth: 520, width: '100%', boxShadow: '0 16px 48px rgba(15,33,55,0.22)',
            display: 'flex', flexDirection: 'column', maxHeight: '85vh',
          }}>
            <div style={{ padding: '28px 32px 0', overflowY: 'auto', flex: 1 }}>
            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 6px' }}>
              Log Hire Outcome
            </h3>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 22px', lineHeight: 1.6 }}>
              Record how {candidate?.name || 'this candidate'} performed after being hired. This builds your predictive accuracy over time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {[
                { value: 'passed_probation',  label: 'Passed probation',          color: GRN,  bg: GRNBG,  bd: GRNBD },
                { value: 'still_probation',   label: 'Still in probation',         color: TEAL, bg: TEALLT, bd: `${TEAL}55` },
                { value: 'failed_probation',  label: 'Failed probation',           color: RED,  bg: REDBG,  bd: REDBD },
                { value: 'left_probation',    label: 'Left during probation',      color: AMB,  bg: AMBBG,  bd: AMBBD },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedOutcome(opt.value)}
                  style={{
                    padding: '11px 16px', borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${selectedOutcome === opt.value ? opt.bd : BD}`,
                    background: selectedOutcome === opt.value ? opt.bg : BG,
                    color: selectedOutcome === opt.value ? opt.color : TX2,
                    fontFamily: F, fontSize: 14, fontWeight: selectedOutcome === opt.value ? 700 : 500,
                    textAlign: 'left', transition: 'all 0.12s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Agency fields */}
            {profile?.account_type === 'agency' && (<>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Client name (optional)</label>
                <input
                  type="text"
                  value={outcomeClientName}
                  onChange={e => setOutcomeClientName(e.target.value)}
                  placeholder="e.g. Acme Ltd"
                  style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, color: TX, outline: 'none', background: CARD, width: '100%', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = TEAL}
                  onBlur={e => e.target.style.borderColor = BD}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Placement date</label>
                <input
                  type="date"
                  value={placementDate}
                  onChange={e => setPlacementDate(e.target.value)}
                  style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: FM, fontSize: 13, color: TX, outline: 'none', background: CARD, width: '100%', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = TEAL}
                  onBlur={e => e.target.style.borderColor = BD}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 8 }}>Rebate period</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: useCustomRebate ? 8 : 0 }}>
                  {[4, 6, 8].map(w => (
                    <button key={w} type="button"
                      onClick={() => { setRebateWeeks(w); setUseCustomRebate(false); setRebateSchedule(defaultRebateSchedule(w)) }}
                      style={{
                        padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${!useCustomRebate && rebateWeeks === w ? TEAL : BD}`,
                        background: !useCustomRebate && rebateWeeks === w ? TEALLT : BG,
                        color: !useCustomRebate && rebateWeeks === w ? TEALD : TX2,
                        transition: 'all 0.1s',
                      }}>
                      {w} weeks
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setUseCustomRebate(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${useCustomRebate ? TEAL : BD}`,
                      background: useCustomRebate ? TEALLT : BG,
                      color: useCustomRebate ? TEALD : TX2,
                      transition: 'all 0.1s',
                    }}>
                    Custom
                  </button>
                </div>
                {useCustomRebate && (
                  <input
                    type="number" min="1" max="52"
                    value={customRebateInput}
                    onChange={e => {
                      setCustomRebateInput(e.target.value)
                      const n = parseInt(e.target.value)
                      if (n > 0 && n <= 52) setRebateSchedule(defaultRebateSchedule(n))
                    }}
                    placeholder="Enter weeks (e.g. 10)"
                    style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: FM, fontSize: 13, color: TX, outline: 'none', background: CARD, width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = TEAL}
                    onBlur={e => e.target.style.borderColor = BD}
                  />
                )}
              </div>

              {/* Rebate schedule table */}
              {rebateSchedule.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 8 }}>
                    Rebate % per week
                    <span style={{ fontWeight: 400, marginLeft: 6, color: TX3 }}>Edit to match your contract</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {rebateSchedule.map((pct, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: BG, border: `1px solid ${BD}`, borderRadius: 7, padding: '6px 10px' }}>
                        <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, minWidth: 46 }}>Week {i + 1}</span>
                        <input
                          type="number" min="0" max="100"
                          value={pct}
                          onChange={e => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                            setRebateSchedule(prev => { const next = [...prev]; next[i] = val; return next })
                          }}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: 5, border: `1px solid ${BD}`, fontFamily: FM, fontSize: 13, color: TX, outline: 'none', background: CARD, textAlign: 'right' }}
                          onFocus={e => e.target.style.borderColor = TEAL}
                          onBlur={e => e.target.style.borderColor = BD}
                        />
                        <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>)}

            {/* Employer fields */}
            {profile?.account_type === 'employer' && (<>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Hire start date</label>
                <input
                  type="date"
                  value={placementDate}
                  onChange={e => setPlacementDate(e.target.value)}
                  style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: FM, fontSize: 13, color: TX, outline: 'none', background: CARD, width: '100%', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = TEAL}
                  onBlur={e => e.target.style.borderColor = BD}
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 8 }}>Probation length</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 6, 12].map(m => (
                    <button key={m} type="button"
                      onClick={() => setProbationMonths(m)}
                      style={{
                        padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${probationMonths === m ? TEAL : BD}`,
                        background: probationMonths === m ? TEALLT : BG,
                        color: probationMonths === m ? TEALD : TX2,
                        transition: 'all 0.1s',
                      }}>
                      {m} months
                    </button>
                  ))}
                </div>
              </div>
            </>)}

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Notes (optional)</label>
              <textarea
                rows={2}
                value={outcomeNoteText}
                onChange={e => setOutcomeNoteText(e.target.value)}
                placeholder="e.g. Exceeded targets in first 3 months"
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13.5, color: TX, resize: 'vertical', outline: 'none', background: CARD }}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = BD}
              />
            </div>

            {outcomeError && (
              <p style={{ fontSize: 13, color: RED, margin: '0 0 12px', lineHeight: 1.5 }}>{outcomeError}</p>
            )}
            </div>
            <div style={{ padding: '16px 32px 24px', borderTop: `1px solid ${BD}`, flexShrink: 0, display: 'flex', gap: 10 }}>
              <button
                onClick={logOutcome}
                disabled={!selectedOutcome || savingOutcome}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
                  background: selectedOutcome && !savingOutcome ? TEAL : BD,
                  color: selectedOutcome && !savingOutcome ? NAVY : TX3,
                  fontFamily: F, fontSize: 14, fontWeight: 700,
                  cursor: selectedOutcome && !savingOutcome ? 'pointer' : 'not-allowed',
                }}
              >
                {savingOutcome ? 'Saving…' : existingOutcome ? 'Update outcome' : 'Save outcome'}
              </button>
              <button
                onClick={() => setOutcomeModal(false)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT REPORT ── */}
      {candidate && results && (
        <div className="client-report-container" style={{ fontFamily: F, color: TX, padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: `2px solid ${NAVY}` }}>
            <div>
              <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: '0.06em', marginBottom: 3 }}>PRODICTA</div>
              <div style={{ fontSize: 11.5, color: TX3 }}>AI-Powered Work Simulation Assessment</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {profile?.company_name && <div style={{ fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 3 }}>Prepared by {profile.company_name}</div>}
              <div style={{ fontSize: 12, color: TX3 }}>Candidate Assessment Report</div>
              {completedDate && <div style={{ fontSize: 11.5, color: TX3, marginTop: 2 }}>{completedDate}</div>}
            </div>
          </div>

          {/* Feature 5: Agency cover explainer — AI-generated */}
          {profile?.account_type === 'agency' && (
            <div style={{ marginBottom: 28, padding: '18px 20px', background: '#f8fafc', border: `1px solid ${TEAL}33`, borderLeft: `4px solid ${TEAL}`, borderRadius: '0 10px 10px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>About this report</div>
              {results.client_explainer
                ? results.client_explainer.split('\n\n').filter(Boolean).map((para, i) => (
                    <p key={i} style={{ fontFamily: F, fontSize: 13, color: TX2, margin: i < results.client_explainer.split('\n\n').filter(Boolean).length - 1 ? '0 0 10px' : 0, lineHeight: 1.75 }}>
                      {para.trim()}
                    </p>
                  ))
                : <>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                      This report is generated by Prodicta, a work simulation platform that assesses candidates through realistic job scenarios rather than CVs or interviews.
                    </p>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                      {candidate.name || 'This candidate'} completed a series of work scenarios tailored to the {candidate.assessments?.role_title || 'role'}. Their overall score of {score} places them in the {slbl(score).toLowerCase()} range. The hiring recommendation is: {dL(score)}.
                    </p>
                    {results.pressure_fit_score != null && (
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                        Their Pressure-Fit score of {results.pressure_fit_score} reflects how they perform under real workplace pressure, including conflicting priorities, difficult conversations, and time constraints.
                      </p>
                    )}
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.75 }}>
                      Scores are benchmarked against assessed candidates. Averages typically sit between 60 and 72. A score of 80 or above places this candidate in the top tier.
                    </p>
                  </>
              }
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 5px', fontSize: 28, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>{candidate.name || 'Candidate'}</h1>
            {candidate.assessments?.role_title && <div style={{ fontSize: 14, color: TX2, fontWeight: 600 }}>{candidate.assessments.role_title}</div>}
          </div>

          {/* Feature 6: Conditional sections */}
          {reportSections.overall_score && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              <div style={{ background: sbg(score), border: `1px solid ${sbd(score)}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Overall Score</div>
                <div style={{ fontFamily: FM, fontSize: 38, fontWeight: 800, color: sc(score), lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: sc(score), marginTop: 5 }}>{slbl(score)}</div>
              </div>
              <div style={{ background: riskBg(results.risk_level), border: `1px solid ${riskBd(results.risk_level)}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Risk Level</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: riskCol(results.risk_level) }}>{results.risk_level || ','}</div>
              </div>
              <div style={{ background: dBg(score), border: `1px solid ${dBd(score)}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Recommendation</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: dC(score), lineHeight: 1.2 }}>{dL(score)}</div>
              </div>
            </div>
          )}
          {reportSections.pressure_fit && results.pressure_fit_score != null && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Pressure-Fit</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: pfColor(results.pressure_fit_score), lineHeight: 1 }}>{results.pressure_fit_score}</div>
                <div style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.7 }}>
                  <strong>{pfLbl(results.pressure_fit_score)}</strong>. Measures how this candidate handles workplace pressure, conflict, and competing priorities.
                </div>
              </div>
            </div>
          )}
          {reportSections.ai_summary && results.ai_summary && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Summary</div>
              {results.ai_summary.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 12px', lineHeight: 1.75 }}>{para}</p>
              ))}
            </div>
          )}
          {reportSections.skills && results.scores && Object.keys(results.scores).length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Skills</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {Object.entries(results.scores).map(([skill, s]) => (
                  <div key={skill} style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: sc(s), minWidth: 36 }}>{s}</div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX }}>{skill}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {reportSections.strengths && results.strengths?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${GRN}`, paddingBottom: 8, marginBottom: 14 }}>Strengths</div>
              {results.strengths.map((s, i) => {
                const t = typeof s === 'object' ? (s.text || s.title || '') : s
                const ev = typeof s === 'object' ? (s.evidence || s.quote || '') : ''
                return (
                  <div key={i} style={{ marginBottom: 10, padding: '10px 14px', background: GRNBG, borderRadius: 8, borderLeft: `3px solid ${GRN}` }}>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, marginBottom: ev ? 4 : 0 }}>{t}</div>
                    {ev && <div style={{ fontFamily: F, fontSize: 12, color: TX2, fontStyle: 'italic' }}>"{ev}"</div>}
                  </div>
                )
              })}
            </div>
          )}
          {reportSections.watchouts && results.watchouts?.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${RED}`, paddingBottom: 8, marginBottom: 14 }}>Watch-outs</div>
              {results.watchouts.map((w, i) => {
                const t = typeof w === 'object' ? (w.text || w.title || '') : w
                const sev = typeof w === 'object' ? w.severity : ''
                return (
                  <div key={i} style={{ marginBottom: 8, padding: '10px 14px', background: sev === 'High' ? REDBG : sev === 'Medium' ? AMBBG : BG, borderRadius: 8, borderLeft: `3px solid ${sev === 'High' ? RED : sev === 'Medium' ? AMB : BD}` }}>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX }}>{sev && `[${sev}] `}{t}</div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Supporting Documents */}
          {(documents.cv || documents.cover_letter) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Supporting Documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {documents.cv && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: TX2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: TEALLT, color: TEALD, padding: '2px 8px', borderRadius: 20 }}>CV</span>
                    {documents.cv.file_name}
                  </div>
                )}
                {documents.cover_letter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: TX2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: TEALLT, color: TEALD, padding: '2px 8px', borderRadius: 20 }}>Cover Letter</span>
                    {documents.cover_letter.file_name}
                  </div>
                )}
              </div>
            </div>
          )}

          {reportSections.hiring_confidence && results.hiring_confidence && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Hiring Confidence</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: results.hiring_confidence.score >= 70 ? TEAL : results.hiring_confidence.score >= 55 ? AMB : RED, lineHeight: 1 }}>{results.hiring_confidence.score}%</div>
                {results.hiring_confidence.explanation && (
                  <div style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.65 }}>{results.hiring_confidence.explanation}</div>
                )}
              </div>
            </div>
          )}
          {reportSections.candidate_type && results.candidate_type && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Candidate Type</div>
              <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: NAVY }}>{results.candidate_type}</div>
            </div>
          )}
          {reportSections.predicted_outcomes && results.predictions && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Predicted Outcomes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[
                  { key: 'pass_probation',       label: 'Pass probation' },
                  { key: 'top_performer',         label: 'Become top performer' },
                  { key: 'churn_risk',            label: 'Churn within 6 months' },
                  { key: 'underperformance_risk', label: 'Underperformance risk' },
                ].map(({ key, label }) => results.predictions[key] != null && (
                  <div key={key} style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>{label}</div>
                    <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: NAVY }}>{results.predictions[key]}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {reportSections.reality_timeline && results.reality_timeline && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Reality Timeline</div>
              {[
                { key: 'week1',  label: 'Weeks 1-2' },
                { key: 'month1', label: 'Month 1' },
                { key: 'month3', label: 'Months 2-3' },
              ].map(({ key, label }) => results.reality_timeline[key] && (
                <div key={key} style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEALD, minWidth: 56, paddingTop: 2 }}>{label}</div>
                  <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.65 }}>{results.reality_timeline[key]}</div>
                </div>
              ))}
            </div>
          )}
          {reportSections.cv_comparison && Array.isArray(results.cv_comparison) && results.cv_comparison.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>What the Assessment Revealed</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>What a CV would tell you</div>
                  {results.cv_comparison.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>{item}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 8, border: `1.5px solid ${TEAL}` }}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>What PRODICTA found</div>
                  {results.scores && Object.entries(results.scores).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([skill, s]) => (
                    <div key={skill} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: TEAL, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>{skill} scored {s} ({slbl(s)})</div>
                    </div>
                  ))}
                  {(results.watchouts || []).filter(w => typeof w === 'object' && w.severity === 'High').slice(0, 2).map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: RED, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>High severity watch-out: {w.text || w.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {reportSections.interview_questions && results.interview_questions?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${AMB}`, paddingBottom: 8, marginBottom: 14 }}>Suggested Interview Questions</div>
              {results.interview_questions.slice(0, 4).map((q, i) => {
                const text = typeof q === 'object' ? (q.question || q.text || '') : q
                return (
                  <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: TEALD, minWidth: 20 }}>{i + 1}.</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.65 }}>{text}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ACCOUNTABILITY RECORD PRINT ── */}
      {candidate && accountRecord && (
        <div className="accountability-record-print" style={{ fontFamily: F, color: TX, padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${NAVY}` }}>
            <div>
              <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: NAVY, letterSpacing: '0.06em', marginBottom: 2 }}>PRODICTA</div>
              <div style={{ fontSize: 11, color: TX3 }}>Accountability Record. Recruitment Agency Documentation</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {profile?.company_name && <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 2 }}>{profile.company_name}</div>}
              <div style={{ fontSize: 11, color: TX3 }}>Generated: {new Date(accountRecord.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              {accountRecord.shared_with_client_at && <div style={{ fontSize: 11, color: TX3 }}>Shared with client: {new Date(accountRecord.shared_with_client_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>{candidate.name || 'Candidate'}</div>
            {candidate.assessments?.role_title && <div style={{ fontSize: 13, color: TX2, fontWeight: 600, marginTop: 2 }}>{candidate.assessments.role_title}</div>}
          </div>
          {accountRecord.key_findings && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 6, marginBottom: 10 }}>Key Findings</div>
              {accountRecord.key_findings.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontFamily: FM, fontSize: 12, color: TX, lineHeight: 1.8 }}>{line}</div>
              ))}
            </div>
          )}
          {accountRecord.watch_outs && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `2px solid ${RED}`, paddingBottom: 6, marginBottom: 10 }}>Watch-outs</div>
              {accountRecord.watch_outs.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.8 }}>{line}</div>
              ))}
            </div>
          )}
          {accountRecord.recommended_actions && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: `2px solid ${AMB}`, paddingBottom: 6, marginBottom: 10 }}>Recommended Interview Questions</div>
              {accountRecord.recommended_actions.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.8 }}>{line}</div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${BD}`, fontSize: 10.5, color: TX3 }}>
            This record was generated by Prodicta AI Assessment Platform and should be retained as part of your placement documentation.
          </div>
        </div>
      )}
    </div>
  )
}
