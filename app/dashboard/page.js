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
  if (!dateStr) return '-'
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
      padding: '2px 7px',
      borderRadius: 50,
      fontSize: 11,
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
  if (!risk) return <span style={{ color: TX3, fontSize: 12 }}>-</span>
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 50,
      fontSize: 11,
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

  const [deletingIds, setDeletingIds] = useState(new Set())
  const [openMenu, setOpenMenu] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Close ⋯ menu when clicking anywhere outside
  useEffect(() => {
    if (!openMenu) return
    function close() { setOpenMenu(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenu])

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
          .select('*, assessments!inner(role_title, id), results(overall_score, risk_level, percentile, pressure_fit_score)')
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

  async function handleDelete(id) {
    setConfirmDelete(null)
    setDeletingIds(prev => new Set([...prev, id]))
    try {
      const supabase = createClient()
      // Delete results first, then candidate (handles DBs without cascade)
      await supabase.from('results').delete().eq('candidate_id', id)
      await supabase.from('candidates').delete().eq('id', id)
      setCandidates(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingIds(prev => { const next = new Set(prev); next.delete(id); return next })
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

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,33,55,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
          onClick={() => setConfirmDelete(null)}
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
              <Ic name="trash" size={20} color={RED} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: TX }}>
              Permanently delete this candidate?
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: TX2, lineHeight: 1.6 }}>
              <strong>{confirmDelete.name}</strong> and all their assessment data will be permanently removed. This cannot be undone.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 12.5, color: TX3, lineHeight: 1.5 }}>
              If you just want to hide them from your pipeline, use Archive instead.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: RED, color: '#fff', fontFamily: F,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Delete permanently
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
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
            value={avgScore !== null ? `${avgScore}` : '-'}
            sub={avgScore !== null ? slabel(avgScore) : 'No data yet'}
          />
          <StatCard
            icon="award"
            label="Recommended"
            value={recommendedCount}
            sub="Scoring 70 or above"
          />
        </div>

        {/* ── Hiring Risk Overview ── */}
        <HiringRiskOverview completed={completed} />

        {/* ── ERA 2025 Risk Calculator / Placement Risk ── */}
        <RiskCalculator profile={profile} completed={completed} />

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
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '5%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        {['Candidate', 'Role', 'Status', 'Score', 'Pressure', 'Risk', 'Date', ''].map(h => (
                          <th key={h} style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: TX3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
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
                        const pf          = result?.pressure_fit_score ?? null
                        const risk        = result?.risk_level ?? null
                        const isCompleted = c.status === 'completed'
                        const isHovered   = hoveredRow === c.id
                        const isClickable = isCompleted
                        const isArchiving = archivingIds.has(c.id)
                        const isDeleting  = deletingIds.has(c.id)
                        const menuOpen    = openMenu === c.id

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
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={c.name} size={28} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    fontSize: 12.5, fontWeight: 600, color: TX,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.name}
                                  </div>
                                  <div style={{
                                    fontSize: 11, color: TX3,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <span style={{
                                fontSize: 12, color: TX2, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', display: 'block',
                              }}>
                                {c.assessments?.role_title || '-'}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <StatusBadge status={c.status} />
                            </td>

                            {/* Score */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted && score !== null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                  <span style={{
                                    fontFamily: FM, fontSize: 15, fontWeight: 700,
                                    color: scolor(score), lineHeight: 1,
                                  }}>
                                    {score}
                                  </span>
                                  <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 12 }}>-</span>
                              )}
                            </td>

                            {/* Pressure-Fit */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted && pf !== null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                  <span style={{
                                    fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1,
                                    color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED,
                                  }}>
                                    {pf}
                                  </span>
                                  <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 12 }}>-</span>
                              )}
                            </td>

                            {/* Risk */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <span style={{ fontSize: 11.5, color: TX3, whiteSpace: 'nowrap' }}>
                                {isCompleted ? fmt(c.completed_at) : fmt(c.invited_at)}
                              </span>
                            </td>

                            {/* Actions ⋯ menu */}
                            <td style={{ padding: '10px 4px', overflow: 'hidden' }}>
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    setOpenMenu(menuOpen ? null : c.id)
                                  }}
                                  disabled={isArchiving || isDeleting}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 32, height: 32, borderRadius: 7, padding: 0,
                                    border: `1px solid ${menuOpen ? TEAL : BD}`,
                                    background: menuOpen ? TEALLT : 'transparent',
                                    cursor: (isArchiving || isDeleting) ? 'wait' : 'pointer',
                                    transition: 'all 0.15s',
                                    opacity: (isArchiving || isDeleting) ? 0.5 : 1,
                                  }}
                                >
                                  <Ic name="more-vertical" size={14} color={menuOpen ? TEALD : TX3} />
                                </button>

                                {menuOpen && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                      position: 'absolute', right: 0, top: 36, zIndex: 50,
                                      background: CARD, border: `1px solid ${BD}`,
                                      borderRadius: 10, boxShadow: '0 8px 24px rgba(15,33,55,0.12)',
                                      minWidth: 170, overflow: 'hidden',
                                    }}
                                  >
                                    <button
                                      onClick={() => { setOpenMenu(null); setConfirmArchive(c) }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        width: '100%', padding: '10px 14px',
                                        border: 'none', background: 'transparent',
                                        color: TX2, fontFamily: F, fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer', textAlign: 'left',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = BG}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Ic name="archive" size={14} color={TX3} />
                                      Archive
                                    </button>
                                    <div style={{ height: 1, background: BD, margin: '0 10px' }} />
                                    <button
                                      onClick={() => { setOpenMenu(null); setConfirmDelete(c) }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        width: '100%', padding: '10px 14px',
                                        border: 'none', background: 'transparent',
                                        color: RED, fontFamily: F, fontSize: 13, fontWeight: 600,
                                        cursor: 'pointer', textAlign: 'left',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = REDBG}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Ic name="trash" size={14} color={RED} />
                                      Delete permanently
                                    </button>
                                  </div>
                                )}
                              </div>
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

