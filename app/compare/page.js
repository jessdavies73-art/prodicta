'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, cs, bs, scolor, sbg, sbd, slabel, dL, dC, riskCol, riskBg, riskBd,
} from '@/lib/constants'

const AMB_GOLD = '#b45309'
const AMB_GOLD_BG = '#fef3c7'

function scoreColour(s) {
  if (s === null || s === undefined) return TX3
  return s >= 75 ? GRN : s >= 50 ? AMB : RED
}

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
        <div style={{ color: TX2, fontSize: 14, fontFamily: F }}>Loading candidates…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

function RiskBadge({ risk }) {
  if (!risk) return <span style={{ color: TX3, fontSize: 12, fontFamily: F }}>-</span>
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

function CandidateSelector({ candidates, selected, onChange, placeholder, usedIds }) {
  const [open, setOpen] = useState(false)
  const selectedCand = candidates.find(c => c.id === selected)

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (!e.target.closest(`[data-selector-id="${placeholder}"]`)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, placeholder])

  return (
    <div data-selector-id={placeholder} style={{ position: 'relative', width: '100%' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 9,
          border: `1.5px solid ${open ? TEAL : BD}`,
          background: CARD,
          cursor: 'pointer',
          fontFamily: F,
          fontSize: 13.5,
          color: selectedCand ? TX : TX3,
          fontWeight: selectedCand ? 600 : 400,
          textAlign: 'left',
          transition: 'border-color 0.15s',
        }}
      >
        {selectedCand ? (
          <>
            <Avatar name={selectedCand.name} size={26} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedCand.name}
            </span>
          </>
        ) : (
          <>
            <Ic name="users" size={15} color={TX3} />
            <span style={{ flex: 1 }}>{placeholder}</span>
          </>
        )}
        <Ic name={open ? 'left' : 'right'} size={14} color={TX3} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: CARD,
          border: `1.5px solid ${BD}`,
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(15,33,55,0.12)',
          zIndex: 200,
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {selected && (
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${BD}`,
                cursor: 'pointer',
                fontFamily: F,
                fontSize: 12.5,
                color: TX3,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ic name="x" size={13} color={TX3} />
              Clear selection
            </button>
          )}
          {candidates.map(c => {
            const isUsed = usedIds.includes(c.id) && c.id !== selected
            const isSelected = c.id === selected
            return (
              <button
                key={c.id}
                disabled={isUsed}
                onClick={() => { if (!isUsed) { onChange(c.id); setOpen(false) } }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: isSelected ? TEALLT : isUsed ? BG : 'transparent',
                  border: 'none',
                  cursor: isUsed ? 'not-allowed' : 'pointer',
                  fontFamily: F,
                  fontSize: 13,
                  color: isUsed ? TX3 : isSelected ? TEALD : TX,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: isUsed ? 0.5 : 1,
                }}
              >
                <Avatar name={c.name} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: TX3 }}>
                    {c.assessments?.role_title || '-'}
                  </div>
                </div>
                {c.results?.[0]?.overall_score != null && (
                  <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: scoreColour(c.results[0].overall_score), flexShrink: 0 }}>
                    {c.results[0].overall_score}
                  </span>
                )}
              </button>
            )
          })}
          {candidates.length === 0 && (
            <div style={{ padding: '14px 16px', fontSize: 13, color: TX3, fontFamily: F }}>
              No completed candidates
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlaceholderColumn({ label }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: BG,
      border: `2px dashed ${BD}`,
      borderRadius: 14,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 12,
      minHeight: 300,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: CARD,
        border: `1px solid ${BD}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ic name="users" size={20} color={TX3} />
      </div>
      <span style={{ fontSize: 13, color: TX3, fontFamily: F, textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function CandidateColumn({ candidate, allScores, skillOrder, assessmentId }) {
  const router = useRouter()
  const result = candidate.results?.[0]
  const score = result?.overall_score ?? null
  const pf = result?.pressure_fit_score ?? null
  const pfDims = result?.pressure_fit ?? null
  const risk = result?.risk_level ?? null
  const percentile = result?.percentile ?? null
  const scores = result?.scores ?? {}
  const strengths = result?.strengths ?? []
  const watchouts = result?.watchouts ?? []
  const hiringDecision = score !== null ? dL(score) : null
  const hiringColor = score !== null ? dC(score) : TX3

  const candidateAssessmentId = assessmentId || candidate.assessment_id

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: CARD,
      border: `1.5px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${BD}`,
        background: NAVY,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <Avatar name={candidate.name} size={48} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 3 }}>
            {candidate.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {candidate.assessments?.role_title || '-'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>

        {/* Overall score ring */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {score !== null ? (() => {
            const sz = 96, sw = 8, r = (sz - sw) / 2
            const circ = 2 * Math.PI * r
            const dash = (score / 100) * circ
            const col = scoreColour(score)
            return (
              <div style={{ position: 'relative', width: sz, height: sz }}>
                <svg width={sz} height={sz} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={`${col}22`} strokeWidth={sw} />
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={col} strokeWidth={sw}
                    strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: 10, color: TX3, marginTop: 1 }}>/100</span>
                </div>
              </div>
            )
          })() : (
            <div style={{ fontFamily: FM, fontSize: 40, fontWeight: 800, color: TX3, lineHeight: 1 }}>—</div>
          )}
          <div style={{ fontSize: 12, color: TX3 }}>
            {score !== null ? slabel(score) : 'No score'}
          </div>
        </div>

        {/* Hiring decision */}
        {hiringDecision && (
          <div style={{
            textAlign: 'center',
            padding: '10px 12px',
            background: sbg(score),
            border: `1px solid ${sbd(score)}`,
            borderRadius: 9,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: hiringColor, lineHeight: 1.2 }}>
              {hiringDecision}
            </div>
            <div style={{ fontSize: 11, color: TX3, marginTop: 3 }}>Hiring decision</div>
          </div>
        )}

        {/* Risk + percentile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center' }}>
          <RiskBadge risk={risk} />
          {percentile && (
            <span style={{
              fontFamily: F,
              fontSize: 11.5,
              fontWeight: 600,
              color: TEALD,
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              borderRadius: 20,
              padding: '3px 10px',
              whiteSpace: 'nowrap',
            }}>
              {percentile} of candidates
            </span>
          )}
        </div>

        {/* Pressure-Fit Assessment */}
        {pf !== null && (() => {
          const pfColor = pf >= 80 ? GRN : pf >= 55 ? TEALD : RED
          const pfLabel = pf >= 80 ? 'Strong' : pf >= 55 ? 'Moderate' : 'Concern'

          const DIMS = [
            { key: 'decision_speed_quality',   short: 'Decision Speed' },
            { key: 'composure_under_conflict',  short: 'Composure' },
            { key: 'prioritisation_under_load', short: 'Prioritisation' },
            { key: 'ownership_accountability',  short: 'Ownership' },
          ]

          function dimColor(s) {
            if (s == null) return TX3
            return s >= 80 ? GRN : s >= 55 ? TEALD : RED
          }

          return (
            <div style={{
              background: `linear-gradient(135deg, #0f2137 0%, #0d3349 100%)`,
              border: '1px solid rgba(91,191,189,0.2)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                Pressure-Fit
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <span style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: pfColor, lineHeight: 1 }}>{pf}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>/100</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: pfColor, marginLeft: 4 }}>{pfLabel}</span>
              </div>
              {pfDims && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {DIMS.map(({ key, short }) => {
                    const s = pfDims[key]?.score ?? null
                    const dc = dimColor(s)
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{short}</span>
                          <span style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: dc }}>{s ?? '-'}</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          {s != null && (
                            <div style={{ height: '100%', width: `${s}%`, background: dc, borderRadius: 99, opacity: 0.8 }} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        <div style={{ height: 1, background: BD }} />

        {/* Skills breakdown */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: TX3,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Skill scores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {skillOrder.map(skill => {
              const s = scores[skill] ?? null
              const vals = allScores[skill] ?? []
              const maxVal = vals.length > 0 ? Math.max(...vals.filter(v => v !== null)) : null
              const isTop = s !== null && s === maxVal && vals.filter(v => v === maxVal).length === 1

              return (
                <div key={skill}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: isTop ? 700 : 500,
                      color: isTop ? TX : TX2, flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {skill}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      {isTop && (
                        <svg width={13} height={13} viewBox="0 0 24 24" fill={AMB_GOLD} stroke={AMB_GOLD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: s !== null ? scoreColour(s) : TX3 }}>
                        {s ?? '-'}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: BD, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: s !== null ? `${s}%` : '0%',
                      background: s !== null ? `linear-gradient(90deg, ${scoreColour(s)}88, ${scoreColour(s)})` : 'transparent',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ height: 1, background: BD }} />

        {/* Strengths + watchouts counts */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, background: GRNBG, border: `1px solid ${GRNBD}`,
            borderRadius: 9, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: GRN, lineHeight: 1 }}>
              {strengths.length}
            </div>
            <div style={{ fontSize: 11, color: GRN, marginTop: 4, fontWeight: 600 }}>
              Strength{strengths.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{
            flex: 1,
            background: watchouts.length > 0 ? REDBG : BG,
            border: `1px solid ${watchouts.length > 0 ? REDBD : BD}`,
            borderRadius: 9, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: watchouts.length > 0 ? RED : TX3, lineHeight: 1 }}>
              {watchouts.length}
            </div>
            <div style={{ fontSize: 11, color: watchouts.length > 0 ? RED : TX3, marginTop: 4, fontWeight: 600 }}>
              Watch-out{watchouts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* View full report */}
        {candidateAssessmentId && (
          <button
            onClick={() => router.push(`/assessment/${candidateAssessmentId}/candidate/${candidate.id}`)}
            style={{
              width: '100%',
              padding: '10px 0',
              background: TEALLT,
              border: `1.5px solid ${TEAL}55`,
              borderRadius: 9,
              cursor: 'pointer',
              fontFamily: F,
              fontSize: 13,
              fontWeight: 700,
              color: TEALD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            <Ic name="eye" size={14} color={TEALD} />
            View full report
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

function ComparePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetAssessmentId = searchParams.get('assessmentId')

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [allCandidates, setAllCandidates] = useState([])
  const [assessments, setAssessments] = useState([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(presetAssessmentId || '')
  const [selected, setSelected] = useState([null, null, null])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { router.push('/login'); return }

        const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile({ ...prof, id: user.id })

        const [{ data: cands, error: candsErr }, { data: asmts }] = await Promise.all([
          supabase
            .from('candidates')
            .select('*, assessments(id, role_title), results(overall_score, scores, risk_level, percentile, strengths, watchouts, pressure_fit_score, pressure_fit)')
            .eq('user_id', user.id)
            .eq('status', 'completed'),
          supabase
            .from('assessments')
            .select('id, role_title')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])

        if (candsErr) throw candsErr
        setAllCandidates(cands || [])
        setAssessments(asmts || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  // Reset candidate selections when assessment filter changes
  function handleAssessmentChange(id) {
    setSelectedAssessmentId(id)
    setSelected([null, null, null])
  }

  function handleSelect(idx, id) {
    setSelected(prev => { const next = [...prev]; next[idx] = id; return next })
  }

  if (loading) return <LoadingSpinner />

  // Filter candidates by selected assessment
  const candidates = selectedAssessmentId
    ? allCandidates.filter(c => c.assessments?.id === selectedAssessmentId || c.assessment_id === selectedAssessmentId)
    : allCandidates

  const selectedCandidates = selected.map(id => id ? candidates.find(c => c.id === id) : null)

  const skillOrder = (() => {
    const seen = new Set()
    const order = []
    for (const cand of selectedCandidates) {
      if (!cand) continue
      for (const k of Object.keys(cand.results?.[0]?.scores ?? {})) {
        if (!seen.has(k)) { seen.add(k); order.push(k) }
      }
    }
    return order
  })()

  const allScores = {}
  for (const skill of skillOrder) {
    allScores[skill] = selectedCandidates.map(c => c?.results?.[0]?.scores?.[skill] ?? null)
  }

  const usedIds = selected.filter(Boolean)
  const activeCount = selectedCandidates.filter(Boolean).length

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="compare" companyName={profile?.company_name} />
      <main style={{ marginLeft: 220, padding: '36px 40px', minHeight: '100vh', background: BG, flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
            Compare Candidates
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: TX2 }}>
            Select up to 3 completed candidates to compare side by side.
          </p>
        </div>

        {error && (
          <div style={{
            background: REDBG, border: `1px solid ${REDBD}`, color: RED,
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 20, padding: '14px 18px',
          }}>
            <Ic name="alert" size={16} color={RED} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Filter + selector bar */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
          padding: '16px 18px', marginBottom: 24,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* Assessment filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Ic name="layers" size={15} color={TEALD} />
              <span style={{ fontSize: 13, fontWeight: 700, color: TX2, whiteSpace: 'nowrap' }}>Filter by assessment</span>
            </div>
            <select
              value={selectedAssessmentId}
              onChange={e => handleAssessmentChange(e.target.value)}
              style={{
                flex: 1,
                maxWidth: 340,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1.5px solid ${BD}`,
                fontFamily: F,
                fontSize: 13.5,
                color: TX,
                background: BG,
                cursor: 'pointer',
              }}
            >
              <option value="">All assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.role_title}</option>
              ))}
            </select>
            {selectedAssessmentId && (
              <span style={{ fontSize: 12.5, color: TX3 }}>
                {candidates.length} completed candidate{candidates.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Candidate selectors */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Ic name="sliders" size={15} color={TEALD} />
              <span style={{ fontSize: 13, fontWeight: 700, color: TX2, whiteSpace: 'nowrap' }}>Select candidates</span>
            </div>
            {[0, 1, 2].map(idx => (
              <div key={idx} style={{ flex: 1, minWidth: 0 }}>
                <CandidateSelector
                  candidates={candidates}
                  selected={selected[idx]}
                  onChange={id => handleSelect(idx, id)}
                  placeholder={`Candidate ${idx + 1}`}
                  usedIds={usedIds}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notice if fewer than 2 selected */}
        {activeCount < 2 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderRadius: 9, background: TEALLT, border: `1px solid ${TEAL}55`,
            marginBottom: 22, fontSize: 13.5, color: TEALD, fontWeight: 600,
          }}>
            <Ic name="info" size={16} color={TEALD} />
            Select at least 2 candidates to start comparing.
          </div>
        )}

        {/* Comparison columns */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {[0, 1, 2].map(idx => {
            const cand = selectedCandidates[idx]
            if (cand) {
              return (
                <CandidateColumn
                  key={cand.id}
                  candidate={cand}
                  allScores={allScores}
                  skillOrder={skillOrder}
                  assessmentId={selectedAssessmentId || cand.assessments?.id}
                />
              )
            }
            return (
              <PlaceholderColumn
                key={idx}
                label={activeCount < 2
                  ? `Select candidate ${idx + 1}`
                  : `Add a ${idx === 2 ? 'third' : 'second'} candidate`}
              />
            )
          })}
        </div>

      </main>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ComparePageInner />
    </Suspense>
  )
}
