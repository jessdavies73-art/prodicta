'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, cs, bs,
} from '@/lib/constants'

const DEFAULT_SKILLS = ['Communication', 'Problem solving', 'Prioritisation', 'Leadership']

const thresholdColor = v => v >= 75 ? GRN : v >= 50 ? AMB : RED
const thresholdBg = v => v >= 75 ? GRNBG : v >= 50 ? AMBBG : REDBG
const thresholdBd = v => v >= 75 ? GRNBD : v >= 50 ? AMBBD : REDBD
const thresholdLabel = v => v >= 75 ? 'High bar' : v >= 50 ? 'Moderate bar' : 'Low bar'

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
        <div style={{ color: TX2, fontSize: 14, fontFamily: F }}>Loading benchmarks…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

function SkillRow({ skill, threshold, onChange, candidateScores }) {
  const isSet = threshold !== null && threshold !== undefined
  const val = isSet ? threshold : 70

  const col = thresholdColor(val)
  const bg = thresholdBg(val)
  const bd = thresholdBd(val)

  // How many current candidates pass / fail this threshold
  const passing = isSet ? candidateScores.filter(s => s >= val).length : null
  const failing = isSet ? candidateScores.filter(s => s < val).length : null
  const total = candidateScores.length

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${isSet ? col + '55' : BD}`,
      borderRadius: 12,
      padding: '20px 24px',
      transition: 'border-color 0.2s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: TX, fontFamily: F }}>{skill}</span>
          {isSet && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 20,
              background: bg,
              color: col,
              border: `1px solid ${bd}`,
            }}>
              {thresholdLabel(val)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isSet && (
            <div style={{
              fontFamily: FM,
              fontSize: 22,
              fontWeight: 800,
              color: col,
              lineHeight: 1,
              minWidth: 36,
              textAlign: 'right',
            }}>
              {val}
            </div>
          )}
          <button
            onClick={() => onChange(isSet ? null : 70)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 7,
              border: `1.5px solid ${isSet ? col : BD}`,
              background: isSet ? bg : 'transparent',
              color: isSet ? col : TX3,
              fontFamily: F,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {isSet ? (
              <>
                <Ic name="x" size={12} color={col} />
                Remove threshold
              </>
            ) : (
              <>
                <Ic name="sliders" size={12} color={TX3} />
                Set threshold
              </>
            )}
          </button>
        </div>
      </div>

      {isSet ? (
        <>
          {/* Slider */}
          <div style={{ marginBottom: 10 }}>
            <style>{`
              .bm-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 6px; outline: none; cursor: pointer; }
              .bm-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${col}; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; transition: background 0.2s; }
              .bm-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: ${col}; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; }
            `}</style>
            <input
              type="range"
              min={0}
              max={100}
              value={val}
              onChange={e => onChange(Number(e.target.value))}
              className="bm-slider"
              style={{
                background: `linear-gradient(to right, ${col} 0%, ${col} ${val}%, ${BD} ${val}%, ${BD} 100%)`,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: TX3, fontFamily: FM }}>
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* Number input + description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: TX2, fontFamily: F }}>Minimum score:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={val}
                onChange={e => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
                style={{
                  fontFamily: FM,
                  fontSize: 14,
                  fontWeight: 700,
                  width: 64,
                  padding: '5px 8px',
                  borderRadius: 7,
                  border: `1.5px solid ${col}`,
                  background: bg,
                  color: col,
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: 13, color: TX2, fontFamily: F }}>out of 100</span>
            </div>

            {/* Live candidate stats */}
            {total > 0 && (
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: GRNBG,
                  color: GRN,
                  border: `1px solid ${GRNBD}`,
                }}>
                  {passing} pass
                </span>
                {failing > 0 && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: REDBG,
                    color: RED,
                    border: `1px solid ${REDBD}`,
                  }}>
                    {failing} flagged
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Unset state */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 8,
          background: BG,
          border: `1px dashed ${BD}`,
        }}>
          <Ic name="info" size={14} color={TX3} />
          <span style={{ fontSize: 13, color: TX3, fontFamily: F }}>
            No threshold set — candidates will not be flagged for this skill.
          </span>
        </div>
      )}
    </div>
  )
}

export default function BenchmarksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [thresholds, setThresholds] = useState({})
  const [candidateScoreMap, setCandidateScoreMap] = useState({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { router.push('/login'); return }

        const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile({ ...prof, id: user.id })

        // Load saved benchmarks
        const { data: benchmarks } = await supabase
          .from('benchmarks')
          .select('*')
          .eq('user_id', user.id)

        const initial = {}
        if (benchmarks) {
          for (const b of benchmarks) initial[b.skill_name] = b.threshold ?? null
        }
        for (const skill of DEFAULT_SKILLS) {
          if (!(skill in initial)) initial[skill] = null
        }
        setThresholds(initial)

        // Load completed candidate skill scores for live pass/fail preview
        const { data: results } = await supabase
          .from('results')
          .select('scores, candidates!inner(user_id)')
          .eq('candidates.user_id', user.id)

        const scoreMap = {}
        for (const skill of DEFAULT_SKILLS) scoreMap[skill] = []
        if (results) {
          for (const r of results) {
            const scores = r.scores || {}
            for (const [skill, score] of Object.entries(scores)) {
              if (!scoreMap[skill]) scoreMap[skill] = []
              scoreMap[skill].push(typeof score === 'number' ? score : score?.score ?? 0)
            }
          }
        }
        setCandidateScoreMap(scoreMap)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  function handleChange(skill, val) {
    setThresholds(prev => ({ ...prev, [skill]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      for (const skill of DEFAULT_SKILLS) {
        await supabase.from('benchmarks').upsert(
          {
            user_id: user.id,
            skill_name: skill,
            threshold: thresholds[skill] ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,skill_name' }
        )
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const setCount = DEFAULT_SKILLS.filter(s => thresholds[s] !== null && thresholds[s] !== undefined).length
  const totalCandidates = Math.max(...DEFAULT_SKILLS.map(s => (candidateScoreMap[s] || []).length), 0)

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="benchmarks" companyName={profile?.company_name} />
      <main style={{ marginLeft: 220, padding: '36px 40px', minHeight: '100vh', background: BG, flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
              Benchmarks
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: TX2, lineHeight: 1.6, maxWidth: 580 }}>
              Set minimum score thresholds per skill. Any candidate scoring below a threshold will be flagged with a red warning in their results report.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {saved && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                background: GRNBG, border: `1px solid ${GRNBD}`, color: GRN,
                fontSize: 13, fontWeight: 700,
              }}>
                <Ic name="check" size={14} color={GRN} />
                Saved
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...bs('primary', 'md'), opacity: saving ? 0.65 : 1, cursor: saving ? 'wait' : 'pointer' }}
            >
              <Ic name="check" size={15} color={NAVY} />
              {saving ? 'Saving…' : 'Save benchmarks'}
            </button>
          </div>
        </div>

        {/* Status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 6,
            background: setCount > 0 ? TEALLT : BG,
            border: `1px solid ${setCount > 0 ? TEAL + '55' : BD}`,
            fontSize: 12.5, fontWeight: 600, color: setCount > 0 ? TEALD : TX3,
          }}>
            <Ic name="layers" size={13} color={setCount > 0 ? TEALD : TX3} />
            {setCount > 0 ? `${setCount} of ${DEFAULT_SKILLS.length} skills have thresholds` : 'No thresholds set'}
          </div>
          {totalCandidates > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 6, background: BG,
              border: `1px solid ${BD}`, fontSize: 12.5, fontWeight: 600, color: TX3,
            }}>
              <Ic name="users" size={13} color={TX3} />
              Applied to {totalCandidates} scored candidate{totalCandidates !== 1 ? 's' : ''}
            </div>
          )}
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

        {/* How it works */}
        <div style={{
          background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
          padding: '16px 20px', marginBottom: 24,
          display: 'flex', gap: 32, flexWrap: 'wrap',
        }}>
          {[
            { icon: 'sliders', title: 'Set a threshold', desc: 'Drag the slider or type a score from 0–100 for any skill.' },
            { icon: 'alert', title: 'Candidates are flagged', desc: 'Any candidate scoring below the threshold is highlighted in red on their report.' },
            { icon: 'check', title: 'Thresholds are global', desc: 'Benchmarks apply across all your assessments, not per role.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: '1 1 200px' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: TEALLT,
                border: `1px solid ${TEAL}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Ic name={icon} size={15} color={TEALD} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TX, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: TX2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Skill rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
          {DEFAULT_SKILLS.map(skill => (
            <SkillRow
              key={skill}
              skill={skill}
              threshold={thresholds[skill] ?? null}
              onChange={val => handleChange(skill, val)}
              candidateScores={candidateScoreMap[skill] || []}
            />
          ))}
        </div>

        {/* Bottom save */}
        <div style={{ marginTop: 28, maxWidth: 720 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...bs('primary', 'lg'), opacity: saving ? 0.65 : 1, cursor: saving ? 'wait' : 'pointer' }}
          >
            <Ic name="check" size={16} color={NAVY} />
            {saving ? 'Saving…' : 'Save benchmarks'}
          </button>
        </div>

      </main>
    </div>
  )
}
