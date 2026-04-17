'use client'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import { createClient } from '@/lib/supabase'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const STEPS = ['intro', 'scenario1', 'scenario2', 'results']

export default function ManagerDnaPage({ params }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [existingDna, setExistingDna] = useState(null)
  const [step, setStep] = useState('intro')
  const [scenarios, setScenarios] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [responses, setResponses] = useState(['', ''])
  const [timers, setTimers] = useState([0, 0])
  const [submitting, setSubmitting] = useState(false)
  const [dnaResult, setDnaResult] = useState(null)
  const [error, setError] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        // Employer-only feature. Agencies are redirected back to the assessment page.
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data: prof } = await supabase.from('users').select('account_type').eq('id', user.id).maybeSingle()
        if (prof?.account_type && prof.account_type !== 'employer') {
          router.push(`/assessment/${params.id}`)
          return
        }

        const res = await fetch(`/api/assessment/${params.id}/manager-dna`)
        const data = await res.json()
        if (!res.ok) { setError(data.error); setLoading(false); return }
        setAssessment(data.assessment)
        if (data.dna) {
          setExistingDna(data.dna)
          setDnaResult(data.dna)
          setStep('results')
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  // Timer for active scenario
  useEffect(() => {
    if (step === 'scenario1' || step === 'scenario2') {
      const idx = step === 'scenario1' ? 0 : 1
      timerRef.current = setInterval(() => {
        setTimers(prev => {
          const next = [...prev]
          next[idx] = prev[idx] + 1
          return next
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [step])

  async function generateScenarios() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/assessment/${params.id}/manager-dna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScenarios(data.scenarios)
      setStep('scenario1')
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function submitResponses() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/assessment/${params.id}/manager-dna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          scenarios,
          responses: responses.map((text, i) => ({
            response_text: text,
            time_taken_seconds: timers[i],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDnaResult(data.dna)
      setStep('results')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : 40, color: TX3 }}>Loading...</main>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : 40 }}>
          <div style={{ background: REDBG, border: `1px solid ${REDBD}`, borderRadius: 12, padding: 24, color: RED }}>{error}</div>
        </main>
      </div>
    )
  }

  const currentScenarioIdx = step === 'scenario1' ? 0 : step === 'scenario2' ? 1 : -1
  const currentScenario = scenarios?.[currentScenarioIdx]

  const dimLabels = {
    autonomy_vs_guidance: 'Autonomy vs Guidance',
    pace_tolerance: 'Pace Tolerance',
    structure_preference: 'Structure Preference',
    conflict_comfort: 'Conflict Comfort',
    detail_orientation: 'Detail Orientation',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
      <Sidebar companyName={companyName} />
      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '32px 40px', flex: 1, minWidth: 0, maxWidth: 800 }}>

        {/* Back button */}
        <button
          onClick={() => router.push(`/assessment/${params.id}`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600, color: TX3, padding: 0, marginBottom: 20 }}
        >
          <Ic name="arrow-left" size={14} color={TX3} />
          Back to assessment
        </button>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: STEPS.indexOf(step) >= i ? TEAL : BD,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* ── INTRO STEP ── */}
        {step === 'intro' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: TEALLT, border: `1px solid ${TEAL}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="zap" size={20} color={TEALD} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manager DNA</div>
                <div style={{ fontSize: 13, color: TX3 }}>{assessment?.role_title}</div>
              </div>
            </div>

            <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px', margin: '0 0 12px' }}>
              Your Management DNA
            </h1>
            <p style={{ fontFamily: F, fontSize: 16, color: TX2, lineHeight: 1.7, margin: '0 0 28px', maxWidth: 600 }}>
              Complete 2 quick scenarios so we can compare candidates against your actual decision-making style. Takes about 10 minutes.
            </p>

            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>What we will assess</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                {[
                  { icon: 'sliders', label: 'Delegation approach', desc: 'How you assign work and manage priorities' },
                  { icon: 'alert', label: 'Conflict handling', desc: 'How you address underperformance and friction' },
                  { icon: 'zap', label: 'Decision speed', desc: 'Whether you decide fast, measured, or cautious' },
                  { icon: 'users', label: 'Team expectations', desc: 'The traits you reward and the ones that clash' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: BG, borderRadius: 8, border: `1px solid ${BD}` }}>
                    <Ic name={item.icon} size={16} color={TEALD} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TX }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: TX3, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={generateScenarios}
              disabled={generating}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10, border: 'none',
                background: generating ? BD : TEAL, color: generating ? TX3 : NAVY,
                fontFamily: F, fontSize: 15, fontWeight: 800,
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating ? 'Generating your scenarios...' : 'Start Assessment'}
            </button>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, color: RED, fontSize: 13 }}>{error}</div>
            )}
          </div>
        )}

        {/* ── SCENARIO STEPS ── */}
        {(step === 'scenario1' || step === 'scenario2') && currentScenario && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Scenario {currentScenarioIdx + 1} of 2
                </div>
                <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>
                  {currentScenario.title}
                </h2>
              </div>
              <div style={{
                fontFamily: FM, fontSize: 16, fontWeight: 700, color: TEAL,
                background: TEALLT, border: `1px solid ${TEAL}44`,
                padding: '6px 14px', borderRadius: 8,
              }}>
                {fmtTime(timers[currentScenarioIdx])}
              </div>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Situation</div>
              <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.7, margin: 0 }}>{currentScenario.context}</p>
            </div>

            <div style={{ background: TEALLT, border: `1px solid ${TEAL}44`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEALD, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Your task</div>
              <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.7, margin: 0, fontWeight: 600 }}>{currentScenario.task}</p>
            </div>

            <textarea
              rows={8}
              value={responses[currentScenarioIdx]}
              onChange={e => {
                setResponses(prev => {
                  const next = [...prev]
                  next[currentScenarioIdx] = e.target.value
                  return next
                })
              }}
              placeholder="Describe exactly what you would do, step by step..."
              style={{
                width: '100%', boxSizing: 'border-box', padding: '14px 18px',
                borderRadius: 10, border: `1.5px solid ${responses[currentScenarioIdx].length > 30 ? TEAL : BD}`,
                fontFamily: F, fontSize: 14, color: TX, background: '#fff',
                outline: 'none', resize: 'vertical', lineHeight: 1.7,
                transition: 'border-color 0.15s',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: TX3 }}>
                {responses[currentScenarioIdx].split(/\s+/).filter(Boolean).length} words
              </span>
              {responses[currentScenarioIdx].length < 30 && (
                <span style={{ fontSize: 12, color: AMB }}>Minimum 30 characters required</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              {step === 'scenario2' && (
                <button
                  onClick={() => setStep('scenario1')}
                  style={{
                    padding: '12px 24px', borderRadius: 9, border: `1.5px solid ${BD}`,
                    background: 'transparent', color: TX2,
                    fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              )}
              {step === 'scenario1' && (
                <button
                  onClick={() => setStep('scenario2')}
                  disabled={responses[0].length < 30}
                  style={{
                    padding: '12px 28px', borderRadius: 9, border: 'none',
                    background: responses[0].length >= 30 ? TEAL : BD,
                    color: responses[0].length >= 30 ? NAVY : TX3,
                    fontFamily: F, fontSize: 14, fontWeight: 700,
                    cursor: responses[0].length >= 30 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Next scenario
                </button>
              )}
              {step === 'scenario2' && (
                <button
                  onClick={submitResponses}
                  disabled={responses[1].length < 30 || submitting}
                  style={{
                    padding: '12px 28px', borderRadius: 9, border: 'none',
                    background: responses[1].length >= 30 && !submitting ? TEAL : BD,
                    color: responses[1].length >= 30 && !submitting ? NAVY : TX3,
                    fontFamily: F, fontSize: 14, fontWeight: 700,
                    cursor: responses[1].length >= 30 && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Analysing your responses...' : 'Submit and build my DNA profile'}
                </button>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, color: RED, fontSize: 13 }}>{error}</div>
            )}
          </div>
        )}

        {/* ── RESULTS STEP ── */}
        {step === 'results' && dnaResult && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: TEALLT, border: `1px solid ${TEAL}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name="zap" size={22} color={TEAL} />
              </div>
              <div>
                <h1 style={{ fontFamily: F, fontSize: 24, fontWeight: 800, color: NAVY, margin: 0 }}>Your Management DNA</h1>
                <div style={{ fontSize: 13, color: TX3 }}>{assessment?.role_title}</div>
              </div>
            </div>

            {/* Style badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: NAVY, padding: '10px 20px', borderRadius: 10, marginBottom: 24,
            }}>
              <Ic name="award" size={16} color={TEAL} />
              <span style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TEAL }}>{dnaResult.management_style}</span>
            </div>

            {/* Summary */}
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontFamily: F, fontSize: 14.5, color: TX, lineHeight: 1.7, margin: 0 }}>
                {dnaResult.summary}
              </p>
            </div>

            {/* Key traits */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Delegation</div>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.6, margin: 0 }}>{dnaResult.delegation_approach}</p>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Conflict style</div>
                <p style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.6, margin: 0 }}>{dnaResult.conflict_style}</p>
              </div>
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Decision speed</div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: TEAL, textTransform: 'capitalize' }}>{dnaResult.decision_speed}</div>
              </div>
            </div>

            {/* Alignment dimensions */}
            {dnaResult.alignment_dimensions && (
              <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Alignment dimensions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(dnaResult.alignment_dimensions).map(([key, val]) => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: TX }}>{dimLabels[key] || key}</span>
                        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: TEAL }}>{val}</span>
                      </div>
                      <div style={{ height: 6, background: BG, borderRadius: 3, border: `1px solid ${BD}` }}>
                        <div style={{ height: '100%', width: `${val}%`, background: TEAL, borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ideal vs clash traits */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: GRNBG, border: `1px solid ${GRNBD}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GRN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Ideal candidate traits</div>
                {(dnaResult.ideal_candidate_traits || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ic name="check" size={12} color={GRN} />
                    <span style={{ fontFamily: F, fontSize: 13, color: TX }}>{t}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: REDBG, border: `1px solid #fecaca`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Clash risk traits</div>
                {(dnaResult.clash_risk_traits || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Ic name="alert" size={12} color={RED} />
                    <span style={{ fontFamily: F, fontSize: 13, color: TX }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push(`/assessment/${params.id}`)}
                style={{
                  padding: '12px 24px', borderRadius: 9, border: 'none',
                  background: TEAL, color: NAVY,
                  fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Back to candidates
              </button>
              <button
                onClick={() => { setStep('intro'); setExistingDna(null); setDnaResult(null); setScenarios(null); setResponses(['', '']); setTimers([0, 0]) }}
                style={{
                  padding: '12px 24px', borderRadius: 9, border: `1.5px solid ${BD}`,
                  background: 'transparent', color: TX2,
                  fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Retake assessment
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
