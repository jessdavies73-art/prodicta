'use client'
import { useState, useEffect, useRef } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'

// ─── Brand tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const TEALD  = '#009688'
const TEALLT = '#e0f2f0'
const BG     = '#f7f9fb'
const CARD   = '#fff'
const BD     = '#e4e9f0'
const TX     = '#0f172a'
const TX2    = '#5e6b7f'
const TX3    = '#94a1b3'
const F      = "'Outfit', system-ui, sans-serif"
const FM     = "'IBM Plex Mono', monospace"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function wordCount(text) {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

const TYPE_COLOURS = {
  'Email Response':     { bg: '#eff6ff', tx: '#2563eb' },
  'Prioritisation':     { bg: '#fef9c3', tx: '#854d0e' },
  'Judgment Call':      { bg: '#fdf4ff', tx: '#7e22ce' },
  'Strategic Thinking': { bg: '#f0fdf4', tx: '#166534' },
}
function typeBadgeStyle(type) {
  const c = TYPE_COLOURS[type] || { bg: TEALLT, tx: TEALD }
  return {
    display: 'inline-block',
    background: c.bg,
    color: c.tx,
    fontFamily: F,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    padding: '3px 10px',
    letterSpacing: 0.3,
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function NavBar({ candidateName }) {
  return (
    <div style={{
      background: NAVY,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <ProdictaLogo textColor="#ffffff" size={30} />
      {candidateName && (
        <span style={{
          fontFamily: F,
          fontSize: 14,
          color: 'rgba(255,255,255,0.75)',
        }}>
          {candidateName}
        </span>
      )}
    </div>
  )
}

function CentredCard({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: F,
    }}>
      <div style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '40px 20px 80px',
      }}>
        {children}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 16,
      padding: '32px 36px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── State: Error ─────────────────────────────────────────────────────────────
function ErrorPage({ message }) {
  return (
    <>
      <NavBar />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '56px 36px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
            Assessment Not Found
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: 0 }}>
            {message || 'This assessment link is invalid or has expired.'}
          </p>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Already completed ─────────────────────────────────────────────────
function AlreadyCompletedPage({ candidateName }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <Card style={{ textAlign: 'center', padding: '56px 36px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
            Already Submitted
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: 0 }}>
            You have already completed this assessment. Thank you!
          </p>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Intro ─────────────────────────────────────────────────────────────
function IntroPage({ candidate, assessment, companyName, onBegin }) {
  const scenarios = assessment.scenarios || []
  const totalMinutes = scenarios.reduce((sum, s) => sum + (s.timeMinutes || 0), 0)

  return (
    <>
      <NavBar candidateName={candidate.name} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: F,
            fontWeight: 800,
            fontSize: 28,
            color: TX,
            margin: '0 0 8px',
          }}>
            Welcome, {candidate.name}
          </h1>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 4px' }}>
            <strong style={{ color: TX }}>{companyName}</strong> has invited you to complete a work
            simulation assessment for the <strong style={{ color: TX }}>{assessment.role_title}</strong> role.
          </p>
        </div>

        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ fontFamily: F, fontSize: 15, fontWeight: 600, color: TX, margin: '0 0 8px' }}>
            About this assessment
          </h3>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 16px', lineHeight: 1.6 }}>
            This assessment includes {scenarios.length} timed work scenarios. Take your time and answer
            as you would in the actual role. There are no trick questions.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: TEALLT,
            borderRadius: 8,
            padding: '8px 16px',
          }}>
            <span style={{ fontSize: 18 }}>⏱</span>
            <span style={{ fontFamily: F, fontSize: 14, color: TEALD, fontWeight: 600 }}>
              Estimated total time: ~{totalMinutes} minutes
            </span>
          </div>
        </Card>

        <Card style={{ marginBottom: 32 }}>
          <h3 style={{ fontFamily: F, fontSize: 15, fontWeight: 600, color: TX, margin: '0 0 20px' }}>
            Scenarios
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scenarios.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: '14px 0',
                borderBottom: i < scenarios.length - 1 ? `1px solid ${BD}` : 'none',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: NAVY,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={typeBadgeStyle(s.type)}>{s.type}</span>
                  </div>
                  <div style={{ fontFamily: F, fontWeight: 600, fontSize: 15, color: TX }}>
                    {s.title}
                  </div>
                </div>
                <div style={{
                  fontFamily: FM,
                  fontSize: 13,
                  color: TX3,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {s.timeMinutes} min
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onBegin}
            style={{
              background: TEAL,
              color: '#fff',
              fontFamily: F,
              fontWeight: 700,
              fontSize: 17,
              border: 'none',
              borderRadius: 12,
              padding: '16px 56px',
              cursor: 'pointer',
              letterSpacing: 0.2,
              boxShadow: `0 4px 20px ${TEAL}44`,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = TEALD}
            onMouseLeave={e => e.currentTarget.style.background = TEAL}
          >
            Begin Assessment
          </button>
        </div>
      </CentredCard>
    </>
  )
}

