'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, cs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const BUCKETS = ['0-49', '50-64', '65-74', '75-84', '85-100']
function bucketise(scores) {
  const b = { '0-49': 0, '50-64': 0, '65-74': 0, '75-84': 0, '85-100': 0 }
  scores.forEach(s => {
    if (s < 50) b['0-49']++
    else if (s < 65) b['50-64']++
    else if (s < 75) b['65-74']++
    else if (s < 85) b['75-84']++
    else b['85-100']++
  })
  return b
}

function distributionShape(buckets, total) {
  if (total < 3) return { label: 'Too few candidates', ok: true }
  const pcts = BUCKETS.map(k => (buckets[k] || 0) / total)
  const maxPct = Math.max(...pcts)
  if (maxPct > 0.6) return { label: 'Skewed', ok: false }
  const mid = pcts[1] + pcts[2] + pcts[3]
  if (mid >= 0.5) return { label: 'Normal', ok: true }
  return { label: 'Broad', ok: true }
}

function adverseChecks(scores) {
  if (scores.length < 10) return []
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min
  const buckets = bucketise(scores)
  const maxBucketPct = Math.max(...Object.values(buckets)) / scores.length
  return [
    { label: 'Score range is broad (candidates are differentiated)', pass: range >= 20 },
    { label: 'Lowest scoring group has meaningful scores (above 30)', pass: min >= 30 },
    { label: 'No cliff edge (no bucket exceeds 60% of candidates)', pass: maxBucketPct <= 0.6 },
    { label: '4/5ths rule across protected groups', pass: null, pending: 'Awaiting candidate self-report data' },
  ]
}

