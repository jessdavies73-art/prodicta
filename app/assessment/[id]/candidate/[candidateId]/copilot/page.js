'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#00897B'
const TEALLT = '#e6f7f4'
const BG = '#f7f9fb'
const CARD = '#ffffff'
const BD = '#e4e9f0'
const TX = '#1a202c'
const TX2 = '#4a5568'
const TX3 = '#94a1b3'
const GRN = '#16a34a'
const GRNBG = '#f0fdf4'
const AMB = '#f59e0b'
const AMBBG = '#fffbeb'
const RED = '#dc2626'
const REDBG = '#fef2f2'
const REDBD = '#fecaca'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const PHASES = [
  { key: 'week1', label: 'Week 1' },
  { key: 'month1', label: 'Month 1' },
  { key: 'month3', label: 'Month 3' },
]

function lightColor(s) {
  if (s === 'red') return RED
  if (s === 'amber') return AMB
  if (s === 'green') return GRN
  return TX3
}
function lightBg(s) {
  if (s === 'red') return REDBG
  if (s === 'amber') return AMBBG
  if (s === 'green') return GRNBG
  return BG
}

export default function ProbationCopilotPage({ params }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState(null)
  const [results, setResults] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)

  const [watchoutStatuses, setWatchoutStatuses] = useState({})
  const [predictionResponses, setPredictionResponses] = useState({})
  const [managerNotes, setManagerNotes] = useState({})
  const [savedAt, setSavedAt] = useState(null)
  const [savingFlag, setSavingFlag] = useState(false)

  // Redline Alerts
  const [redlineStatus, setRedlineStatus] = useState(null) // { deviation_status, reason, deviating_dimension, assessment_prediction, actual_signal, urgency }
  const [redlineLoading, setRedlineLoading] = useState(false)
  const [interventionPlan, setInterventionPlan] = useState(null)
  const [interventionLoading, setInterventionLoading] = useState(false)
  const [interventionCopied, setInterventionCopied] = useState(false)

  // Probation Review Generator
  const [reviewMilestone, setReviewMilestone] = useState('month1')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewResult, setReviewResult] = useState(null)
  const [reviewError, setReviewError] = useState(null)
  const [reviewCopied, setReviewCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) { router.push('/login'); return }
        setUser(u)
        const [{ data: cand }, { data: res }, { data: prof }, { data: out }, { data: cop }] = await Promise.all([
          supabase.from('candidates').select('*, assessments(role_title)').eq('id', params.candidateId).single(),
          supabase.from('results').select('overall_score, risk_level, hiring_confidence, watchouts, reality_timeline, predictions').eq('candidate_id', params.candidateId).maybeSingle(),
          supabase.from('users').select('company_name, account_type').eq('id', u.id).maybeSingle(),
          supabase.from('candidate_outcomes').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
          supabase.from('probation_copilot').select('*').eq('candidate_id', params.candidateId).eq('user_id', u.id).maybeSingle(),
        ])
        setCandidate(cand)
        setResults(res)
        setProfile(prof)
        setOutcome(out)
        if (cop) {
          setWatchoutStatuses(cop.watchout_statuses || {})
          setPredictionResponses(cop.prediction_responses || {})
          setManagerNotes(cop.manager_notes || {})
          setSavedAt(cop.last_updated)
        }

        // Run redline deviation analysis if we have check-in data
        if (cop && (Object.keys(cop.watchout_statuses || {}).length > 0 || Object.values(cop.manager_notes || {}).some(n => n && n.trim()))) {
          try {
            const rlRes = await fetch(`/api/candidates/${params.candidateId}/redline`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'analyse' }),
            })
            if (rlRes.ok) {
              const rlData = await rlRes.json()
              setRedlineStatus(rlData)
            }
          } catch {}
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.candidateId, router])

  // Timeline progress
  const timeline = useMemo(() => {
    if (!outcome?.placement_date) return null
    const start = new Date(outcome.placement_date)
    const months = outcome.probation_months || 6
    const totalDays = Math.round(months * 30.44)
    const elapsed = Math.max(0, Math.round((Date.now() - start.getTime()) / 86400000))
    const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
    return { start, months, totalDays, elapsed, pct }
  }, [outcome])

  const watchouts = Array.isArray(results?.watchouts) ? results.watchouts : []
  const realityTimeline = results?.reality_timeline || null
  const predictionItems = useMemo(() => {
    const items = []
    if (realityTimeline?.week1) items.push({ key: 'week1', label: 'Week 1 prediction', text: realityTimeline.week1 })
    if (realityTimeline?.month1) items.push({ key: 'month1', label: 'Month 1 prediction', text: realityTimeline.month1 })
    if (realityTimeline?.month3) items.push({ key: 'month3', label: 'Month 3 prediction', text: realityTimeline.month3 })
    return items
  }, [realityTimeline])

  const summary = useMemo(() => {
    const totalPreds = predictionItems.length
    const confirmed = Object.values(predictionResponses).filter(v => v === 'yes' || v === 'partially').length
    const materialised = Object.values(watchoutStatuses).filter(v => v === 'red').length
    const concerns = Object.values(watchoutStatuses).filter(v => v === 'amber').length
    let status = 'On Track'
    if (materialised >= 2) status = 'Critical'
    else if (materialised === 1 || concerns >= 2) status = 'At Risk'
    return { totalPreds, confirmed, materialised, concerns, status }
  }, [predictionItems, predictionResponses, watchoutStatuses])

  async function save() {
    if (!user) return
    setSavingFlag(true)
    try {
      const supabase = createClient()
      const payload = {
        candidate_id: params.candidateId,
        user_id: user.id,
        watchout_statuses: watchoutStatuses,
        prediction_responses: predictionResponses,
        manager_notes: managerNotes,
        overall_status: summary.status,
        last_updated: new Date().toISOString(),
      }
      await supabase.from('probation_copilot').upsert(payload, { onConflict: 'candidate_id,user_id' })
      setSavedAt(payload.last_updated)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingFlag(false)
    }
  }

  async function generateReview() {
    setReviewLoading(true)
    setReviewError(null)
    setReviewResult(null)
    setReviewCopied(false)
    try {
      const res = await fetch('/api/probation-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: params.candidateId,
          review_month: reviewMilestone,
          predictions_checked: predictionResponses,
          manager_notes: managerNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate review')
      setReviewResult(data.review)
    } catch (e) {
      setReviewError(e.message)
    } finally {
      setReviewLoading(false)
    }
  }

  async function generateInterventionPlan() {
    setInterventionLoading(true)
    setInterventionCopied(false)
    try {
      const res = await fetch(`/api/candidates/${params.candidateId}/redline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'intervene', deviation_reason: redlineStatus?.reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInterventionPlan(data.plan)
    } catch (e) {
      console.error(e)
    } finally {
      setInterventionLoading(false)
    }
  }

  function setLight(idx, val) {
    setWatchoutStatuses(prev => ({ ...prev, [idx]: val }))
  }
  function setPred(key, val) {
    setPredictionResponses(prev => ({ ...prev, [key]: val }))
  }
  function setNote(key, val) {
    setManagerNotes(prev => ({ ...prev, [key]: val }))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
        <Sidebar active="dashboard" companyName={profile?.company_name} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : 40, color: TX3 }}>Loading...</main>
      </div>
    )
  }

  if (!outcome) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
        <Sidebar active="dashboard" companyName={profile?.company_name} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : 40 }}>
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: 32, maxWidth: 600 }}>
            <h2 style={{ margin: '0 0 10px', color: NAVY }}>No outcome logged</h2>
            <p style={{ color: TX2, margin: 0 }}>Log a hire outcome on this candidate before opening the Probation Co-pilot.</p>
          </div>
        </main>
      </div>
    )
  }

  const statusColor = summary.status === 'Critical' ? RED : summary.status === 'At Risk' ? AMB : GRN
  const statusBg = summary.status === 'Critical' ? REDBG : summary.status === 'At Risk' ? AMBBG : GRNBG
  const tlColor = !timeline ? TX3 : summary.status === 'Critical' ? RED : summary.status === 'At Risk' ? AMB : GRN

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Sidebar active="dashboard" companyName={profile?.company_name} />
      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '32px 40px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <button
              onClick={() => router.push(`/assessment/${params.id}/candidate/${params.candidateId}`)}
              style={{ background: 'none', border: 'none', color: TEALD, fontSize: 12.5, fontWeight: 700, padding: 0, cursor: 'pointer', marginBottom: 8 }}
            >
              ← Back to report
            </button>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.4px' }}>Probation Co-pilot</h1>
            <p style={{ margin: '4px 0 0', color: TX3, fontSize: 13.5 }}>{candidate?.name} &middot; {candidate?.assessments?.role_title}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={save}
              disabled={savingFlag}
              style={{
                background: TEAL, color: NAVY, border: 'none', borderRadius: 8,
                padding: '10px 18px', fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {savingFlag ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={() => window.open(`/api/probation-copilot/${params.candidateId}/export`, '_blank')}
              style={{
                background: '#fff', color: TEALD, border: `1.5px solid ${TEAL}55`, borderRadius: 8,
                padding: '10px 18px', fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Export Probation Report
            </button>
          </div>
        </div>

        {/* Redline Alert Banner */}
        {redlineStatus && redlineStatus.deviation_status === 'REDLINE' && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: `1.5px solid #fecaca`,
            borderLeft: `5px solid ${RED}`, borderRadius: '0 12px 12px 0',
            padding: isMobile ? '16px 18px' : '20px 24px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name="alert" size={16} color="#fff" />
              </div>
              <span style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: RED }}>Redline Alert</span>
              {redlineStatus.urgency === 'immediate' && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: RED, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>Immediate</span>
              )}
            </div>
            <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: '0 0 6px' }}>
              {redlineStatus.deviating_dimension && (
                <><strong>{redlineStatus.deviating_dimension}</strong>{' '}</>
              )}
              {redlineStatus.assessment_prediction && (
                <>scored at assessment as: {redlineStatus.assessment_prediction}. </>
              )}
              {redlineStatus.actual_signal && (
                <>Check-ins now showing: {redlineStatus.actual_signal}. </>
              )}
            </p>
            <p style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55, margin: '0 0 14px' }}>
              {redlineStatus.reason}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={generateInterventionPlan}
                disabled={interventionLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: interventionLoading ? BD : RED, color: interventionLoading ? TX3 : '#fff',
                  fontFamily: F, fontSize: 13, fontWeight: 700, cursor: interventionLoading ? 'wait' : 'pointer',
                }}
              >
                {interventionLoading ? 'Generating...' : 'Generate Intervention Plan'}
              </button>
            </div>

            {/* Intervention Plan Display */}
            {interventionPlan && (
              <div style={{ marginTop: 16, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Intervention Plan</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const text = [
                          `INTERVENTION PLAN: ${candidate?.name}`,
                          `Role: ${candidate?.assessments?.role_title}`,
                          '',
                          'DIAGNOSIS',
                          interventionPlan.diagnosis,
                          '',
                          'WEEK 1 ACTIONS',
                          ...interventionPlan.week1_actions.map((a, i) => `${i + 1}. ${a}`),
                          '',
                          'WEEK 2 ACTIONS',
                          ...interventionPlan.week2_actions.map((a, i) => `${i + 1}. ${a}`),
                          '',
                          'MONITORING',
                          interventionPlan.monitoring,
                          '',
                          `RECOMMENDATION: ${(interventionPlan.recommendation || '').replace(/_/g, ' ')}`,
                          interventionPlan.recommendation_reason,
                        ].join('\n')
                        navigator.clipboard.writeText(text)
                        setInterventionCopied(true)
                        setTimeout(() => setInterventionCopied(false), 2000)
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                        background: interventionCopied ? GRNBG : '#fff', color: interventionCopied ? GRN : TX2,
                        fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {interventionCopied ? 'Copied' : 'Copy plan'}
                    </button>
                    <button
                      onClick={() => {
                        const subject = encodeURIComponent(`Intervention Plan: ${candidate?.name} - ${candidate?.assessments?.role_title}`)
                        const body = encodeURIComponent([
                          `Intervention Plan: ${candidate?.name}`,
                          `Role: ${candidate?.assessments?.role_title}`,
                          '',
                          'Diagnosis:',
                          interventionPlan.diagnosis,
                          '',
                          'Week 1 Actions:',
                          ...interventionPlan.week1_actions.map((a, i) => `${i + 1}. ${a}`),
                          '',
                          'Week 2 Actions:',
                          ...interventionPlan.week2_actions.map((a, i) => `${i + 1}. ${a}`),
                          '',
                          'Monitoring:',
                          interventionPlan.monitoring,
                          '',
                          `Recommendation: ${(interventionPlan.recommendation || '').replace(/_/g, ' ')}`,
                          interventionPlan.recommendation_reason,
                        ].join('\n'))
                        window.open(`mailto:?subject=${subject}&body=${body}`)
                      }}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                        background: '#fff', color: TX2,
                        fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Email to HR
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Diagnosis</div>
                  <p style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.65, margin: 0 }}>{interventionPlan.diagnosis}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Week 1 Actions</div>
                    {interventionPlan.week1_actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: RED, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.55 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Week 2 Actions</div>
                    {interventionPlan.week2_actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: AMB, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.55 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Monitoring</div>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.6, margin: 0 }}>{interventionPlan.monitoring}</p>
                </div>

                <div style={{
                  background: interventionPlan.recommendation === 'managed_exit' ? REDBG : interventionPlan.recommendation === 'extend_probation' ? AMBBG : TEALLT,
                  border: `1px solid ${interventionPlan.recommendation === 'managed_exit' ? '#fecaca' : interventionPlan.recommendation === 'extend_probation' ? AMBBD : `${TEAL}55`}`,
                  borderRadius: 8, padding: '12px 16px',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
                    color: interventionPlan.recommendation === 'managed_exit' ? RED : interventionPlan.recommendation === 'extend_probation' ? AMB : TEALD,
                  }}>
                    Recommendation: {(interventionPlan.recommendation || '').replace(/_/g, ' ')}
                  </div>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.55 }}>{interventionPlan.recommendation_reason}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Watch Status Banner */}
        {redlineStatus && redlineStatus.deviation_status === 'WATCH' && (
          <div style={{
            background: AMBBG, border: `1.5px solid ${AMBBD}`,
            borderLeft: `5px solid ${AMB}`, borderRadius: '0 12px 12px 0',
            padding: '14px 20px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ic name="alert" size={14} color={AMB} />
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: AMB }}>Watch</span>
            </div>
            <p style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.55, margin: 0 }}>{redlineStatus.reason}</p>
          </div>
        )}

        {/* On Track Indicator */}
        {redlineStatus && redlineStatus.deviation_status === 'ON_TRACK' && redlineStatus.reason !== 'Insufficient data for analysis.' && redlineStatus.reason !== 'No check-in data recorded yet.' && (
          <div style={{
            background: GRNBG, border: `1px solid ${GRN}55`,
            borderLeft: `5px solid ${GRN}`, borderRadius: '0 12px 12px 0',
            padding: '12px 18px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ic name="check" size={14} color={GRN} />
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: GRN }}>On track — performing as predicted</span>
            </div>
          </div>
        )}

        {/* Timeline bar */}
        {timeline && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Probation timeline</div>
              <div style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: tlColor }}>
                Day {timeline.elapsed} of {timeline.totalDays} ({timeline.pct}%)
              </div>
            </div>
            <div style={{ position: 'relative', height: 12, background: '#e4e9f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${timeline.pct}%`, background: tlColor, borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: TX3 }}>
              Started {new Date(timeline.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &middot; {timeline.months}-month probation
            </div>
          </div>
        )}

        {/* Summary */}
        <div style={{ background: statusBg, border: `1px solid ${statusColor}55`, borderLeft: `5px solid ${statusColor}`, borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Overall probation status
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: statusColor, marginBottom: 8 }}>{summary.status}</div>
          <div style={{ fontSize: 13.5, color: TX, lineHeight: 1.65 }}>
            <strong>{summary.confirmed} of {summary.totalPreds}</strong> PRODICTA predictions confirmed.{' '}
            <strong>{summary.materialised}</strong> watch-out{summary.materialised === 1 ? '' : 's'} materialised, {summary.concerns} showing early signs.
          </div>
        </div>

        {/* Predictions */}
        {predictionItems.length > 0 && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: NAVY }}>Reality timeline predictions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {predictionItems.map(item => {
                const v = predictionResponses[item.key]
                return (
                  <div key={item.key} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{item.label}</div>
                    <p style={{ fontSize: 13.5, color: TX, lineHeight: 1.65, margin: '0 0 12px' }}>{item.text}</p>
                    <div style={{ fontSize: 11, color: TX3, marginBottom: 6 }}>Has this materialised?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { val: 'yes', label: 'Yes', color: GRN },
                        { val: 'partially', label: 'Partially', color: AMB },
                        { val: 'no', label: 'No', color: TX3 },
                        { val: 'not_yet', label: 'Not yet', color: TX3 },
                      ].map(opt => {
                        const selected = v === opt.val
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setPred(item.key, opt.val)}
                            style={{
                              padding: '6px 12px', borderRadius: 18, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                              background: selected ? opt.color : '#fff',
                              color: selected ? '#fff' : opt.color,
                              border: `1.5px solid ${opt.color}`,
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Watch-outs */}
        {watchouts.length > 0 && (
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: NAVY }}>Watch-outs from the original report</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {watchouts.map((w, i) => {
                const status = watchoutStatuses[i] || null
                const text = typeof w === 'object' ? (w.text || w.title || '') : w
                const ifIgnored = typeof w === 'object' ? w.if_ignored : null
                const action = typeof w === 'object' ? w.action : null
                const c = lightColor(status)
                return (
                  <div key={i} style={{ background: lightBg(status), border: `1px solid ${status ? c + '55' : BD}`, borderLeft: `5px solid ${c}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: TX, lineHeight: 1.55, marginBottom: 6 }}>{text}</div>
                    {ifIgnored && (
                      <div style={{ fontSize: 12.5, color: TX2, marginBottom: 8, lineHeight: 1.55 }}>
                        <strong>If unmanaged:</strong> {ifIgnored}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {[
                        { val: 'green', label: 'No issues', color: GRN },
                        { val: 'amber', label: 'Early signs', color: AMB },
                        { val: 'red', label: 'Materialised', color: RED },
                      ].map(opt => {
                        const selected = status === opt.val
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setLight(i, opt.val)}
                            style={{
                              padding: '6px 12px', borderRadius: 18, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                              background: selected ? opt.color : '#fff',
                              color: selected ? '#fff' : opt.color,
                              border: `1.5px solid ${opt.color}`,
                            }}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                    {(status === 'amber' || status === 'red') && action && (
                      <div style={{ marginTop: 8, padding: '10px 12px', background: '#fff', border: `1px solid ${BD}`, borderRadius: 8, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>
                        <strong style={{ color: TEALD }}>Suggested intervention:</strong> {action}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Manager notes per phase */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: NAVY }}>Manager notes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PHASES.map(phase => (
              <div key={phase.key}>
                <div style={{ fontSize: 11, fontWeight: 800, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{phase.label}</div>
                <textarea
                  rows={3}
                  value={managerNotes[phase.key] || ''}
                  onChange={e => setNote(phase.key, e.target.value)}
                  placeholder={`Observations for ${phase.label.toLowerCase()}...`}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 14px', borderRadius: 8, border: `1px solid ${BD}`,
                    fontFamily: F, fontSize: 13.5, color: TX, background: BG, outline: 'none', resize: 'vertical',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Probation Review Generator */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: NAVY }}>Probation Review Generator</h2>
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 16px', lineHeight: 1.55 }}>
            Generate a structured probation review document based on the co-pilot data collected so far.
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Milestone</div>
            {[
              { key: 'month1', label: '1 month' },
              { key: 'month3', label: '3 month' },
              { key: 'month6', label: '6 month' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setReviewMilestone(m.key)}
                style={{
                  padding: '6px 14px', borderRadius: 7, fontFamily: F, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  background: reviewMilestone === m.key ? TEALLT : BG,
                  border: `1.5px solid ${reviewMilestone === m.key ? TEAL : BD}`,
                  color: reviewMilestone === m.key ? TEALD : TX2,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={generateReview}
            disabled={reviewLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: reviewLoading ? BD : TEAL, color: reviewLoading ? TX3 : NAVY,
              fontFamily: F, fontSize: 13.5, fontWeight: 700,
              cursor: reviewLoading ? 'wait' : 'pointer',
            }}
          >
            {reviewLoading ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: NAVY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Generating...
              </>
            ) : 'Generate Probation Review'}
          </button>

          {reviewError && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 8, fontFamily: F, fontSize: 13, color: RED }}>
              {reviewError}
            </div>
          )}

          {reviewResult && (
            <div style={{ marginTop: 16, background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Generated review — {reviewMilestone === 'month1' ? '1 month' : reviewMilestone === 'month3' ? '3 month' : '6 month'}
                </div>
                <button
                  onClick={() => {
                    const text = JSON.stringify(reviewResult, null, 2)
                    navigator.clipboard.writeText(text)
                    setReviewCopied(true)
                    setTimeout(() => setReviewCopied(false), 2000)
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                    background: reviewCopied ? GRNBG : '#fff', color: reviewCopied ? GRN : TX2,
                    fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {reviewCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre style={{
                fontFamily: FM, fontSize: 12.5, color: TX, lineHeight: 1.65,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
              }}>
                {typeof reviewResult === 'string' ? reviewResult : JSON.stringify(reviewResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {savedAt && (
          <div style={{ fontSize: 11.5, color: TX3, textAlign: 'right', marginTop: 6 }}>
            Last saved {new Date(savedAt).toLocaleString('en-GB')}
          </div>
        )}
      </main>
    </div>
  )
}
