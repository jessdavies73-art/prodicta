'use client'
import { useState, useEffect, Suspense, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, scolor, sbg, slabel, dL, dC, cs, bs, ps,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

function ScoreRing({ score, size = 64, strokeWidth = 5 }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - (score || 0) / 100)
  const color = scolor(score)
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BD} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, fill: TX }}>{score ?? '--'}</text>
    </svg>
  )
}

function CompareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [allCandidates, setAllCandidates] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('company_name').eq('id', user.id).single()
      if (prof?.company_name) setCompanyName(prof.company_name)

      const assessmentId = searchParams.get('assessmentId')
      const idsParam = searchParams.get('ids')

      if (!assessmentId) { setLoading(false); return }

      const { data: assess } = await supabase.from('assessments').select('id, role_title').eq('id', assessmentId).single()
      setAssessment(assess)

      const { data: allCands } = await supabase
        .from('candidates')
        .select('id, name, email, status, results(overall_score, scores, score_narratives, strengths, watchouts, risk_level, hiring_confidence, candidate_type)')
        .eq('assessment_id', assessmentId)
        .eq('status', 'scored')
        .order('name')
      const scored = (allCands || []).filter(c => c.results && c.results.length > 0)
      setAllCandidates(scored)

      if (idsParam) {
        const ids = new Set(idsParam.split(',').filter(Boolean))
        setSelectedIds(ids)
        setCandidates(scored.filter(c => ids.has(c.id)))
      } else {
        const ids = new Set(scored.map(c => c.id))
        setSelectedIds(ids)
        setCandidates(scored)
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleCandidate(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      setCandidates(allCandidates.filter(c => next.has(c.id)))
      return next
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar companyName={companyName} />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', ...cs, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          </div>
        </main>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar companyName={companyName} />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', ...cs, textAlign: 'center', padding: '48px 24px' }}>
            <Ic name="sliders" size={28} color={BD} />
            <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '12px 0 0' }}>
              No assessment selected. Open Compare from an assessment page.
            </p>
            <button onClick={() => router.push('/dashboard')} style={{ ...bs('primary', 'md'), marginTop: 16 }}>
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  const SKILLS = ['Communication', 'Problem solving', 'Prioritisation', 'Leadership']
  const cols = Math.min(candidates.length, isMobile ? 2 : 4)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar companyName={companyName} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: `1px solid ${BD}`, background: CARD, cursor: 'pointer', flexShrink: 0 }}>
              <Ic name="left" size={18} color={TX2} />
            </button>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>Compare Candidates</h1>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '4px 0 0' }}>{assessment.role_title}</p>
            </div>
          </div>

          {/* Candidate selector */}
          {allCandidates.length > 2 && (
            <div style={{ ...cs, marginBottom: 20, padding: '14px 20px' }}>
              <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Select candidates to compare</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allCandidates.map(c => {
                  const sel = selectedIds.has(c.id)
                  return (
                    <button key={c.id} onClick={() => toggleCandidate(c.id)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                      border: `1.5px solid ${sel ? TEAL : BD}`, background: sel ? TEALLT : CARD,
                      fontFamily: F, fontSize: 12.5, fontWeight: 600, color: sel ? TEALD : TX2, cursor: 'pointer',
                    }}>
                      {c.name}
                      {sel && <Ic name="check" size={12} color={TEALD} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {candidates.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: F, fontSize: 14, color: TX3 }}>Select at least one candidate to compare.</p>
            </div>
          ) : (
            <>
              {/* Score overview */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 20 }}>
                {candidates.map(c => {
                  const r = c.results[0]
                  const score = r?.overall_score ?? 0
                  return (
                    <div key={c.id} style={{ ...cs, textAlign: 'center', padding: '20px 16px' }}>
                      <div style={{ marginBottom: 10 }}><Avatar name={c.name} size={40} /></div>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginBottom: 12 }}>{r?.candidate_type || '--'}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                        <ScoreRing score={score} />
                      </div>
                      <span style={{ ...ps(sbg(score), scolor(score)), fontSize: 11 }}>{slabel(score)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Verdict and confidence */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 20 }}>
                {candidates.map(c => {
                  const r = c.results[0]
                  const score = r?.overall_score ?? 0
                  const verdict = dL(score)
                  const vColor = dC(score)
                  const hc = r?.hiring_confidence
                  return (
                    <div key={c.id} style={{ ...cs, padding: '16px' }}>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Verdict</div>
                      <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: vColor, marginBottom: 10 }}>{verdict}</div>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Hiring Confidence</div>
                      <div style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TX }}>
                        {hc?.score != null ? `${hc.score}%` : '--'}
                      </div>
                      {r?.risk_level && (
                        <div style={{ marginTop: 8 }}>
                          <span style={{ ...ps(sbg(score), scolor(score)), fontSize: 10 }}>Risk: {r.risk_level}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Skills breakdown */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Skills Breakdown</div>
                {SKILLS.map(skill => (
                  <div key={skill} style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX2, marginBottom: 6 }}>{skill}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
                      {candidates.map(c => {
                        const r = c.results[0]
                        const scores = r?.scores || {}
                        const val = scores[skill] ?? scores[skill.toLowerCase()] ?? '--'
                        const num = typeof val === 'number' ? val : null
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: BG, borderRadius: 3, overflow: 'hidden' }}>
                              {num != null && <div style={{ width: `${num}%`, height: '100%', background: scolor(num), borderRadius: 3, transition: 'width 0.3s' }} />}
                            </div>
                            <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: num != null ? scolor(num) : TX3, minWidth: 28, textAlign: 'right' }}>
                              {num ?? '--'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginTop: 6 }}>
                  {candidates.map(c => (
                    <div key={c.id} style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: TX3, textAlign: 'center' }}>{c.name}</div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Top Strengths</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, isMobile ? 1 : 4)}, 1fr)`, gap: 14 }}>
                  {candidates.map(c => {
                    const r = c.results[0]
                    const strengths = r?.strengths || []
                    return (
                      <div key={c.id}>
                        <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2, marginBottom: 8 }}>{c.name}</div>
                        {strengths.length === 0 ? (
                          <p style={{ fontFamily: F, fontSize: 12, color: TX3 }}>No strengths data</p>
                        ) : strengths.slice(0, 3).map((s, i) => (
                          <div key={i} style={{ borderLeft: `3px solid ${TEAL}`, paddingLeft: 10, marginBottom: 8 }}>
                            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX }}>{typeof s === 'string' ? s : s.label || s.title || '--'}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Watch-outs */}
              <div style={{ ...cs, marginBottom: 20 }}>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 14 }}>Watch-outs</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, isMobile ? 1 : 4)}, 1fr)`, gap: 14 }}>
                  {candidates.map(c => {
                    const r = c.results[0]
                    const watchouts = r?.watchouts || []
                    return (
                      <div key={c.id}>
                        <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2, marginBottom: 8 }}>{c.name}</div>
                        {watchouts.length === 0 ? (
                          <p style={{ fontFamily: F, fontSize: 12, color: TX3 }}>No watch-outs</p>
                        ) : watchouts.slice(0, 3).map((w, i) => (
                          <div key={i} style={{ borderLeft: `3px solid ${AMB}`, paddingLeft: 10, marginBottom: 8 }}>
                            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX }}>{typeof w === 'string' ? w : w.label || w.title || '--'}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f9fb', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #e4e9f0', borderTopColor: '#00BFA5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <CompareContent />
    </Suspense>
  )
}