function HiringRiskOverview({ completed }) {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // This month's completed candidates
  const thisMonth = completed.filter(c => {
    if (!c.completed_at) return false
    const d = new Date(c.completed_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  // Fall back to all-time if nothing this month
  const pool = thisMonth.length > 0 ? thisMonth : completed
  const periodLabel = thisMonth.length > 0 ? monthLabel : 'All time'
  const isThisMonth = thisMonth.length > 0

  const assessed  = pool.length
  const passed    = pool.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length
  const failed    = assessed - passed
  const passRate  = assessed > 0 ? Math.round((passed / assessed) * 100) : null
  const avgScore  = assessed > 0
    ? Math.round(pool.reduce((sum, c) => sum + (c.results?.[0]?.overall_score ?? 0), 0) / assessed)
    : null

  // High risk = any result where risk_level contains 'High'
  const highRisk  = completed.filter(c => {
    const rl = c.results?.[0]?.risk_level ?? ''
    return rl.toLowerCase().includes('high')
  })

  const passColor = passRate === null ? TX3 : passRate >= 70 ? GRN : passRate >= 50 ? AMB : RED
  const passBg    = passRate === null ? BG   : passRate >= 70 ? GRNBG : passRate >= 50 ? AMBBG : REDBG
  const passBd    = passRate === null ? BD   : passRate >= 70 ? GRNBD : passRate >= 50 ? '#fde68a' : '#fecaca'

  const avgColor  = avgScore === null ? TX3 : avgScore >= 70 ? GRN : avgScore >= 50 ? AMB : RED
  const avgBg     = avgScore === null ? BG   : avgScore >= 70 ? GRNBG : avgScore >= 50 ? AMBBG : REDBG

  const METRICS = [
    {
      label: 'Assessed',
      value: assessed > 0 ? assessed : '-',
      sub: isThisMonth ? 'This month' : 'All time',
      color: TEALD, bg: TEALLT, bd: `${TEAL}55`,
    },
    {
      label: 'Pass rate',
      value: passRate !== null ? `${passRate}%` : '-',
      sub: `${passed} of ${assessed} scored 70+`,
      color: passColor, bg: passBg, bd: passBd,
    },
    {
      label: 'Average score',
      value: avgScore !== null ? avgScore : '-',
      sub: avgScore !== null ? (avgScore >= 70 ? 'Above threshold' : avgScore >= 50 ? 'Below threshold' : 'Needs attention') : 'No data yet',
      color: avgColor, bg: avgBg, bd: `${avgColor}55`,
    },
  ]

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${BD}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 15.5, fontWeight: 700, color: TX }}>
            Hiring Pipeline Health
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: TX3, fontFamily: F }}>
            Quality snapshot across all active assessments, useful for employers and recruitment agencies alike.
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, flexShrink: 0,
          background: isThisMonth ? TEALLT : BG,
          border: `1px solid ${isThisMonth ? `${TEAL}55` : BD}`,
          fontSize: 12, fontWeight: 700,
          color: isThisMonth ? TEALD : TX3,
        }}>
          <Ic name="calendar" size={12} color={isThisMonth ? TEALD : TX3} />
          {periodLabel}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {completed.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '24px 0', color: TX3, fontSize: 13.5 }}>
            <Ic name="bar" size={28} color={BD} />
            <div style={{ marginTop: 10 }}>No completed assessments yet. Stats will appear here once candidates finish.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* 3 metric tiles */}
              {METRICS.map(({ label, value, sub, color, bg, bd }) => (
                <div key={label} style={{
                  flex: 1, minWidth: 140,
                  background: bg,
                  border: `1px solid ${bd}`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11.5, color: TX3 }}>{sub}</div>
                </div>
              ))}

              {/* High risk callout — larger, red */}
              <div style={{
                flex: '1 1 180px',
                background: highRisk.length > 0
                  ? `linear-gradient(135deg, ${REDBG}, #fff5f5)`
                  : GRNBG,
                border: `1.5px solid ${highRisk.length > 0 ? '#fecaca' : GRNBD}`,
                borderRadius: 10, padding: '14px 16px',
                position: 'relative', overflow: 'hidden',
              }}>
                {highRisk.length > 0 && (
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 56, height: 56, borderRadius: '50%',
                    background: `${RED}15`,
                  }} />
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
                  color: highRisk.length > 0 ? RED : GRN,
                }}>
                  High risk flagged
                </div>
                <div style={{
                  fontFamily: FM, fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 4,
                  color: highRisk.length > 0 ? RED : GRN,
                }}>
                  {highRisk.length}
                </div>
                <div style={{ fontSize: 11.5, color: TX3 }}>
                  {highRisk.length === 0
                    ? 'No high-risk candidates'
                    : highRisk.length === 1
                    ? '1 candidate needs attention'
                    : `${highRisk.length} candidates need attention`}
                </div>
              </div>
            </div>

            {/* Pass / fail bar */}
            {assessed > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: GRN }}>
                    {passed} passed (≥70)
                  </span>
                  {failed > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: RED }}>
                      {failed} below threshold
                    </span>
                  )}
                </div>
                <div style={{ height: 7, borderRadius: 4, background: REDBG, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${passRate ?? 0}%`,
                    background: `linear-gradient(90deg, ${GRN}, #34d399)`,
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11.5, color: TX3, marginTop: 6 }}>
                  Pass rate vs fail rate across {assessed} scored candidate{assessed !== 1 ? 's' : ''}
                  {isThisMonth ? ' this month' : ' in total'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PlacementRiskCard({ completed = [] }) {
  const [fee, setFee] = useState('5000')
  const [feeFocused, setFeeFocused] = useState(false)

  const feeVal = Math.max(0, parseInt(fee.replace(/[^0-9]/g, '')) || 0)
  const replacementSearch = 3000
  const totalLoss = feeVal + replacementSearch

  function gbp(n) {
    return '£' + n.toLocaleString('en-GB')
  }

  const now = new Date()
  const thisMonth = completed.filter(c => {
    if (!c.completed_at) return false
    const d = new Date(c.completed_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const assessedThisMonth = thisMonth.length
  const highRiskThisMonth = thisMonth.filter(c => {
    const rl = c.results?.[0]?.risk_level ?? ''
    return rl.toLowerCase().includes('high')
  }).length

  const inputStyle = focused => ({
    fontFamily: F,
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: CARD,
    color: NAVY,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        background: NAVY,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: `${PURPLE}22`, border: `1px solid ${PURPLE}55`,
              fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.04em',
            }}>
              AGENCY
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: `${RED}22`, border: `1px solid ${RED}55`,
              fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.04em',
            }}>
              PLACEMENT RISK
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            What does a failed placement cost you?
          </h2>
        </div>
        <Ic name="shield" size={28} color={`${TEAL}88`} />
      </div>

      <div style={{ padding: '24px 28px' }}>

        {/* This-month candidate stats — only shown when there is data */}
        {assessedThisMonth > 0 && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 160,
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Assessed this month
              </div>
              <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, color: TEALD, lineHeight: 1, marginBottom: 4 }}>
                {assessedThisMonth}
              </div>
              <div style={{ fontSize: 11.5, color: TX3 }}>Candidates assessed before sending to clients</div>
            </div>
            <div style={{
              flex: 1, minWidth: 160,
              background: highRiskThisMonth > 0 ? REDBG : GRNBG,
              border: `1px solid ${highRiskThisMonth > 0 ? '#fecaca' : GRNBD}`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
                color: highRiskThisMonth > 0 ? RED : GRN,
              }}>
                Flagged high risk
              </div>
              <div style={{ fontFamily: FM, fontSize: 34, fontWeight: 800, lineHeight: 1, marginBottom: 4,
                color: highRiskThisMonth > 0 ? RED : GRN,
              }}>
                {highRiskThisMonth}
              </div>
              <div style={{ fontSize: 11.5, color: TX3 }}>
                {highRiskThisMonth === 0
                  ? 'No high-risk candidates this month'
                  : `Flagged before being sent to clients`}
              </div>
            </div>
          </div>
        )}

        {/* Average fee input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>
            Average placement fee
          </label>
          <div style={{ position: 'relative', maxWidth: 280 }}>
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, fontWeight: 700, color: TX3, pointerEvents: 'none',
            }}>£</span>
            <input
              type="text"
              value={fee}
              onChange={e => setFee(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => setFeeFocused(true)}
              onBlur={() => setFeeFocused(false)}
              style={{ ...inputStyle(feeFocused), paddingLeft: 26 }}
              placeholder="5000"
            />
          </div>
        </div>

        {/* Cost breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Cost of a failed placement
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Lost placement fee',         value: gbp(feeVal),          note: 'Not recovered on failed placement',           color: RED,    bg: REDBG },
              { label: 'Replacement search cost',    value: gbp(replacementSearch), note: 'Average cost to source a replacement',       color: AMB,    bg: AMBBG },
              { label: 'Client relationship damage', value: 'Reputational',        note: 'Loss of future instructions, hard to quantify', color: PURPLE, bg: '#f5f3ff' },
            ].map(({ label, value, note, color, bg }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: bg, border: `1px solid ${color}33`,
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: TX3, marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color, flexShrink: 0 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total exposure */}
        <div style={{
          background: `linear-gradient(135deg, ${REDBG}, #fff5f5)`,
          border: `1.5px solid ${RED}66`,
          borderRadius: 12, padding: '18px 20px',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Total financial exposure: 1 failed placement
          </div>
          <div style={{ fontFamily: FM, fontSize: 40, fontWeight: 800, color: RED, lineHeight: 1, marginBottom: 4 }}>
            {gbp(totalLoss)}
          </div>
          <div style={{ fontSize: 12.5, color: TX2 }}>
            Lost fee + replacement search · excludes reputational damage
          </div>
        </div>

        {/* CTA */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: NAVY,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Ic name="shield" size={15} color={TEAL} />
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, fontFamily: F }}>
            <strong style={{ color: TEAL }}>PRODICTA</strong> helps you send candidates your clients can trust,{' '}
            identifying high-risk placements before you submit CVs.
          </p>
        </div>
      </div>
    </div>
  )
}

