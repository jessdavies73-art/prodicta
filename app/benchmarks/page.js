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

function SkillRow({ skill, threshold, onToggle, onChange }) {
  const isSet = threshold !== null && threshold !== undefined
  const val = isSet ? threshold : 0
  const [inputFocused, setInputFocused] = useState(false)

  const barColour = val >= 75 ? GRN : val >= 50 ? AMB : RED

  return (
    <div style={{
      ...cs,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {/* Top row: skill name + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: TX, fontFamily: F }}>{skill}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isSet && (
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={e => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value)))
                  onChange(v)
                }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={{
                  fontFamily: FM,
                  fontSize: 14,
                  fontWeight: 700,
                  width: 72,
                  padding: '7px 10px',
                  borderRadius: 7,
                  border: `1.5px solid ${inputFocused ? TEAL : BD}`,
                  background: BG,
                  color: barColour,
                  outline: 'none',
                  textAlign: 'center',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
          )}
          <button
            onClick={onToggle}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 7,
              border: `1.5px solid ${isSet ? TEAL : BD}`,
              background: isSet ? TEALLT : 'transparent',
              color: isSet ? TEALD : TX2,
              fontFamily: F,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isSet ? (
              <>
                <Ic name="check" size={13} color={TEALD} />
                Threshold set
              </>
            ) : (
              <>
                <Ic name="sliders" size={13} color={TX3} />
                Not set
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual bar */}
      <div>
        <div style={{
          height: 10,
          borderRadius: 6,
          background: BD,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: isSet ? `${val}%` : '0%',
            background: isSet
              ? `linear-gradient(90deg, ${barColour}55, ${barColour})`
              : 'transparent',
            borderRadius: 6,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 11,
          color: TX3,
          fontFamily: FM,
        }}>
          <span>0</span>
          <span style={{ color: isSet ? barColour : TX3, fontWeight: isSet ? 700 : 400 }}>
            {isSet ? `Threshold: ${val}` : 'No threshold'}
          </span>
          <span>100</span>
        </div>
      </div>
    </div>
  )
}

export default function BenchmarksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [thresholds, setThresholds] = useState({})
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

        const { data: benchmarks } = await supabase
          .from('benchmarks')
          .select('*')
          .eq('user_id', user.id)

        const initial = {}
        if (benchmarks) {
          for (const b of benchmarks) {
            initial[b.skill_name] = b.threshold ?? null
          }
        }
        // Fill in any skills not yet saved
        for (const skill of DEFAULT_SKILLS) {
          if (!(skill in initial)) initial[skill] = null
        }
        setThresholds(initial)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  function handleToggle(skill) {
    setThresholds(prev => ({
      ...prev,
      [skill]: prev[skill] === null || prev[skill] === undefined ? 70 : null,
    }))
    setSaved(false)
  }

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

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="benchmarks" companyName={profile?.company_name} />
      <main style={{
        marginLeft: 220,
        padding: '36px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
              Benchmarks
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saved && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: GRNBG,
                  border: `1px solid ${GRNBD}`,
                  color: GRN,
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  <Ic name="check" size={14} color={GRN} />
                  Benchmarks saved
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...bs('primary', 'md'),
                  opacity: saving ? 0.65 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                <Ic name="check" size={15} color={NAVY} />
                {saving ? 'Saving…' : 'Save benchmarks'}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: TX2, lineHeight: 1.6, maxWidth: 640 }}>
            Set minimum score thresholds for each skill. Candidates who score below a threshold will be flagged in their results. Leave unset to disable flagging for that skill.
          </p>
          {setCount > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '4px 12px',
              borderRadius: 6,
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              fontSize: 12.5,
              fontWeight: 600,
              color: TEALD,
            }}>
              <Ic name="layers" size={13} color={TEALD} />
              {setCount} of {DEFAULT_SKILLS.length} skills have thresholds set
            </div>
          )}
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

        {/* Skill rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
          {DEFAULT_SKILLS.map(skill => (
            <SkillRow
              key={skill}
              skill={skill}
              threshold={thresholds[skill] ?? null}
              onToggle={() => handleToggle(skill)}
              onChange={val => handleChange(skill, val)}
            />
          ))}
        </div>

        {/* Bottom save */}
        <div style={{ marginTop: 28, maxWidth: 680 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...bs('primary', 'lg'),
              opacity: saving ? 0.65 : 1,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Ic name="check" size={16} color={NAVY} />
            {saving ? 'Saving…' : 'Save benchmarks'}
          </button>
        </div>

      </main>
    </div>
  )
}
