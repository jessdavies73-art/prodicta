'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, RED, REDBG,
  F, FM, scolor, sbg, slabel, dL, dC, riskCol, riskBg, riskBd, cs, ps, bs
} from '@/lib/constants'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  })
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = TEAL }) {
  return (
    <div style={{
      ...cs,
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TX2, fontFamily: F }}>{label}</span>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: TEALLT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic name={icon} size={16} color={TEALD} />
        </div>
      </div>
      <div>
        <div style={{
          fontSize: 34, fontWeight: 800, color: NAVY, fontFamily: FM,
          lineHeight: 1, letterSpacing: '-1px'
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: TX3, marginTop: 6, fontFamily: F }}>{sub}</div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', bg: GRNBG, color: GRN, bd: GRNBD },
    pending:   { label: 'Pending',   bg: AMBBG,  color: AMB,  bd: '#fde68a' },
    sent:      { label: 'Sent',      bg: '#f1f5f9', color: TX3,  bd: BD },
    archived:  { label: 'Archived',  bg: '#f1f5f9', color: TX3,  bd: BD },
  }
  const s = map[status] || map.sent
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 50,
      fontSize: 11.5,
      fontWeight: 700,
      fontFamily: F,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function RiskBadge({ risk }) {
  if (!risk) return <span style={{ color: TX3, fontSize: 12 }}>—</span>
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 50,
      fontSize: 11.5,
      fontWeight: 700,
      fontFamily: F,
      background: riskBg(risk),
      color: riskCol(risk),
      border: `1px solid ${riskBd(risk)}`,
      whiteSpace: 'nowrap',
    }}>
      {risk}
    </span>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: BG,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44,
          border: `3px solid ${BD}`,
          borderTop: `3px solid ${TEAL}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <div style={{ color: TX2, fontSize: 14, fontFamily: F }}>Loading dashboard…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

function EmptyState() {
  const router = useRouter()
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 16,
        background: TEALLT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Ic name="users" size={26} color={TEALD} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: TX, fontFamily: F, marginBottom: 8 }}>
        No candidates yet
      </div>
      <div style={{ fontSize: 13.5, color: TX2, fontFamily: F, marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>
        Create an assessment and invite your first candidate to get started.
      </div>
      <button
        onClick={() => router.push('/assessment/new')}
        style={bs('primary', 'md')}
      >
        <Ic name="plus" size={15} color={NAVY} />
        New assessment
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [assessments, setAssessments] = useState([])
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [archivingIds, setArchivingIds] = useState(new Set())
  const [hoveredArchive, setHoveredArchive] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null) // candidate object to confirm

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          router.push('/login')
          return
        }

        const { data: prof } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(prof)

        const { data: cands, error: candsErr } = await supabase
          .from('candidates')
          .select('*, assessments!inner(role_title, id), results(overall_score, risk_level, percentile)')
          .eq('user_id', user.id)
          .neq('status', 'archived')
          .order('invited_at', { ascending: false })

        if (candsErr) throw candsErr
        setCandidates(cands || [])

        const { data: assess, error: assessErr } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (assessErr) throw assessErr
        setAssessments(assess || [])
      } catch (err) {
        console.error(err)
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleArchive(id) {
    setConfirmArchive(null)
    setArchivingIds(prev => new Set([...prev, id]))
    try {
      const supabase = createClient()
      await supabase.from('candidates').update({ status: 'archived' }).eq('id', id)
      setCandidates(prev => prev.filter(c => c.id !== id))
    } finally {
      setArchivingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar active="dashboard" companyName={profile?.company_name} />
        <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: BG, fontFamily: F }}>
          <div style={{
            ...cs, background: REDBG, border: `1px solid #fecaca`,
            display: 'flex', alignItems: 'center', gap: 12, color: RED,
          }}>
            <Ic name="alert" size={18} color={RED} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
          </div>
        </main>
      </div>
    )
  }

  // ── computed stats ──────────────────────────────────────────────────────────

  const completed = candidates.filter(c => c.status === 'completed')
  const pendingCandidates = candidates.filter(c => c.status === 'sent' || c.status === 'pending')

  const avgScore = completed.length
    ? Math.round(
        completed.reduce((sum, c) => {
          const score = c.results?.[0]?.overall_score ?? 0
          return sum + score
        }, 0) / completed.length
      )
    : null

  const recommendedCount = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length

  // ── filtered candidates ─────────────────────────────────────────────────────

  const filtered = search.trim()
    ? candidates.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      )
    : candidates

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="dashboard" companyName={profile?.company_name} />

      {/* ── Confirmation modal ── */}
      {confirmArchive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,33,55,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
          onClick={() => setConfirmArchive(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CARD, borderRadius: 14, padding: '28px 32px',
              maxWidth: 420, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: REDBG, border: `1px solid #fecaca`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ic name="archive" size={22} color={RED} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: TX }}>
              Archive this candidate?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: TX2, lineHeight: 1.6 }}>
              <strong>{confirmArchive.name}</strong> will be removed from your active pipeline. You can restore them at any time from the Archive page.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleArchive(confirmArchive.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: RED, color: '#fff', fontFamily: F,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Archive candidate
              </button>
              <button
                onClick={() => setConfirmArchive(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{
        marginLeft: 220,
        padding: '32px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
        }}>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 800,
            color: NAVY, letterSpacing: '-0.5px', flexShrink: 0,
          }}>
            Dashboard
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                <Ic name="search" size={15} color={searchFocused ? TEALD : TX3} />
              </div>
              <input
                type="text"
                placeholder="Search candidates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  fontFamily: F,
                  fontSize: 13.5,
                  padding: '9px 14px 9px 36px',
                  borderRadius: 8,
                  border: `1.5px solid ${searchFocused ? TEAL : BD}`,
                  background: CARD,
                  color: TX,
                  outline: 'none',
                  width: 220,
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            <button
              onClick={() => router.push('/assessment/new')}
              style={bs('primary', 'md')}
            >
              <Ic name="plus" size={15} color={NAVY} />
              New assessment
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{
          display: 'flex', gap: 16, marginBottom: 28,
        }}>
          <StatCard
            icon="check"
            label="Completed"
            value={completed.length}
            sub="Completed assessments"
          />
          <StatCard
            icon="clock"
            label="Pending"
            value={pendingCandidates.length}
            sub="Awaiting completion"
          />
          <StatCard
            icon="bar"
            label="Avg score"
            value={avgScore !== null ? `${avgScore}` : '—'}
            sub={avgScore !== null ? slabel(avgScore) : 'No data yet'}
          />
          <StatCard
            icon="award"
            label="Recommended"
            value={recommendedCount}
            sub="Scoring 70 or above"
          />
        </div>

        {/* ── Bottom grid: table + assessments panel ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Candidates table ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...cs,
              padding: 0,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: `1px solid ${BD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 15.5, fontWeight: 700, color: TX,
                  }}>
                    All Candidates
                  </h2>
                  {search && (
                    <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>
                      {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                    </div>
                  )}
                </div>
                {candidates.length > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: TX3,
                    background: BG, border: `1px solid ${BD}`,
                    borderRadius: 6, padding: '3px 10px',
                  }}>
                    {candidates.length} total
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <EmptyState />
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        {['Candidate', 'Role', 'Status', 'Score', 'Risk', 'Date', ''].map(h => (
                          <th key={h} style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: TX3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            background: BG,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => {
                        const result      = c.results?.[0]
                        const score       = result?.overall_score ?? null
                        const risk        = result?.risk_level ?? null
                        const isCompleted = c.status === 'completed'
                        const isHovered   = hoveredRow === c.id
                        const isClickable = isCompleted
                        const isArchiving = archivingIds.has(c.id)
                        const isArchiveHovered = hoveredArchive === c.id

                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              if (isClickable) {
                                router.push(`/assessment/${c.assessments.id}/candidate/${c.id}`)
                              }
                            }}
                            onMouseEnter={() => setHoveredRow(c.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                              borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none',
                              background: isHovered ? TEALLT : CARD,
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'background 0.12s',
                            }}
                          >
                            {/* Candidate name + email */}
                            <td style={{ padding: '12px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <Avatar name={c.name} size={30} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 13, fontWeight: 600, color: TX,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.name}
                                  </div>
                                  <div style={{
                                    fontSize: 11.5, color: TX3,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '12px 12px' }}>
                              <span style={{
                                fontSize: 12.5, color: TX2, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', display: 'block',
                              }}>
                                {c.assessments?.role_title || '—'}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 12px' }}>
                              <StatusBadge status={c.status} />
                            </td>

                            {/* Score */}
                            <td style={{ padding: '12px 12px' }}>
                              {isCompleted && score !== null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                  <span style={{
                                    fontFamily: FM, fontSize: 16, fontWeight: 700,
                                    color: scolor(score), lineHeight: 1,
                                  }}>
                                    {score}
                                  </span>
                                  <span style={{ fontSize: 10.5, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 13 }}>—</span>
                              )}
                            </td>

                            {/* Risk */}
                            <td style={{ padding: '12px 12px' }}>
                              {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 13 }}>—</span>}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '12px 12px' }}>
                              <span style={{ fontSize: 12, color: TX3, whiteSpace: 'nowrap' }}>
                                {isCompleted ? fmt(c.completed_at) : fmt(c.invited_at)}
                              </span>
                            </td>

                            {/* Archive */}
                            <td style={{ padding: '12px 8px' }}>
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmArchive(c) }}
                                onMouseEnter={() => setHoveredArchive(c.id)}
                                onMouseLeave={() => setHoveredArchive(null)}
                                disabled={isArchiving}
                                title="Archive candidate"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 32,
                                  height: 32,
                                  borderRadius: 7,
                                  border: `1px solid ${isArchiveHovered ? '#fecaca' : BD}`,
                                  background: isArchiveHovered ? REDBG : 'transparent',
                                  cursor: isArchiving ? 'wait' : 'pointer',
                                  transition: 'all 0.15s',
                                  opacity: isArchiving ? 0.5 : 1,
                                  padding: 0,
                                }}
                              >
                                <Ic name="archive" size={14} color={isArchiveHovered ? RED : TX3} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Assessments sidebar panel ── */}
          <div style={{ width: 268, flexShrink: 0 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '18px 20px',
                borderBottom: `1px solid ${BD}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: TX }}>
                  Active Assessments
                </h2>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, color: TEALD,
                  background: TEALLT, borderRadius: 6, padding: '2px 8px',
                }}>
                  {assessments.length}
                </span>
              </div>

              {assessments.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: TEALLT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <Ic name="layers" size={18} color={TEALD} />
                  </div>
                  <div style={{ fontSize: 13, color: TX2, fontWeight: 600, marginBottom: 6 }}>
                    No active assessments
                  </div>
                  <div style={{ fontSize: 12, color: TX3, marginBottom: 16, lineHeight: 1.5 }}>
                    Create one to start inviting candidates.
                  </div>
                  <button
                    onClick={() => router.push('/assessment/new')}
                    style={{ ...bs('secondary', 'sm'), width: '100%', justifyContent: 'center' }}
                  >
                    <Ic name="plus" size={13} color={TX2} />
                    New assessment
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {assessments.map(a => {
                    const candidatesForAssessment = candidates.filter(
                      c => c.assessments?.id === a.id
                    )
                    const completedCount = candidatesForAssessment.filter(c => c.status === 'completed').length
                    const totalForAssessment = candidatesForAssessment.length

                    return (
                      <AssessmentCard
                        key={a.id}
                        assessment={a}
                        completed={completedCount}
                        total={totalForAssessment}
                        onClick={() => router.push(`/assessment/${a.id}`)}
                      />
                    )
                  })}

                  <button
                    onClick={() => router.push('/assessment/new')}
                    style={{
                      ...bs('secondary', 'sm'),
                      width: '100%',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Ic name="plus" size={13} color={TX2} />
                    New assessment
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function AssessmentCard({ assessment, completed, total, onClick }) {
  const [hovered, setHovered] = useState(false)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${hovered ? TEAL : BD}`,
        background: hovered ? TEALLT : CARD,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{
        fontSize: 13, fontWeight: 700, color: TX,
        marginBottom: 4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {assessment.role_title}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: total > 0 ? 8 : 0,
      }}>
        <span style={{ fontSize: 11.5, color: TX3 }}>
          {total} candidate{total !== 1 ? 's' : ''}
          {total > 0 ? ` · ${completed} done` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Ic name="right" size={12} color={hovered ? TEALD : TX3} />
        </div>
      </div>
      {total > 0 && (
        <div style={{
          height: 4, borderRadius: 2, background: BD, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${TEAL}, ${TEALD})`,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
      <div style={{
        fontSize: 11, color: TX3, marginTop: total > 0 ? 5 : 0,
      }}>
        {assessment.detected_role_type && (
          <span style={{
            display: 'inline-block',
            padding: '1px 7px',
            borderRadius: 4,
            background: BG,
            border: `1px solid ${BD}`,
            fontSize: 10.5,
            fontWeight: 600,
            color: TX3,
            textTransform: 'capitalize',
          }}>
            {assessment.detected_role_type}
          </span>
        )}
      </div>
    </div>
  )
}
