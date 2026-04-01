'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'

const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

// Score helpers
const scolor = s => s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626'
const sbg = s => s >= 75 ? '#ecfdf5' : s >= 50 ? '#fffbeb' : '#fef2f2'
const slabel = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 60 ? 'Moderate' : s >= 45 ? 'Developing' : 'Concern'
const riskCol = r => (r === 'Very Low' || r === 'Low') ? '#16a34a' : r === 'Medium' ? '#d97706' : '#dc2626'
const riskBg = r => (r === 'Very Low' || r === 'Low') ? '#ecfdf5' : r === 'Medium' ? '#fffbeb' : '#fef2f2'

const scenarioTypeBadge = type => {
  const map = {
    'Email Response':      { bg: '#e0f2f0', color: '#009688' },
    'Prioritisation':      { bg: '#fffbeb', color: '#d97706' },
    'Judgment Call':       { bg: '#f3e8ff', color: '#7c3aed' },
    'Strategic Thinking':  { bg: '#0f2137', color: '#fff' },
  }
  return map[type] || { bg: '#f1f5f9', color: '#5e6b7f' }
}

const statusBadge = status => {
  const map = {
    Completed: { bg: '#ecfdf5', color: '#16a34a' },
    Pending:   { bg: '#fffbeb', color: '#d97706' },
    Sent:      { bg: '#f1f5f9', color: '#94a1b3' },
  }
  return map[status] || map.Sent
}

function formatDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ScenarioCard({ scenario, index }) {
  const [expanded, setExpanded] = useState(false)
  const context = scenario.context || ''
  const showToggle = context.length > 100
  const badge = scenarioTypeBadge(scenario.type)

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
      padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12
    }}>
      {/* Type badge + number */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: badge.bg, color: badge.color, fontFamily: F, letterSpacing: 0.3
        }}>
          {scenario.type || 'General'}
        </span>
        <span style={{ fontSize: 12, color: '#94a1b3', fontFamily: FM }}>
          #{index + 1}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.35, fontFamily: F }}>
        {scenario.title}
      </div>

      {/* Context (collapsible) */}
      {context && (
        <div>
          <div style={{ fontSize: 13, color: '#5e6b7f', lineHeight: 1.6 }}>
            {expanded ? context : context.slice(0, 100) + (showToggle ? '…' : '')}
          </div>
          {showToggle && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                marginTop: 4, background: 'none', border: 'none', padding: 0,
                fontSize: 12, fontWeight: 600, color: '#00BFA5', cursor: 'pointer', fontFamily: F
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Task */}
      {scenario.task && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: '#f7f9fb',
          fontSize: 13, color: '#0f172a', lineHeight: 1.6
        }}>
          <span style={{ fontWeight: 600, color: '#5e6b7f', marginRight: 6 }}>Task:</span>
          {scenario.task}
        </div>
      )}

      {/* Time + Skills */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        {scenario.time_minutes != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5e6b7f', fontSize: 13 }}>
            <Ic name="clock" size={14} />
            <span>{scenario.time_minutes} minute{scenario.time_minutes !== 1 ? 's' : ''}</span>
          </div>
        )}
        {Array.isArray(scenario.skills) && scenario.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {scenario.skills.map(skill => (
              <span key={skill} style={{
                fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                background: '#e0f2f0', color: '#009688', fontFamily: F
              }}>
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AssessmentPage({ params }) {
  const router = useRouter()
  const { id } = params

  const [companyName, setCompanyName] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loadingPage, setLoadingPage] = useState(true)

  // Invite form state
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [pendingInvites, setPendingInvites] = useState([])
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [inviteError, setInviteError] = useState('')

  // Close assessment state
  const [closing, setClosing] = useState(false)

  // Delete candidate state
  const [confirmDeleteCandidate, setConfirmDeleteCandidate] = useState(null)
  const [deletingCandidateId, setDeletingCandidateId] = useState(null)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', user.id).single()
      if (profile?.company_name) setCompanyName(profile.company_name)

      const { data: assess } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', id)
        .single()
      setAssessment(assess)

      const { data: cands } = await supabase
        .from('candidates')
        .select('*, results(overall_score, risk_level, percentile)')
        .eq('assessment_id', id)
        .order('invited_at', { ascending: false })
      setCandidates(cands || [])

      setLoadingPage(false)
    }
    init()
  }, [id, router])

  const handleDeleteCandidate = async () => {
    if (!confirmDeleteCandidate) return
    const candidateId = confirmDeleteCandidate.id
    setConfirmDeleteCandidate(null)
    setDeletingCandidateId(candidateId)
    try {
      const supabase = createClient()
      await supabase.from('responses').delete().eq('candidate_id', candidateId)
      await supabase.from('results').delete().eq('candidate_id', candidateId)
      await supabase.from('candidates').delete().eq('id', candidateId)
      setCandidates(prev => prev.filter(c => c.id !== candidateId))
    } finally {
      setDeletingCandidateId(null)
    }
  }

  const handleCloseAssessment = async () => {
    if (closing) return
    setClosing(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('assessments')
      .update({ status: 'closed' })
      .eq('id', id)
      .select()
      .single()
    if (data) setAssessment(data)
    setClosing(false)
  }

  const addPendingInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setPendingInvites(prev => [...prev, { name: inviteName.trim(), email: inviteEmail.trim() }])
    setInviteName('')
    setInviteEmail('')
  }

  const removePendingInvite = idx => {
    setPendingInvites(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSendInvitations = async () => {
    if (pendingInvites.length === 0) return
    setInviting(true)
    setInviteError('')
    setInviteSuccess(false)
    try {
      const res = await fetch('/api/candidates/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: id, candidates: pendingInvites })
      })
      const data = await res.json()
      if (res.ok) {
        setInviteSuccess(true)
        setPendingInvites([])
        // Refresh candidates
        const supabase = createClient()
        const { data: cands } = await supabase
          .from('candidates')
          .select('*, results(overall_score, risk_level, percentile)')
          .eq('assessment_id', id)
          .order('invited_at', { ascending: false })
        setCandidates(cands || [])
      } else {
        setInviteError(data.error || 'Failed to send invitations.')
      }
    } catch {
      setInviteError('Something went wrong. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  if (loadingPage) {
    return (
      <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12, color: '#5e6b7f' }}>
            <div style={{
              width: 22, height: 22, border: '3px solid #e0f2f0',
              borderTopColor: '#00BFA5', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Loading assessment…</span>
          </div>
        </main>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb' }}>
          <div style={{ color: '#dc2626', fontSize: 15, paddingTop: 40 }}>Assessment not found.</div>
        </main>
      </div>
    )
  }

  const scenarios = assessment.scenarios || []
  const isActive = assessment.status !== 'closed'

  // Rank completed candidates by score
  const rankMap = {}
  ;[...candidates]
    .filter(c => c.status === 'Completed' && (Array.isArray(c.results) ? c.results[0] : c.results)?.overall_score != null)
    .sort((a, b) => {
      const sa = (Array.isArray(a.results) ? a.results[0] : a.results)?.overall_score || 0
      const sb = (Array.isArray(b.results) ? b.results[0] : b.results)?.overall_score || 0
      return sb - sa
    })
    .forEach((c, i) => { rankMap[c.id] = i + 1 })

  return (
    <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Sidebar companyName={companyName} />

      {/* Delete candidate confirmation modal */}
      {confirmDeleteCandidate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,33,55,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setConfirmDeleteCandidate(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, padding: '28px 32px',
              maxWidth: 420, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#fef2f2', border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#0f172a', fontFamily: F }}>
              Are you sure you want to permanently delete this candidate?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5e6b7f', lineHeight: 1.6 }}>
              <strong>{confirmDeleteCandidate.name}</strong> and all their responses and results will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDeleteCandidate}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: '#dc2626', color: '#fff', fontFamily: F,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Delete permanently
              </button>
              <button
                onClick={() => setConfirmDeleteCandidate(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: '1.5px solid #e4e9f0', background: 'transparent',
                  color: '#5e6b7f', fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 8, border: '1px solid #e4e9f0',
                background: '#fff', cursor: 'pointer', color: '#5e6b7f', flexShrink: 0
              }}
            >
              <Ic name="arrow-left" size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
                  {assessment.role_title}
                </h1>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: isActive ? '#ecfdf5' : '#f1f5f9',
                  color: isActive ? '#16a34a' : '#94a1b3',
                  fontFamily: F, letterSpacing: 0.3
                }}>
                  {isActive ? 'Active' : 'Closed'}
                </span>
              </div>
              {assessment.created_at && (
                <div style={{ fontSize: 12, color: '#94a1b3', marginTop: 3 }}>
                  Created {formatDate(assessment.created_at)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push(`/compare?assessmentId=${id}`)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid #00BFA5',
                background: '#e0f2f0', color: '#009688', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Ic name="sliders" size={14} color="#009688" />
              Compare candidates
            </button>
            {isActive && (
              <button
                onClick={handleCloseAssessment}
                disabled={closing}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid #e4e9f0',
                  background: '#fff', color: '#5e6b7f', fontSize: 13, fontWeight: 600,
                  cursor: closing ? 'not-allowed' : 'pointer', fontFamily: F,
                  opacity: closing ? 0.6 : 1
                }}
              >
                {closing ? 'Closing…' : 'Close assessment'}
              </button>
            )}
          </div>
        </div>

        {/* Scenario cards */}
        {scenarios.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
              Simulations
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20
            }}>
              {scenarios.map((scenario, i) => (
                <ScenarioCard key={i} scenario={scenario} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Invite section */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '28px 32px', marginBottom: 28
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
            Invite Candidates
          </h2>

          {/* Add candidate form */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 5 }}>
                Name
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Candidate name"
                onKeyDown={e => e.key === 'Enter' && addPendingInvite()}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '9px 13px',
                  borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                  color: '#0f172a', fontFamily: F, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = '#00BFA5'}
                onBlur={e => e.target.style.borderColor = '#e4e9f0'}
              />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 5 }}>
                Email address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="candidate@email.com"
                onKeyDown={e => e.key === 'Enter' && addPendingInvite()}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '9px 13px',
                  borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                  color: '#0f172a', fontFamily: F, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = '#00BFA5'}
                onBlur={e => e.target.style.borderColor = '#e4e9f0'}
              />
            </div>
            <button
              onClick={addPendingInvite}
              disabled={!inviteName.trim() || !inviteEmail.trim()}
              style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: inviteName.trim() && inviteEmail.trim() ? '#00BFA5' : '#e4e9f0',
                color: inviteName.trim() && inviteEmail.trim() ? '#fff' : '#94a1b3',
                fontSize: 14, fontWeight: 600, fontFamily: F,
                cursor: inviteName.trim() && inviteEmail.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s'
              }}
            >
              Add
            </button>
          </div>

          {/* Pending list */}
          {pendingInvites.length > 0 && (
            <div style={{
              border: '1px solid #e4e9f0', borderRadius: 10,
              overflow: 'hidden', marginBottom: 16
            }}>
              {pendingInvites.map((inv, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px',
                  borderBottom: i < pendingInvites.length - 1 ? '1px solid #e4e9f0' : 'none',
                  background: i % 2 === 0 ? '#fff' : '#f7f9fb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={inv.name} size={28} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{inv.name}</div>
                      <div style={{ fontSize: 12, color: '#5e6b7f' }}>{inv.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removePendingInvite(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a1b3', padding: 4, display: 'flex', alignItems: 'center'
                    }}
                  >
                    <Ic name="x" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error / success */}
          {inviteError && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: 13, color: '#dc2626'
            }}>
              {inviteError}
            </div>
          )}
          {inviteSuccess && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 8,
              background: '#ecfdf5', border: '1px solid #bbf7d0',
              fontSize: 13, color: '#16a34a', fontWeight: 600
            }}>
              Invitations sent successfully.
            </div>
          )}

          <button
            onClick={handleSendInvitations}
            disabled={pendingInvites.length === 0 || inviting}
            style={{
              padding: '11px 28px', borderRadius: 9, border: 'none',
              background: pendingInvites.length > 0 && !inviting ? '#00BFA5' : '#e4e9f0',
              color: pendingInvites.length > 0 && !inviting ? '#fff' : '#94a1b3',
              fontSize: 15, fontWeight: 700, fontFamily: F,
              cursor: pendingInvites.length > 0 && !inviting ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {inviting && (
              <div style={{
                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            )}
            {inviting ? 'Sending…' : `Send invitation${pendingInvites.length !== 1 ? 's' : ''}${pendingInvites.length > 0 ? ` (${pendingInvites.length})` : ''}`}
          </button>
        </div>

        {/* Candidates table */}
        {candidates.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #e4e9f0' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
                Candidates
                <span style={{
                  marginLeft: 10, fontSize: 12, fontWeight: 600, padding: '2px 9px',
                  borderRadius: 20, background: '#f1f5f9', color: '#5e6b7f'
                }}>
                  {candidates.length}
                </span>
              </h2>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 44px',
              padding: '10px 28px',
              background: '#f7f9fb',
              borderBottom: '1px solid #e4e9f0'
            }}>
              {['Name / Email', 'Status', 'Score', 'Risk', 'Date', ''].map(col => (
                <div key={col} style={{ fontSize: 11, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {col}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {candidates.map((candidate, i) => {
              const result = Array.isArray(candidate.results) ? candidate.results[0] : candidate.results
              const score = result?.overall_score
              const risk = result?.risk_level
              const statusStyle = statusBadge(candidate.status)
              const isCompleted = candidate.status === 'Completed'
              const isDeleting = deletingCandidateId === candidate.id

              return (
                <div
                  key={candidate.id}
                  onClick={() => isCompleted && router.push(`/assessment/${id}/candidate/${candidate.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 44px',
                    padding: '14px 28px',
                    borderBottom: i < candidates.length - 1 ? '1px solid #e4e9f0' : 'none',
                    alignItems: 'center',
                    cursor: isCompleted ? 'pointer' : 'default',
                    transition: 'background 0.12s',
                    background: '#fff'
                  }}
                  onMouseEnter={e => { if (isCompleted) e.currentTarget.style.background = '#f7f9fb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                >
                  {/* Name / Email */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={candidate.name} size={32} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{candidate.name}</div>
                        {rankMap[candidate.id] <= 3 && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                            background: rankMap[candidate.id] === 1 ? '#fef3c7' : rankMap[candidate.id] === 2 ? '#f1f5f9' : '#fef9ec',
                            color: rankMap[candidate.id] === 1 ? '#b45309' : rankMap[candidate.id] === 2 ? '#475569' : '#92400e',
                            border: `1px solid ${rankMap[candidate.id] === 1 ? '#fde68a' : rankMap[candidate.id] === 2 ? '#e2e8f0' : '#fcd34d'}`,
                          }}>
                            #{rankMap[candidate.id]}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a1b3' }}>{candidate.email}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: statusStyle.bg, color: statusStyle.color, fontFamily: F
                    }}>
                      {candidate.status || 'Sent'}
                    </span>
                  </div>

                  {/* Score */}
                  <div>
                    {score != null ? (
                      <span style={{
                        fontSize: 14, fontWeight: 700, fontFamily: FM,
                        color: scolor(score), background: sbg(score),
                        padding: '3px 10px', borderRadius: 7, display: 'inline-block'
                      }}>
                        {score}%
                        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 5, fontFamily: F }}>
                          {slabel(score)}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#e4e9f0' }}>-</span>
                    )}
                  </div>

                  {/* Risk */}
                  <div>
                    {risk ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: riskBg(risk), color: riskCol(risk), fontFamily: F
                      }}>
                        {risk}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#e4e9f0' }}>-</span>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 12, color: '#94a1b3' }}>
                    {formatDate(candidate.invited_at)}
                  </div>

                  {/* Delete */}
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDeleteCandidate(candidate)}
                      disabled={isDeleting}
                      title="Delete permanently"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: 7, padding: 0,
                        border: '1px solid #e4e9f0', background: 'transparent',
                        cursor: isDeleting ? 'wait' : 'pointer',
                        transition: 'all 0.15s',
                        opacity: isDeleting ? 0.4 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#e4e9f0' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {candidates.length === 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
            padding: '36px 32px', textAlign: 'center', color: '#94a1b3', fontSize: 14
          }}>
            No candidates invited yet. Use the form above to send your first invitation.
          </div>
        )}

      </main>
    </div>
  )
}
