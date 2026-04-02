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
   Score colour helpers — updated thresholds
   <50 red · 50–69 amber · 70–84 jade · 85+ green
───────────────────────────────────────────────────────────── */
const sc   = s => s >= 85 ? GRN  : s >= 70 ? TEAL : s >= 50 ? AMB  : RED
const sbg  = s => s >= 85 ? GRNBG : s >= 70 ? TEALLT : s >= 50 ? AMBBG : REDBG
const sbd  = s => s >= 85 ? GRNBD : s >= 70 ? `${TEAL}55` : s >= 50 ? AMBBD : REDBD
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'

const pfColor = s => s == null ? TX3  : s >= 80 ? GRN  : s >= 55 ? TEALD : RED
const pfBg    = s => s == null ? BG   : s >= 80 ? GRNBG : s >= 55 ? TEALLT : REDBG
const pfBd    = s => s == null ? BD   : s >= 80 ? GRNBD : s >= 55 ? `${TEAL}55` : REDBD
const pfLbl   = s => s == null ? '—'  : s >= 80 ? 'Strong' : s >= 55 ? 'Moderate' : 'Concern'

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

const EvidenceBox = ({ children }) => (
  <div style={{
    background: '#f8fafc',
    border: `1px solid ${BD}`,
    borderLeft: `3px solid ${TEAL}`,
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
    background: TEALLT,
    border: `1px solid ${TEAL}44`,
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 10,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  }}>
    <Ic name="zap" size={13} color={TEALD} />
    <p style={{ fontFamily: F, fontSize: 13, color: TEALD, margin: 0, lineHeight: 1.55 }}>
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
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

/* ─────────────────────────────────────────────────────────────
   Severity helpers
───────────────────────────────────────────────────────────── */
function sevStyle(severity) {
  if (severity === 'High')   return { bg: REDBG,  color: RED,   border: REDBD,  tint: `${RED}08` }
  if (severity === 'Medium') return { bg: AMBBG,  color: AMB,   border: AMBBD,  tint: `${AMB}08` }
  return                            { bg: '#f1f5f9', color: TX3, border: BD,     tint: '#f8fafc'   }
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
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [existingOutcome, setExistingOutcome] = useState(null)

  // Accountability Trail (agency only)
  const [accountRecord, setAccountRecord] = useState(null)
  const [savingRecord, setSavingRecord] = useState(false)
  const [recordSharedDate, setRecordSharedDate] = useState('')
  const [savingSharedDate, setSavingSharedDate] = useState(false)

  // Report section prefs (agency — Feature 6)
  const DEFAULT_SECTIONS = { overall_score: true, pressure_fit: true, ai_summary: true, skills: true, strengths: true, watchouts: true, interview_questions: true }
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

        const [{ data: outcome }, { data: acRec }] = await Promise.all([
          supabase.from('candidate_outcomes').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
          supabase.from('accountability_records').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
        ])
        setExistingOutcome(outcome || null)
        if (outcome) { setSelectedOutcome(outcome.outcome); setOutcomeDate(outcome.outcome_date || ''); setOutcomeNoteText(outcome.notes || '') }
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

  // IntersectionObserver for sticky nav active section tracking
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

  const score = results?.overall_score ?? 0
  const passProbability = results?.pass_probability ?? null
  const completedDate = candidate?.completed_at
    ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const bmMap = {}
  benchmarks.forEach(b => { if (b.skill_name) bmMap[b.skill_name.toLowerCase()] = b.threshold })

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
    doClientPrint()
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
    const supabase = createClient()
    const payload = {
      candidate_id: params.candidateId,
      user_id: user.id,
      outcome: selectedOutcome,
      outcome_date: outcomeDate || null,
      notes: outcomeNoteText.trim() || null,
    }
    let saved
    if (existingOutcome) {
      const { data } = await supabase.from('candidate_outcomes').update(payload).eq('id', existingOutcome.id).select().single()
      saved = data
    } else {
      const { data } = await supabase.from('candidate_outcomes').insert(payload).select().single()
      saved = data
    }
    if (saved) { setExistingOutcome(saved); setOutcomeModal(false) }
    setSavingOutcome(false)
  }

  async function generateAccountabilityRecord() {
    if (!user || !results) return
    setSavingRecord(true)
    const supabase = createClient()
    const keyFindings = [
      `Overall Score: ${results.overall_score}/100 (${slbl(results.overall_score)})`,
      results.pressure_fit_score != null ? `Pressure-Fit Score: ${results.pressure_fit_score}/100` : null,
      `Hiring Decision: ${dL(results.overall_score)}`,
      results.risk_level ? `Risk Level: ${results.risk_level}` : null,
      results.trajectory ? `Performance Trajectory: ${results.trajectory}` : null,
      results.confidence_level ? `Confidence Level: ${results.confidence_level}` : null,
    ].filter(Boolean).join('\n')
    const watchOuts = (results.watchouts || []).map(w =>
      typeof w === 'object' ? `[${w.severity || 'Medium'}] ${w.text || w.title || ''}` : w
    ).join('\n')
    const actions = (results.interview_questions || []).slice(0, 3).map((q, i) =>
      `${i + 1}. ${typeof q === 'object' ? (q.question || q.text || '') : q}`
    ).join('\n')
    const payload = {
      candidate_id: params.candidateId,
      user_id: user.id,
      generated_at: new Date().toISOString(),
      key_findings: keyFindings,
      watch_outs: watchOuts,
      recommended_actions: actions,
    }
    let saved
    if (accountRecord) {
      const { data } = await supabase.from('accountability_records').update(payload).eq('id', accountRecord.id).select().single()
      saved = data
    } else {
      const { data } = await supabase.from('accountability_records').insert(payload).select().single()
      saved = data
    }
    if (saved) setAccountRecord(saved)
    setSavingRecord(false)
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
                  <Avatar name={candidate.name || 'Candidate'} size={56} />
                  <div>
                    <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 3px', letterSpacing: '-0.4px' }}>
                      {candidate.name || 'Unknown Candidate'}
                    </h2>
                    {candidate.email && (
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px' }}>{candidate.email}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {candidate.assessments?.role_title && (
                        <Badge label={candidate.assessments.role_title} bg={TEALLT} color={TEALD} border={`${TEAL}55`} />
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
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                        Overall Score
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
                    {results && profile?.account_type === 'employer' && (
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
                    <button onClick={handlePrint} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'transparent', border: `1.5px solid ${BD}`, borderRadius: 8,
                      cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2, padding: '9px 16px',
                    }}>
                      <Ic name="download" size={15} color={TX2} />
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {!results && <PendingState candidate={candidate} />}

            {results && (
              <>

                <StickyNav active={activeSection} />

                {/* ══════════════════════════════════════════════════
                    TOP SUMMARY ROW — Pass Probability · Hiring Decision · Risk Level
                ══════════════════════════════════════════════════ */}
                <ScrollReveal id="summary">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>

                  {/* Pass Probability */}
                  <Card topColor={sc(passProbability ?? score)} style={{ textAlign: 'center', padding: '24px 20px', background: `linear-gradient(180deg, ${sbg(passProbability ?? score)} 0%, #fff 60%)` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Pass Probability
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
                    PLACEMENT RISK SCORE — agency only
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
                    RESPONSE INTEGRITY — dark navy
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

                  function fmtTime(s) { if (!s) return '—'; const m = Math.floor(s / 60); return m > 0 ? `${m}m ${s % 60}s` : `${s}s` }
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
                            <InfoTooltip text="Analysis of response timing, authenticity, and consistency across scenarios" light />
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
                    PRESSURE-FIT — dark navy, animated bars
                ══════════════════════════════════════════════════ */}
                <ScrollReveal id="pressure-fit" delay={60}>
                {(results.pressure_fit_score != null || results.pressure_fit) && (() => {
                  const pf = results.pressure_fit_score ?? null
                  const dims = results.pressure_fit ?? {}

                  const DIMENSIONS = [
                    { key: 'decision_speed_quality',    label: 'Decision Speed & Quality',   icon: 'zap',     desc: 'Decisiveness and commitment when no perfect answer exists' },
                    { key: 'composure_under_conflict',   label: 'Composure Under Conflict',   icon: 'alert',   desc: 'Emotional regulation when facing difficult conversations' },
                    { key: 'prioritisation_under_load',  label: 'Prioritisation Under Load',  icon: 'sliders', desc: 'Framework and trade-off awareness when demands compete' },
                    { key: 'ownership_accountability',   label: 'Ownership & Accountability', icon: 'award',   desc: 'Personal responsibility, active language, and specific commitments' },
                  ]

                  function vStyle(v) {
                    if (v === 'Strength') return { bg: GRNBG, color: GRN, bd: GRNBD }
                    if (v === 'Concern')  return { bg: REDBG,  color: RED, bd: REDBD }
                    return { bg: TEALLT, color: TEALD, bd: `${TEAL}55` }
                  }

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
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${TEAL}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Ic name="sliders" size={14} color={TEAL} />
                            </div>
                            <div>
                              <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                                Pressure-Fit Assessment
                              </h2>
                              <div style={{ height: 3, width: 40, borderRadius: 99, background: TEAL, marginTop: 5 }} />
                            </div>
                            <InfoTooltip text="How this candidate handles pressure, conflict, and competing priorities" light />
                          </div>
                          <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', margin: 0, paddingLeft: 36 }}>
                            How this candidate performs when it matters most.
                          </p>
                        </div>
                        {pf != null && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
                            borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0,
                          }}>
                            <div style={{ fontFamily: FM, fontSize: 42, fontWeight: 800, color: pfColor(pf), lineHeight: 1, letterSpacing: '-2px' }}>{pf}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: pfColor(pf) }}>{pfLbl(pf)}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>/ 100</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dimensions */}
                      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {DIMENSIONS.map(({ key, label, icon, desc }, idx) => {
                          const dim = dims[key] ?? {}
                          const s = dim.score ?? null
                          const v = dim.verdict ?? null
                          const n = dim.narrative ?? null
                          const vs = vStyle(v)
                          const barColor = s == null ? TX3 : s >= 80 ? GRN : s >= 55 ? TEAL : RED

                          return (
                            <div key={key} style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 10,
                              padding: '16px 18px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                  background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Ic name={icon} size={15} color={TEAL} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</div>
                                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{desc}</div>
                                </div>
                                {v && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '4px 12px', borderRadius: 50,
                                    fontSize: 11.5, fontWeight: 700,
                                    background: vs.bg, color: vs.color, border: `1px solid ${vs.bd}`,
                                    flexShrink: 0,
                                  }}>
                                    {v}
                                  </span>
                                )}
                                {s != null && (
                                  <span style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: barColor, flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
                                    {s}
                                  </span>
                                )}
                              </div>

                              {s != null && (
                                <div style={{ marginBottom: n ? 12 : 0 }}>
                                  <AnimBar pct={s} color={barColor} height={5} delay={idx * 80} />
                                </div>
                              )}

                              {n && (
                                <p style={{
                                  fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.6)',
                                  margin: 0, lineHeight: 1.7,
                                  borderLeft: `3px solid ${barColor}55`,
                                  paddingLeft: 12,
                                }}>
                                  {n}
                                </p>
                              )}

                              {s == null && !n && (
                                <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.25)', margin: 0, fontStyle: 'italic' }}>
                                  Data available for newly scored assessments.
                                </p>
                              )}
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
                    <SectionHeading>AI Hiring Summary</SectionHeading>
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
                    SKILLS BREAKDOWN — 2×2 grid with small rings
                ══════════════════════════════════════════════════ */}
                {results.scores && Object.keys(results.scores).length > 0 && (
                  <ScrollReveal id="skills" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="Individual scores for core workplace skills based on scenario responses">
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
                    STRENGTHS
                ══════════════════════════════════════════════════ */}
                {results.strengths?.length > 0 && (
                  <ScrollReveal id="strengths" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading tooltip="Specific behaviours the candidate demonstrated well, with direct evidence">
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
                    <SectionHeading tooltip="Areas of concern with severity rating and recommended management actions">
                      Watch-outs
                    </SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.watchouts.map((w, i) => {
                        const title = typeof w === 'object' ? (w.watchout || w.title || w.text) : w
                        const severity = typeof w === 'object' ? w.severity : null
                        const explanation = typeof w === 'object' ? w.explanation : null
                        const evidence = typeof w === 'object' ? w.evidence : null
                        const action = typeof w === 'object' ? w.action : null
                        const sev = sevStyle(severity)
                        return (
                          <div key={i} style={{
                            background: sev.tint,
                            border: `1px solid ${sev.border}`,
                            borderRadius: 10,
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
                            {evidence && <EvidenceBox>{evidence}</EvidenceBox>}
                            {action && <ActionBox>{action}</ActionBox>}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                  </ScrollReveal>
                )}

                {/* ══════════════════════════════════════════════════
                    ONBOARDING PLAN — timeline style
                ══════════════════════════════════════════════════ */}
                {results.onboarding_plan?.length > 0 && (
                  <ScrollReveal id="onboarding" delay={60}>
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Personalised Onboarding Plan</SectionHeading>
                    <div style={{ paddingLeft: 4 }}>
                      {results.onboarding_plan.map((item, i) => {
                        const text = typeof item === 'object' ? (item.text || item.title || JSON.stringify(item)) : item
                        const match = text.match(/^(Week\s*\d+):/i)
                        const weekNum = match ? match[1].replace(/\s+/g, ' ') : null
                        const body = weekNum ? text.slice(match[0].length).trim() : text
                        const isLast = i === results.onboarding_plan.length - 1

                        return (
                          <div key={i} style={{ display: 'flex', gap: 0 }}>
                            {/* Timeline column */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                background: TEAL, boxShadow: `0 0 0 4px ${TEALLT}, 0 0 0 5px ${TEAL}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FM, fontSize: 12, fontWeight: 800, color: '#fff',
                                zIndex: 1,
                              }}>
                                {i + 1}
                              </div>
                              {!isLast && (
                                <div style={{ width: 2, flex: 1, background: `${TEAL}25`, minHeight: 32, marginTop: 2 }} />
                              )}
                            </div>
                            {/* Content */}
                            <div style={{ paddingBottom: isLast ? 0 : 28, paddingLeft: 16, flex: 1, paddingTop: 6 }}>
                              {weekNum && (
                                <span style={{
                                  fontFamily: F, fontSize: 11, fontWeight: 800, color: TEALD,
                                  textTransform: 'uppercase', letterSpacing: '0.07em',
                                  display: 'block', marginBottom: 4,
                                }}>
                                  {weekNum}
                                </span>
                              )}
                              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.7 }}>
                                {body}
                              </p>
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
                    <SectionHeading>Suggested Interview Questions</SectionHeading>
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
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800, color: '#fff',
                              }}>
                                {(n.author_name || '?').slice(0, 1).toUpperCase()}
                              </div>
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
                    ACCOUNTABILITY TRAIL — agency only
                ══════════════════════════════════════════════════ */}
                {profile?.account_type === 'agency' && (
                  <Card style={{ marginBottom: 40 }} className="no-print">
                    <SectionHeading tooltip="Create a timestamped accountability record of this assessment for client-facing documentation.">
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

              </>
            )}
          </>
        )}
      </main>

      {/* ── REPORT SECTIONS MODAL (agency only — Feature 6) ── */}
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
                { key: 'overall_score',      label: 'Overall Score & Recommendation' },
                { key: 'pressure_fit',       label: 'Pressure-Fit Assessment' },
                { key: 'ai_summary',         label: 'AI Hiring Summary' },
                { key: 'skills',             label: 'Skills Breakdown' },
                { key: 'strengths',          label: 'Strengths' },
                { key: 'watchouts',          label: 'Watch-outs' },
                { key: 'interview_questions',label: 'Interview Questions' },
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
            background: CARD, borderRadius: 16, padding: '28px 32px',
            maxWidth: 460, width: '100%', boxShadow: '0 16px 48px rgba(15,33,55,0.22)',
          }}>
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

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 5 }}>Date (optional)</label>
              <input
                type="date"
                value={outcomeDate}
                onChange={e => setOutcomeDate(e.target.value)}
                style={{ padding: '9px 13px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: FM, fontSize: 13, color: TX, outline: 'none', background: CARD, width: '100%', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = TEAL}
                onBlur={e => e.target.style.borderColor = BD}
              />
            </div>

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

            <div style={{ display: 'flex', gap: 10 }}>
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

          {/* Feature 5: Agency cover explainer */}
          {profile?.account_type === 'agency' && (
            <div style={{ marginBottom: 28, padding: '18px 20px', background: '#f8fafc', border: `1px solid ${TEAL}33`, borderLeft: `4px solid ${TEAL}`, borderRadius: '0 10px 10px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>How to read this report</div>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                This report is generated by Prodicta, an AI-powered work simulation platform. Rather than relying on a CV, {candidate.name || 'this candidate'} completed a series of realistic work scenarios tailored to the <strong>{candidate.assessments?.role_title || 'role'}</strong>. Their responses were analysed across four key competencies: communication, problem solving, prioritisation, and leadership.
              </p>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                <strong>Overall Score (0–100):</strong> A score of 75+ indicates a strong candidate. 65–74 is good with some development areas. Below 65 suggests gaps worth exploring in interview.
              </p>
              {results.pressure_fit_score != null && (
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.75 }}>
                  <strong>Pressure-Fit Score:</strong> Measures how the candidate performs under real workplace pressure: conflicting priorities, difficult conversations, and time constraints. This is often a stronger predictor of long-term performance than technical skills alone.
                </p>
              )}
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.75 }}>
                Scores are calibrated against a strict benchmark. Averages typically sit between 60 and 72. A score of 80+ places this candidate in the top tier. This data goes beyond what any CV or interview can reveal.
              </p>
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
                <div style={{ fontSize: 20, fontWeight: 800, color: riskCol(results.risk_level) }}>{results.risk_level || '—'}</div>
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
