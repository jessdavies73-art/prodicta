'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, cs, bs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Status derivation for a weekly checkpoint. `rating` is present if the review
// has been submitted; otherwise we use days elapsed from assignment start to
// show Due / Upcoming / Overdue.
function reviewStatus({ week, rating, startDate }) {
  if (rating) return { label: 'Completed', color: GRN, bg: GRNBG, bd: GRNBD }
  if (!startDate) return { label: 'Scheduled', color: TX3, bg: BG, bd: BD }
  const start = new Date(startDate + (startDate.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(start.getTime())) return { label: 'Scheduled', color: TX3, bg: BG, bd: BD }
  const days = Math.floor((Date.now() - start.getTime()) / 86400000)
  const dueDay = week * 7
  // Window: 3 days before through 7 days after the target date.
  if (days < dueDay - 3) return { label: 'Upcoming', color: TX3, bg: BG, bd: BD }
  if (days <= dueDay + 7) return { label: 'Due now', color: AMB, bg: AMBBG, bd: AMBBD }
  return { label: 'Overdue', color: RED, bg: REDBG, bd: REDBD }
}

function StatusPill({ status }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '3px 10px', borderRadius: 999,
      background: status.bg, color: status.color,
      border: `1px solid ${status.bd}`,
      fontFamily: F, fontSize: 10.5, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {status.label}
    </span>
  )
}

