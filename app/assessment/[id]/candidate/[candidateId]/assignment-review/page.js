'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'

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
const AMB = '#D97706'
const AMBBG = '#fffbeb'
const DRED = '#B91C1C'
const DREDBG = '#fef2f2'
const GRN = '#00BFA5'
const GRNBG = '#E6F7F5'
const F = "'Outfit', system-ui, sans-serif"

const RATINGS = ['Exceeding Expectations', 'Meeting Expectations', 'Below Expectations', 'Concern Raised']
const MILESTONES = [
  { key: 'week1', label: 'Week 1 Check-in', days: 7 },
  { key: 'week4', label: 'Week 4 Review', days: 28 },
  { key: 'week8', label: 'Week 8 Review', days: 56 },
]
const RECOMMENDATIONS = ['Extend Assignment', 'End as Planned', 'End Early', 'Convert to Permanent']

function fmtDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

function healthFromReviews(rec) {
  const ratings = [rec.week1_rating, rec.week4_rating, rec.week8_rating].filter(Boolean)
  if (ratings.length === 0) return 'green'
  if (ratings.includes('Concern Raised')) return 'red'
  if (ratings.includes('Below Expectations')) return 'amber'
  return 'green'
}

function healthColor(h) { return h === 'red' ? DRED : h === 'amber' ? AMB : GRN }
function healthBg(h) { return h === 'red' ? DREDBG : h === 'amber' ? AMBBG : GRNBG }
function healthLabel(h) { return h === 'red' ? 'Critical' : h === 'amber' ? 'At Risk' : 'On Track' }

