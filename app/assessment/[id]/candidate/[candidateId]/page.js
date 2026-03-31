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
    margin: '0 0 14px',
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

/* ── main page ─────────────────────────────────────────── */
export default function CandidateReportPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [results, setResults] = useState(null)
  const [benchmarks, setBenchmarks] = useState([])
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) { router.push('/login'); return }
        setUser(u)

        const [{ data: cand, error: cErr }, { data: res, error: rErr }, { data: bm }] = await Promise.all([
          supabase
            .from('candidates')
            .select('*, assessments(role_title, job_description, skill_weights)')
            .eq('id', params.candidateId)
            .single(),
          supabase
            .from('results')
            .select('*')
            .eq('candidate_id', params.candidateId)
            .single(),
          supabase
            .from('benchmarks')
            .select('*')
            .eq('user_id', u.id),
        ])

        if (cErr) throw cErr
        setCandidate(cand)
        setResults(res || null)
        setBenchmarks(bm || [])
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

  /* ── render ── */
  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
      <Sidebar active="assessment" />

      <main style={{ marginLeft: 220, padding: '32px 40px', maxWidth: 980, boxSizing: 'border-box' }}>

        {/* ── 1. Navigation ── */}
        <button
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
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 4px' }}>
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

                {/* Percentile + score + export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, flexWrap: 'wrap' }}>
                  {results?.percentile != null && (
                    <div style={{
                      background: TEALLT,
                      border: `1px solid ${TEAL}55`,
                      borderRadius: 10,
                      padding: '8px 14px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 700, color: TEALD }}>
                        {results.percentile}<span style={{ fontSize: 13 }}>th</span>
                      </div>
                      <div style={{ fontFamily: F, fontSize: 11, color: TEALD, fontWeight: 600 }}>percentile</div>
                    </div>
                  )}

                  {results && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: FM, fontSize: 48, fontWeight: 700, color: scolor(score), lineHeight: 1 }}>
                        {score}
                      </div>
                      <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: scolor(score), marginTop: 4 }}>
                        {slabel(score)}
                      </div>
                    </div>
                  )}

                  <button
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
                    <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 700, color: scolor(score), lineHeight: 1, marginBottom: 6 }}>
                      {passPct(score)}%
                    </div>
                    <div style={{ fontFamily: F, fontSize: 12, color: TX2, fontWeight: 600, marginBottom: 10 }}>
                      Predicted probation success
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
                  </Card>

                  {/* Hiring decision */}
                  <Card style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      fontFamily: F,
                      fontSize: 20,
                      fontWeight: 800,
                      color: dC(score),
                      marginBottom: 6,
                    }}>
                      {dL(score)}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 12, color: TX3, fontWeight: 500 }}>
                      Hiring decision
                    </div>
                    <div style={{
                      marginTop: 10,
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: sbg(score),
                      border: `1px solid ${sbd(score)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ic name="award" size={20} color={scolor(score)} />
                    </div>
                  </Card>

                  {/* Risk level */}
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 11px',
                        borderRadius: 50,
                        fontSize: 11,
                        fontWeight: 700,
                        background: riskBg(results.risk_level),
                        color: riskCol(results.risk_level),
                        border: `1px solid ${riskBd(results.risk_level)}`,
                      }}>
                        {results.risk_level || 'Unknown'}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>risk</span>
                    </div>
                    {results.risk_reason && (
                      <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
                        {results.risk_reason}
                      </p>
                    )}
                  </Card>
                </div>

                {/* ── 4. AI Assessment Summary ── */}
                {results.ai_summary && (
                  <Card style={{
                    marginBottom: 20,
                    borderLeft: `4px solid ${TEAL}`,
                    paddingLeft: 22,
                  }}>
                    <SectionHeading>AI Assessment Summary</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {results.ai_summary.split('\n\n').filter(Boolean).map((para, i) => (
                        <p key={i} style={{
                          fontFamily: F,
                          fontSize: 14,
                          color: TX2,
                          lineHeight: 1.7,
                          margin: 0,
                        }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </Card>
                )}

                {/* ── 5. Skills breakdown ── */}
                {results.scores && Object.keys(results.scores).length > 0 && (
                  <Card style={{ marginBottom: 20 }}>
                    <SectionHeading>Skills Breakdown</SectionHeading>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: 16,
                    }}>
                      {Object.entries(results.scores).map(([skill, data]) => {
                        const skillScore = typeof data === 'object' ? (data.score ?? data) : data
                        const narrative = typeof data === 'object' ? data.score_narrative : null
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
                                <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 700, color: scolor(skillScore) }}>
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
                              marginBottom: narrative || belowBenchmark ? 10 : 0,
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
                                marginBottom: narrative ? 8 : 0,
                              }}>
                                <Ic name="alert" size={12} color={RED} />
                                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: RED }}>
                                  Below benchmark (threshold: {bmThreshold})
                                </span>
                              </div>
                            )}

                            {/* Narrative */}
                            {narrative && (
                              <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
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
                            padding: '13px 16px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ marginTop: 1, flexShrink: 0 }}>
                                <Ic name="check" size={16} color={GRN} />
                              </div>
                              <div>
                                <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '0 0 4px' }}>
                                  {title}
                                </p>
                                {evidence && (
                                  <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
                                    {evidence}
                                  </p>
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

                        const sevBg = severity === 'High' ? REDBG : severity === 'Medium' ? AMBBG : '#f1f5f9'
                        const sevCol = severity === 'High' ? RED : severity === 'Medium' ? AMB : TX3
                        const sevBd = severity === 'High' ? REDBD : severity === 'Medium' ? AMBBD : BD

                        return (
                          <div key={i} style={{
                            background: CARD,
                            border: `1px solid ${BD}`,
                            borderRadius: 10,
                            padding: '14px 16px',
                          }}>
                            {severity && (
                              <div style={{ marginBottom: 8 }}>
                                <Badge label={severity} bg={sevBg} color={sevCol} border={sevBd} />
                              </div>
                            )}
                            <p style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, margin: '0 0 4px' }}>
                              {title}
                            </p>
                            {evidence && (
                              <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: '0 0 10px', lineHeight: 1.6 }}>
                                {evidence}
                              </p>
                            )}
                            {action && (
                              <div style={{
                                background: TEALLT,
                                border: `1px solid ${TEAL}55`,
                                borderRadius: 7,
                                padding: '9px 12px',
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                              }}>
                                <Ic name="zap" size={13} color={TEALD} />
                                <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, margin: 0, lineHeight: 1.55 }}>
                                  <strong>Recommended action:</strong> {action}
                                </p>
                              </div>
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
                    <SectionHeading>Onboarding Plan</SectionHeading>
                    <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {results.onboarding_plan.map((item, i) => {
                        const text = typeof item === 'object' ? (item.text || item.title || JSON.stringify(item)) : item
                        return (
                          <li key={i} style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.6 }}>
                            {text}
                          </li>
                        )
                      })}
                    </ol>
                  </Card>
                )}

                {/* ── 9. Interview Questions ── */}
                {results.interview_questions?.length > 0 && (
                  <Card style={{ marginBottom: 40 }}>
                    <SectionHeading>Suggested Interview Questions</SectionHeading>
                    <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {results.interview_questions.map((q, i) => {
                        const text = typeof q === 'object' ? (q.question || q.text || JSON.stringify(q)) : q
                        return (
                          <li key={i} style={{
                            fontFamily: F,
                            fontSize: 13.5,
                            color: TX,
                            lineHeight: 1.65,
                            paddingBottom: i < results.interview_questions.length - 1 ? 10 : 0,
                            borderBottom: i < results.interview_questions.length - 1 ? `1px solid ${BD}` : 'none',
                            listStyle: 'decimal',
                          }}>
                            {text}
                          </li>
                        )
                      })}
                    </ol>
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