export default function AssignmentReviewsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('') // '' | 'due' | 'overdue'

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('users')
        .select('company_name, account_type').eq('id', user.id).maybeSingle()
      if (prof?.company_name) setCompanyName(prof.company_name)

      if (prof?.account_type !== 'agency') {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      // Pull all assignment_reviews for this user, join candidate + assessment
      // so we can render rich rows without extra round-trips.
      const { data: reviews } = await supabase
        .from('assignment_reviews')
        .select(`
          id,
          candidate_id,
          assessment_id,
          client_company,
          assignment_start_date,
          week1_rating, week4_rating, week8_rating,
          candidates(id, name, email, assessment_id, assessments(id, role_title))
        `)
        .eq('user_id', user.id)
        .order('assignment_start_date', { ascending: false, nullsLast: true })

      setRows(reviews || [])
      setLoading(false)
    }
    load()
  }, [])

  const enriched = rows.map(r => {
    const cand = r.candidates
    const w1 = reviewStatus({ week: 1, rating: r.week1_rating, startDate: r.assignment_start_date })
    const w4 = reviewStatus({ week: 4, rating: r.week4_rating, startDate: r.assignment_start_date })
    const w8 = reviewStatus({ week: 8, rating: r.week8_rating, startDate: r.assignment_start_date })
    return {
      id: r.id,
      candidateId: r.candidate_id,
      assessmentId: r.assessment_id || cand?.assessment_id || cand?.assessments?.id || null,
      name: cand?.name || 'Unknown',
      role: cand?.assessments?.role_title || '-',
      client: r.client_company || '-',
      startDate: r.assignment_start_date,
      w1, w4, w8,
    }
  })

  const filtered = enriched.filter(r => {
    if (statusFilter === 'due' && ![r.w1, r.w4, r.w8].some(s => s.label === 'Due now')) return false
    if (statusFilter === 'overdue' && ![r.w1, r.w4, r.w8].some(s => s.label === 'Overdue')) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return r.name.toLowerCase().includes(q)
      || r.role.toLowerCase().includes(q)
      || r.client.toLowerCase().includes(q)
  })

  const counts = {
    total: enriched.length,
    due: enriched.filter(r => [r.w1, r.w4, r.w8].some(s => s.label === 'Due now')).length,
    overdue: enriched.filter(r => [r.w1, r.w4, r.w8].some(s => s.label === 'Overdue')).length,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar active="assignments" companyName={companyName} />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '24px 16px' : '36px 40px',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontFamily: F, fontSize: 24, fontWeight: 800, color: TX,
              margin: '0 0 6px', letterSpacing: '-0.3px',
            }}>
              Assignment reviews
            </h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Week 1, week 4, and week 8 checkpoints for every active placement. Catch issues before the client does.
            </p>
          </div>

          {accessDenied ? (
            <div style={{ ...cs, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: BG,
                border: `1px solid ${BD}`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <Ic name="shield" size={20} color={TX3} />
              </div>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, marginBottom: 6 }}>
                Available for agency accounts
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: TX3, lineHeight: 1.55, maxWidth: 440, margin: '0 auto' }}>
                Assignment reviews track placements at client sites. Direct employers can track equivalent data from the Probation Tracker on the dashboard.
              </div>
            </div>
          ) : loading ? (
            <div style={{ ...cs, padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : enriched.length === 0 ? (
            <div style={{ ...cs, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: TEALLT,
                border: `1px solid ${TEAL}55`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                <Ic name="file" size={20} color={TEALD} />
              </div>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, marginBottom: 6 }}>
                No assignment reviews yet
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: TX3, marginBottom: 18, lineHeight: 1.55 }}>
                Once you log a placement, week 1, week 4, and week 8 reviews appear here automatically.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { key: '',        label: 'Total',    value: counts.total,   color: TX },
                  { key: 'due',     label: 'Due now',  value: counts.due,     color: AMB },
                  { key: 'overdue', label: 'Overdue',  value: counts.overdue, color: RED },
                ].map(f => {
                  const active = statusFilter === f.key
                  return (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setStatusFilter(f.key)}
                      style={{
                        ...cs,
                        padding: '14px 18px',
                        border: `1.5px solid ${active ? f.color : BD}`,
                        background: active ? `${f.color}10` : CARD,
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                    >
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: TX3, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {f.label}
                      </div>
                      <div style={{ fontFamily: FM, fontSize: 24, fontWeight: 800, color: f.color, lineHeight: 1.05 }}>
                        {f.value}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ ...cs, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: F, fontSize: 13, color: TX3 }}>
                  {filtered.length} of {enriched.length} placement{enriched.length !== 1 ? 's' : ''}
                  {statusFilter ? ` · ${statusFilter === 'due' ? 'Due now' : 'Overdue'}` : ''}
                </div>
                <div style={{ position: 'relative', minWidth: isMobile ? '100%' : 280 }}>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by candidate, role or client"
                    style={{
                      width: '100%', padding: '9px 12px 9px 34px',
                      borderRadius: 8, border: `1px solid ${BD}`, background: BG,
                      fontFamily: F, fontSize: 13, color: TX, outline: 'none',
                    }}
                  />
                  <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                    <Ic name="search" size={13} color={TX3} />
                  </div>
                </div>
              </div>

              <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 960 : undefined }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        {['Candidate', 'Role', 'Client', 'Started', 'Week 1', 'Week 4', 'Week 8', ''].map(h => (
                          <th key={h} style={{
                            padding: '12px 14px', textAlign: 'left',
                            fontSize: 11, fontWeight: 700, color: TX3,
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                            whiteSpace: 'nowrap', background: BG,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: TX3, fontSize: 13 }}>
                            No placements match your filters.
                          </td>
                        </tr>
                      ) : filtered.map((r, i) => (
                        <tr key={r.id} style={{
                          borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none',
                          background: CARD,
                        }}>
                          <td style={{ padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Avatar name={r.name} size={28} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>{r.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span style={{ fontSize: 12.5, color: TX2, fontWeight: 500 }}>{r.role}</span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span style={{ fontSize: 12.5, color: TX2, fontWeight: 500 }}>{r.client}</span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <span style={{ fontSize: 12, color: TX3, whiteSpace: 'nowrap' }}>{fmtDate(r.startDate)}</span>
                          </td>
                          <td style={{ padding: '14px' }}>
                            <StatusPill status={r.w1} />
                          </td>
                          <td style={{ padding: '14px' }}>
                            <StatusPill status={r.w4} />
                          </td>
                          <td style={{ padding: '14px' }}>
                            <StatusPill status={r.w8} />
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            {r.assessmentId && r.candidateId ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/assessment/${r.assessmentId}/candidate/${r.candidateId}/assignment-review`)}
                                style={{
                                  padding: '8px 14px', borderRadius: 7, border: 'none',
                                  background: TEAL, color: NAVY,
                                  fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Do review
                              </button>
                            ) : (
                              <span style={{ color: TX3, fontSize: 11.5 }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
