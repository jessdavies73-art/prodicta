'use client'
import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, scolor, sbg, slabel, cs, bs, ps,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

export default function BenchmarksPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [assessments, setAssessments] = useState([])
  const [candidates, setCandidates] = useState([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('company_name').eq('id', user.id).single()
      if (prof?.company_name) setCompanyName(prof.company_name)

      const { data: assess } = await supabase
        .from('assessments')
        .select('id, role_title, detected_role_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setAssessments(assess || [])

      const { data: cands } = await supabase
        .from('candidates')
        .select('id, name, assessment_id, status, results(overall_score, risk_level, candidate_type)')
        .eq('status', 'scored')
        .in('assessment_id', (assess || []).map(a => a.id))
      setCandidates((cands || []).filter(c => c.results && c.results.length > 0))
      setLoading(false)
    }
    load()
  }, [])

  // Derive benchmark data
  const roleStats = useMemo(() => {
    const map = {}
    for (const c of candidates) {
      const assess = assessments.find(a => a.id === c.assessment_id)
      if (!assess) continue
      const role = assess.role_title
      if (!map[role]) map[role] = { scores: [], passed: 0, total: 0 }
      const score = c.results[0]?.overall_score
      if (typeof score === 'number') {
        map[role].scores.push(score)
        map[role].total++
        if (score >= 70) map[role].passed++
      }
    }
    return Object.entries(map).map(([role, d]) => ({
      role,
      avg: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
      passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
      count: d.total,
    })).sort((a, b) => b.avg - a.avg)
  }, [candidates, assessments])

  const sectorStats = useMemo(() => {
    const map = {}
    for (const c of candidates) {
      const assess = assessments.find(a => a.id === c.assessment_id)
      if (!assess) continue
      const sector = assess.detected_role_type || 'general'
      if (!map[sector]) map[sector] = { scores: [], total: 0 }
      const score = c.results[0]?.overall_score
      if (typeof score === 'number') {
        map[sector].scores.push(score)
        map[sector].total++
      }
    }
    return Object.entries(map).map(([sector, d]) => ({
      sector: sector.charAt(0).toUpperCase() + sector.slice(1).replace(/_/g, ' '),
      avg: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
      count: d.total,
    })).sort((a, b) => b.avg - a.avg)
  }, [candidates, assessments])

  const topCandidates = useMemo(() => {
    return [...candidates]
      .filter(c => typeof c.results[0]?.overall_score === 'number')
      .sort((a, b) => (b.results[0]?.overall_score || 0) - (a.results[0]?.overall_score || 0))
      .slice(0, 10)
  }, [candidates])

  const distribution = useMemo(() => {
    const buckets = [
      { label: '90-100', min: 90, max: 100, count: 0 },
      { label: '75-89', min: 75, max: 89, count: 0 },
      { label: '60-74', min: 60, max: 74, count: 0 },
      { label: '45-59', min: 45, max: 59, count: 0 },
      { label: '0-44', min: 0, max: 44, count: 0 },
    ]
    for (const c of candidates) {
      const score = c.results[0]?.overall_score
      if (typeof score !== 'number') continue
      const b = buckets.find(b => score >= b.min && score <= b.max)
      if (b) b.count++
    }
    const maxCount = Math.max(1, ...buckets.map(b => b.count))
    return buckets.map(b => ({ ...b, pct: Math.round((b.count / maxCount) * 100) }))
  }, [candidates])

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar companyName={companyName} />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', ...cs, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar companyName={companyName} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: `1px solid ${BD}`, background: CARD, cursor: 'pointer', flexShrink: 0 }}>
              <Ic name="left" size={18} color={TX2} />
            </button>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>Benchmarks</h1>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '4px 0 0' }}>Scoring benchmarks and pass rates across your assessments.</p>
            </div>
          </div>

          {candidates.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
              <Ic name="layers" size={28} color={BD} />
              <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '12px 0 0' }}>
                No scored candidates yet. Benchmarks will appear once assessments are completed.
              </p>
            </div>
          ) : (
            <>
              {/* Score distribution */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Score Distribution</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {distribution.map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TX2, minWidth: 48, textAlign: 'right' }}>{b.label}</span>
                      <div style={{ flex: 1, height: 22, background: BG, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${b.pct}%`, height: '100%', borderRadius: 4,
                          background: b.min >= 75 ? TEAL : b.min >= 60 ? TEALD : b.min >= 45 ? AMB : RED,
                          transition: 'width 0.4s ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                        }}>
                          {b.count > 0 && <span style={{ fontFamily: F, fontSize: 10, fontWeight: 800, color: '#fff' }}>{b.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: F, fontSize: 11, color: TX3, margin: '10px 0 0' }}>
                  {candidates.length} scored candidate{candidates.length !== 1 ? 's' : ''} across {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Average score by role */}
              {roleStats.length > 0 && (
                <div style={{ ...cs, marginBottom: 20 }}>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Average Score by Role</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: BG }}>
                          {['Role', 'Avg Score', 'Pass Rate', 'Candidates'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: TX2, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roleStats.map((r, i) => (
                          <tr key={r.role} style={{ borderBottom: i < roleStats.length - 1 ? `1px solid ${BD}` : 'none' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: TX }}>{r.role}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: FM, fontWeight: 700, color: scolor(r.avg) }}>{r.avg}</span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ ...ps(r.passRate >= 70 ? GRNBG : r.passRate >= 50 ? AMBBG : REDBG, r.passRate >= 70 ? GRN : r.passRate >= 50 ? AMB : RED), fontSize: 11 }}>
                                {r.passRate}%
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: TX2 }}>{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Average score by sector */}
              {sectorStats.length > 0 && (
                <div style={{ ...cs, marginBottom: 20 }}>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Average Score by Sector</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sectorStats.map(s => (
                      <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, minWidth: isMobile ? 100 : 160 }}>{s.sector}</span>
                        <div style={{ flex: 1, height: 8, background: BG, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${s.avg}%`, height: '100%', background: scolor(s.avg), borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: scolor(s.avg), minWidth: 28, textAlign: 'right' }}>{s.avg}</span>
                        <span style={{ fontFamily: F, fontSize: 11, color: TX3, minWidth: 20 }}>({s.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top candidates */}
              {topCandidates.length > 0 && (
                <div style={{ ...cs, marginBottom: 20 }}>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Top Performing Candidates</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topCandidates.map((c, i) => {
                      const score = c.results[0]?.overall_score || 0
                      const assess = assessments.find(a => a.id === c.assessment_id)
                      return (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          background: i === 0 ? TEALLT : BG, borderRadius: 8,
                          borderLeft: `3px solid ${i === 0 ? TEAL : scolor(score)}`,
                        }}>
                          <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: TX3, minWidth: 22 }}>#{i + 1}</span>
                          <Avatar name={c.name} size={28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>{c.name}</div>
                            <div style={{ fontFamily: F, fontSize: 11, color: TX3 }}>{assess?.role_title || '--'}</div>
                          </div>
                          <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: scolor(score) }}>{score}</span>
                          <span style={{ ...ps(sbg(score), scolor(score)), fontSize: 10 }}>{slabel(score)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
