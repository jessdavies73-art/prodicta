'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, PURPLE,
  F, FM,
  scolor, sbg, sbd, slabel, dL, dC, riskBg, riskCol, riskBd,
} from '@/lib/constants'

/* ── score helpers ─────────────────────────────────────── */
const passPct = s => s >= 85 ? 96 : s >= 75 ? 89 : s >= 60 ? 72 : s >= 45 ? 51 : 28

/* ── tiny reusable primitives ──────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: CARD,
    border: `1px solid ${BD}`,
    borderRadius: 14,
    padding: '22px 26px',
    ...style,
  }}>
    {children}
  </div>
)

const SectionHeading = ({ children }) => (
  <h2 style={{
    fontFamily: F,
    fontSize: 16,
    fontWeight: 800,
    color: TX,
    margin: '0 0 16px',
    letterSpacing: '-0.2px',
  }}>
    {children}
  </h2>
)

const Badge = ({ label, bg, color, border }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 11px',
    borderRadius: 50,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color,
    border: `1px solid ${border || 'transparent'}`,
  }}>
    {label}
  </span>
)

const EvidenceBox = ({ children, icon = 'quote', color = TX2, bg = '#f8fafc', border = BD }) => (
  <div style={{
    background: bg,
    border: `1px solid ${border}`,
    borderLeft: `3px solid ${color === TX2 ? TEAL : color}`,
    borderRadius: '0 8px 8px 0',
    padding: '10px 14px',
    marginTop: 8,
  }}>
    <p style={{
      fontFamily: F,
      fontSize: 12.5,
      color: TX2,
      margin: 0,
      lineHeight: 1.65,
      fontStyle: 'italic',
    }}>
      {children}
    </p>
  </div>
)

const ActionBox = ({ children }) => (
  <div style={{
    background: TEALLT,
    border: `1px solid ${TEAL}55`,
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 10,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  }}>
    <Ic name="zap" size={13} color={TEALD} />
    <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, margin: 0, lineHeight: 1.55 }}>
      <strong>Recommended action:</strong> {children}
    </p>
  </div>
)

/* ── loading skeleton ──────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[260, 100, 380, 220, 160].map((h, i) => (
        <div key={i} style={{
          height: h,
          background: BD,
          borderRadius: 14,
          opacity: 0.5,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.6}}`}</style>
    </div>
  )
}

/* ── pending / no-results state ────────────────────────── */
function PendingState({ candidate }) {
  return (
    <Card style={{ textAlign: 'center', padding: '56px 32px' }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: AMBBG,
        border: `1px solid ${AMBBD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <Ic name="clock" size={28} color={AMB} />
      </div>
      <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 8px' }}>
        Results pending
      </h3>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 6px' }}>
        {candidate?.name
          ? `${candidate.name} hasn't completed the assessment yet, or scoring is still in progress.`
          : 'This candidate has not completed the assessment yet, or scoring is still in progress.'}
      </p>
      <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>
        Check back shortly — AI analysis typically takes under two minutes once the candidate finishes.
      </p>
    </Card>
  )
}

/* ── severity helpers ──────────────────────────────────── */
function sevStyle(severity) {
  if (severity === 'High') return { bg: REDBG, color: RED, border: REDBD }
  if (severity === 'Medium') return { bg: AMBBG, color: AMB, border: AMBBD }
  return { bg: '#f1f5f9', color: TX3, border: BD }
}