export default function EdiPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [allScores, setAllScores] = useState([])
  const [ediReports, setEdiReports] = useState({})
  const [generating, setGenerating] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: assess } = await supabase
        .from('assessments')
        .select('id, role_title, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const { data: cands } = await supabase
        .from('candidates')
        .select('id, assessment_id, results(overall_score)')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const scores = (cands || []).map(c => ({
        assessment_id: c.assessment_id,
        score: c.results?.[0]?.overall_score,
      })).filter(s => s.score != null)

      // Group scores by assessment
      const byAssessment = {}
      for (const s of scores) {
        if (!byAssessment[s.assessment_id]) byAssessment[s.assessment_id] = []
        byAssessment[s.assessment_id].push(s.score)
      }

      const enriched = (assess || []).map(a => ({
        ...a,
        scores: byAssessment[a.id] || [],
        candidateCount: (byAssessment[a.id] || []).length,
      })).filter(a => a.candidateCount > 0)

      setAssessments(enriched)
      setAllScores(scores.map(s => s.score))

      // Load existing EDI reports
      try {
        const { data: reports } = await supabase
          .from('edi_reports')
          .select('assessment_id, certificate_generated, certificate_generated_at')
          .eq('user_id', user.id)
          .eq('certificate_generated', true)
        const reportMap = {}
        for (const r of (reports || [])) reportMap[r.assessment_id] = r
        setEdiReports(reportMap)
      } catch {}

      setLoading(false)
    }
    load()
  }, [router])

  async function handleGenerateCertificate(assessmentId) {
    setGenerating(assessmentId)
    try {
      const res = await fetch(`/api/edi/certificate?assessment_id=${assessmentId}`)
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to generate certificate')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setEdiReports(prev => ({ ...prev, [assessmentId]: { certificate_generated: true, certificate_generated_at: new Date().toISOString() } }))
    } catch (err) {
      alert('Failed to generate certificate')
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar active="edi" companyName="" />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', ...cs, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        </main>
      </div>
    )
  }

  const totalAssessed = allScores.length
  const avgScore = totalAssessed > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / totalAssessed) : 0
  const passRate = totalAssessed > 0 ? Math.round((allScores.filter(s => s >= 65).length / totalAssessed) * 100) : 0
  const overallBuckets = bucketise(allScores)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar active="edi" companyName={profile?.company_name || ''} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px', fontFamily: F }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 6px' }}>Diversity and Inclusion Monitor</h1>
            <p style={{ fontSize: 13.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Monitor assessment fairness across your candidate pool. Generate Bias-Free Hiring Certificates for every assessment.
            </p>
          </div>

          {/* Disclaimer */}
          <div style={{ ...cs, borderLeft: `4px solid ${TEAL}`, marginBottom: 24, padding: '16px 22px' }}>
            <p style={{ fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.65 }}>
              PRODICTA assessments are based on real work performance not personality, appearance, or background. This monitor tracks score distributions to help you identify any unintended patterns in your hiring process. Statistical adverse impact analysis across protected characteristics becomes available when candidate self-report is enabled (see below).
            </p>
          </div>

          {/* Insufficient data gate */}
          {totalAssessed < 10 && (
            <div style={{ ...cs, borderLeft: `4px solid ${AMB}`, marginBottom: 24, padding: '16px 22px', background: AMBBG }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Ic name="info" size={16} color={AMB} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 4 }}>Not enough data yet</div>
                  <p style={{ fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.6 }}>
                    Collect assessments from at least 10 candidates to unlock statistical analysis. You currently have {totalAssessed}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Protected Characteristic Self-Report (in preparation) */}
          <div style={{ ...cs, marginBottom: 24, padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: TX, margin: 0 }}>Candidate self-report (protected characteristics)</h2>
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, background: BG, color: TX3, border: `1px solid ${BD}` }}>
                In preparation
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: TX2, margin: '0 0 12px', lineHeight: 1.6 }}>
              When enabled, candidates may optionally declare age band, gender, and ethnicity at the end of their assessment. Data is stored separately from their assessment responses and is never used for scoring. Once at least 10 candidates have self-reported in a given assessment, per-group pass rates and 4/5ths rule analysis become available here.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Age band', 'Gender', 'Ethnicity'].map(cat => (
                <span key={cat} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: BG, color: TX3, border: `1px solid ${BD}` }}>
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Overview Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Assessments Run', value: assessments.length },
              { label: 'Total Candidates', value: totalAssessed },
              { label: 'Average Score', value: avgScore },
              { label: 'Pass Rate (65+)', value: `${passRate}%` },
            ].map((s, i) => (
              <div key={i} style={{ ...cs, textAlign: 'center', padding: '18px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Score Distribution */}
          {totalAssessed > 0 && (
            <div style={{ ...cs, marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 14px' }}>Overall Score Distribution</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {BUCKETS.map(bucket => {
                  const count = overallBuckets[bucket]
                  const pct = totalAssessed > 0 ? Math.round((count / totalAssessed) * 100) : 0
                  return (
                    <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2, width: 50, flexShrink: 0 }}>{bucket}</span>
                      <div style={{ flex: 1, background: BG, borderRadius: 4, height: 20, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: TEAL, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, width: 60, textAlign: 'right', flexShrink: 0 }}>{count} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Assessment Breakdown */}
          <h2 style={{ fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 14px' }}>Assessment Breakdown</h2>
          {assessments.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '40px 20px', color: TX3, fontSize: 13.5 }}>
              No completed assessments yet. Scores will appear here once candidates complete their assessments.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              {assessments.map(a => {
                const buckets = bucketise(a.scores)
                const avg = Math.round(a.scores.reduce((x, y) => x + y, 0) / a.scores.length)
                const shape = distributionShape(buckets, a.scores.length)
                const checks = adverseChecks(a.scores)
                const hasCert = !!ediReports[a.id]
                const anyReview = checks.some(c => c.pass === false)
                const allResolvedChecksPassed = checks.length > 0 && checks.filter(c => c.pass !== null).every(c => c.pass === true)

                return (
                  <div key={a.id} style={{ ...cs }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: TX, margin: 0 }}>{a.role_title || 'Untitled'}</h3>
                          {hasCert && (
                            <span title="Bias-Free Certificate generated" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 50, background: GRNBG, border: `1px solid ${GRNBD}` }}>
                              <Ic name="shield" size={11} color={GRN} />
                              <span style={{ fontSize: 9, fontWeight: 800, color: GRN }}>Certified</span>
                            </span>
                          )}
                        </div>
 <div style={{ fontSize: 11.5, color: TX3, marginTop: 2 }}>{a.candidateCount} candidate{a.candidateCount !== 1 ? 's' : ''} assessed, Average: {avg}</div>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 50,
                        fontSize: 10, fontWeight: 800, fontFamily: F,
                        background: shape.ok ? GRNBG : AMBBG,
                        color: shape.ok ? GRN : AMB,
                        border: `1px solid ${shape.ok ? GRNBD : AMBBD}`,
                      }}>
                        {shape.label}
                      </span>
                    </div>

                    {/* Score bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                      {BUCKETS.map(bucket => {
                        const count = buckets[bucket]
                        const pct = a.scores.length > 0 ? Math.round((count / a.scores.length) * 100) : 0
                        const flagged = pct > 60
                        return (
                          <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: TX3, width: 44, flexShrink: 0 }}>{bucket}</span>
                            <div style={{ flex: 1, background: BG, borderRadius: 3, height: 16, overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.max(2, pct)}%`, height: '100%', borderRadius: 3,
                                background: flagged ? AMB : TEAL,
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: flagged ? AMB : TX3, width: 52, textAlign: 'right', flexShrink: 0 }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Adverse impact checks */}
                    {checks.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          Adverse Impact Checks
                          <InfoTooltip text="A statistical check for patterns that could indicate unintentional bias in assessment scoring. PRODICTA tests on work performance not personal characteristics." />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {checks.map((ck, i) => {
                            const isPending = ck.pass === null
                            const bg = isPending ? BG : (ck.pass ? GRNBG : AMBBG)
                            const fg = isPending ? TX3 : (ck.pass ? GRN : AMB)
                            const icon = isPending ? 'info' : (ck.pass ? 'check' : 'alert')
                            const status = isPending ? 'PENDING' : (ck.pass ? 'PASS' : 'REVIEW')
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                  background: bg,
                                }}>
                                  <Ic name={icon} size={12} color={fg} />
                                </span>
                                <span style={{ fontSize: 12, color: TX2 }}>
                                  {ck.label}
                                  {isPending && ck.pending && <span style={{ color: TX3, fontSize: 11, marginLeft: 6 }}>({ck.pending})</span>}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: fg, marginLeft: 'auto', flexShrink: 0 }}>
                                  {status}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Review warning */}
                    {anyReview && (
                      <div style={{ background: AMBBG, borderLeft: `4px solid ${AMB}`, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 14 }}>
                        <p style={{ fontSize: 12, color: TX2, margin: 0, lineHeight: 1.55 }}>
                          Consider reviewing this assessment with an employment law specialist before using scores as the primary hiring filter.
                        </p>
                      </div>
                    )}

                    {/* Generate Certificate, only when all resolved checks pass and count >= 10 */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {(() => {
                        const insufficientData = a.candidateCount < 10
                        const blocked = insufficientData || !allResolvedChecksPassed
                        const busy = generating === a.id
                        const disabled = blocked || busy
                        const label = busy
                          ? 'Generating...'
                          : insufficientData
                          ? 'Requires 10+ candidates'
                          : !allResolvedChecksPassed
                          ? 'Resolve review items to unlock'
                          : hasCert
                          ? 'Regenerate Certificate'
                          : 'Generate Certificate'
                        return (
                          <button
                            onClick={() => handleGenerateCertificate(a.id)}
                            disabled={disabled}
                            style={{
                              padding: '8px 18px', borderRadius: 8, border: 'none',
                              background: disabled ? BD : TEAL,
                              color: disabled ? TX3 : NAVY,
                              fontFamily: F, fontSize: 12.5, fontWeight: 700,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <Ic name="shield" size={14} color={disabled ? TX3 : NAVY} />
                            {label}
                          </button>
                        )
                      })()}
                      <InfoTooltip text="A downloadable certificate confirming this assessment met fairness criteria under the Equality Act 2010 and ERA 2025. Generated only when all non-pending checks pass and the assessment has at least 10 candidates." />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
