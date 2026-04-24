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

  // Client share
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareToken, setShareToken] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [generatingShare, setGeneratingShare] = useState(false)

  // Replacement trigger
  const [showReplacementPrompt, setShowReplacementPrompt] = useState(false)
  const [replacementCandidates, setReplacementCandidates] = useState(null) // null = not loaded, [] = none found
  const [loadingReplacements, setLoadingReplacements] = useState(false)
  const [replacementReason, setReplacementReason] = useState('')
  const [savingReplacement, setSavingReplacement] = useState(false)
  const [replacementLogged, setReplacementLogged] = useState(false)

  // Pre-start check
  const [prestartCheck, setPrestartCheck] = useState(null)
  const [psStartConfirmed, setPsStartConfirmed] = useState(null)
  const [psInContact, setPsInContact] = useState('')
  const [psHesitation, setPsHesitation] = useState(null)
  const [psNotes, setPsNotes] = useState('')
  const [savingPrestart, setSavingPrestart] = useState(false)
  const [showPrestartForm, setShowPrestartForm] = useState(false)

  // Attendance
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [attStatus, setAttStatus] = useState('')
  const [attNotes, setAttNotes] = useState('')
  const [savingAtt, setSavingAtt] = useState(false)
  const [showAttForm, setShowAttForm] = useState(false)

  // Engagement pulses
  const [engagementPulses, setEngagementPulses] = useState([])
  const [sendingPulse, setSendingPulse] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('company_name, account_type').eq('id', user.id).single()
      setProfile(prof)

      // Gate: assignment review is agency-only
      if (prof?.account_type !== 'agency') {
        router.push(`/assessment/${params.id}/candidate/${params.candidateId}`)
        return
      }

      const { data: cand } = await supabase.from('candidates').select('*, assessments(role_title, employment_type)').eq('id', params.candidateId).single()
      setCandidate(cand)

      // Gate: assignment review is temporary-only
      if (cand?.assessments?.employment_type !== 'temporary') {
        router.push(`/assessment/${params.id}/candidate/${params.candidateId}`)
        return
      }

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
        if (existing.client_share_token) setShareToken(existing.client_share_token)
        if (existing.client_share_enabled) setShareEnabled(true)
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

      // Load attendance records
      try {
        const attRes = await fetch(`/api/attendance?candidate_id=${params.candidateId}`)
        if (attRes.ok) {
          const attData = await attRes.json()
          setAttendanceRecords(attData.records || [])
        }
      } catch {}

      // Load existing prestart check
      try {
        const psRes = await fetch(`/api/prestart-check?candidate_id=${params.candidateId}`)
        if (psRes.ok) {
          const psData = await psRes.json()
          if (psData.check) setPrestartCheck(psData.check)
        }
      } catch {}

      // Load engagement pulses
      try {
        const epRes = await fetch(`/api/engagement-pulses?candidate_id=${params.candidateId}`)
        if (epRes.ok) {
          const epData = await epRes.json()
          if (epData.pulses) setEngagementPulses(epData.pulses)
        }
      } catch {}

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
      if (newRec) {
        setRecord(newRec)
        // Schedule engagement pulses for this temp placement
        try {
          const epRes = await fetch('/api/engagement-pulses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidate_id: params.candidateId,
              assessment_id: params.id,
              worker_name: candidate?.name || '',
              worker_email: candidate?.email || '',
              client_company: setupClient,
              start_date: setupStart,
            }),
          })
          if (epRes.ok) {
            const epData = await epRes.json()
            if (epData.pulses) setEngagementPulses(epData.pulses)
          }
        } catch {}
      }
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

  async function handleLogAttendance() {
    if (!attDate || !attStatus) return
    setSavingAtt(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: params.candidateId,
          assessment_id: params.id,
          worker_name: candidate?.name || '',
          role_title: candidate?.assessments?.role_title || '',
          client_company: record?.client_company || '',
          record_date: attDate,
          status: attStatus,
          notes: attNotes || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAttendanceRecords(prev => [data.record, ...prev])
        if (data.reliability_score != null) {
          setRecord(prev => prev ? { ...prev, reliability_score: data.reliability_score, attendance_risk: data.attendance_risk } : prev)
        }
        setAttStatus('')
        setAttNotes('')
        setShowAttForm(false)
      }
    } catch (err) { console.error(err) }
    finally { setSavingAtt(false) }
  }

  async function loadReplacementCandidates() {
    setLoadingReplacements(true)
    try {
      const res = await fetch(`/api/placements/replacement-candidates?candidate_id=${encodeURIComponent(params.candidateId)}`)
      const json = await res.json().catch(() => ({}))
      setReplacementCandidates(res.ok ? (json.candidates || []) : [])
    } catch (err) {
      console.error('Replacement search error:', err)
      setReplacementCandidates([])
    } finally {
      setLoadingReplacements(false)
    }
  }

  async function handleLogReplacement(selectedCandidateId) {
    if (!replacementReason || savingReplacement) return
    setSavingReplacement(true)
    try {
      const supabase = createClient()
      const { data: saved } = await supabase.from('assignment_reviews').update({
        replacement_triggered: true,
        replacement_triggered_at: new Date().toISOString(),
        replacement_candidate_id: selectedCandidateId,
        replacement_reason: replacementReason,
        updated_at: new Date().toISOString(),
      }).eq('id', record.id).select('*').single()
      if (saved) setRecord(saved)
      setReplacementLogged(true)
    } catch (err) { console.error(err) }
    finally { setSavingReplacement(false) }
  }

  async function handleGenerateShareLink() {
    if (!record) return
    setGeneratingShare(true)
    try {
      const supabase = createClient()
      const token = crypto.randomUUID()
      const { data: saved } = await supabase.from('assignment_reviews').update({
        client_share_token: token,
        client_share_enabled: true,
        updated_at: new Date().toISOString(),
      }).eq('id', record.id).select('*').single()
      if (saved) {
        setRecord(saved)
        setShareToken(token)
        setShareEnabled(true)
      }
    } catch (err) { console.error(err) }
    finally { setGeneratingShare(false) }
  }

  async function handleToggleShare(enabled) {
    if (!record) return
    try {
      const supabase = createClient()
      const { data: saved } = await supabase.from('assignment_reviews').update({
        client_share_enabled: enabled,
        updated_at: new Date().toISOString(),
      }).eq('id', record.id).select('*').single()
      if (saved) { setRecord(saved); setShareEnabled(enabled) }
    } catch (err) { console.error(err) }
  }

  const shareUrl = shareToken ? `${typeof window !== 'undefined' ? window.location.origin : 'https://app.prodicta.co.uk'}/placement/${shareToken}` : ''

  async function handleSavePrestartCheck() {
    if (psStartConfirmed === null || !psInContact || psHesitation === null) return
    setSavingPrestart(true)
    try {
      const res = await fetch('/api/prestart-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: params.candidateId,
          assessment_id: params.id,
          worker_name: candidate?.name || '',
          role_title: candidate?.assessments?.role_title || '',
          client_company: record?.client_company || '',
          start_date: record?.assignment_start_date || '',
          start_confirmed: psStartConfirmed,
          in_contact: psInContact,
          hesitation: psHesitation,
          counter_offer_flag: false,
          notes: psNotes || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setPrestartCheck(data.check)
        setShowPrestartForm(false)
      }
    } catch (err) { console.error(err) }
    finally { setSavingPrestart(false) }
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
 {candidate.name}, {candidate.assessments?.role_title || 'Worker'}
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

 {/* Pre-Start Check, show when start date is in the future or within 7 days */}
              {record?.assignment_start_date && (() => {
                const startDate = new Date(record.assignment_start_date + 'T00:00:00')
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const daysUntil = Math.ceil((startDate - today) / 86400000)
                if (daysUntil < -7) return null // past start, no longer relevant
                const riskColor = (r) => r === 'high' ? DRED : r === 'medium' ? AMB : GRN
                const riskBg = (r) => r === 'high' ? DREDBG : r === 'medium' ? AMBBG : GRNBG
                const riskLabel = (r) => r === 'high' ? 'High' : r === 'medium' ? 'Medium' : 'Low'

                return (
                  <div style={{
                    ...cs, marginBottom: 20,
                    borderTop: `3px solid ${prestartCheck?.overall_risk === 'high' ? DRED : prestartCheck?.overall_risk === 'medium' ? AMB : TEAL}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Ic name="shield" size={15} color={prestartCheck ? riskColor(prestartCheck.overall_risk) : TEALD} />
                        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>Pre-Start Risk Check</span>
                        {daysUntil > 0 && <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{daysUntil} day{daysUntil !== 1 ? 's' : ''} until start</span>}
                      </div>
                      {prestartCheck && (
                        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, fontFamily: F, background: riskBg(prestartCheck.overall_risk), color: riskColor(prestartCheck.overall_risk) }}>
                          {riskLabel(prestartCheck.overall_risk)} Risk
                        </span>
                      )}
                    </div>

                    {prestartCheck && !showPrestartForm ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                          {[
                            { label: 'Ghosting risk', value: prestartCheck.ghosting_risk },
                            { label: 'Counter-offer risk', value: prestartCheck.counter_offer_risk },
                            { label: 'Overall', value: prestartCheck.overall_risk },
                          ].map((f, i) => (
                            <div key={i} style={{ background: BG, borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: riskColor(f.value) }}>{riskLabel(f.value)}</div>
                            </div>
                          ))}
                        </div>
                        {prestartCheck.overall_risk === 'high' && (
                          <div style={{ background: DREDBG, borderLeft: `4px solid ${DRED}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 14 }}>
                            <p style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: DRED, margin: '0 0 6px' }}>Recommended actions</p>
                            <ul style={{ fontFamily: F, fontSize: 12.5, color: TX, margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                              <li>Call the worker today to confirm their start date</li>
                              <li>Check for counter-offer signals</li>
                              <li>Have a backup candidate ready</li>
                            </ul>
                          </div>
                        )}
                        {prestartCheck.overall_risk === 'high' && (
                          <button onClick={() => { if (typeof loadReplacementCandidates === 'function') loadReplacementCandidates() }} style={{ padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, cursor: 'pointer', marginBottom: 8 }}>
                            Find Backup Candidate
                          </button>
                        )}
                        <button onClick={() => setShowPrestartForm(true)} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          Update check
                        </button>
                      </>
                    ) : (
                      <>
                        {!showPrestartForm && !prestartCheck && (
                          <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 14px', lineHeight: 1.55 }}>
                            Complete a pre-start check to identify ghosting risk and counter-offer risk before day one.
                          </p>
                        )}
                        {(showPrestartForm || !prestartCheck) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                              <label style={labelStyle}>Has the worker confirmed their start date?</label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(o => (
                                  <button key={o.l} onClick={() => setPsStartConfirmed(o.v)} style={{ padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer', background: psStartConfirmed === o.v ? `${o.v ? GRN : DRED}14` : BG, border: `1.5px solid ${psStartConfirmed === o.v ? (o.v ? GRN : DRED) : BD}`, color: psStartConfirmed === o.v ? (o.v ? GRN : DRED) : TX2 }}>{o.l}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Have they been in contact since accepting?</label>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }, { v: 'not_attempted', l: 'Not attempted' }].map(o => (
                                  <button key={o.v} onClick={() => setPsInContact(o.v)} style={{ padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer', background: psInContact === o.v ? `${o.v === 'yes' ? GRN : o.v === 'no' ? DRED : AMB}14` : BG, border: `1.5px solid ${psInContact === o.v ? (o.v === 'yes' ? GRN : o.v === 'no' ? DRED : AMB) : BD}`, color: psInContact === o.v ? (o.v === 'yes' ? GRN : o.v === 'no' ? DRED : AMB) : TX2 }}>{o.l}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Any signs of hesitation or second thoughts?</label>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(o => (
                                  <button key={o.l} onClick={() => setPsHesitation(o.v)} style={{ padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer', background: psHesitation === o.v ? `${o.v ? DRED : GRN}14` : BG, border: `1.5px solid ${psHesitation === o.v ? (o.v ? DRED : GRN) : BD}`, color: psHesitation === o.v ? (o.v ? DRED : GRN) : TX2 }}>{o.l}</button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label style={labelStyle}>Notes (optional)</label>
                              <input type="text" value={psNotes} onChange={e => setPsNotes(e.target.value)} onFocus={() => setFocusedField('psn')} onBlur={() => setFocusedField(null)} placeholder="Any additional context" style={inputStyle('psn')} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={handleSavePrestartCheck} disabled={psStartConfirmed === null || !psInContact || psHesitation === null || savingPrestart} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: (psStartConfirmed === null || !psInContact || psHesitation === null || savingPrestart) ? BD : TEAL, color: (psStartConfirmed === null || !psInContact || psHesitation === null || savingPrestart) ? TX3 : NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: (psStartConfirmed === null || !psInContact || psHesitation === null || savingPrestart) ? 'not-allowed' : 'pointer' }}>
                                {savingPrestart ? 'Saving...' : 'Complete Check'}
                              </button>
                              {showPrestartForm && <button onClick={() => setShowPrestartForm(false)} style={{ padding: '10px 22px', borderRadius: 8, border: `1.5px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX2, cursor: 'pointer' }}>Cancel</button>}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Share with Client */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: shareToken ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Ic name="send" size={15} color={TEALD} />
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>Client Visibility</span>
                  </div>
                  {!shareToken ? (
                    <button
                      onClick={handleGenerateShareLink}
                      disabled={generatingShare}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: generatingShare ? BD : TEAL, color: generatingShare ? TX3 : NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: generatingShare ? 'not-allowed' : 'pointer' }}
                    >
                      {generatingShare ? 'Generating...' : 'Share with Client'}
                    </button>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, color: shareEnabled ? GRN : TX3 }}>
                      <input type="checkbox" checked={shareEnabled} onChange={e => handleToggleShare(e.target.checked)} style={{ accentColor: TEAL }} />
                      {shareEnabled ? 'Sharing enabled' : 'Sharing disabled'}
                    </label>
                  )}
                </div>
                {shareToken && (
                  <div style={{ background: BG, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      style={{ flex: 1, fontFamily: F, fontSize: 12, color: shareEnabled ? TX : TX3, background: 'transparent', border: 'none', outline: 'none', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}
                      style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 11, fontWeight: 700, color: shareCopied ? GRN : TX2, cursor: 'pointer', flexShrink: 0 }}
                    >
                      {shareCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {shareToken && (
                  <p style={{ fontFamily: F, fontSize: 11.5, color: TX3, margin: '8px 0 0', lineHeight: 1.5 }}>
                    {shareEnabled ? 'Your client can view a live placement summary at this link. No login required.' : 'Sharing is disabled. The client cannot access this link.'}
                  </p>
                )}
              </div>

              {/* Reliability Score + Attendance */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Reliability Score Ring */}
                <div style={{ ...cs, flex: '0 0 auto', textAlign: 'center', minWidth: 160 }}>
                  <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Reliability Score</div>
                  {(() => {
                    const rs = record?.reliability_score ?? 100
                    const rsColor = rs >= 80 ? GRN : rs >= 60 ? AMB : DRED
                    const rsLabel = rs >= 80 ? 'Reliable' : rs >= 60 ? 'Monitor' : 'At Risk'
                    const size = 100, sw = 8, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r
                    const offset = circ * (1 - rs / 100)
                    return (
                      <>
                        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e4e9f0" strokeWidth={sw} />
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={rsColor} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontSize: 28, fontWeight: 800, color: rsColor }}>{rs}</div>
                        </div>
                        <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, fontFamily: F, background: rs >= 80 ? GRNBG : rs >= 60 ? AMBBG : DREDBG, color: rsColor }}>
                          {rsLabel}
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Attendance Summary + Log Button */}
                <div style={{ ...cs, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>Attendance</div>
                    <button onClick={() => setShowAttForm(!showAttForm)} style={{
                      padding: '6px 14px', borderRadius: 7, border: `1px solid ${TEAL}`, background: showAttForm ? TEALLT : 'transparent',
                      fontFamily: F, fontSize: 12, fontWeight: 700, color: TEALD, cursor: 'pointer',
                    }}>
                      {showAttForm ? 'Cancel' : 'Log Attendance'}
                    </button>
                  </div>

                  {/* Log form */}
                  {showAttForm && (
                    <div style={{ background: BG, borderRadius: 10, padding: '14px 16px', marginBottom: 14, border: `1px solid ${BD}` }}>
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Date</label>
                        <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                          onFocus={() => setFocusedField('ad')} onBlur={() => setFocusedField(null)} style={inputStyle('ad')} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>Status</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { key: 'present', label: 'Present', color: GRN },
                            { key: 'late', label: 'Late', color: AMB },
                            { key: 'left_early', label: 'Left Early', color: AMB },
                            { key: 'absent', label: 'Absent', color: DRED },
                            { key: 'unauthorised_absence', label: 'Unauthorised', color: DRED },
                          ].map(s => (
                            <button key={s.key} onClick={() => setAttStatus(s.key)} style={{
                              padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                              background: attStatus === s.key ? `${s.color}18` : BG,
                              border: `1.5px solid ${attStatus === s.key ? s.color : BD}`,
                              color: attStatus === s.key ? s.color : TX2,
                            }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Notes (optional)</label>
                        <input type="text" value={attNotes} onChange={e => setAttNotes(e.target.value)}
                          onFocus={() => setFocusedField('an')} onBlur={() => setFocusedField(null)}
                          placeholder="e.g. Called in late, 20 minutes" style={inputStyle('an')} />
                      </div>
                      <button onClick={handleLogAttendance} disabled={!attDate || !attStatus || savingAtt}
                        style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: (!attDate || !attStatus || savingAtt) ? BD : TEAL, color: (!attDate || !attStatus || savingAtt) ? TX3 : NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: (!attDate || !attStatus || savingAtt) ? 'not-allowed' : 'pointer' }}>
                        {savingAtt ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}

                  {/* Weekly summary */}
                  {(() => {
                    const now = new Date()
                    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1); startOfWeek.setHours(0,0,0,0)
                    const weekRecords = attendanceRecords.filter(r => new Date(r.record_date + 'T00:00:00') >= startOfWeek)
                    const present = weekRecords.filter(r => r.status === 'present').length
                    const late = weekRecords.filter(r => r.status === 'late' || r.status === 'left_early').length
                    const absent = weekRecords.filter(r => r.status === 'absent' || r.status === 'unauthorised_absence').length
                    const totalPresent = attendanceRecords.filter(r => r.status === 'present').length
                    const totalIssues = attendanceRecords.length - totalPresent
                    return (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 120, background: BG, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', marginBottom: 4 }}>This week</div>
                          <div style={{ fontFamily: F, fontSize: 13, color: TX }}>
                            <span style={{ color: GRN, fontWeight: 700 }}>{present}</span> present
                            {late > 0 && <>, <span style={{ color: AMB, fontWeight: 700 }}>{late}</span> late</>}
                            {absent > 0 && <>, <span style={{ color: DRED, fontWeight: 700 }}>{absent}</span> absent</>}
                            {weekRecords.length === 0 && <span style={{ color: TX3 }}>No records</span>}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 120, background: BG, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', marginBottom: 4 }}>Running total</div>
                          <div style={{ fontFamily: F, fontSize: 13, color: TX }}>
                            <span style={{ fontWeight: 700 }}>{attendanceRecords.length}</span> days logged, <span style={{ color: totalIssues > 0 ? AMB : GRN, fontWeight: 700 }}>{totalIssues}</span> issue{totalIssues !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Recent records */}
                  {attendanceRecords.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', marginBottom: 8 }}>Recent</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {attendanceRecords.slice(0, 7).map(r => {
                          const sc = r.status === 'present' ? GRN : (r.status === 'late' || r.status === 'left_early') ? AMB : DRED
                          const sl = r.status === 'present' ? 'Present' : r.status === 'late' ? 'Late' : r.status === 'left_early' ? 'Left Early' : r.status === 'absent' ? 'Absent' : 'Unauthorised'
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: BG }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                              <span style={{ fontFamily: F, fontSize: 12, color: TX2, flex: 1 }}>{fmtDate(r.record_date)}</span>
                              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: sc }}>{sl}</span>
                              {r.notes && <span style={{ fontFamily: F, fontSize: 11, color: TX3, marginLeft: 4 }}>{r.notes}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Pre-Start Engagement ── */}
              {engagementPulses.length > 0 && (() => {
                const ghostRisk = record?.ghosting_risk || 'low'
                const grColor = ghostRisk === 'critical' ? DRED : ghostRisk === 'high' ? DRED : ghostRisk === 'medium' ? AMB : GRN
                const grBg = ghostRisk === 'critical' ? DREDBG : ghostRisk === 'high' ? DREDBG : ghostRisk === 'medium' ? AMBBG : GRNBG
                const grLabel = ghostRisk.charAt(0).toUpperCase() + ghostRisk.slice(1)

                async function handleSendPulseNow() {
                  setSendingPulse(true)
                  try {
                    const res = await fetch('/api/engagement-pulses', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        candidate_id: params.candidateId,
                        assessment_id: params.id,
                        worker_name: candidate?.name || '',
                        worker_email: candidate?.email || '',
                        client_company: record?.client_company || '',
                        start_date: record?.assignment_start_date || '',
                      }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      if (data.pulses) setEngagementPulses(data.pulses)
                    }
                  } catch {} finally { setSendingPulse(false) }
                }

                return (
                  <div style={{ ...cs, marginBottom: 20, borderTop: `3px solid ${grColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Ic name="pulse" size={15} color={grColor} />
                        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>Pre-Start Engagement</span>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 800, fontFamily: F,
                        background: grBg, color: grColor,
                      }}>
                        {grLabel} Risk
                      </span>
                    </div>

                    {/* Pulse status indicators */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      {engagementPulses.map(p => {
                        const status = p.response === 'confirmed' ? 'Confirmed'
                          : p.response === 'question' ? 'Question'
                          : p.response === 'concern' ? 'Concern'
                          : p.response === 'no_response' ? 'No response'
                          : p.pulse_opened ? 'Opened'
                          : p.pulse_sent_at ? 'Sent'
                          : 'Scheduled'
                        const pColor = p.response === 'confirmed' ? GRN
                          : p.response === 'concern' || p.response === 'no_response' ? DRED
                          : p.response === 'question' ? AMB
                          : p.pulse_sent_at ? TEAL
                          : TX3
                        const pBg = p.response === 'confirmed' ? GRNBG
                          : p.response === 'concern' || p.response === 'no_response' ? DREDBG
                          : p.response === 'question' ? AMBBG
                          : BG
                        return (
                          <div key={p.id} style={{ flex: '1 1 140px', background: pBg, borderRadius: 8, padding: '10px 14px', border: `1px solid ${pColor}33` }}>
                            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pulse {p.pulse_number}</div>
                            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: pColor }}>{status}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Last engagement */}
                    {record?.last_engagement_at && (
                      <div style={{ fontFamily: F, fontSize: 11.5, color: TX3, marginBottom: 12 }}>
                        Last engagement: {new Date(record.last_engagement_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Manual trigger */}
                    <button onClick={handleSendPulseNow} disabled={sendingPulse}
                      style={{
                        padding: '8px 18px', borderRadius: 7, border: `1px solid ${TEAL}`,
                        background: sendingPulse ? BD : TEALLT, fontFamily: F, fontSize: 12, fontWeight: 700,
                        color: sendingPulse ? TX3 : NAVY, cursor: sendingPulse ? 'not-allowed' : 'pointer',
                      }}>
                      {sendingPulse ? 'Sending...' : 'Send Engagement Pulse Now'}
                    </button>
                  </div>
                )
              })()}

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
              {(() => {
                const firstIncompleteKey = MILESTONES.find(m => !record[`${m.key}_review_done`])?.key || null
                return null
              })()}
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
                  const isNextStep = !done && m.key === MILESTONES.find(mm => !record[`${mm.key}_review_done`])?.key

                  return (
                    <div key={m.key} style={{
                      ...cs, padding: '18px 22px',
                      borderLeft: `4px solid ${done ? GRN : isNextStep ? TEAL : isOverdue ? DRED : BD}`,
                      boxShadow: isNextStep ? `0 0 0 1px ${TEAL}44` : 'none',
                      position: 'relative',
                    }}>
                      {isNextStep && (
                        <span style={{ position: 'absolute', top: -8, right: 14, fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 4, background: TEAL, color: '#fff', fontFamily: F }}>Do this now</span>
                      )}
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

              {/* All done prompt */}
              {allDone && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 20px', marginBottom: 20,
                  background: GRNBG, borderRadius: 10, border: `1px solid ${GRN}44`, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ic name="check" size={15} color="#fff" />
                    </div>
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>All done. Share the placement update with your client.</span>
                  </div>
                  {!shareToken ? (
                    <button onClick={handleGenerateShareLink} disabled={generatingShare} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: generatingShare ? BD : TEAL, color: generatingShare ? TX3 : NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: generatingShare ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                      {generatingShare ? 'Generating...' : 'Share with Client'}
                    </button>
                  ) : (
                    <button onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {shareCopied ? 'Copied' : 'Copy Client Link'}
                    </button>
                  )}
                </div>
              )}

 {/* Assignment summary, shown when all reviews done */}
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

              {/* ── Replacement Trigger ── */}
              {record && !record.replacement_triggered && !replacementLogged && (health === 'red' || recommendation === 'End Early') && (
                <div style={{
                  ...cs, marginBottom: 20,
                  borderTop: `3px solid ${DRED}`,
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff 40%)',
                }}>
                  {!showReplacementPrompt ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Ic name="alert" size={16} color={DRED} />
                        <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX }}>Do you need to replace this worker?</span>
                      </div>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 16px', lineHeight: 1.55 }}>
                        {replacementCandidates === null
                          ? `PRODICTA can search your previously screened candidates for ${candidate?.assessments?.role_title || 'this role'}.`
                          : `We have found ${replacementCandidates.length} previously screened candidate${replacementCandidates.length !== 1 ? 's' : ''} for ${candidate?.assessments?.role_title || 'this role'} who scored above 70.`}
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => { setShowReplacementPrompt(true); if (replacementCandidates === null) loadReplacementCandidates() }}
                          style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Yes, find a replacement
                        </button>
                        <button
                          onClick={() => setShowReplacementPrompt(false)}
                          style={{ padding: '10px 22px', borderRadius: 8, border: `1.5px solid ${BD}`, background: CARD, color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          No, not needed
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX }}>Replacement Candidates</span>
                        <button onClick={() => setShowReplacementPrompt(false)} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, background: 'none', border: 'none', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>

                      {/* Reason selector */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Reason for replacement</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['End Early', 'Performance', 'Attendance', 'Client Request'].map(r => (
                            <button key={r} onClick={() => setReplacementReason(r)} style={{
                              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                              background: replacementReason === r ? `${DRED}14` : BG,
                              border: `1.5px solid ${replacementReason === r ? DRED : BD}`,
                              color: replacementReason === r ? DRED : TX2,
                            }}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {loadingReplacements && (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                          <div style={{ width: 24, height: 24, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                          <p style={{ fontFamily: F, fontSize: 13, color: TX3, marginTop: 10 }}>Searching your assessed candidates...</p>
                        </div>
                      )}

                      {replacementCandidates && !loadingReplacements && replacementCandidates.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '0 0 14px' }}>
                            No previously screened candidates available for this role.
                          </p>
                          <button
                            onClick={() => router.push(`/assessment/new?role=${encodeURIComponent(candidate?.assessments?.role_title || '')}&type=temporary`)}
                            style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Screen new candidates
                          </button>
                        </div>
                      )}

                      {replacementCandidates && !loadingReplacements && replacementCandidates.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {replacementCandidates.map(rc => {
                            const rcScore = rc.score ?? rc.results?.[0]?.overall_score ?? 0
                            const rcColor = rcScore >= 80 ? GRN : rcScore >= 70 ? TEAL : AMB
                            const rcVerdict = rcScore >= 80 ? 'Strong Hire' : 'Review'
                            const size = 48, sw = 4, r = (size - sw * 2) / 2, circ = 2 * Math.PI * r
                            const offset = circ * (1 - rcScore / 100)
                            return (
                              <div key={rc.id} style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', background: CARD, border: `1px solid ${BD}`, borderRadius: 10,
                                flexWrap: 'wrap',
                              }}>
                                {/* Score ring */}
                                <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                                  <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e4e9f0" strokeWidth={sw} />
                                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={rcColor} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
                                  </svg>
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontSize: 16, fontWeight: 800, color: rcColor }}>{rcScore}</div>
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 140 }}>
                                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{rc.name}</div>
                                  <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 2 }}>
 {rc.role_title || rc.assessments?.role_title || 'Role'}{rc.completed_at ? `, Assessed ${fmtDate(rc.completed_at)}` : ''}
                                  </div>
                                  <span style={{
                                    display: 'inline-block', marginTop: 4,
                                    padding: '2px 10px', borderRadius: 50, fontSize: 10, fontWeight: 800, fontFamily: F,
                                    background: rcScore >= 80 ? GRNBG : TEALLT, color: rcScore >= 80 ? GRN : TEALD,
                                  }}>
                                    {rcVerdict}
                                  </span>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => router.push(`/assessment/${rc.assessment_id}/candidate/${rc.id}`)}
                                    style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${BD}`, background: CARD, fontFamily: F, fontSize: 12, fontWeight: 700, color: TX, cursor: 'pointer' }}
                                  >
                                    View Report
                                  </button>
                                  <a
 href={`mailto:${rc.email || ''}?subject=${encodeURIComponent(`${candidate?.assessments?.role_title || 'Role'}, Replacement Opportunity`)}&body=${encodeURIComponent(`Hi ${rc.name},\n\nWe have a ${candidate?.assessments?.role_title || 'role'} opportunity available${record?.client_company ? ' at ' + record.client_company : ''}. Based on your previous assessment you are a strong match for this role.\n\nPlease let me know if you are interested and available.\n\nBest regards,\n${profile?.company_name || ''}`)}`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: TEAL, fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, cursor: 'pointer', textDecoration: 'none' }}
                                  >
                                    Contact
                                  </a>
                                  {replacementReason && (
                                    <button
                                      onClick={() => handleLogReplacement(rc.id)}
                                      disabled={savingReplacement}
                                      style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: NAVY, fontFamily: F, fontSize: 12, fontWeight: 700, color: '#fff', cursor: savingReplacement ? 'not-allowed' : 'pointer', opacity: savingReplacement ? 0.6 : 1 }}
                                    >
                                      {savingReplacement ? 'Logging...' : 'Select as Replacement'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Replacement logged confirmation */}
              {(record?.replacement_triggered || replacementLogged) && (
                <div style={{
                  ...cs, marginBottom: 20,
                  borderLeft: `4px solid ${GRN}`, background: GRNBG,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Ic name="check" size={16} color={GRN} />
                    <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>
 Replacement triggered{record?.replacement_reason ? `, ${record.replacement_reason}` : ''}
                    </span>
                  </div>
                  {record?.replacement_triggered_at && (
                    <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '6px 0 0' }}>
                      Logged on {fmtDate(record.replacement_triggered_at)}
                    </p>
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
