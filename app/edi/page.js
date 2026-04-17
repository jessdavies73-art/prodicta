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
  if (scores.length < 3) return []
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min
  const buckets = bucketise(scores)
  const maxBucketPct = Math.max(...Object.values(buckets)) / scores.length
  return [
    { label: 'Score range is broad (candidates are differentiated)', pass: range >= 20 },
    { label: 'Lowest scoring group has meaningful scores (above 30)', pass: min >= 30 },
    { label: 'No cliff edge (no bucket exceeds 60% of candidates)', pass: maxBucketPct <= 0.6 },
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
              PRODICTA assessments are based on real work performance not personality, appearance, or background. This monitor tracks score distributions to help you identify any unintended patterns in your hiring process. It does not collect or store demographic data. Assessment fairness is monitored at the aggregate level only.
            </p>
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
                const anyReview = checks.some(c => !c.pass)

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
                        <div style={{ fontSize: 11.5, color: TX3, marginTop: 2 }}>{a.candidateCount} candidate{a.candidateCount !== 1 ? 's' : ''} assessed — Average: {avg}</div>
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
                          {checks.map((ck, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: ck.pass ? GRNBG : AMBBG,
                              }}>
                                <Ic name={ck.pass ? 'check' : 'alert'} size={12} color={ck.pass ? GRN : AMB} />
                              </span>
                              <span style={{ fontSize: 12, color: TX2 }}>{ck.label}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: ck.pass ? GRN : AMB, marginLeft: 'auto', flexShrink: 0 }}>
                                {ck.pass ? 'PASS' : 'REVIEW'}
                              </span>
                            </div>
                          ))}
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

                    {/* Generate Certificate */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => handleGenerateCertificate(a.id)}
                        disabled={a.candidateCount < 3 || generating === a.id}
                        style={{
                          padding: '8px 18px', borderRadius: 8, border: 'none',
                          background: (a.candidateCount < 3 || generating === a.id) ? BD : TEAL,
                          color: (a.candidateCount < 3 || generating === a.id) ? TX3 : NAVY,
                          fontFamily: F, fontSize: 12.5, fontWeight: 700,
                          cursor: (a.candidateCount < 3 || generating === a.id) ? 'not-allowed' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Ic name="shield" size={14} color={(a.candidateCount < 3 || generating === a.id) ? TX3 : NAVY} />
                        {generating === a.id ? 'Generating...' : hasCert ? 'Regenerate Certificate' : a.candidateCount < 3 ? 'Requires 3+ candidates' : 'Generate Certificate'}
                      </button>
                      <InfoTooltip text="A downloadable certificate confirming this assessment met fairness criteria under the Equality Act 2010 and ERA 2025." />
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
