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

const Card = ({ children, style = {}, className = '' }) => (
  <div className={className} style={{
    background: CARD,
    border: `1px solid ${BD}`,
    borderRadius: 12,
    padding: '24px 28px',
    boxShadow: SHADOW,
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
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
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
        <span style={{ fontFamily: FM, fontSize: size * 0.24, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-1px' }}>
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
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={drawn ? circ * (1 - score / 100) : circ}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.24, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
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
          supabase.from('users').select('company_name, account_type').eq('id', u.id).maybeSingle(),
        ])

        if (cErr) throw cErr
        setCandidate(cand)
        setResults(res || null)
        setBenchmarks(bm || [])
        setResponses(resps || [])
        setProfile(prof || null)

        const { data: nts } = await supabase.from('candidate_notes').select('*').eq('candidate_id', params.candidateId).order('created_at', { ascending: false })
        setNotes(nts || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.candidateId])

  const score = results?.overall_score ?? 0
  const passProbability = results?.pass_probability ?? null
  const completedDate = candidate?.completed_at
    ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const bmMap = {}
  benchmarks.forEach(b => { if (b.skill_name) bmMap[b.skill_name.toLowerCase()] = b.threshold })

  function handlePrint() { window.print() }
  function handleClientExport() {
    document.body.classList.add('client-print')
    window.print()
    window.addEventListener('afterprint', function cleanup() {
      document.body.classList.remove('client-print')
      window.removeEventListener('afterprint', cleanup)
    })
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
        @media print {
          body.client-print aside { display: none !important; }
          body.client-print main { display: none !important; }
          body.client-print .client-report-container { display: block !important; }
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

                {/* ══════════════════════════════════════════════════
                    TOP SUMMARY ROW — Pass Probability · Hiring Decision · Risk Level
                ══════════════════════════════════════════════════ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>

                  {/* Pass Probability */}
                  <Card style={{ textAlign: 'center', padding: '24px 20px' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Pass Probability
                    </div>
                    <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
                      <SmallRing score={passProbability ?? score} size={80} strokeWidth={7} />
                    </div>
                    <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: sc(passProbability ?? score), lineHeight: 1, marginBottom: 6 }}>
                      {passProbability ?? score}%
                    </div>
                    <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>predicted probation success</div>
                  </Card>

                  {/* Hiring Decision */}
                  <Card style={{ textAlign: 'center', padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                      Hiring Decision
                    </div>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: dBg(score), border: `2px solid ${dBd(score)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                    }}>
                      <Ic name="award" size={24} color={dC(score)} />
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '6px 16px', borderRadius: 50,
                      background: dBg(score), border: `1.5px solid ${dBd(score)}`,
                    }}>
                      <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: dC(score) }}>
                        {dL(score)}
                      </span>
                    </div>
                  </Card>

                  {/* Risk Level */}
                  <Card style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Risk Level</span>
                      <InfoTooltip text="Likelihood of this candidate struggling during probation based on their responses" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: riskBg(results.risk_level), border: `1px solid ${riskBd(results.risk_level)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ic name="alert" size={18} color={riskCol(results.risk_level)} />
                      </div>
                      <span style={{
                        fontFamily: F, fontSize: 17, fontWeight: 800, color: riskCol(results.risk_level),
                        letterSpacing: '-0.2px',
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

                {/* ══════════════════════════════════════════════════
                    RESPONSE INTEGRITY — dark navy
                ══════════════════════════════════════════════════ */}
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

                {/* ══════════════════════════════════════════════════
                    PRESSURE-FIT — dark navy, animated bars
                ══════════════════════════════════════════════════ */}
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
                            <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>
                              Pressure-Fit Assessment
                            </h2>
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

                {/* ══════════════════════════════════════════════════
                    AI HIRING SUMMARY
                ══════════════════════════════════════════════════ */}
                {results.ai_summary && (
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
                )}

                {/* ══════════════════════════════════════════════════
                    SKILLS BREAKDOWN — 2×2 grid with small rings
                ══════════════════════════════════════════════════ */}
                {results.scores && Object.keys(results.scores).length > 0 && (
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
                )}

                {/* ══════════════════════════════════════════════════
                    STRENGTHS
                ══════════════════════════════════════════════════ */}
                {results.strengths?.length > 0 && (
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
                              <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: 0, lineHeight: 1.4 }}>
                                {title}
                              </p>
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
                )}

                {/* ══════════════════════════════════════════════════
                    WATCH-OUTS
                ══════════════════════════════════════════════════ */}
                {results.watchouts?.length > 0 && (
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
                )}

                {/* ══════════════════════════════════════════════════
                    ONBOARDING PLAN — timeline style
                ══════════════════════════════════════════════════ */}
                {results.onboarding_plan?.length > 0 && (
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
                )}

                {/* ══════════════════════════════════════════════════
                    INTERVIEW QUESTIONS
                ══════════════════════════════════════════════════ */}
                {results.interview_questions?.length > 0 && (
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

              </>
            )}
          </>
        )}
      </main>

      {/* ── CLIENT REPORT ── */}
      {candidate && results && (
        <div className="client-report-container" style={{ fontFamily: F, color: TX, padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
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
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 5px', fontSize: 28, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>{candidate.name || 'Candidate'}</h1>
            {candidate.assessments?.role_title && <div style={{ fontSize: 14, color: TX2, fontWeight: 600 }}>{candidate.assessments.role_title}</div>}
          </div>
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
          {results.ai_summary && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `2px solid ${TEAL}`, paddingBottom: 8, marginBottom: 14 }}>Summary</div>
              {results.ai_summary.split('\n\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 12px', lineHeight: 1.75 }}>{para}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