// ─── State: Active scenario ───────────────────────────────────────────────────
function ActivePage({ candidate, assessment, onSubmit }) {
  const scenarios = assessment.scenarios || []
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [responses, setResponses] = useState(scenarios.map(() => ''))
  const [timeLefts, setTimeLefts] = useState(scenarios.map(s => (s.timeMinutes || 10) * 60))
  const [timeTakens, setTimeTakens] = useState(scenarios.map(() => 0))

  const intervalRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  const scenario = scenarios[scenarioIndex]
  const isLast = scenarioIndex === scenarios.length - 1

  // Start/restart timer whenever scenarioIndex changes
  useEffect(() => {
    startTimeRef.current = Date.now()

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)

      setTimeTakens(prev => {
        const next = [...prev]
        next[scenarioIndex] = elapsed
        return next
      })

      setTimeLefts(prev => {
        const next = [...prev]
        const total = (scenarios[scenarioIndex]?.timeMinutes || 10) * 60
        next[scenarioIndex] = Math.max(0, total - elapsed)
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [scenarioIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleNext() {
    // Snapshot current time taken before switching
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setTimeTakens(prev => {
      const next = [...prev]
      next[scenarioIndex] = elapsed
      return next
    })

    if (isLast) {
      clearInterval(intervalRef.current)
      const payload = scenarios.map((_, i) => ({
        scenario_index: i,
        response_text: responses[i],
        time_taken_seconds: i === scenarioIndex ? elapsed : timeTakens[i],
      }))
      onSubmit(payload)
    } else {
      setScenarioIndex(i => i + 1)
    }
  }

  const timeLeft = timeLefts[scenarioIndex]
  const isTimeLow = timeLeft < 60

  return (
    <>
      <NavBar candidateName={candidate.name} />
      <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
        {/* Progress + timer bar */}
        <div style={{
          background: CARD,
          borderBottom: `1px solid ${BD}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'sticky',
          top: 56,
          zIndex: 90,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <span style={{ fontFamily: F, fontSize: 14, color: TX2, whiteSpace: 'nowrap' }}>
              Scenario {scenarioIndex + 1} of {scenarios.length}
            </span>
            <div style={{
              flex: 1,
              height: 6,
              background: BD,
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((scenarioIndex + 1) / scenarios.length) * 100}%`,
                background: TEAL,
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
          <div style={{
            fontFamily: FM,
            fontSize: 16,
            fontWeight: 600,
            color: isTimeLow ? '#dc2626' : TX,
            minWidth: 56,
            textAlign: 'right',
          }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 80px' }}>
          <Card>
            {/* Type badge + title */}
            <div style={{ marginBottom: 20 }}>
              <span style={typeBadgeStyle(scenario.type)}>{scenario.type}</span>
              <h2 style={{
                fontFamily: F,
                fontWeight: 700,
                fontSize: 22,
                color: TX,
                margin: '12px 0 0',
              }}>
                {scenario.title}
              </h2>
            </div>

            {/* Context */}
            <div style={{
              background: BG,
              border: `1px solid ${BD}`,
              borderRadius: 10,
              padding: '18px 20px',
              marginBottom: 20,
            }}>
              <div style={{
                fontFamily: F,
                fontSize: 12,
                fontWeight: 600,
                color: TX3,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}>
                Context
              </div>
              <p style={{
                fontFamily: F,
                fontSize: 15,
                color: TX2,
                margin: 0,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {scenario.context}
              </p>
            </div>

            {/* Task */}
            <div style={{
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
            }}>
              <div style={{
                fontFamily: F,
                fontSize: 12,
                fontWeight: 600,
                color: TEALD,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>
                Your Task
              </div>
              <p style={{
                fontFamily: F,
                fontSize: 15,
                fontWeight: 500,
                color: TX,
                margin: 0,
                lineHeight: 1.6,
              }}>
                {scenario.task}
              </p>
            </div>

            {/* Textarea */}
            <div>
              <label style={{
                fontFamily: F,
                fontSize: 13,
                fontWeight: 600,
                color: TX2,
                display: 'block',
                marginBottom: 8,
              }}>
                Your Response
              </label>
              <textarea
                value={responses[scenarioIndex]}
                onChange={e => {
                  const val = e.target.value
                  setResponses(prev => {
                    const next = [...prev]
                    next[scenarioIndex] = val
                    return next
                  })
                  // Auto-grow
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.max(200, e.target.scrollHeight) + 'px'
                }}
                placeholder="Write your response here..."
                rows={8}
                style={{
                  width: '100%',
                  minHeight: 200,
                  fontFamily: F,
                  fontSize: 15,
                  color: TX,
                  background: CARD,
                  border: `1.5px solid ${BD}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.7,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = TEAL}
                onBlur={e => e.currentTarget.style.borderColor = BD}
              />
              <div style={{
                fontFamily: FM,
                fontSize: 13,
                color: TX3,
                marginTop: 6,
                textAlign: 'right',
              }}>
                {wordCount(responses[scenarioIndex])} words
              </div>
            </div>

            {/* Next / Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={handleNext}
                style={{
                  background: TEAL,
                  color: '#fff',
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 40px',
                  cursor: 'pointer',
                  letterSpacing: 0.2,
                  boxShadow: `0 4px 16px ${TEAL}44`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = TEALD}
                onMouseLeave={e => e.currentTarget.style.background = TEAL}
              >
                {isLast ? 'Submit Assessment' : 'Next Scenario →'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

// ─── State: Submitting ────────────────────────────────────────────────────────
function SubmittingPage({ candidateName }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
          <div style={{ marginBottom: 20 }}>
            <svg width={48} height={48} viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx={24} cy={24} r={20} fill="none" stroke={BD} strokeWidth={4} />
              <path d="M24 4 a20 20 0 0 1 20 20" fill="none" stroke={TEAL} strokeWidth={4} strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: 0 }}>
            Submitting your responses…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Rating ───────────────────────────────────────────────────────────
function RatingPage({ candidateName, uniqueToken, onComplete }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmitRating() {
    setSubmitting(true)
    try {
      await fetch(`/api/assess/${uniqueToken}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedbackText }),
      })
    } catch {}
    onComplete()
  }

  const filled = hovered || rating

  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌟</div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>
            How was your experience?
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
            Your feedback helps us improve the assessment experience for everyone.
          </p>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  transition: 'transform 0.12s',
                  transform: filled >= n ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                <svg
                  width={36} height={36} viewBox="0 0 24 24"
                  fill={filled >= n ? '#f59e0b' : 'none'}
                  stroke={filled >= n ? '#f59e0b' : '#e4e9f0'}
                  strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>

          {/* Optional feedback */}
          {rating > 0 && (
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              <label style={{
                fontFamily: F, fontSize: 13, fontWeight: 600, color: TX2,
                display: 'block', marginBottom: 6,
              }}>
                Any other thoughts? (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="What went well? What could be improved?"
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: F,
                  fontSize: 14,
                  color: TX,
                  background: CARD,
                  border: `1.5px solid ${BD}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.65,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = TEAL}
                onBlur={e => e.currentTarget.style.borderColor = BD}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onComplete}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 600, color: TX3,
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px',
              }}
            >
              Skip
            </button>
            {rating > 0 && (
              <button
                onClick={handleSubmitRating}
                disabled={submitting}
                style={{
                  background: TEAL, color: '#fff', fontFamily: F,
                  fontWeight: 700, fontSize: 15, border: 'none',
                  borderRadius: 10, padding: '12px 32px', cursor: 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </button>
            )}
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Complete ──────────────────────────────────────────────────────────
function CompletePage({ candidateName }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: TEALLT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 32,
          }}>
            ✓
          </div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>
            Thank You!
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 8px' }}>
            Your responses have been submitted successfully.
          </p>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 32px' }}>
            The hiring team will be notified and will be in touch.
          </p>
          <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ProdictaLogo textColor={NAVY} size={28} />
            <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0 }}>
              Work simulation assessments
            </p>
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AssessPage({ params }) {
  const { uniqueToken } = params

  const [uiState, setUiState] = useState('loading') // loading | error | already_complete | intro | active | submitting | rating | complete
  const [errorMessage, setErrorMessage] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assess/${uniqueToken}`)
        if (res.status === 404) {
          setUiState('error')
          setErrorMessage('Assessment not found or link invalid.')
          return
        }
        if (!res.ok) {
          setUiState('error')
          setErrorMessage('Something went wrong. Please try again later.')
          return
        }
        const data = await res.json()
        setCandidate(data.candidate)
        setAssessment(data.assessment)
        setCompanyName(data.company_name || 'The hiring team')

        if (data.candidate.status === 'completed') {
          setUiState('already_complete')
        } else {
          setUiState('intro')
        }
      } catch {
        setUiState('error')
        setErrorMessage('Failed to load assessment. Please check your connection.')
      }
    }
    load()
  }, [uniqueToken])

  async function handleSubmit(responses) {
    setUiState('submitting')
    try {
      const res = await fetch(`/api/assess/${uniqueToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMessage(data.error || 'Submission failed. Please try again.')
        setUiState('error')
        return
      }
      setUiState('rating')
    } catch {
      setErrorMessage('Submission failed. Please check your connection and try again.')
      setUiState('error')
    }
  }

  if (uiState === 'loading') {
    return (
      <>
        <NavBar />
        <div style={{ background: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: F, color: TX3, fontSize: 15 }}>Loading assessment…</span>
        </div>
      </>
    )
  }

  if (uiState === 'error') return <ErrorPage message={errorMessage} />
  if (uiState === 'already_complete') return <AlreadyCompletedPage candidateName={candidate?.name} />
  if (uiState === 'intro') return (
    <IntroPage
      candidate={candidate}
      assessment={assessment}
      companyName={companyName}
      onBegin={() => setUiState('active')}
    />
  )
  if (uiState === 'active') return (
    <ActivePage
      candidate={candidate}
      assessment={assessment}
      onSubmit={handleSubmit}
    />
  )
  if (uiState === 'submitting') return <SubmittingPage candidateName={candidate?.name} />
  if (uiState === 'rating') return (
    <RatingPage
      candidateName={candidate?.name}
      uniqueToken={uniqueToken}
      onComplete={() => setUiState('complete')}
    />
  )
  if (uiState === 'complete') return <CompletePage candidateName={candidate?.name} />

  return null
}