/* ── main page ─────────────────────────────────────────── */
export default function CandidateReportPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [results, setResults] = useState(null)
  const [benchmarks, setBenchmarks] = useState([])
  const [responses, setResponses] = useState([])
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) { router.push('/login'); return }
        setUser(u)

        const [{ data: cand, error: cErr }, { data: res }, { data: bm }, { data: resps }] = await Promise.all([
          supabase
            .from('candidates')
            .select('*, assessments(role_title, job_description, skill_weights)')
            .eq('id', params.candidateId)
            .single(),
          supabase
            .from('results')
            .select('*')
            .eq('candidate_id', params.candidateId)
            .maybeSingle(),
          supabase
            .from('benchmarks')
            .select('*')
            .eq('user_id', u.id),
          supabase
            .from('responses')
            .select('scenario_index, time_taken_seconds')
            .eq('candidate_id', params.candidateId)
            .order('scenario_index'),
        ])

        if (cErr) throw cErr
        setCandidate(cand)
        setResults(res || null)
        setBenchmarks(bm || [])
        setResponses(resps || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.candidateId])

  /* helpers */
  const score = results?.overall_score ?? 0
  const completedDate = candidate?.completed_at
    ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  /* build benchmark map: skill_name → threshold */
  const bmMap = {}
  benchmarks.forEach(b => { if (b.skill_name) bmMap[b.skill_name.toLowerCase()] = b.threshold })

  function handlePrint() { window.print() }

  /* ── render ── */
  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
      <style>{`@media print { aside { display: none !important; } main { margin-left: 0 !important; padding: 16px !important; } .no-print { display: none !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <Sidebar active="assessment" />

      <main style={{ marginLeft: 220, padding: '32px 40px', maxWidth: 980, boxSizing: 'border-box' }}>

        {/* ── 1. Navigation ── */}
        <button
          className="no-print"
          onClick={() => router.push(`/assessment/${params.id}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: F,
            fontSize: 13.5,
            fontWeight: 600,
            color: TX2,
            padding: '0 0 20px',
          }}
        >
          <Ic name="left" size={16} color={TX2} />
          Back to assessment
        </button>

        {/* ── loading / error ── */}
        {loading && <LoadingState />}
        {!loading && error && (
          <Card style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: RED, fontFamily: F, fontSize: 14 }}>{error}</p>
          </Card>
        )}

        {!loading && !error && candidate && (
          <>
            {/* ── 2. Candidate header card ── */}
            <Card style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                {/* Avatar + meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 220 }}>
                  <Avatar name={candidate.name || 'Candidate'} size={52} />
                  <div>
                    <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, margin: '0 0 2px', letterSpacing: '-0.3px' }}>
                      {candidate.name || 'Unknown Candidate'}
                    </h2>
                    {candidate.email && (
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px' }}>
                        {candidate.email}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {candidate.assessments?.role_title && (
                        <Badge
                          label={candidate.assessments.role_title}
                          bg={TEALLT}
                          color={TEALD}
                          border={TEAL + '55'}
                        />
                      )}
                      {completedDate && (
                        <span style={{ fontSize: 12, color: TX3, fontFamily: F }}>
                          Completed {completedDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score + percentile + export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, flexWrap: 'wrap' }}>
                  {results && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: FM, fontSize: 52, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>
                        {score}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: scolor(score), marginTop: 3 }}>
                        {slabel(score)}
                      </div>
                      {results.percentile && (
                        <div style={{
                          marginTop: 6,
                          fontFamily: F,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: TEALD,
                          background: TEALLT,
                          border: `1px solid ${TEAL}55`,
                          borderRadius: 20,
                          padding: '3px 10px',
                          whiteSpace: 'nowrap',
                        }}>
                          {results.percentile} of candidates
                        </div>
                      )}
                    </div>
                  )}

                  <div className="no-print">
                    <button
                      onClick={handlePrint}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: `1.5px solid ${BD}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontFamily: F,
                        fontSize: 13,
                        fontWeight: 700,
                        color: TX2,
                        padding: '9px 16px',
                      }}
                    >
                      <Ic name="download" size={15} color={TX2} />
                      Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── results not ready ── */}
            {!results && <PendingState candidate={candidate} />}

            {results && (
              <>
                {/* ── 3. Three-column summary row ── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                  marginBottom: 20,
                }}>
                  {/* Pass prediction */}
                  <Card style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Predicted probation success
                    </div>
                    <div style={{ fontFamily: FM, fontSize: 40, fontWeight: 700, color: scolor(score), lineHeight: 1, marginBottom: 8 }}>
                      {passPct(score)}%
                    </div>
                    <div style={{
                      height: 6,
                      borderRadius: 99,
                      background: BD,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${passPct(score)}%`,
                        background: scolor(score),
                        borderRadius: 99,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <div style={{ fontFamily: F, fontSize: 11.5, color: TX3, marginTop: 8 }}>
                      chance of passing probation
                    </div>
                  </Card>

                  {/* Hiring decision */}
                  <Card style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Hiring decision
                    </div>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: sbg(score),
                      border: `1px solid ${sbd(score)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}>
                      <Ic name="award" size={22} color={scolor(score)} />
                    </div>
                    <div style={{
                      fontFamily: F,
                      fontSize: 16,
                      fontWeight: 800,
                      color: dC(score),
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}>
                      {dL(score)}
                    </div>
                  </Card>

                  {/* Risk level */}
                  <Card>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                      Risk level
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 14px',
                        borderRadius: 50,
                        fontSize: 13,
                        fontWeight: 800,
                        background: riskBg(results.risk_level),
                        color: riskCol(results.risk_level),
                        border: `1px solid ${riskBd(results.risk_level)}`,
                      }}>
                        {results.risk_level || 'Unknown'}
                      </span>
                    </div>
                    {results.risk_reason && (
                      <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
                        {results.risk_reason}
                      </p>
                    )}
                  </Card>
                </div>

                {/* ── 4. Response Integrity ── */}
                {(() => {
                  const integrity = results.integrity || {}
                  const rq = integrity.response_quality
                  const hasIntegrity = !!rq

                  // Colour scheme per quality rating
                  const qColor = !rq ? TX3
                    : rq === 'Genuine'              ? GRN
                    : rq === 'Likely Genuine'        ? TEALD
                    : rq === 'Possibly AI-Assisted'  ? AMB
                    : RED
                  const qBg = !rq ? BG
                    : rq === 'Genuine'              ? GRNBG
                    : rq === 'Likely Genuine'        ? TEALLT
                    : rq === 'Possibly AI-Assisted'  ? AMBBG
                    : REDBG
                  const qBd = !rq ? BD
                    : rq === 'Genuine'              ? GRNBD
                    : rq === 'Likely Genuine'        ? `${TEAL}55`
                    : rq === 'Possibly AI-Assisted'  ? '#fde68a'
                    : '#fecaca'
                  const qIcon = !rq ? 'eye'
                    : rq === 'Genuine'              ? 'check'
                    : rq === 'Likely Genuine'        ? 'check'
                    : rq === 'Possibly AI-Assisted'  ? 'alert'
                    : 'alert'

                  // Format per-scenario timing from raw response data
                  function fmtTime(s) {
                    if (!s) return '—'
                    const m = Math.floor(s / 60)
                    const sec = s % 60
                    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
                  }
                  function timingLabel(s) {
                    if (!s) return { label: 'No data', color: TX3, bg: BG, bd: BD }
                    if (s < 90)   return { label: 'Rushed', color: RED, bg: REDBG, bd: '#fecaca' }
                    if (s < 180)  return { label: 'Fast',   color: AMB, bg: AMBBG, bd: '#fde68a' }
                    if (s > 1200) return { label: 'Extended', color: TEALD, bg: TEALLT, bd: `${TEAL}55` }
                    return { label: 'Normal', color: GRN, bg: GRNBG, bd: GRNBD }
                  }

                  const redFlags = integrity.red_flags || []
                  const consistencyRating = integrity.consistency_rating
                  const cColor = !consistencyRating ? TX3
                    : consistencyRating === 'High'   ? GRN
                    : consistencyRating === 'Medium' ? AMB
                    : RED

                  return (
                    <Card style={{ marginBottom: 20, border: `1px solid ${hasIntegrity ? qBd : BD}` }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                        <div>
                          <SectionHeading>Response Integrity</SectionHeading>
                          <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '-8px 0 0' }}>
                            AI analysis of response authenticity, timing, and consistency across all 4 scenarios.
                          </p>
                        </div>
                        {hasIntegrity ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 10,
                            background: qBg, border: `1.5px solid ${qBd}`,
                            flexShrink: 0,
                          }}>
                            <Ic name={qIcon} size={16} color={qColor} />
                            <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: qColor }}>
                              {rq}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12.5, color: TX3, fontStyle: 'italic' }}>
                            Integrity data available for new assessments
                          </span>
                        )}
                      </div>

                      {/* Per-scenario timing tiles */}
                      <div style={{ marginBottom: integrity.quality_notes || redFlags.length > 0 || consistencyRating ? 16 : 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          Time per scenario
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {[0, 1, 2, 3].map(i => {
                            const resp = responses.find(r => r.scenario_index === i)
                            const secs = resp?.time_taken_seconds ?? null
                            const tl = timingLabel(secs)
                            return (
                              <div key={i} style={{
                                flex: '1 1 100px',
                                background: tl.bg,
                                border: `1px solid ${tl.bd}`,
                                borderRadius: 8, padding: '10px 12px',
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, marginBottom: 4 }}>
                                  Scenario {i + 1}
                                </div>
                                <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: tl.color, lineHeight: 1, marginBottom: 3 }}>
                                  {fmtTime(secs)}
                                </div>
                                <div style={{
                                  display: 'inline-block', fontSize: 10.5, fontWeight: 700,
                                  color: tl.color, background: 'rgba(255,255,255,0.6)',
                                  borderRadius: 4, padding: '1px 6px',
                                }}>
                                  {tl.label}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Quality notes */}
                      {integrity.quality_notes && (
                        <div style={{ marginBottom: 12 }}>
                          <EvidenceBox color={qColor} bg={qBg} border={qBd}>
                            {integrity.quality_notes}
                          </EvidenceBox>
                        </div>
                      )}

                      {/* Consistency */}
                      {consistencyRating && (
                        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: TX2 }}>Response consistency:</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: cColor === GRN ? GRNBG : cColor === AMB ? AMBBG : REDBG,
                            color: cColor,
                            border: `1px solid ${cColor === GRN ? GRNBD : cColor === AMB ? '#fde68a' : '#fecaca'}`,
                          }}>
                            {consistencyRating}
                          </span>
                          {integrity.consistency_notes && (
                            <span style={{ fontSize: 12.5, color: TX3 }}>{integrity.consistency_notes}</span>
                          )}
                        </div>
                      )}

                      {/* Red flags */}
                      {redFlags.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Red flags detected
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {redFlags.map((flag, i) => (
                              <div key={i} style={{
                                display: 'flex', gap: 8, alignItems: 'flex-start',
                                background: REDBG, border: `1px solid #fecaca`,
                                borderRadius: 8, padding: '9px 12px',
                              }}>
                                <Ic name="alert" size={13} color={RED} />
                                <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>
                                  {typeof flag === 'string' ? flag : JSON.stringify(flag)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No integrity data yet */}
                      {!hasIntegrity && responses.length === 0 && (
                        <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>
                          Timing data was not recorded for this assessment. Response integrity analysis will appear for new assessments going forward.
                        </p>
                      )}
                    </Card>
                  )
                })()}

                {/* ── 5. Pressure-Fit Assessment ── */}
                {(results.pressure_fit_score != null || results.pressure_fit) && (() => {
                  const pf = results.pressure_fit_score ?? null
                  const dims = results.pressure_fit ?? {}

                  function pfScoreColor(s) {
                    if (s == null) return TX3
                    return s >= 80 ? GRN : s >= 55 ? TEALD : RED
                  }
                  function pfScoreBg(s) {
                    if (s == null) return BG
                    return s >= 80 ? GRNBG : s >= 55 ? TEALLT : REDBG
                  }
                  function pfScoreBd(s) {
                    if (s == null) return BD
                    return s >= 80 ? GRNBD : s >= 55 ? `${TEAL}55` : '#fecaca'
                  }
                  function verdictStyle(v) {
                    if (v === 'Strength') return { color: GRN, bg: GRNBG, bd: GRNBD }
                    if (v === 'Concern')  return { color: RED, bg: REDBG, bd: '#fecaca' }
                    return { color: TEALD, bg: TEALLT, bd: `${TEAL}55` }
                  }

                  const DIMENSIONS = [
                    { key: 'decision_speed_quality',   label: 'Decision Speed & Quality',   icon: 'zap',      desc: 'Decisiveness and commitment when no perfect answer exists' },
                    { key: 'composure_under_conflict',  label: 'Composure Under Conflict',   icon: 'alert',    desc: 'Emotional regulation when facing difficult conversations' },
                    { key: 'prioritisation_under_load', label: 'Prioritisation Under Load',  icon: 'sliders',  desc: 'Framework and trade-off awareness when demands compete' },
                    { key: 'ownership_accountability',  label: 'Ownership & Accountability', icon: 'award',    desc: 'Personal responsibility, active language, and specific commitments' },
                  ]

                  const overallColor = pfScoreColor(pf)
                  const overallBg    = pfScoreBg(pf)
                  const overallBd    = pfScoreBd(pf)
                  const overallLabel = pf == null ? '—' : pf >= 80 ? 'Strong' : pf >= 55 ? 'Moderate' : 'Concern'

                  return (
                    <div style={{
                      marginBottom: 20,
                      background: `linear-gradient(135deg, #0f2137 0%, #0d3349 100%)`,
                      border: `1px solid rgba(91,191,189,0.25)`,
                      borderRadius: 14,
                      overflow: 'hidden',
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: '22px 26px 18px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                      }}>
                        <div>
                          <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.2px' }}>
                            Pressure-Fit Assessment
                          </h2>
                          <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            How this candidate performs when it matters most.
                          </p>
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
                          padding: '10px 18px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                          <div style={{ fontFamily: FM, fontSize: 44, fontWeight: 800, color: overallColor, lineHeight: 1, letterSpacing: '-2px' }}>
                            {pf ?? '—'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: overallColor }}>{overallLabel}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>overall / 100</div>
                          </div>
                        </div>
                      </div>

                      {/* 4 Dimensions */}
                      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {DIMENSIONS.map(({ key, label, icon, desc }) => {
                          const dim = dims[key] ?? {}
                          const s   = dim.score ?? null
                          const v   = dim.verdict ?? null
                          const n   = dim.narrative ?? null
                          const vs  = verdictStyle(v)

                          return (
                            <div key={key} style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 10,
                              padding: '16px 18px',
                            }}>
                              {/* Row: label + verdict + score */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                  background: 'rgba(91,191,189,0.15)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <Ic name={icon} size={14} color={TEAL} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{label}</div>
                                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{desc}</div>
                                </div>
                                {v && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '3px 11px', borderRadius: 20,
                                    fontSize: 11.5, fontWeight: 700,
                                    background: vs.bg, color: vs.color, border: `1px solid ${vs.bd}`,
                                    flexShrink: 0,
                                  }}>
                                    {v}
                                  </span>
                                )}
                                {s != null && (
                                  <span style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: pfScoreColor(s), flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
                                    {s}
                                  </span>
                                )}
                              </div>

                              {/* Progress bar */}
                              {s != null && (
                                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: n ? 12 : 0 }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${s}%`,
                                    background: pfScoreColor(s),
                                    borderRadius: 99,
                                    transition: 'width 0.6s ease',
                                    opacity: 0.85,
                                  }} />
                                </div>
                              )}

                              {/* Narrative */}
                              {n && (
                                <p style={{
                                  fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.65)',
                                  margin: 0, lineHeight: 1.7,
                                  borderLeft: `3px solid ${pfScoreColor(s) || TEAL}55`,
                                  paddingLeft: 12,
                                }}>
                                  {n}
                                </p>
                              )}

                              {/* No data fallback */}
                              {s == null && !n && (
                                <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.3)', margin: 0, fontStyle: 'italic' }}>
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

                {/* ── 6. AI Hiring Summary ── */}
                {results.ai_summary && (
                  <Card style={{ marginBottom: 20, borderLeft: `4px solid ${TEAL}` }}>
                    <SectionHeading>AI Hiring Summary</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.ai_summary.split('\n\n').filter(Boolean).map((para, i) => (
                        <p key={i} style={{
                          fontFamily: F,
                          fontSize: 14,
                          color: TX2,
                          lineHeight: 1.75,
                          margin: 0,
                        }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── 6. Skills Breakdown ── */}
                {results.scores && Object.keys(results.scores).length > 0 && (
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Skills Breakdown</SectionHeading>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 16,
                    }}>
                      {Object.entries(results.scores).map(([skill, skillScore]) => {
                        const narrative = results.score_narratives?.[skill]
                        const bmKey = skill.toLowerCase()
                        const bmThreshold = bmMap[bmKey]
                        const belowBenchmark = bmThreshold != null && skillScore < bmThreshold

                        return (
                          <div key={skill} style={{
                            background: BG,
                            border: `1px solid ${BD}`,
                            borderRadius: 10,
                            padding: '16px 18px',
                          }}>
                            {/* Skill name + score */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX }}>
                                {skill}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontFamily: FM, fontSize: 20, fontWeight: 700, color: scolor(skillScore) }}>
                                  {skillScore}
                                </span>
                                <Badge
                                  label={slabel(skillScore)}
                                  bg={sbg(skillScore)}
                                  color={scolor(skillScore)}
                                  border={sbd(skillScore)}
                                />
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{
                              height: 7,
                              borderRadius: 99,
                              background: BD,
                              overflow: 'hidden',
                              marginBottom: 10,
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${skillScore}%`,
                                background: scolor(skillScore),
                                borderRadius: 99,
                                transition: 'width 0.6s ease',
                              }} />
                            </div>

                            {/* Below benchmark flag */}
                            {belowBenchmark && (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: REDBG,
                                border: `1px solid ${REDBD}`,
                                borderRadius: 6,
                                padding: '3px 9px',
                                marginBottom: 8,
                              }}>
                                <Ic name="alert" size={12} color={RED} />
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: RED }}>
                                  Below benchmark (threshold: {bmThreshold})
                                </span>
                              </div>
                            )}

                            {/* Narrative */}
                            {narrative && (
                              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.65 }}>
                                {narrative}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ── 6. Strengths ── */}
                {results.strengths?.length > 0 && (
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Strengths</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.strengths.map((s, i) => {
                        const title = typeof s === 'object' ? (s.strength || s.title || s.text) : s
                        const evidence = typeof s === 'object' ? s.evidence : null
                        return (
                          <div key={i} style={{
                            background: GRNBG,
                            border: `1px solid ${GRNBD}`,
                            borderRadius: 10,
                            padding: '14px 16px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ marginTop: 2, flexShrink: 0 }}>
                                <Ic name="check" size={16} color={GRN} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: 0 }}>
                                  {title}
                                </p>
                                {evidence && (
                                  <EvidenceBox>{evidence}</EvidenceBox>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ── 7. Watch-outs ── */}
                {results.watchouts?.length > 0 && (
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Watch-outs</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.watchouts.map((w, i) => {
                        const title = typeof w === 'object' ? (w.watchout || w.title || w.text) : w
                        const severity = typeof w === 'object' ? w.severity : null
                        const evidence = typeof w === 'object' ? w.evidence : null
                        const action = typeof w === 'object' ? w.action : null
                        const sev = sevStyle(severity)

                        return (
                          <div key={i} style={{
                            background: CARD,
                            border: `1px solid ${BD}`,
                            borderRadius: 10,
                            padding: '14px 16px',
                          }}>
                            {severity && (
                              <div style={{ marginBottom: 8 }}>
                                <Badge label={`${severity} severity`} bg={sev.bg} color={sev.color} border={sev.border} />
                              </div>
                            )}
                            <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: 0 }}>
                              {title}
                            </p>
                            {evidence && (
                              <EvidenceBox>{evidence}</EvidenceBox>
                            )}
                            {action && (
                              <ActionBox>{action}</ActionBox>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ── 8. Onboarding Plan ── */}
                {results.onboarding_plan?.length > 0 && (
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Personalised Onboarding Plan</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {results.onboarding_plan.map((item, i) => {
                        const text = typeof item === 'object' ? (item.text || item.title || JSON.stringify(item)) : item
                        // Extract week label from start of string
                        const match = text.match(/^(Week\s[\d–]+|Ongoing|Weeks\s[\d–]+):/i)
                        const weekLabel = match ? match[1] : null
                        const body = weekLabel ? text.slice(match[0].length).trim() : text
                        const isLast = i === results.onboarding_plan.length - 1

                        return (
                          <div key={i} style={{ display: 'flex', gap: 0 }}>
                            {/* Timeline column */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
                              <div style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: TEAL,
                                border: `2px solid ${TEALLT}`,
                                flexShrink: 0,
                                marginTop: 4,
                              }} />
                              {!isLast && (
                                <div style={{ width: 2, flex: 1, background: `${TEAL}30`, minHeight: 24 }} />
                              )}
                            </div>
                            {/* Content */}
                            <div style={{ paddingBottom: isLast ? 0 : 20, paddingLeft: 12, flex: 1 }}>
                              {weekLabel && (
                                <span style={{
                                  fontFamily: F,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: TEALD,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  display: 'block',
                                  marginBottom: 3,
                                }}>
                                  {weekLabel}
                                </span>
                              )}
                              <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.65 }}>
                                {body}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}

                {/* ── 9. Interview Questions ── */}
                {results.interview_questions?.length > 0 && (
                  <Card style={{ marginBottom: 40 }}>
                    <SectionHeading>Suggested Interview Questions</SectionHeading>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 18px', lineHeight: 1.5 }}>
                      These questions are designed to probe the specific gaps identified in this assessment. Each includes a follow-up probe to test whether the candidate's answer is genuine.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {results.interview_questions.map((q, i) => {
                        const text = typeof q === 'object' ? (q.question || q.text || JSON.stringify(q)) : q
                        // Split main question from follow-up
                        const followUpMatch = text.match(/\[Follow-up:\s*(.*?)\]$/i)
                        const followUp = followUpMatch ? followUpMatch[1] : null
                        const mainQ = followUpMatch ? text.slice(0, followUpMatch.index).trim() : text

                        return (
                          <div key={i} style={{
                            background: BG,
                            border: `1px solid ${BD}`,
                            borderRadius: 10,
                            padding: '16px 18px',
                          }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                background: TEALLT,
                                border: `1px solid ${TEAL}55`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: FM,
                                fontSize: 12,
                                fontWeight: 700,
                                color: TEALD,
                                flexShrink: 0,
                                marginTop: 1,
                              }}>
                                {i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, margin: 0, lineHeight: 1.6 }}>
                                  {mainQ}
                                </p>
                                {followUp && (
                                  <div style={{
                                    marginTop: 10,
                                    background: AMBBG,
                                    border: `1px solid ${AMBBD}`,
                                    borderRadius: 7,
                                    padding: '8px 12px',
                                  }}>
                                    <p style={{ fontFamily: F, fontSize: 12.5, color: AMB, margin: 0, lineHeight: 1.55 }}>
                                      <strong>Follow-up:</strong> {followUp}
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
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