export default function AssignmentReviewPage({ params }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  // Setup form (shown when no record exists)
  const [setupClient, setSetupClient] = useState('')
  const [setupStart, setSetupStart] = useState('')
  const [setupEnd, setSetupEnd] = useState('')

  // Review form
  const [activeReview, setActiveReview] = useState(null) // 'week1' | 'week4' | 'week8'
  const [reviewDate, setReviewDate] = useState('')
  const [reviewRating, setReviewRating] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewClientFeedback, setReviewClientFeedback] = useState('')

  // Client feedback
  const [clientFeedback, setClientFeedback] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)

  // Summary
  const [recommendation, setRecommendation] = useState('')

  // Alerts
  const [alerts, setAlerts] = useState([])
  const [latestAlert, setLatestAlert] = useState(null)
  const [resolvingAlert, setResolvingAlert] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('company_name, account_type').eq('id', user.id).single()
      setProfile(prof)

      const { data: cand } = await supabase.from('candidates').select('*, assessments(role_title, employment_type)').eq('id', params.candidateId).single()
      setCandidate(cand)

      const { data: existing } = await supabase
        .from('assignment_reviews')
        .select('*')
        .eq('candidate_id', params.candidateId)
        .eq('assessment_id', params.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (existing) {
        setRecord(existing)
        setClientFeedback(existing.client_feedback || '')
      }

      // Load existing alerts
      const { data: existingAlerts } = await supabase
        .from('assignment_alerts')
        .select('*')
        .eq('candidate_id', params.candidateId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (existingAlerts && existingAlerts.length > 0) {
        setAlerts(existingAlerts)
        const unresolved = existingAlerts.find(a => !a.resolved)
        if (unresolved) setLatestAlert(unresolved)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleCreateRecord() {
    if (!setupClient || !setupStart) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newRec } = await supabase.from('assignment_reviews').insert({
        user_id: user.id,
        candidate_id: params.candidateId,
        assessment_id: params.id,
        worker_name: candidate?.name || '',
        role_title: candidate?.assessments?.role_title || '',
        client_company: setupClient,
        assignment_start_date: setupStart,
        assignment_end_date: setupEnd || null,
      }).select('*').single()
      if (newRec) setRecord(newRec)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleSaveReview() {
    if (!activeReview || !reviewDate || !reviewRating) return
    setSaving(true)
    try {
      const supabase = createClient()
      const updates = {
        [`${activeReview}_review_done`]: true,
        [`${activeReview}_review_date`]: reviewDate,
        [`${activeReview}_notes`]: reviewNotes || null,
        [`${activeReview}_rating`]: reviewRating,
        updated_at: new Date().toISOString(),
      }
      // Compute health after this update
      const updatedRec = { ...record, ...updates }
      const health = healthFromReviews(updatedRec)
      updates.placement_health = health
      updates.overall_status = health === 'red' ? 'critical' : health === 'amber' ? 'at_risk' : 'on_track'

      const { data: saved } = await supabase.from('assignment_reviews').update(updates).eq('id', record.id).select('*').single()
      if (saved) setRecord(saved)
      setActiveReview(null)
      setReviewDate(''); setReviewRating(''); setReviewNotes(''); setReviewClientFeedback('')

      // Run alert detection after saving review
      try {
        const alertRes = await fetch(`/api/assignment-alerts/${params.candidateId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'detect' }),
        })
        if (alertRes.ok) {
          const alertData = await alertRes.json()
          if (alertData.deviation_status === 'REDLINE' || alertData.deviation_status === 'WATCH') {
            const newAlert = {
              id: alertData.alert_id,
              deviation_severity: alertData.deviation_status,
              alert_type: alertData.alert_type,
              intervention_plan: JSON.stringify(alertData),
              resolved: false,
            }
            setAlerts(prev => [newAlert, ...prev])
            setLatestAlert(newAlert)
          }
        }
      } catch {}
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  async function handleSaveFeedback() {
    if (!record) return
    setSavingFeedback(true)
    try {
      const supabase = createClient()
      const { data: saved } = await supabase.from('assignment_reviews').update({
        client_feedback: clientFeedback,
        updated_at: new Date().toISOString(),
      }).eq('id', record.id).select('*').single()
      if (saved) setRecord(saved)
    } catch (err) { console.error(err) }
    finally { setSavingFeedback(false) }
  }

  const inputStyle = (field) => ({
    fontFamily: F, fontSize: 14, width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1.5px solid ${focusedField === field ? TEAL : BD}`, background: CARD, color: TX,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  })
  const labelStyle = { fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 6, display: 'block' }
  const cs = { background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: '22px 26px' }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar companyName={profile?.company_name || ''} />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', ...cs, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        </main>
      </div>
    )
  }

  const allDone = record?.week1_review_done && record?.week4_review_done && record?.week8_review_done
  const health = record ? healthFromReviews(record) : 'green'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar companyName={profile?.company_name || ''} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: `1px solid ${BD}`, background: CARD, cursor: 'pointer', flexShrink: 0 }}>
              <Ic name="left" size={18} color={TX2} />
            </button>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>Assignment Review Tracker</h1>
              {candidate && (
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '4px 0 0' }}>
                  {candidate.name} — {candidate.assessments?.role_title || 'Worker'}
                </p>
              )}
            </div>
          </div>

          {/* Setup form if no record */}
          {!record && (
            <div style={{ ...cs, marginBottom: 24 }}>
              <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: TX, margin: '0 0 16px' }}>Set Up Assignment</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Client company</label>
                  <input type="text" value={setupClient} onChange={e => setSetupClient(e.target.value)}
                    onFocus={() => setFocusedField('sc')} onBlur={() => setFocusedField(null)}
                    placeholder="Client name" style={inputStyle('sc')} />
                </div>
                <div>
                  <label style={labelStyle}>Assignment start date</label>
                  <input type="date" value={setupStart} onChange={e => setSetupStart(e.target.value)}
                    onFocus={() => setFocusedField('ss')} onBlur={() => setFocusedField(null)} style={inputStyle('ss')} />
                </div>
              </div>
              <div style={{ marginBottom: 16, maxWidth: isMobile ? '100%' : 'calc(50% - 7px)' }}>
                <label style={labelStyle}>Assignment end date (optional)</label>
                <input type="date" value={setupEnd} onChange={e => setSetupEnd(e.target.value)}
                  onFocus={() => setFocusedField('se')} onBlur={() => setFocusedField(null)} style={inputStyle('se')} />
              </div>
              <button onClick={handleCreateRecord} disabled={!setupClient || !setupStart || saving}
                style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: (!setupClient || !setupStart || saving) ? BD : TEAL, color: (!setupClient || !setupStart || saving) ? TX3 : NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: (!setupClient || !setupStart || saving) ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creating...' : 'Create Assignment Record'}
              </button>
            </div>
          )}

          {/* Assignment details */}
          {record && (
            <>
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: TX, margin: 0 }}>Assignment Details</h2>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, fontFamily: F,
                    background: healthBg(health), color: healthColor(health),
                  }}>
                    {healthLabel(health)}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Client', value: record.client_company },
                    { label: 'Start', value: fmtDate(record.assignment_start_date) },
                    { label: 'End', value: fmtDate(record.assignment_end_date) },
                    { label: 'Health', value: healthLabel(health), color: healthColor(health) },
                  ].map((s, i) => (
                    <div key={i} style={{ background: BG, borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: s.color || TX }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alert banner */}
              {latestAlert && !latestAlert.resolved && (() => {
                const isRedline = latestAlert.deviation_severity === 'REDLINE'
                const alertColor = isRedline ? DRED : AMB
                const alertBg = isRedline ? DREDBG : AMBBG
                let plan = null
                try { plan = typeof latestAlert.intervention_plan === 'string' ? JSON.parse(latestAlert.intervention_plan) : latestAlert.intervention_plan } catch {}

                return (
                  <div style={{ marginBottom: 20 }}>
                    {/* Banner */}
                    <div style={{
                      background: alertBg, borderLeft: `4px solid ${alertColor}`, borderRadius: '0 10px 10px 0',
                      padding: '14px 18px', marginBottom: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Ic name="alert" size={16} color={alertColor} />
                        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: alertColor }}>
                          Assignment Performance Alert
                        </span>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 800, fontFamily: F,
                          background: alertColor, color: '#fff',
                        }}>
                          {isRedline ? 'REDLINE' : 'WATCH'}
                        </span>
                      </div>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.55 }}>
                        This placement is deviating from the assessment prediction. {isRedline ? 'Immediate action required.' : 'Monitor closely and consider early intervention.'}
                      </p>
                    </div>

                    {/* Intervention plan */}
                    {plan && (
                      <div style={{ ...cs, padding: '18px 22px', marginBottom: 12, borderTop: `3px solid ${alertColor}` }}>
                        <h3 style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY, margin: '0 0 10px' }}>Intervention Plan</h3>
                        {plan.intervention_plan && (
                          <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 14px', lineHeight: 1.6 }}>{plan.intervention_plan}</p>
                        )}
                        {plan.client_actions && plan.client_actions.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Actions with client</div>
                            {plan.client_actions.map((a, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                <Ic name="check" size={13} color={TEAL} />
                                <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.5 }}>{a}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {plan.worker_actions && plan.worker_actions.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Actions with worker</div>
                            {plan.worker_actions.map((a, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                <Ic name="check" size={13} color={TEAL} />
                                <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.5 }}>{a}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {plan.risk_summary && (
                          <div style={{ background: BG, borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                            <span style={{ fontFamily: F, fontSize: 12.5, color: plan.assignment_at_risk ? DRED : TX2, fontWeight: 600 }}>{plan.risk_summary}</span>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            setResolvingAlert(true)
                            try {
                              await fetch(`/api/assignment-alerts/${params.candidateId}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'resolve', alert_id: latestAlert.id }),
                              })
                              setLatestAlert(null)
                              setAlerts(prev => prev.map(a => a.id === latestAlert.id ? { ...a, resolved: true } : a))
                            } catch {}
                            finally { setResolvingAlert(false) }
                          }}
                          disabled={resolvingAlert}
                          style={{
                            padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${BD}`, background: CARD,
                            fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, cursor: resolvingAlert ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {resolvingAlert ? 'Resolving...' : 'Resolve Alert'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Review milestones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {MILESTONES.map(m => {
                  const done = record[`${m.key}_review_done`]
                  const reviewDateVal = record[`${m.key}_review_date`]
                  const rating = record[`${m.key}_rating`]
                  const notes = record[`${m.key}_notes`]
                  const startDate = record.assignment_start_date ? new Date(record.assignment_start_date + 'T00:00:00') : null
                  const scheduledDate = startDate ? new Date(startDate.getTime() + m.days * 86400000) : null
                  const isOverdue = scheduledDate && !done && new Date() > scheduledDate
                  const isActive = activeReview === m.key
                  const ratingColor = rating === 'Concern Raised' ? DRED : rating === 'Below Expectations' ? AMB : rating === 'Exceeding Expectations' ? TEAL : GRN

                  return (
                    <div key={m.key} style={{
                      ...cs, padding: '18px 22px',
                      borderLeft: `4px solid ${done ? GRN : isOverdue ? DRED : BD}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%',
                            background: done ? GRN : isOverdue ? DRED : BG,
                            color: done || isOverdue ? '#fff' : TX3,
                            fontSize: 11, fontWeight: 800, fontFamily: F, flexShrink: 0,
                          }}>
                            {done ? <Ic name="check" size={13} color="#fff" /> : m.key === 'week1' ? '1' : m.key === 'week4' ? '4' : '8'}
                          </span>
                          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{m.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {scheduledDate && (
                            <span style={{ fontFamily: F, fontSize: 11, color: TX3 }}>
                              Due: {fmtDate(scheduledDate.toISOString())}
                            </span>
                          )}
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 700, fontFamily: F,
                            background: done ? GRNBG : isOverdue ? DREDBG : BG,
                            color: done ? GRN : isOverdue ? DRED : TX3,
                          }}>
                            {done ? 'Complete' : isOverdue ? 'Overdue' : 'Upcoming'}
                          </span>
                        </div>
                      </div>

                      {/* Completed review summary */}
                      {done && !isActive && (
                        <div style={{ paddingLeft: 34 }}>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, marginBottom: 4 }}>
                            Reviewed: {fmtDate(reviewDateVal)} | <span style={{ fontWeight: 700, color: ratingColor }}>{rating}</span>
                          </div>
                          {notes && <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '4px 0 0', lineHeight: 1.5 }}>{notes}</p>}
                        </div>
                      )}

                      {/* Open review button */}
                      {!done && !isActive && (
                        <button onClick={() => { setActiveReview(m.key); setReviewDate(''); setReviewRating(''); setReviewNotes(''); setReviewClientFeedback('') }}
                          style={{ marginTop: 8, marginLeft: 34, padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX, cursor: 'pointer' }}>
                          Complete Review
                        </button>
                      )}

                      {/* Review form */}
                      {isActive && (
                        <div style={{ marginTop: 12, marginLeft: isMobile ? 0 : 34, background: BG, borderRadius: 10, padding: '16px 18px', border: `1px solid ${BD}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                              <label style={labelStyle}>Date of review</label>
                              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
                                onFocus={() => setFocusedField('rd')} onBlur={() => setFocusedField(null)} style={inputStyle('rd')} />
                            </div>
                            <div>
                              <label style={labelStyle}>Rating</label>
                              <select value={reviewRating} onChange={e => setReviewRating(e.target.value)}
                                style={{ ...inputStyle('rr'), cursor: 'pointer' }}>
                                <option value="">Select rating...</option>
                                {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <label style={labelStyle}>Notes</label>
                            <textarea rows={3} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                              onFocus={() => setFocusedField('rn')} onBlur={() => setFocusedField(null)}
                              placeholder="Review notes..."
                              style={{ ...inputStyle('rn'), resize: 'vertical' }} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>Client feedback (optional)</label>
                            <textarea rows={2} value={reviewClientFeedback} onChange={e => setReviewClientFeedback(e.target.value)}
                              onFocus={() => setFocusedField('rcf')} onBlur={() => setFocusedField(null)}
                              placeholder="Any feedback from the client..."
                              style={{ ...inputStyle('rcf'), resize: 'vertical' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSaveReview} disabled={!reviewDate || !reviewRating || saving}
                              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: (!reviewDate || !reviewRating || saving) ? BD : TEAL, color: (!reviewDate || !reviewRating || saving) ? TX3 : NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: (!reviewDate || !reviewRating || saving) ? 'not-allowed' : 'pointer' }}>
                              {saving ? 'Saving...' : 'Save Review'}
                            </button>
                            <button onClick={() => setActiveReview(null)}
                              style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 13, fontWeight: 600, color: TX3, cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Client feedback section */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, margin: '0 0 10px' }}>Client Feedback</h2>
                <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '0 0 12px', lineHeight: 1.5 }}>
                  Log ongoing client feedback between scheduled reviews.
                </p>
                <textarea rows={4} value={clientFeedback} onChange={e => setClientFeedback(e.target.value)}
                  onFocus={() => setFocusedField('cf')} onBlur={() => setFocusedField(null)}
                  placeholder="Client feedback..."
                  style={{ ...inputStyle('cf'), resize: 'vertical', marginBottom: 10 }} />
                <button onClick={handleSaveFeedback} disabled={savingFeedback}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: savingFeedback ? BD : TEAL, color: savingFeedback ? TX3 : NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: savingFeedback ? 'not-allowed' : 'pointer' }}>
                  {savingFeedback ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>

              {/* Assignment summary — shown when all reviews done */}
              {allDone && (
                <div style={{ ...cs, marginBottom: 20, borderTop: `3px solid ${TEAL}` }}>
                  <h2 style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY, margin: '0 0 14px' }}>Assignment Performance Summary</h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX2 }}>Overall placement health:</span>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 800, fontFamily: F,
                      background: healthBg(health), color: healthColor(health),
                    }}>
                      {healthLabel(health)}
                    </span>
                  </div>

                  {/* Review ratings summary */}
                  <div style={{ background: BG, borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
                    {MILESTONES.map(m => {
                      const rating = record[`${m.key}_rating`]
                      const rc = rating === 'Concern Raised' ? DRED : rating === 'Below Expectations' ? AMB : rating === 'Exceeding Expectations' ? TEAL : GRN
                      return (
                        <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: m.key !== 'week8' ? `1px solid ${BD}` : 'none' }}>
                          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX }}>{m.label}</span>
                          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: rc }}>{rating}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Recommendation */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Recommendation</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {RECOMMENDATIONS.map(r => (
                        <button key={r} onClick={() => setRecommendation(r)} style={{
                          padding: '7px 14px', borderRadius: 8, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          background: recommendation === r ? TEALLT : BG,
                          border: `1.5px solid ${recommendation === r ? TEAL : BD}`,
                          color: recommendation === r ? TEALD : TX2,
                        }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {recommendation && (
                    <div style={{ borderLeft: `4px solid ${TEAL}`, background: TEALLT, borderRadius: '0 8px 8px 0', padding: '10px 14px' }}>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0 }}>
                        Recommendation recorded: <strong>{recommendation}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
