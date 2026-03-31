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
  F, FM, cs, bs, scolor, sbg, sbd, slabel, riskCol, riskBg, riskBd,
} from '@/lib/constants'

// ── helpers ────────────────────────────────────────────────────────────────

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
  if (!risk) return <span style={{ color: TX3, fontSize: 12, fontFamily: F }}>—</span>
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

// ── Selector dropdown ──────────────────────────────────────────────────────

function CandidateSelector({ candidates, selected, onChange, placeholder, usedIds }) {
  const [open, setOpen] = useState(false)

  const selectedCand = candidates.find(c => c.id === selected)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (!e.target.closest(`[data-selector-id="${placeholder}"]`)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, placeholder])

  return (
    <div
      data-selector-id={placeholder}
      style={{ position: 'relative', width: '100%' }}
    >
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
          {/* Clear option */}
          {selected && (
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderBottom: `1px solid ${BD}`,
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
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: TX3 }}>
                    {c.assessments?.role_title || '—'}
                  </div>
                </div>
                {c.results?.[0]?.overall_score != null && (
                  <span style={{
                    fontFamily: FM,
                    fontSize: 13,
                    fontWeight: 700,
                    color: scoreColour(c.results[0].overall_score),
                    flexShrink: 0,
                  }}>
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

// ── Placeholder column ─────────────────────────────────────────────────────

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

// ── Candidate column ───────────────────────────────────────────────────────

function CandidateColumn({ candidate, allScores, skillOrder }) {
  const result = candidate.results?.[0]
  const score = result?.overall_score ?? null
  const risk = result?.risk_level ?? null
  const percentile = result?.percentile ?? null
  const scores = result?.scores ?? {}
  const strengths = result?.strengths ?? []
  const watchouts = result?.watchouts ?? []

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
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 3,
          }}>
            {candidate.name}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
            {candidate.assessments?.role_title || '—'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>

        {/* Overall score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: FM,
            fontSize: 52,
            fontWeight: 800,
            color: scoreColour(score),
            lineHeight: 1,
            letterSpacing: '-2px',
          }}>
            {score ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: TX3, marginTop: 4 }}>
            {score !== null ? slabel(score) : 'No score'}
          </div>
        </div>

        {/* Risk + percentile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <RiskBadge risk={risk} />
          {percentile && (
            <span style={{
              fontFamily: FM,
              fontSize: 12.5,
              fontWeight: 600,
              color: TX2,
              background: BG,
              border: `1px solid ${BD}`,
              borderRadius: 6,
              padding: '3px 10px',
            }}>
              {percentile}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BD }} />

        {/* Skills breakdown */}
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: TX3,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Skill scores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {skillOrder.map(skill => {
              const s = scores[skill] ?? null
              // Find highest score for this skill across all candidates
              const vals = allScores[skill] ?? []
              const maxVal = vals.length > 0 ? Math.max(...vals.filter(v => v !== null)) : null
              const isTop = s !== null && s === maxVal && vals.filter(v => v === maxVal).length === 1

              return (
                <div key={skill}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                    gap: 6,
                  }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: isTop ? 700 : 500,
                      color: isTop ? TX : TX2,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {skill}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      {isTop && (
                        <svg
                          width={13}
                          height={13}
                          viewBox="0 0 24 24"
                          fill={AMB_GOLD}
                          stroke={AMB_GOLD}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ display: 'block' }}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      <span style={{
                        fontFamily: FM,
                        fontSize: 13,
                        fontWeight: 700,
                        color: s !== null ? scoreColour(s) : TX3,
                      }}>
                        {s ?? '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    height: 6,
                    borderRadius: 4,
                    background: BD,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: s !== null ? `${s}%` : '0%',
                      background: s !== null
                        ? `linear-gradient(90deg, ${scoreColour(s)}88, ${scoreColour(s)})`
                        : 'transparent',
                      borderRadius: 4,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: BD }} />

        {/* Strengths + watchouts counts */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1,
            background: GRNBG,
            border: `1px solid ${GRNBD}`,
            borderRadius: 9,
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: FM,
              fontSize: 22,
              fontWeight: 800,
              color: GRN,
              lineHeight: 1,
            }}>
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
            borderRadius: 9,
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: FM,
              fontSize: 22,
              fontWeight: 800,
              color: watchouts.length > 0 ? RED : TX3,
              lineHeight: 1,
            }}>
              {watchouts.length}
            </div>
            <div style={{ fontSize: 11, color: watchouts.length > 0 ? RED : TX3, marginTop: 4, fontWeight: 600 }}>
              Watch-out{watchouts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ComparePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [candidates, setCandidates] = useState([])
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

        const { data: cands, error: candsErr } = await supabase
          .from('candidates')
          .select('*, assessments(role_title), results(overall_score, scores, risk_level, percentile, strengths, watchouts)')
          .eq('user_id', user.id)
          .eq('status', 'completed')

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

  function handleSelect(idx, id) {
    setSelected(prev => {
      const next = [...prev]
      next[idx] = id
      return next
    })
  }

  if (loading) return <LoadingSpinner />

  // Derive the union of all skill names across selected candidates
  const selectedCandidates = selected.map(id => id ? candidates.find(c => c.id === id) : null)
  const skillOrder = (() => {
    const seen = new Set()
    const order = []
    for (const cand of selectedCandidates) {
      if (!cand) continue
      const scores = cand.results?.[0]?.scores ?? {}
      for (const k of Object.keys(scores)) {
        if (!seen.has(k)) { seen.add(k); order.push(k) }
      }
    }
    return order
  })()

  // Build per-skill score arrays for highlight detection
  const allScores = {}
  for (const skill of skillOrder) {
    allScores[skill] = selectedCandidates.map(c => {
      if (!c) return null
      return c.results?.[0]?.scores?.[skill] ?? null
    })
  }

  const usedIds = selected.filter(Boolean)
  const activeCount = selectedCandidates.filter(Boolean).length

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="dashboard" companyName={profile?.company_name} />
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
            Compare Candidates
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: TX2 }}>
            Select up to 3 completed candidates to compare side by side.
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

        {/* Selector row */}
        <div style={{
          display: 'flex',
          gap: 14,
          marginBottom: 28,
          background: CARD,
          border: `1px solid ${BD}`,
          borderRadius: 12,
          padding: '16px 18px',
          alignItems: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            marginRight: 6,
          }}>
            <Ic name="sliders" size={15} color={TEALD} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TX2 }}>Select candidates</span>
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

        {/* Notice if fewer than 2 selected */}
        {activeCount < 2 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 9,
            background: TEALLT,
            border: `1px solid ${TEAL}55`,
            marginBottom: 22,
            fontSize: 13.5,
            color: TEALD,
            fontWeight: 600,
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
