'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  F, FM, scolor, slabel, cs, bs,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CandidateFeedbackPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('users')
        .select('company_name').eq('id', user.id).maybeSingle()
      if (prof?.company_name) setCompanyName(prof.company_name)

      const { data: cands } = await supabase
        .from('candidates')
        .select('id, name, email, unique_link, status, completed_at, assessments(role_title), results(overall_score)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      setCandidates(cands || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim()
    ? candidates.filter(c => {
        const q = search.toLowerCase()
        return (c.name || '').toLowerCase().includes(q)
          || (c.email || '').toLowerCase().includes(q)
          || (c.assessments?.role_title || '').toLowerCase().includes(q)
      })
    : candidates

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar active="feedback" companyName={companyName} />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '24px 16px' : '36px 40px',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontFamily: F, fontSize: 24, fontWeight: 800, color: TX,
              margin: '0 0 6px', letterSpacing: '-0.3px',
            }}>
              Candidate feedback
            </h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Every candidate who completed an assessment can receive a tailored development report. Share the report link with the candidate.
            </p>
          </div>

          {loading ? (
            <div style={{ ...cs, padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ ...cs, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: TEALLT,
                border: `1px solid ${TEAL}55`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <Ic name="mail" size={20} color={TEALD} />
              </div>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX, marginBottom: 6 }}>
                No completed assessments yet
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: TX3, marginBottom: 18, lineHeight: 1.55 }}>
                Once candidates complete their assessments you will be able to share development reports with them here.
              </div>
              <button
                type="button"
                onClick={() => router.push('/assessment/new')}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: TEAL, color: NAVY,
                  fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                }}
              >
                Send an assessment
              </button>
            </div>
          ) : (
            <>
              <div style={{ ...cs, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: F, fontSize: 13, color: TX3 }}>
                  {filtered.length} of {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
                </div>
                <div style={{ position: 'relative', minWidth: isMobile ? '100%' : 280 }}>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email or role"
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 720 : undefined }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        {['Candidate', 'Role', 'Date', 'Score', ''].map(h => (
                          <th key={h} style={{
                            padding: '12px 16px', textAlign: 'left',
                            fontSize: 11, fontWeight: 700, color: TX3,
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                            whiteSpace: 'nowrap', background: BG,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => {
                        const res = Array.isArray(c.results) ? c.results[0] : c.results
                        const score = res?.overall_score ?? null
                        return (
                          <tr key={c.id} style={{
                            borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none',
                            background: CARD,
                          }}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={c.name} size={30} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: TX }}>
                                    {c.name}
                                  </div>
                                  <div style={{ fontSize: 11.5, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                                    {c.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: 13, color: TX2, fontWeight: 500 }}>
                                {c.assessments?.role_title || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontSize: 12, color: TX3, whiteSpace: 'nowrap' }}>
                                {fmtDate(c.completed_at)}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {score != null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                  <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: scolor(score), lineHeight: 1 }}>
                                    {score}
                                  </span>
                                  <span style={{ fontSize: 10.5, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 12 }}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              {c.unique_link ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/assess/${c.unique_link}/feedback`)}
                                  style={{
                                    padding: '8px 14px', borderRadius: 7, border: 'none',
                                    background: TEAL, color: NAVY,
                                    fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  View development report
                                </button>
                              ) : (
                                <span style={{ color: TX3, fontSize: 11.5 }}>No link</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
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