function RiskCalculator({ profile, completed = [] }) {
  if (profile?.account_type === 'agency') {
    return <PlacementRiskCard completed={completed} />
  }
  const [salary, setSalary] = useState('30000')
  const [hires, setHires] = useState('5')
  const [salFocused, setSalFocused] = useState(false)
  const [hiresFocused, setHiresFocused] = useState(false)

  const sal = Math.max(0, parseInt(salary.replace(/[^0-9]/g, '')) || 0)
  const h   = Math.max(1, parseInt(hires.replace(/[^0-9]/g, '')) || 1)

  const recruitment  = Math.round(sal * 0.15)
  const training     = 3000
  const productivity = Math.round(sal * 0.25)   // ~3 months lost
  const tribunal     = Math.round(sal * 0.75)   // conservative 9-month award, uncapped from Jan 2027
  const totalPerHire = recruitment + training + productivity + tribunal

  const failCount    = Math.max(1, Math.round(h * 0.2))
  const totalExposure = totalPerHire * failCount

  function gbp(n) {
    return '£' + n.toLocaleString('en-GB')
  }

  const inputStyle = focused => ({
    fontFamily: F,
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: CARD,
    color: NAVY,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  const BREAK = [
    { label: 'Recruitment cost',       value: recruitment,  note: '15% of salary',             color: AMB,  bg: AMBBG },
    { label: 'Training & onboarding',  value: training,     note: 'Average cost per hire',      color: AMB,  bg: AMBBG },
    { label: 'Lost productivity',      value: productivity, note: '~3 months in role',          color: AMB,  bg: AMBBG },
    { label: 'ERA 2025 tribunal risk', value: tribunal,     note: 'Uncapped from Jan 2027',     color: RED,  bg: REDBG },
  ]

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        background: NAVY,
        padding: '20px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: `${TEAL}22`, border: `1px solid ${TEAL}55`,
              fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.04em',
            }}>
              ERA 2025
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 20,
              background: `${RED}22`, border: `1px solid ${RED}55`,
              fontSize: 11, fontWeight: 700, color: '#f87171', letterSpacing: '0.04em',
            }}>
              RISK CALCULATOR
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            What does a bad hire actually cost you?
          </h2>
        </div>
        <Ic name="shield" size={28} color={`${TEAL}88`} />
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Inputs */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>
              Average salary for your hires
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: TX3, pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={salary}
                onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setSalFocused(true)}
                onBlur={() => setSalFocused(false)}
                style={{ ...inputStyle(salFocused), paddingLeft: 26 }}
                placeholder="30000"
              />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 6, fontFamily: F }}>
              Hires planned this year
            </label>
            <input
              type="text"
              value={hires}
              onChange={e => setHires(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => setHiresFocused(true)}
              onBlur={() => setHiresFocused(false)}
              style={inputStyle(hiresFocused)}
              placeholder="5"
            />
          </div>
        </div>

        {/* Cost breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Cost breakdown per failed hire
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BREAK.map(({ label, value, note, color, bg }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: bg, border: `1px solid ${color}33`,
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: TX3, marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color, flexShrink: 0 }}>
                  {gbp(value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total exposure panels */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {/* Per hire */}
          <div style={{
            flex: 1, minWidth: 220,
            background: `linear-gradient(135deg, ${AMBBG}, #fff8ed)`,
            border: `1.5px solid ${AMB}66`,
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: AMB, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Total exposure: 1 bad hire
            </div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: AMB, lineHeight: 1, marginBottom: 4 }}>
              {gbp(totalPerHire)}
            </div>
            <div style={{ fontSize: 12.5, color: TX2 }}>
              Recruitment + training + lost productivity + tribunal
            </div>
          </div>

          {/* 20% failure */}
          <div style={{
            flex: 1, minWidth: 220,
            background: `linear-gradient(135deg, ${REDBG}, #fff5f5)`,
            border: `1.5px solid ${RED}66`,
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Total exposure: 20% failure rate
            </div>
            <div style={{ fontFamily: FM, fontSize: 36, fontWeight: 800, color: RED, lineHeight: 1, marginBottom: 4 }}>
              {gbp(totalExposure)}
            </div>
            <div style={{ fontSize: 12.5, color: TX2 }}>
              {failCount} of {h} hire{h !== 1 ? 's' : ''} failing · industry average risk
            </div>
          </div>
        </div>

        {/* ERA 2025 warning note */}
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          borderRadius: 8,
          background: NAVY,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Ic name="alert" size={15} color={TEAL} />
          <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, fontFamily: F }}>
            <strong style={{ color: '#fff' }}>From January 2027,</strong> unfair dismissal claims can be made after just 6 months of employment, with no compensation cap.{' '}
            <strong style={{ color: TEAL }}>PRODICTA</strong> helps you identify high-risk hires before they start, reducing your ERA 2025 exposure.
          </p>
        </div>
      </div>
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
