'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, cs, bs, scolor,
} from '@/lib/constants'

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44,
          border: `3px solid ${BD}`,
          borderTop: `3px solid ${TEAL}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <div style={{ color: TX2, fontSize: 14, fontFamily: F }}>Loading archive…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

function fmt(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ArchivePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [profile, setProfile] = useState(null)
  const [restoring, setRestoring] = useState(null)
  const [error, setError] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { router.push('/login'); return }

        const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile({ ...prof, id: user.id })

        const { data: cands, error: candsErr } = await supabase
          .from('candidates')
          .select('*, assessments(role_title), results(overall_score)')
          .eq('user_id', user.id)
          .eq('status', 'archived')
          .order('invited_at', { ascending: false })

        if (candsErr) throw candsErr
        setCandidates(cands || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleRestore(candidateId) {
    setRestoring(candidateId)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('candidates')
        .update({ status: 'sent' })
        .eq('id', candidateId)
      if (updateErr) throw updateErr
      setCandidates(prev => prev.filter(c => c.id !== candidateId))
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="archive" companyName={profile?.company_name} />
      <main style={{
        marginLeft: 220,
        padding: '36px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
            Archive
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: TX2 }}>
            Candidates you've archived from your active pipeline.
          </p>
        </div>

        {error && (
          <div style={{
            ...cs,
            background: REDBG,
            border: `1px solid ${REDBD}`,
            color: RED,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            padding: '14px 18px',
          }}>
            <Ic name="alert" size={16} color={RED} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Table card */}
        <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${BD}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: TX }}>
              Archived candidates
            </h2>
            {candidates.length > 0 && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: TX3,
                background: BG,
                border: `1px solid ${BD}`,
                borderRadius: 6,
                padding: '3px 10px',
              }}>
                {candidates.length} total
              </span>
            )}
          </div>

          {candidates.length === 0 ? (
            /* Empty state */
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: TEALLT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
              }}>
                <Ic name="archive" size={24} color={TEALD} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TX, marginBottom: 8 }}>
                No archived candidates
              </div>
              <div style={{ fontSize: 13.5, color: TX2, maxWidth: 320, margin: '0 auto' }}>
                Candidates you archive from the dashboard will appear here.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BD}` }}>
                    {['Candidate', 'Role', 'Score', 'Date invited', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 16px',
                        textAlign: i === 4 ? 'right' : 'left',
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
                  {candidates.map((c, i) => {
                    const score = c.results?.[0]?.overall_score ?? null
                    const isHovered = hoveredRow === c.id
                    const isRestoring = restoring === c.id

                    return (
                      <tr
                        key={c.id}
                        onMouseEnter={() => setHoveredRow(c.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderBottom: i < candidates.length - 1 ? `1px solid ${BD}` : 'none',
                          background: isHovered ? BG : CARD,
                          transition: 'background 0.12s',
                        }}
                      >
                        {/* Candidate */}
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                            <Avatar name={c.name} size={40} />
                            <div>
                              <div style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: TX,
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {c.name}
                              </div>
                              <div style={{
                                fontSize: 12,
                                color: TX3,
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {c.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ padding: '13px 16px' }}>
                          <span style={{
                            fontSize: 13,
                            color: TX2,
                            fontWeight: 500,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}>
                            {c.assessments?.role_title || '-'}
                          </span>
                        </td>

                        {/* Score */}
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          {score !== null ? (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{
                                fontFamily: FM,
                                fontSize: 18,
                                fontWeight: 700,
                                color: scolor(score),
                                lineHeight: 1,
                              }}>
                                {score}
                              </span>
                              <span style={{ fontSize: 11, color: TX3 }}>/100</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: TX3 }}>-</span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12.5, color: TX3 }}>{fmt(c.invited_at)}</span>
                        </td>

                        {/* Restore */}
                        <td style={{ padding: '13px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleRestore(c.id)}
                            disabled={isRestoring}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              borderRadius: 7,
                              border: `1.5px solid ${isRestoring ? BD : TEAL}`,
                              background: isRestoring ? BG : TEALLT,
                              color: isRestoring ? TX3 : TEALD,
                              fontFamily: F,
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: isRestoring ? 'wait' : 'pointer',
                              transition: 'all 0.15s',
                              opacity: isRestoring ? 0.6 : 1,
                            }}
                          >
                            <Ic name="right" size={13} color={isRestoring ? TX3 : TEALD} />
                            {isRestoring ? 'Restoring…' : 'Restore'}
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

      </main>
    </div>
  )
}
