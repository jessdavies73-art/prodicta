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
import { calculateSurvivalScore } from '@/lib/survival-score'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

// Maximum number of candidates that can be placed side by side in the
// comparison view. Increased from 3 so recruiters can hold a full shortlist in
// one view (two rows of three on desktop, two across on tablet, one on phone).
const MAX_COMPARE = 6

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
  const [profile, setProfile] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [allCandidates, setAllCandidates] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'replay' | 'simulator'
  const [replayData, setReplayData] = useState(null)
  const [replayLoading, setReplayLoading] = useState(false)
  const [replayError, setReplayError] = useState('')
  const [replayIndex, setReplayIndex] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(prof || null)
      if (prof?.company_name) setCompanyName(prof.company_name)

      const assessmentId = searchParams.get('assessmentId')
      const idsParam = searchParams.get('ids')

      if (!assessmentId) { setLoading(false); return }

      const { data: assess } = await supabase.from('assessments').select('id, role_title').eq('id', assessmentId).single()
      setAssessment(assess)

      const { data: allCands } = await supabase
        .from('candidates')
        .select('id, name, email, status, assessments(employment_type, role_title), results(overall_score, scores, score_narratives, strengths, watchouts, risk_level, hiring_confidence, candidate_type, execution_reliability, training_potential, pressure_fit_score)')
        .eq('assessment_id', assessmentId)
        .eq('status', 'scored')
        .order('name')
      const scored = (allCands || []).filter(c => c.results && c.results.length > 0)
      setAllCandidates(scored)

      if (idsParam) {
        const requested = idsParam.split(',').filter(Boolean).slice(0, MAX_COMPARE)
        const ids = new Set(requested)
        setSelectedIds(ids)
        setCandidates(scored.filter(c => ids.has(c.id)))
      } else {
        const first = scored.slice(0, MAX_COMPARE)
        const ids = new Set(first.map(c => c.id))
        setSelectedIds(ids)
        setCandidates(first)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (activeTab !== 'replay') return
    if (!assessment?.id) return
    if (selectedIds.size < 2) { setReplayData({ shared_scenarios: [] }); return }
    let cancelled = false
    async function fetchReplay() {
      setReplayLoading(true)
      setReplayError('')
      try {
        const ids = Array.from(selectedIds).join(',')
        const res = await fetch(`/api/assessment/${assessment.id}/scenario-replay?candidateIds=${encodeURIComponent(ids)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load scenario replay')
        if (cancelled) return
        setReplayData(data)
        setReplayIndex(0)
      } catch (err) {
        if (!cancelled) setReplayError(err.message || 'Failed to load scenario replay')
      } finally {
        if (!cancelled) setReplayLoading(false)
      }
    }
    fetchReplay()
    return () => { cancelled = true }
  }, [activeTab, assessment?.id, selectedIds])

  function toggleCandidate(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_COMPARE) return prev
        next.add(id)
      }
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
  // Responsive column counts: desktop up to 6, tablet 3, mobile 2.
  const isTablet = typeof window !== 'undefined' && window.innerWidth <= 1080
  const desktopCap = isTablet ? 3 : 6
  const cols = Math.min(candidates.length || 1, isMobile ? 2 : desktopCap)
  const detailCols = Math.min(candidates.length || 1, isMobile ? 1 : Math.min(desktopCap, 3))

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select up to {MAX_COMPARE} candidates to compare
                </div>
                <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>
                  {selectedIds.size} of {MAX_COMPARE} selected
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allCandidates.map(c => {
                  const sel = selectedIds.has(c.id)
                  const full = !sel && selectedIds.size >= MAX_COMPARE
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCandidate(c.id)}
                      disabled={full}
                      title={full ? `Clear one candidate first (max ${MAX_COMPARE})` : undefined}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                        border: `1.5px solid ${sel ? TEAL : BD}`, background: sel ? TEALLT : CARD,
                        fontFamily: F, fontSize: 12.5, fontWeight: 600, color: sel ? TEALD : TX2,
                        cursor: full ? 'not-allowed' : 'pointer',
                        opacity: full ? 0.5 : 1,
                      }}
                    >
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
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${BD}`, flexWrap: 'wrap' }}>
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'replay', label: 'Scenario Replay' },
                  { key: 'simulator', label: 'Outcome Simulator' },
                ].map(t => {
                  const active = activeTab === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      style={{
                        padding: '10px 16px', border: 'none', background: 'transparent',
                        fontFamily: F, fontSize: 13, fontWeight: 700,
                        color: active ? NAVY : TX3, cursor: 'pointer',
                        borderBottom: `2px solid ${active ? TEAL : 'transparent'}`,
                        marginBottom: -1,
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {activeTab === 'replay' ? (
                <ScenarioReplayView
                  replayData={replayData}
                  loading={replayLoading}
                  error={replayError}
                  candidates={candidates}
                  index={replayIndex}
                  setIndex={setReplayIndex}
                  cols={cols}
                  isMobile={isMobile}
                />
              ) : activeTab === 'simulator' ? (
                <OutcomeSimulatorView
                  candidates={candidates}
                  isMobile={isMobile}
                  isAgency={profile?.account_type === 'agency'}
                  averageFee={Number(profile?.average_placement_fee) > 0 ? Number(profile.average_placement_fee) : 15000}
                />
              ) : (
                <>
              {/* Score overview */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 20 }}>
                {candidates.map(c => {
                  const r = c.results[0]
                  const score = r?.overall_score ?? 0
                  const empType = c.assessments?.employment_type
                  return (
                    <div key={c.id} style={{ ...cs, textAlign: 'center', padding: '20px 16px' }}>
                      <div style={{ marginBottom: 10 }}><Avatar name={c.name} size={40} /></div>
                      <div style={{
                        fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 4,
                        display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                      }}>
                        {c.name}
                        {empType && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                            padding: '1px 6px', borderRadius: 4,
                            background: empType === 'temporary' ? TEAL : NAVY, color: '#fff',
                          }}>
                            {empType === 'temporary' ? 'TEMP' : 'PERM'}
                          </span>
                        )}
                      </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${detailCols}, 1fr)`, gap: 14 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${detailCols}, 1fr)`, gap: 14 }}>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function ScenarioReplayView({ replayData, loading, error, candidates, index, setIndex, cols, isMobile }) {
  if (loading) {
    return (
      <div style={{ ...cs, padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ width: 24, height: 24, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>Loading responses...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ ...cs, padding: '24px', fontFamily: F, fontSize: 13, color: RED, background: REDBG, border: `1px solid ${REDBD}` }}>
        {error}
      </div>
    )
  }
  if (candidates.length < 2) {
    return (
      <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: 0 }}>
          Select at least 2 candidates to compare their responses side by side.
        </p>
      </div>
    )
  }
  const shared = replayData?.shared_scenarios || []
  if (shared.length === 0) {
    return (
      <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0, lineHeight: 1.6 }}>
          No shared scenarios found. Scenario Replay works when candidates have completed the same assessment type.
        </p>
      </div>
    )
  }

  const clamped = Math.min(Math.max(index, 0), shared.length - 1)
  const scenario = shared[clamped]
  const cardById = Object.fromEntries((scenario.responses || []).map(r => [r.candidate_id, r]))
  const respondents = candidates.filter(c => cardById[c.id]?.has_response)
  const respondentCols = Math.min(respondents.length || 1, isMobile ? 1 : cols)

  return (
    <div>
      {shared.length > 1 && (
        <div style={{ ...cs, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Shared scenarios
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {shared.map((s, i) => {
              const active = i === clamped
              return (
                <button
                  key={s.scenario_index}
                  onClick={() => setIndex(i)}
                  style={{
                    padding: '6px 12px', borderRadius: 999,
                    border: `1.5px solid ${active ? TEAL : BD}`,
                    background: active ? TEALLT : CARD,
                    fontFamily: F, fontSize: 12, fontWeight: 700,
                    color: active ? TEALD : TX2, cursor: 'pointer',
                  }}
                >
                  S{i + 1}. {s.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2 }}>
          Scenario {clamped + 1} of {shared.length} shared
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setIndex(Math.max(0, clamped - 1))}
            disabled={clamped === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8,
              border: `1px solid ${BD}`, background: CARD,
              fontFamily: F, fontSize: 12, fontWeight: 600,
              color: clamped === 0 ? TX3 : TX, cursor: clamped === 0 ? 'not-allowed' : 'pointer',
              opacity: clamped === 0 ? 0.5 : 1,
            }}
          >
            <Ic name="left" size={13} color={clamped === 0 ? TX3 : TX2} />
            Previous
          </button>
          <button
            onClick={() => setIndex(Math.min(shared.length - 1, clamped + 1))}
            disabled={clamped >= shared.length - 1}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 8,
              border: `1px solid ${BD}`, background: CARD,
              fontFamily: F, fontSize: 12, fontWeight: 600,
              color: clamped >= shared.length - 1 ? TX3 : TX,
              cursor: clamped >= shared.length - 1 ? 'not-allowed' : 'pointer',
              opacity: clamped >= shared.length - 1 ? 0.5 : 1,
            }}
          >
            Next
            <Ic name="right" size={13} color={clamped >= shared.length - 1 ? TX3 : TX2} />
          </button>
        </div>
      </div>

      <div style={{
        background: BG, border: `1px solid ${BD}`, borderRadius: 12,
        padding: '18px 22px', marginBottom: 16,
        position: isMobile ? 'sticky' : 'static', top: isMobile ? 0 : undefined, zIndex: isMobile ? 2 : undefined,
      }}>
        {scenario.type && (
          <div style={{ fontFamily: F, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {scenario.type}
          </div>
        )}
        <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 8 }}>
          {scenario.title}
        </div>
        <p style={{ fontFamily: F, fontSize: 13, color: TX2, fontStyle: 'italic', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {scenario.context}
        </p>
        {scenario.task && (
          <div style={{ marginTop: 12, background: TEALLT, border: `1px solid ${TEAL}40`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Task</div>
            <p style={{ fontFamily: F, fontSize: 12.5, color: TEALD, fontWeight: 600, margin: 0, lineHeight: 1.55 }}>
              {scenario.task}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${respondentCols}, minmax(0, 1fr))`, gap: 14 }}>
        {respondents.map(c => {
          const card = cardById[c.id] || {}
          const score10 = card.scenario_score_10
          const isStrong = typeof score10 === 'number' && score10 >= 7
          const isModerate = typeof score10 === 'number' && score10 >= 5 && score10 < 7
          const accent = isStrong ? TEAL : isModerate ? AMB : TX3
          const overall = c.results?.[0]?.overall_score
          const empType = c.assessments?.employment_type
          return (
            <div key={c.id} style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Avatar name={c.name} size={28} />
                  <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  {empType && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                      padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      background: empType === 'temporary' ? TEAL : NAVY, color: '#fff',
                    }}>
                      {empType === 'temporary' ? 'TEMP' : 'PERM'}
                    </span>
                  )}
                </div>
                {typeof overall === 'number' && (
                  <span style={{
                    display: 'inline-block', fontFamily: FM, fontSize: 11, fontWeight: 800,
                    padding: '2px 8px', borderRadius: 999,
                    background: sbg(overall), color: scolor(overall),
                    border: `1px solid ${scolor(overall)}33`,
                  }}>
                    Overall {overall}/100
                  </span>
                )}
              </div>
              <div style={{ padding: '16px 18px', flex: 1, background: BG }}>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                  {card.response_text}
                </p>
              </div>
              {(typeof score10 === 'number' || card.observation) && (
                <div style={{ padding: '12px 16px', borderTop: `1px solid ${BD}`, background: CARD, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {typeof score10 === 'number' && (
                    <span style={{
                      alignSelf: 'flex-start', fontFamily: FM, fontSize: 11, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 999,
                      background: isStrong ? GRNBG : isModerate ? AMBBG : BG,
                      color: isStrong ? GRN : isModerate ? AMB : TX3,
                      border: `1px solid ${isStrong ? GRNBD : isModerate ? AMBBD : BD}`,
                    }}>
                      Scenario score {score10}/10
                    </span>
                  )}
                  {card.observation && (
                    <div style={{ fontFamily: F, fontSize: 12, color: TX2, lineHeight: 1.55 }}>
                      {card.observation}
                    </div>
                  )}
                </div>
              )}
              <div style={{ height: 4, background: accent }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Outcome Simulator: 90-day performance curves and predicted milestones
// Slate is used for the third candidate's line when 3 are selected.
const SLATE = '#64748B'
const CURVE_COLORS = [TEAL, NAVY, SLATE]

function clampCurve(v) { return Math.max(20, Math.min(100, Math.round(v))) }

function buildCurve(c) {
  const r = c.results?.[0] || {}
  const s = typeof r.overall_score === 'number' ? r.overall_score : 50
  const er = typeof r.execution_reliability === 'number' ? r.execution_reliability : 50
  return {
    d1: clampCurve(s - 15),
    d30: clampCurve(s - 8),
    d60: clampCurve(s),
    d90: clampCurve(s + er / 10),
  }
}

function milestoneFor(score, day) {
  if (day === 30) {
    if (score >= 80) return 'Likely to be operating independently by end of month one.'
    if (score >= 60) return 'Will need structured support through month one before finding their feet.'
    return 'Month one will be challenging. Close management recommended.'
  }
  if (day === 60) {
    if (score >= 80) return 'Client relationships and internal processes fully understood.'
    if (score >= 60) return 'Performance stabilising. Watch-outs from assessment likely to surface here.'
    return 'Risk of early exit increases if watch-outs are not actively managed.'
  }
  if (score >= 80) return 'Delivering at or above expectations. Strong retention probability.'
  if (score >= 60) return 'Performing adequately. Development plan recommended to reach full potential.'
  return 'Probation review recommended. Intervention plan should be in place.'
}

function verdictFor(score) {
  if (score >= 80) return { label: 'Strongest Outcome', color: TEAL, bg: TEALLT, bd: `${TEAL}55` }
  if (score >= 65) return { label: 'Solid Choice', color: '#fff', bg: NAVY, bd: NAVY }
  return { label: 'Higher Risk', color: '#92400E', bg: AMBBG, bd: AMBBD }
}

function formatPounds(n) {
  const v = Math.round(Number(n) || 0)
  return `£${v.toLocaleString('en-GB')}`
}

function ChartLegendDot({ color }) {
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
}

// Simple multi-series SVG line chart for the 90-day performance curves.
// All series drawn on a single chart so the comparison is glance-readable.
function PerformanceCurveChart({ series, isMobile }) {
  const width = isMobile ? 320 : 680
  const height = 220
  const pad = { top: 18, right: 18, bottom: 30, left: 32 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const xs = [1, 30, 60, 90]
  const xScale = day => pad.left + ((day - 1) / 89) * plotW
  const yScale = score => pad.top + (1 - (score - 0) / 100) * plotH
  const yTicks = [0, 25, 50, 75, 100]
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', display: 'block' }}>
      {/* Y gridlines */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={pad.left} x2={pad.left + plotW} y1={yScale(t)} y2={yScale(t)} stroke={BD} strokeWidth={1} strokeDasharray={t === 0 ? '0' : '2 4'} />
          <text x={pad.left - 8} y={yScale(t) + 4} textAnchor="end" fontFamily={F} fontSize={10} fill={TX3}>{t}</text>
        </g>
      ))}
      {/* X labels */}
      {xs.map(day => (
        <text key={day} x={xScale(day)} y={height - 8} textAnchor="middle" fontFamily={F} fontSize={10} fill={TX3}>
          Day {day}
        </text>
      ))}
      {/* Series */}
      {series.map((s, i) => {
        const points = [
          { x: xScale(1), y: yScale(s.curve.d1) },
          { x: xScale(30), y: yScale(s.curve.d30) },
          { x: xScale(60), y: yScale(s.curve.d60) },
          { x: xScale(90), y: yScale(s.curve.d90) },
        ]
        const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
        const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${yScale(0).toFixed(1)} L ${points[0].x.toFixed(1)} ${yScale(0).toFixed(1)} Z`
        return (
          <g key={s.id}>
            <path d={area} fill={s.color} opacity={0.12} />
            <path d={path} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={3.2} fill={s.color} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

function OutcomeSimulatorView({ candidates, isMobile, isAgency, averageFee }) {
  const selected = candidates.slice(0, 3)
  if (selected.length < 2) {
    return (
      <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: 0 }}>
          Select at least 2 candidates to run the Outcome Simulator.
        </p>
      </div>
    )
  }

  // Build enriched rows: compute curve, productivity, survival, replacement risk, revenue.
  const rows = selected.map((c, i) => {
    const r = c.results?.[0] || {}
    const score = typeof r.overall_score === 'number' ? r.overall_score : 0
    const curve = buildCurve(c)
    const productivity = Math.max(5, Math.round((90 - score / 2) / 5) * 5)
    const survival = calculateSurvivalScore({
      overallScore: score,
      hiringConfidence: r.hiring_confidence,
      watchouts: r.watchouts || [],
      executionReliability: r.execution_reliability,
      trainingPotential: r.training_potential,
    })
    const replacementRisk = Math.max(0, Math.min(100, 100 - survival))
    const revenue = Math.round((survival * averageFee) / 100)
    const verdict = verdictFor(score)
    return { c, i, score, curve, productivity, survival, replacementRisk, revenue, verdict, color: CURVE_COLORS[i] || SLATE }
  })

  const minProductivity = Math.min(...rows.map(r => r.productivity))
  const cols = Math.min(rows.length, isMobile ? 1 : 3)
  const gridCols = `repeat(${cols}, minmax(0, 1fr))`

  return (
    <div>
      {/* Header row of candidates */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14, marginBottom: 18 }}>
        {rows.map(({ c, score, color }) => {
          const empType = c.assessments?.employment_type
          return (
            <div key={c.id} style={{ ...cs, padding: '14px 16px', borderTop: `3px solid ${color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Avatar name={c.name} size={28} />
                <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </div>
                {empType && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                    padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                    background: empType === 'temporary' ? TEAL : NAVY, color: '#fff',
                  }}>
                    {empType === 'temporary' ? 'TEMP' : 'PERM'}
                  </span>
                )}
              </div>
              <span style={{
                display: 'inline-block', fontFamily: FM, fontSize: 11, fontWeight: 800,
                padding: '2px 8px', borderRadius: 999,
                background: sbg(score), color: scolor(score),
                border: `1px solid ${scolor(score)}33`,
              }}>
                Overall {score}/100
              </span>
            </div>
          )
        })}
      </div>

      {/* Section 1: 90-day performance curve */}
      <div style={{ ...cs, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 4 }}>
          90-day performance curve
        </div>
        <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginBottom: 14 }}>
          Predicted trajectory from Day 1 through the probation window.
        </div>
        <PerformanceCurveChart
          series={rows.map(r => ({ id: r.c.id, name: r.c.name, color: r.color, curve: r.curve }))}
          isMobile={isMobile}
        />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {rows.map(r => (
            <div key={r.c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChartLegendDot color={r.color} />
              <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX }}>{r.c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Key outcome predictions */}
      <div style={{ ...cs, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 14 }}>
          Key outcome predictions
        </div>

        <MetricRow label="Estimated days to full productivity" helper="Lower is better">
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
            {rows.map(r => {
              const best = r.productivity === minProductivity
              return (
                <div key={r.c.id} style={{ textAlign: 'left' }}>
                  <span style={{
                    fontFamily: FM, fontSize: 22, fontWeight: 800,
                    color: best ? TEAL : TX,
                  }}>
                    {r.productivity}
                  </span>
                  <span style={{ fontFamily: F, fontSize: 12, color: TX3, marginLeft: 6 }}>days</span>
                </div>
              )
            })}
          </div>
        </MetricRow>

        {isAgency && (
          <MetricRow label="Estimated fee protection value" helper="Based on survival probability">
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
              {rows.map(r => (
                <div key={r.c.id} style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: TEAL }}>
                  {formatPounds(r.revenue)}
                </div>
              ))}
            </div>
          </MetricRow>
        )}

        <MetricRow label="Probability of early exit" helper="Replacement risk across the placement" last>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
            {rows.map(r => {
              const risk = r.replacementRisk
              const color = risk > 30 ? RED : risk >= 15 ? AMB : TEAL
              return (
                <div key={r.c.id} style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color }}>
                  {risk}%
                </div>
              )
            })}
          </div>
        </MetricRow>
      </div>

      {/* Section 3: 90-day milestone predictions */}
      <div style={{ ...cs, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 14 }}>
          90-day milestone predictions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 18 }}>
          {rows.map(r => (
            <div key={r.c.id}>
              <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX, marginBottom: 10 }}>{r.c.name}</div>
              <Timeline items={[
                { day: 30, text: milestoneFor(r.score, 30) },
                { day: 60, text: milestoneFor(r.score, 60) },
                { day: 90, text: milestoneFor(r.score, 90) },
              ]} />
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Hiring recommendation */}
      <div style={{ ...cs, padding: '18px 20px' }}>
        <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, marginBottom: 14 }}>
          Hiring recommendation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
          {rows.map(r => (
            <div key={r.c.id}>
              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                fontFamily: F, fontSize: 11, fontWeight: 800, letterSpacing: '0.03em',
                background: r.verdict.bg, color: r.verdict.color, border: `1px solid ${r.verdict.bd}`,
                marginBottom: 8,
              }}>
                {r.verdict.label}
              </span>
              <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
                Based on assessment data {r.c.name} is predicted to reach full productivity in {r.productivity} days with a {r.survival}% chance of completing the full placement.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, helper, children, last }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 14, borderBottom: last ? 'none' : `1px solid ${BD}` }}>
      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      {helper && (
        <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginBottom: 10 }}>{helper}</div>
      )}
      {children}
    </div>
  )
}

function Timeline({ items }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 18 }}>
      <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: BD }} />
      {items.map((it, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: i < items.length - 1 ? 14 : 0 }}>
          <div style={{ position: 'absolute', left: -18, top: 4, width: 12, height: 12, borderRadius: '50%', background: TEAL, border: `2px solid ${CARD}`, boxShadow: `0 0 0 2px ${TEAL}33` }} />
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
            Day {it.day}
          </div>
          <div style={{ fontFamily: F, fontSize: 12.5, color: TX, lineHeight: 1.55 }}>
            {it.text}
          </div>
        </div>
      ))}
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
