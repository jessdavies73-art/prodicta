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
  'Core Task':          { bg: '#eff6ff', tx: '#2563eb' },
  'Pressure Test':      { bg: '#fff7ed', tx: '#9a3412' },
  'Judgment Call':      { bg: '#fdf4ff', tx: '#7e22ce' },
  'Staying Power':      { bg: '#f0fdf4', tx: '#166534' },
  // Legacy types for existing assessments
  'Email Response':     { bg: '#eff6ff', tx: '#2563eb' },
  'Prioritisation':     { bg: '#fef9c3', tx: '#854d0e' },
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
function AlreadyCompletedPage({ candidateName, token }) {
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
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 20px' }}>
            You have already completed this assessment. Thank you!
          </p>
          {token && (
            <a
              href={`/assess/${token}/feedback`}
              style={{
                display: 'inline-block', background: '#00BFA5', color: '#fff',
                padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                textDecoration: 'none', fontSize: 14, fontFamily: F,
              }}
            >
              View your feedback
            </a>
          )}
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
                  background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  marginTop: 2,
                  boxShadow: `0 2px 8px rgba(0,191,165,0.3)`,
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

  // Role level and voice recording state
  const mode = (assessment.assessment_mode || 'standard').toLowerCase()
  const roleLevel = assessment.role_level || 'MID_LEVEL'
  const isOperational = roleLevel === 'OPERATIONAL'
  const isLeadership = roleLevel === 'LEADERSHIP'
  const showRecordToggle = mode !== 'quick' && !isOperational
  const [inputModes, setInputModes] = useState(scenarios.map(() => 'type')) // 'type' or 'record'
  const [audioBlobs, setAudioBlobs] = useState(scenarios.map(() => null))
  const [audioUrls, setAudioUrls] = useState(scenarios.map(() => null))
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const audioChunksRef = useRef([])

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlobs(prev => { const n = [...prev]; n[scenarioIndex] = blob; return n })
        setAudioUrls(prev => { const n = [...prev]; n[scenarioIndex] = url; return n })
        setRecording(false)
        clearInterval(recordTimerRef.current)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 59) { mr.stop(); return 60 }
          return prev + 1
        })
      }, 1000)
    }).catch(() => {
      alert('Microphone access is required for voice recording. Please allow access and try again.')
    })
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function clearRecording() {
    if (audioUrls[scenarioIndex]) URL.revokeObjectURL(audioUrls[scenarioIndex])
    setAudioBlobs(prev => { const n = [...prev]; n[scenarioIndex] = null; return n })
    setAudioUrls(prev => { const n = [...prev]; n[scenarioIndex] = null; return n })
    setRecordTime(0)
  }

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

  async function handleNext() {
    // Snapshot current time taken before switching
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setTimeTakens(prev => {
      const next = [...prev]
      next[scenarioIndex] = elapsed
      return next
    })

    if (isLast) {
      clearInterval(intervalRef.current)
      // Upload any audio recordings to Supabase Storage
      const uploadedAudioUrls = [...audioUrls]
      for (let idx = 0; idx < scenarios.length; idx++) {
        if (audioBlobs[idx]) {
          try {
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()
            const path = `recordings/${assessment.id}/${candidate.id}/scenario_${idx}.webm`
            const { error: upErr } = await supabase.storage.from('recordings').upload(path, audioBlobs[idx], {
              contentType: 'audio/webm', upsert: true,
            })
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(path)
              uploadedAudioUrls[idx] = urlData?.publicUrl || null
            }
          } catch {}
        }
      }

      const payload = scenarios.map((_, i) => ({
        scenario_index: i,
        response_text: responses[i] || (audioBlobs[i] ? '[Voice response recorded]' : ''),
        time_taken_seconds: i === scenarioIndex ? elapsed : timeTakens[i],
        audio_url: uploadedAudioUrls[i] || null,
        input_mode: inputModes[i],
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
          <Card style={isOperational ? { background: '#f8f9fb', border: 'none', boxShadow: 'none', padding: '16px' } : {}}>
            {isOperational ? (
              <>
                {/* Chat-style scenario display for operational roles */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: TEAL,
                  }}>Mgr</div>
                  <div style={{
                    background: CARD, border: `1px solid ${BD}`, borderRadius: '4px 16px 16px 16px',
                    padding: '14px 18px', flex: 1,
                  }}>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, marginBottom: 6 }}>Your manager</div>
                    <p style={{ fontFamily: F, fontSize: 15, color: TX, margin: '0 0 10px', lineHeight: 1.65 }}>{scenario.context}</p>
                    <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{scenario.task}</p>
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX3, textAlign: 'center', marginBottom: 8 }}>
                  Aim for 50-100 words. Be direct.
                </div>
              </>
            ) : (
              <>
                {/* Standard / Leadership scenario display */}
                <div style={{ marginBottom: 20 }}>
                  {isLeadership && (
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: NAVY, background: '#E8B84B22', border: '1px solid #E8B84B55', padding: '4px 12px', borderRadius: 6, display: 'inline-block', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Boardroom Context
                    </div>
                  )}
                  <span style={typeBadgeStyle(scenario.type)}>{scenario.type}</span>
                  <h2 style={{ fontFamily: F, fontWeight: 700, fontSize: 22, color: TX, margin: '12px 0 0' }}>
                    {scenario.title}
                  </h2>
                </div>
                <div style={{
                  background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                  padding: '18px 20px', marginBottom: 20,
                }}>
                  <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    {isLeadership ? 'Situation' : 'Context'}
                  </div>
                  <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {scenario.context}
                  </p>
                </div>
              </>
            )}

            {/* Task (hidden for operational — already in chat bubble) */}
            <div style={{
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
              display: isOperational ? 'none' : 'block',
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

              {/* Voice recording toggle */}
              {showRecordToggle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  {['type', 'record'].map(m => (
                    <button
                      key={m}
                      onClick={() => setInputModes(prev => { const n = [...prev]; n[scenarioIndex] = m; return n })}
                      style={{
                        padding: '6px 14px', borderRadius: 7, fontFamily: F, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', border: `1.5px solid ${inputModes[scenarioIndex] === m ? TEAL : BD}`,
                        background: inputModes[scenarioIndex] === m ? TEALLT : '#fff',
                        color: inputModes[scenarioIndex] === m ? TEALD : TX2,
                      }}
                    >
                      {m === 'type' ? 'Type your response' : 'Record a voice note'}
                    </button>
                  ))}
                  {mode === 'advanced' && (
                    <span style={{ fontSize: 11, color: TEALD, fontFamily: F, fontWeight: 600 }}>Recommended for senior roles</span>
                  )}
                </div>
              )}

              {/* Text input (default) */}
              {inputModes[scenarioIndex] === 'type' && (
                <>
                  <textarea
                    value={responses[scenarioIndex]}
                    onChange={e => {
                      const val = e.target.value
                      setResponses(prev => {
                        const next = [...prev]
                        next[scenarioIndex] = val
                        return next
                      })
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.max(200, e.target.scrollHeight) + 'px'
                    }}
                    placeholder="Write your response here..."
                    rows={8}
                    style={{
                      width: '100%', minHeight: 200, fontFamily: F, fontSize: 15, color: TX,
                      background: CARD, border: `1.5px solid ${BD}`, borderRadius: 10,
                      padding: '14px 16px', resize: 'vertical', outline: 'none',
                      lineHeight: 1.7, boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = TEAL}
                    onBlur={e => e.currentTarget.style.borderColor = BD}
                  />
                  <div style={{ fontFamily: FM, fontSize: 13, color: TX3, marginTop: 6, textAlign: 'right' }}>
                    {wordCount(responses[scenarioIndex])} words
                  </div>
                </>
              )}

              {/* Voice recording interface */}
              {inputModes[scenarioIndex] === 'record' && (
                <div style={{ background: CARD, border: `1.5px solid ${BD}`, borderRadius: 12, padding: '24px', textAlign: 'center' }}>
                  {!audioUrls[scenarioIndex] && !recording && (
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 16px' }}>
                        Click record and speak your response clearly. Maximum 60 seconds.
                      </p>
                      <button
                        onClick={startRecording}
                        style={{
                          width: 64, height: 64, borderRadius: '50%', border: 'none',
                          background: '#dc2626', cursor: 'pointer', position: 'relative',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                      </button>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 8 }}>Tap to record</div>
                    </div>
                  )}

                  {recording && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%', background: '#dc2626',
                          animation: 'pulse 1s ease infinite',
                        }} />
                        <span style={{ fontFamily: FM, fontSize: 24, fontWeight: 700, color: TX }}>{formatTime(recordTime)}</span>
                        <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>/ 1:00</span>
                      </div>
                      {/* Simple bars animation */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginBottom: 16 }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} style={{
                            width: 3, borderRadius: 2, background: TEAL,
                            height: `${15 + Math.random() * 25}px`,
                            animation: `pulse ${0.3 + Math.random() * 0.5}s ease infinite`,
                            animationDelay: `${i * 0.05}s`,
                          }} />
                        ))}
                      </div>
                      <button
                        onClick={stopRecording}
                        style={{
                          width: 56, height: 56, borderRadius: '50%', border: 'none',
                          background: '#dc2626', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: 3, background: '#fff' }} />
                      </button>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 8 }}>Tap to stop</div>
                    </div>
                  )}

                  {audioUrls[scenarioIndex] && !recording && (
                    <div>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TEALD, marginBottom: 12 }}>
                        Recording complete ({formatTime(recordTime)})
                      </div>
                      <audio
                        src={audioUrls[scenarioIndex]}
                        controls
                        style={{ width: '100%', maxWidth: 400, marginBottom: 12 }}
                      />
                      <div>
                        <button
                          onClick={clearRecording}
                          style={{
                            padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${BD}`,
                            background: '#fff', color: TX2, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Re-record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                {isLast ? (isOperational ? 'Send Reply' : 'Submit Assessment') : (isOperational ? 'Next' : 'Next Scenario →')}
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
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 8px' }}>
            Submitting your responses…
          </p>
          <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Your responses are being saved and scored. This can take up to 90 seconds.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Saved (scoring timed out client-side) ────────────────────────────
function SavedPage({ candidateName, onContinue }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
          <div style={{ marginBottom: 20 }}>
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>
            Your responses have been saved
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 14, margin: '0 0 28px', lineHeight: 1.7 }}>
            Scoring is taking longer than expected. Your responses have been saved and will be scored shortly. You do not need to wait or resubmit.
          </p>
          <button
            onClick={onContinue}
            style={{
              background: TEAL, color: '#fff', fontFamily: F,
              fontWeight: 700, fontSize: 15, border: 'none',
              borderRadius: 10, padding: '12px 32px', cursor: 'pointer',
            }}
          >
            Continue
          </button>
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

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#00BFA5','#4F46E5','#F59E0B','#10B981','#F43F5E','#3B82F6','#7C3AED']
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${(i * 3.33) % 100}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size: 6 + (i % 4) * 2,
    duration: `${0.9 + (i % 5) * 0.15}s`,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -8,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? '50%' : 2,
            background: p.color,
            animation: `confettiFall ${p.duration} ease-in ${p.delay} both`,
          }}
        />
      ))}
    </div>
  )
}

// ─── State: Complete ──────────────────────────────────────────────────────────
function CompletePage({ candidateName }) {
  const [textVisible, setTextVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setTextVisible(true), 700); return () => clearTimeout(t) }, [])

  return (
    <>
      <style>{`
        @keyframes drawCheck { from { stroke-dashoffset: 30 } to { stroke-dashoffset: 0 } }
        @keyframes popIn { 0%{transform:scale(0.35);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes textFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px', position: 'relative', overflow: 'hidden' }}>
          <Confetti />
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `linear-gradient(135deg, #22C55E, #16a34a)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 0 0 8px #f0fdf4, 0 8px 28px rgba(34,197,94,0.35)`,
            animation: 'popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline
                points="20 6 9 17 4 12"
                strokeDasharray="30"
                strokeDashoffset="30"
                style={{ animation: 'drawCheck 0.4s ease-out 0.4s forwards' }}
              />
            </svg>
          </div>
          <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.45s ease, transform 0.45s ease' }}>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>
              All done. Thank you!
            </h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 8px', lineHeight: 1.6 }}>
              Your responses have been submitted successfully.
            </p>
            <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 36px', lineHeight: 1.6 }}>
              The hiring team will review your assessment and be in touch.
            </p>
          </div>
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

// ─── Calendar: Plan Your First Monday ─────────────────────────────────────────
const TIME_SLOTS = []
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function CalendarPage({ assessment, candidate, onSubmit, onSkip }) {
  const calEvents = assessment.calendar_events || {}
  const fixedEvents = [
    ...(calEvents.fixed_events || []),
    ...(calEvents.interruption ? [calEvents.interruption] : []),
    ...(calEvents.deadline ? [calEvents.deadline] : []),
  ]
  const unscheduled = (calEvents.unscheduled_tasks || []).map((t, i) => ({ ...t, id: `task-${i}` }))

  const [taskSlots, setTaskSlots] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [timeLeft, setTimeLeft] = useState(8 * 60)
  const [editingNote, setEditingNote] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function handleSubmit() {
    clearInterval(timerRef.current)
    const scheduled_tasks = unscheduled.map(t => ({
      title: t.title,
      type: t.type,
      scheduled_time: taskSlots[t.id] || null,
      note: taskNotes[t.id] || null,
    }))
    onSubmit({
      fixed_events: fixedEvents,
      scheduled_tasks,
      event_notes: taskNotes,
    })
  }

  const allScheduled = unscheduled.every(t => taskSlots[t.id])
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isLow = timeLeft < 120

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, padding: '24px 20px 80px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Day One Planning</div>
          <h1 style={{ fontFamily: F, fontSize: 26, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>Plan Your First Monday</h1>
          <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: 0, lineHeight: 1.6 }}>
            Based on this role, here is what your first Monday looks like. Organise your day.
          </p>
        </div>

        {/* Timer */}
        <div style={{
          textAlign: 'center', marginBottom: 24,
          fontFamily: FM, fontSize: 20, fontWeight: 700,
          color: isLow ? '#dc2626' : TX,
        }}>
          {mins}:{String(secs).padStart(2, '0')} remaining
        </div>

        {/* Calendar timeline */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, background: NAVY }}>
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TEAL }}>Monday Schedule</span>
            <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>8:00am - 6:00pm</span>
          </div>

          <div style={{ padding: '12px 0' }}>
            {TIME_SLOTS.map(slot => {
              const fixedHere = fixedEvents.filter(e => e.time === slot)
              const tasksHere = unscheduled.filter(t => taskSlots[t.id] === slot)
              const isEmpty = fixedHere.length === 0 && tasksHere.length === 0

              return (
                <div key={slot} style={{
                  display: 'flex', gap: 12, padding: '4px 18px', minHeight: 36,
                  alignItems: 'center',
                  borderBottom: slot.endsWith(':00') ? `1px solid ${BD}` : 'none',
                }}>
                  <div style={{ width: 48, fontFamily: FM, fontSize: 11.5, color: TX3, flexShrink: 0 }}>{slot}</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {fixedHere.map((e, i) => (
                      <div key={i} style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: e.type === 'interruption' ? '#FEF3C7' : e.type === 'deadline' ? REDBG : TEALLT,
                        color: e.type === 'interruption' ? '#92400E' : e.type === 'deadline' ? '#dc2626' : TEALD,
                        border: `1px solid ${e.type === 'interruption' ? '#FCD34D' : e.type === 'deadline' ? '#fecaca' : `${TEAL}55`}`,
                      }}>
                        {e.title}
                        {e.type === 'interruption' && <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 800 }}>UNEXPECTED</span>}
                        {e.type === 'deadline' && <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 800 }}>DEADLINE</span>}
                      </div>
                    ))}
                    {tasksHere.map(t => (
                      <div key={t.id} style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD',
                      }}>
                        {t.title}
                        {taskNotes[t.id] && <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 6 }}>({taskNotes[t.id]})</span>}
                      </div>
                    ))}
                    {isEmpty && <div style={{ height: 1 }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Unscheduled tasks */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Schedule these tasks into your day
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unscheduled.map(task => (
              <div key={task.id} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, flex: 1 }}>{task.title}</span>
                  <select
                    value={taskSlots[task.id] || ''}
                    onChange={e => setTaskSlots(prev => ({ ...prev, [task.id]: e.target.value || null }))}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: `1px solid ${taskSlots[task.id] ? TEAL : BD}`,
                      fontFamily: F, fontSize: 12.5, color: taskSlots[task.id] ? TEALD : TX3,
                      background: taskSlots[task.id] ? TEALLT : '#fff', cursor: 'pointer',
                    }}
                  >
                    <option value="">When?</option>
                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setEditingNote(editingNote === task.id ? null : task.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 5, border: `1px solid ${BD}`,
                      background: taskNotes[task.id] ? TEALLT : '#fff',
                      color: taskNotes[task.id] ? TEALD : TX3,
                      fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {taskNotes[task.id] ? 'Edit note' : 'Add note'}
                  </button>
                </div>
                {editingNote === task.id && (
                  <input
                    type="text"
                    value={taskNotes[task.id] || ''}
                    onChange={e => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Why did you schedule it here?"
                    style={{
                      width: '100%', boxSizing: 'border-box', marginTop: 8,
                      padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                      fontFamily: F, fontSize: 13, color: TX, outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = TEAL}
                    onBlur={e => e.target.style.borderColor = BD}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            style={{
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: allScheduled ? TEAL : BD,
              color: allScheduled ? '#fff' : TX3,
              fontFamily: F, fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            This is my day
          </button>
          <button
            onClick={onSkip}
            style={{
              padding: '14px 24px', borderRadius: 10, border: `1.5px solid ${BD}`,
              background: 'transparent', color: TX3,
              fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AssessPage({ params }) {
  const { uniqueToken } = params

  const [uiState, setUiState] = useState('loading') // loading | error | already_complete | intro | active | calendar | submitting | rating | complete
  const [errorMessage, setErrorMessage] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [pendingResponses, setPendingResponses] = useState(null) // stored between active→calendar→submit

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

  function handleScenariosComplete(responses) {
    setPendingResponses(responses)
    // Show calendar step if calendar events exist, otherwise submit directly
    if (assessment?.calendar_events) {
      setUiState('calendar')
    } else {
      doSubmit(responses)
    }
  }

  async function doSubmit(responses) {
    setUiState('submitting')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      setUiState('saved')
    }, 120000)
    try {
      const res = await fetch(`/api/assess/${uniqueToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMessage(data.error || 'Submission failed. Please try again.')
        setUiState('error')
        return
      }
      setUiState('rating')
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') return // timeout already set uiState to 'saved'
      setErrorMessage('Submission failed. Please check your connection and try again.')
      setUiState('error')
    }
  }

  if (uiState === 'loading') {
    const shimmer = {
      background: 'linear-gradient(90deg, #f0f4f8 25%, #e4eaf2 50%, #f0f4f8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
      borderRadius: 8,
    }
    return (
      <>
        <NavBar />
        <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 16, padding: '32px 36px' }}>
              <div style={{ ...shimmer, width: 120, height: 22, marginBottom: 20 }} />
              <div style={{ ...shimmer, width: '75%', height: 14, marginBottom: 10 }} />
              <div style={{ ...shimmer, width: '55%', height: 14, marginBottom: 28 }} />
              <div style={{ ...shimmer, width: '100%', height: 120, borderRadius: 10, marginBottom: 20 }} />
              <div style={{ ...shimmer, width: '100%', height: 80, borderRadius: 10, marginBottom: 24 }} />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...shimmer, width: 200, height: 52, borderRadius: 12 }} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (uiState === 'error') return <ErrorPage message={errorMessage} />
  if (uiState === 'already_complete') return <AlreadyCompletedPage candidateName={candidate?.name} token={params.uniqueToken} />
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
      onSubmit={handleScenariosComplete}
    />
  )
  if (uiState === 'calendar') return (
    <CalendarPage
      assessment={assessment}
      candidate={candidate}
      onSubmit={(calendarData) => {
        // Score calendar async after submit
        doSubmit(pendingResponses)
        fetch(`/api/assessment/${assessment.id}/calendar-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: calendarData }),
        }).catch(() => {})
      }}
      onSkip={() => doSubmit(pendingResponses)}
    />
  )
  if (uiState === 'submitting') return <SubmittingPage candidateName={candidate?.name} />
  if (uiState === 'saved') return <SavedPage candidateName={candidate?.name} onContinue={() => setUiState('rating')} />
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
