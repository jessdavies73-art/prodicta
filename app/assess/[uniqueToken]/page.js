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
const AMB    = '#F59E0B'
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
  'Staying Power':      { bg: '#E6F7F5', tx: '#006B5E' },
  // Legacy types for existing assessments
  'Email Response':     { bg: '#eff6ff', tx: '#2563eb' },
  'Prioritisation':     { bg: '#fef9c3', tx: '#854d0e' },
  'Strategic Thinking': { bg: '#E6F7F5', tx: '#006B5E' },
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

        {(assessment.assessment_mode || '').toLowerCase() === 'rapid' && (
          <div style={{
            background: TEALLT,
            border: `1px solid ${TEAL}55`,
            borderRadius: 10,
            padding: '12px 18px',
            marginBottom: 20,
            fontFamily: F,
            fontSize: 14,
            fontWeight: 600,
            color: TEALD,
            textAlign: 'center',
          }}>
            This is a brief 5-8 minute screening assessment.
          </div>
        )}

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
  const showRecordToggle = mode !== 'quick' && mode !== 'rapid' && !isOperational
  const [inputModes, setInputModes] = useState(scenarios.map(() => 'type')) // 'type' or 'record'
  const [audioBlobs, setAudioBlobs] = useState(scenarios.map(() => null))
  const [audioUrls, setAudioUrls] = useState(scenarios.map(() => null))
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const audioChunksRef = useRef([])

  // Inbox Overload state
  const showInbox = mode !== 'quick' && mode !== 'rapid' && assessment.inbox_events?.scenarios
  const inboxData = showInbox ? (assessment.inbox_events.scenarios || []) : []
  const currentInbox = inboxData.find(s => s.scenario_index === scenarioIndex) || null
  const [inboxActions, setInboxActions] = useState({}) // { `${scenarioIdx}-${itemIdx}`: 'action'|'defer' }
  const [inboxNotes, setInboxNotes] = useState({}) // { `${scenarioIdx}`: 'reason for deferral' }
  const [interruptionVisible, setInterruptionVisible] = useState(false)
  const [interruptionResponse, setInterruptionResponse] = useState({}) // { scenarioIdx: 'reply_now'|'note_later'|'focus' }
  const [interruptionReply, setInterruptionReply] = useState({}) // { scenarioIdx: 'text' }
  const [interruptionDismissed, setInterruptionDismissed] = useState({})
  const interruptionTimerRef = useRef(null)

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

  // Interruption trigger — 90 seconds into each scenario
  useEffect(() => {
    if (!showInbox || !currentInbox?.interruption || interruptionDismissed[scenarioIndex]) return
    setInterruptionVisible(false)
    const t = setTimeout(() => {
      if (!interruptionDismissed[scenarioIndex]) setInterruptionVisible(true)
    }, 90000)
    interruptionTimerRef.current = setTimeout(() => {
      setInterruptionVisible(false)
      setInterruptionDismissed(prev => ({ ...prev, [scenarioIndex]: true }))
    }, 105000) // auto-dismiss after 15 seconds
    return () => { clearTimeout(t); clearTimeout(interruptionTimerRef.current) }
  }, [scenarioIndex, showInbox])

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
        inbox_responses: currentInbox ? (currentInbox.inbox_items || []).map((item, idx) => ({
          item: item.subject,
          action: inboxActions[`${i}-${idx}`] || 'no_action',
        })) : null,
        interruption_response: interruptionResponse[i] || null,
        interruption_reply: interruptionReply[i] || null,
        inbox_note: inboxNotes[i] || null,
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
            {!isOperational && (
              <span style={{ fontFamily: F, fontSize: 14, color: TX2, whiteSpace: 'nowrap' }}>
                {isLeadership ? `Step ${scenarioIndex + 1} of ${scenarios.length}` : `Scenario ${scenarioIndex + 1} of ${scenarios.length}`}
              </span>
            )}
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
          {/* Interruption Toast */}
          {interruptionVisible && currentInbox?.interruption && !interruptionResponse[scenarioIndex] && (
            <div style={{
              position: 'fixed', top: 80, right: 20, zIndex: 500, width: 340, maxWidth: 'calc(100vw - 40px)',
              background: CARD, border: `1.5px solid ${BD}`, borderRadius: 12,
              boxShadow: '0 8px 32px rgba(15,33,55,0.18)', padding: '16px 18px',
              animation: 'slideIn 0.3s ease',
            }}>
              <style>{`@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: TEAL, flexShrink: 0 }}>
                  {currentInbox.interruption.sender?.[0] || 'M'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX }}>{currentInbox.interruption.sender} <span style={{ fontWeight: 500, color: TX3 }}>({currentInbox.interruption.role})</span></div>
                  <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>{currentInbox.interruption.message}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'reply_now', label: 'Reply now' },
                  { key: 'note_later', label: 'Note for later' },
                  { key: 'focus', label: 'Stay focused' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setInterruptionResponse(prev => ({ ...prev, [scenarioIndex]: opt.key }))
                    setInterruptionVisible(false)
                    setInterruptionDismissed(prev => ({ ...prev, [scenarioIndex]: true }))
                  }} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    fontFamily: F, cursor: 'pointer',
                    background: opt.key === 'reply_now' ? TEALLT : opt.key === 'focus' ? BG : '#FEF3C7',
                    border: `1px solid ${opt.key === 'reply_now' ? `${TEAL}55` : opt.key === 'focus' ? BD : '#FCD34D'}`,
                    color: opt.key === 'reply_now' ? TEALD : opt.key === 'focus' ? TX2 : '#92400E',
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reply field if they chose reply_now */}
          {interruptionResponse[scenarioIndex] === 'reply_now' && !interruptionReply[scenarioIndex] && currentInbox?.interruption && (
            <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEALD, marginBottom: 6 }}>Quick reply to {currentInbox.interruption.sender}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type your quick reply..."
                  onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) setInterruptionReply(prev => ({ ...prev, [scenarioIndex]: e.target.value.trim() })) }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, outline: 'none' }}
                />
                <button onClick={e => {
                  const input = e.target.previousSibling
                  if (input.value.trim()) setInterruptionReply(prev => ({ ...prev, [scenarioIndex]: input.value.trim() }))
                }} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          )}

          {/* Inbox Panel */}
          {showInbox && currentInbox && (
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your inbox</div>
                <div style={{ fontFamily: F, fontSize: 11, color: TX3 }}>These arrived at the same time as this scenario</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(currentInbox.inbox_items || []).map((item, idx) => {
                  const key = `${scenarioIndex}-${idx}`
                  const action = inboxActions[key]
                  const priorityStyles = {
                    urgent: { bg: '#FEF2F2', bd: '#fecaca', color: '#dc2626', label: 'URGENT' },
                    action_needed: { bg: '#FEF3C7', bd: '#FCD34D', color: '#92400E', label: 'ACTION NEEDED' },
                    today: { bg: BG, bd: BD, color: NAVY, label: 'TODAY' },
                  }
                  const ps = priorityStyles[item.priority] || priorityStyles.today
                  return (
                    <div key={idx} style={{ background: ps.bg, border: `1px solid ${ps.bd}`, borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: ps.color, background: `${ps.color}18`, padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', flexShrink: 0 }}>{ps.label}</span>
                          <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX }}>{item.sender}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => setInboxActions(prev => ({ ...prev, [key]: 'action' }))} style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                            background: action === 'action' ? TEALLT : '#fff', border: `1px solid ${action === 'action' ? TEAL : BD}`,
                            color: action === 'action' ? TEALD : TX3,
                          }}>Handle now</button>
                          <button onClick={() => setInboxActions(prev => ({ ...prev, [key]: 'defer' }))} style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                            background: action === 'defer' ? '#FEF3C7' : '#fff', border: `1px solid ${action === 'defer' ? '#FCD34D' : BD}`,
                            color: action === 'defer' ? '#92400E' : TX3,
                          }}>Defer</button>
                        </div>
                      </div>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 2 }}>{item.subject}</div>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{item.preview}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={inboxNotes[scenarioIndex] || ''}
                  onChange={e => setInboxNotes(prev => ({ ...prev, [scenarioIndex]: e.target.value }))}
                  placeholder="Optional: why did you defer or prioritise certain items?"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12.5, color: TX, outline: 'none' }}
                />
              </div>
            </div>
          )}

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
                  {mode === 'rapid' && (
                    <div style={{ fontFamily: F, fontSize: 12, color: AMB, marginTop: 4, textAlign: 'right' }}>
                      Keep your response under 100 words
                    </div>
                  )}
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
// ─── Candidate Self-Preview ──────────────────────────────────────────────────
function CandidatePreviewPage({ candidateName, uniqueToken, onContinue }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/assess/${uniqueToken}/feedback`)
        if (res.status === 425) {
          // Scoring not finished yet — poll
          if (pollCount < 30) {
            setTimeout(() => { if (!cancelled) setPollCount(c => c + 1) }, 3000)
          }
          return
        }
        if (res.status === 403) {
          // Feedback disabled — skip to complete
          onContinue()
          return
        }
        if (!res.ok) { setError('Unable to load preview'); setLoading(false); return }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Unable to load preview')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pollCount, uniqueToken])

  if (loading || (!data && !error && pollCount < 30)) {
    return (
      <>
        <NavBar candidateName={candidateName} />
        <CentredCard>
          <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
            <div style={{
              width: 40, height: 40, border: `4px solid ${BD}`, borderTopColor: TEAL,
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
              Analysing your responses...
            </h2>
            <p style={{ fontFamily: F, color: TX3, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              This usually takes 30-60 seconds. Your personalised insights will appear shortly.
            </p>
          </Card>
        </CentredCard>
      </>
    )
  }

  if (error || !data) {
    // Skip preview gracefully
    return (
      <>
        <NavBar candidateName={candidateName} />
        <CentredCard>
          <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Your Assessment is Complete</h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}>
              Thank you for completing your assessment. The hiring team will be in touch.
            </p>
            <button onClick={onContinue} style={{ padding: '12px 28px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Continue
            </button>
          </Card>
        </CentredCard>
      </>
    )
  }

  const strengths = (data.strengths || []).slice(0, 3)
  const devArea = (data.development_plan || [])[0]

  return (
    <>
      <NavBar candidateName={candidateName} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${TEAL}, #009688)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 8px ${TEALLT}, 0 8px 28px rgba(0,191,165,0.25)`,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>
            Your Assessment is Complete
          </h1>
          <p style={{ fontFamily: F, fontSize: 16, color: TX2, margin: '0 0 6px', lineHeight: 1.6 }}>
            Here is a snapshot of what the assessment revealed about you.
          </p>
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>
            This is a summary for you. The hiring team will receive a detailed report.
          </p>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Your Strengths
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {strengths.map((s, i) => (
                <Card key={i} style={{ borderLeft: `4px solid ${TEAL}`, padding: '16px 20px' }}>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 6 }}>
                    {s.text || s.strength || s.title}
                  </div>
                  {(s.detail || s.explanation) && (
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.6 }}>
                      {s.detail || s.explanation}
                    </p>
                  )}
                  {s.evidence && (
                    <div style={{ fontFamily: F, fontSize: 12.5, color: TEALD, fontStyle: 'italic', lineHeight: 1.55 }}>
                      "{s.evidence}"
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Development opportunity */}
        {devArea && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              One area to develop
            </div>
            <Card style={{ borderLeft: '4px solid #E8B84B', padding: '16px 20px' }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 6 }}>
                {devArea.area}
              </div>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.6 }}>
                {devArea.advice}
              </p>
              {devArea.actions && devArea.actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {devArea.actions.map((a, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: TX, fontFamily: F }}>
                      <span style={{ color: '#E8B84B', fontWeight: 700, flexShrink: 0 }}>{j + 1}.</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Role expectations */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            What to expect in this role
          </div>
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ fontFamily: F, fontSize: 14, color: TX, margin: 0, lineHeight: 1.7 }}>
              Your responses showed how you approach real work situations. The hiring team uses this alongside the rest of their process to understand how you are likely to perform and what support you may need in your first 90 days.
            </p>
          </Card>
        </div>

        {/* Benchmarks if available */}
        {data.benchmarks && data.benchmarks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              How you compare
            </div>
            <Card style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.benchmarks.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: F, fontSize: 13, color: TX }}>{b.skill}</span>
                    <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: TEAL }}>Top {100 - b.percentile}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: '0 0 20px', lineHeight: 1.65 }}>
            Thank you for completing your assessment. The hiring team will be in touch.
          </p>
          <button onClick={onContinue} style={{
            padding: '14px 32px', borderRadius: 10, border: 'none',
            background: TEAL, color: '#fff',
            fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer',
          }}>
            Done
          </button>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 16, borderTop: `1px solid ${BD}` }}>
          <ProdictaLogo textColor={NAVY} size={28} />
          <p style={{ fontFamily: F, color: TX3, fontSize: 12, margin: '6px 0 0' }}>Work simulation assessments</p>
        </div>
      </div>
    </>
  )
}

function CompletePage({ candidateName, assessment }) {
  const [textVisible, setTextVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setTextVisible(true), 700); return () => clearTimeout(t) }, [])
  const rl = assessment?.role_level || 'MID_LEVEL'
  const am = (assessment?.assessment_mode || '').toLowerCase()

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
            background: `linear-gradient(135deg, #00BFA5, #009688)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 0 0 8px #E6F7F5, 0 8px 28px rgba(0,191,165,0.35)`,
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
              {rl === 'OPERATIONAL' || am === 'rapid'
                ? 'Done. Your results are being prepared.'
                : rl === 'LEADERSHIP'
                ? 'Your Strategy-Fit assessment is complete.'
                : 'All done. Thank you!'}
            </h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 8px', lineHeight: 1.6 }}>
              {rl === 'OPERATIONAL' || am === 'rapid'
                ? 'Your responses have been submitted.'
                : rl === 'LEADERSHIP'
                ? 'A detailed report is being prepared for the hiring team.'
                : 'Your responses have been submitted successfully.'}
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

// ─── Virtual Workspace: Day 1 Simulation ─────────────────────────────────────
function WorkspacePage({ assessment, candidate, onSubmit, onSkip }) {
  const [content, setContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(true)
  const [emailOpen, setEmailOpen] = useState(null)
  const [emailReplies, setEmailReplies] = useState({})
  const [emailRead, setEmailRead] = useState({})
  const [msgReplies, setMsgReplies] = useState({})
  const [taskActions, setTaskActions] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [gapPlans, setGapPlans] = useState({})
  const [surpriseShown, setSurpriseShown] = useState(false)
  const [surpriseReply, setSurpriseReply] = useState('')
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const timerRef = useRef(null)
  const surpriseRef = useRef(null)

  useEffect(() => {
    fetch(`/api/assessment/${assessment.id}/workspace-content`)
      .then(r => r.json())
      .then(data => { if (!data.error) setContent(data) })
      .finally(() => setLoadingContent(false))
  }, [assessment.id])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); return 0 }; return p - 1 })
    }, 1000)
    surpriseRef.current = setTimeout(() => setSurpriseShown(true), 180000) // 3 minutes
    return () => { clearInterval(timerRef.current); clearTimeout(surpriseRef.current) }
  }, [])

  const emailsReplied = Object.keys(emailReplies).filter(k => emailReplies[k]?.trim()).length
  const tasksHandled = Object.keys(taskActions).length
  const msgsReplied = Object.keys(msgReplies).filter(k => msgReplies[k]?.trim()).length
  const canSubmit = emailsReplied >= 2 && tasksHandled >= 3
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  function handleSubmit() {
    clearInterval(timerRef.current)
    onSubmit({
      email_replies: emailReplies,
      email_read: emailRead,
      message_replies: msgReplies,
      task_actions: taskActions,
      task_notes: taskNotes,
      gap_plans: gapPlans,
      surprise_reply: surpriseReply,
      time_remaining: timeLeft,
    })
  }

  if (loadingContent) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: TX2, fontSize: 14 }}>Preparing your workspace...</div>
        </div>
      </div>
    )
  }

  if (!content) return <div style={{ minHeight: '100vh', background: '#f3f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: TX2 }}>Unable to load workspace.</div>

  const emails = content.emails || []
  const messages = content.messages || []
  const tasks = content.tasks || []
  const gaps = content.calendar_gaps || []
  const fixed = content.fixed_meetings || []
  const surprise = content.surprise_message

  return (
    <div style={{ minHeight: '100vh', background: '#f3f5f8', fontFamily: F }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: TEAL }}>PRODICTA</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{assessment.role_title} — Day 1, 9:00am</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: timeLeft < 120 ? '#dc2626' : '#fff' }}>{mins}:{String(secs).padStart(2, '0')}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Emails {emailsReplied}/{emails.length} | Tasks {tasksHandled}/{tasks.length} | Messages {msgsReplied}/{messages.length}</span>
        </div>
      </div>

      {/* Surprise notification */}
      {surpriseShown && surprise && !surpriseReply && (
        <div style={{ position: 'fixed', top: 60, right: 20, zIndex: 500, width: 320, background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(15,33,55,0.18)', padding: '14px 16px', animation: 'slideIn 0.3s ease' }}>
          <style>{`@keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }`}</style>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: TEAL, flexShrink: 0 }}>{surprise.from?.[0]}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX }}>{surprise.from} <span style={{ fontWeight: 500, color: TX3 }}>({surprise.role})</span></div>
              <div style={{ fontSize: 13, color: TX2 }}>{surprise.text}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" placeholder="Quick reply..." onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) setSurpriseReply(e.target.value.trim()) }} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, outline: 'none' }} />
            <button onClick={() => setSurpriseReply('noted')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: '#fff', color: TX2, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Main workspace grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto' }}>

        {/* Email Inbox */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Email Inbox</span>
            <span style={{ fontSize: 11, color: TX3 }}>{emailsReplied}/{emails.length} replied</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {emails.map(email => (
              <div key={email.id}>
                <div
                  onClick={() => { setEmailOpen(emailOpen === email.id ? null : email.id); setEmailRead(p => ({ ...p, [email.id]: true })) }}
                  style={{ padding: '12px 18px', borderBottom: `1px solid ${BD}`, cursor: 'pointer', background: emailRead[email.id] ? '#fff' : '#f0fdfb' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: emailRead[email.id] ? 500 : 700, color: TX }}>{email.from}</span>
                    {emailReplies[email.id] && <span style={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>REPLIED</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX, marginBottom: 2 }}>{email.subject}</div>
                  <div style={{ fontSize: 12, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.preview}</div>
                </div>
                {emailOpen === email.id && (
                  <div style={{ padding: '14px 18px', background: BG, borderBottom: `1px solid ${BD}` }}>
                    <p style={{ fontSize: 13, color: TX, lineHeight: 1.65, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{email.body}</p>
                    <textarea
                      rows={3}
                      value={emailReplies[email.id] || ''}
                      onChange={e => setEmailReplies(p => ({ ...p, [email.id]: e.target.value }))}
                      placeholder="Type your reply..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, color: TX, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Tasks</span>
            <span style={{ fontSize: 11, color: TX3 }}>{tasksHandled}/{tasks.length} actioned</span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 360, overflowY: 'auto' }}>
            {tasks.map(task => {
              const action = taskActions[task.id]
              const pColor = task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#E8B84B' : TX3
              return (
                <div key={task.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${BD}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: pColor, textTransform: 'uppercase' }}>{task.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{task.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: TX3, marginBottom: 6 }}>{task.context}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['do_now', 'delegate', 'defer'].map(a => (
                      <button key={a} onClick={() => setTaskActions(p => ({ ...p, [task.id]: a }))} style={{
                        padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                        background: action === a ? (a === 'do_now' ? TEALLT : a === 'delegate' ? '#EDE9FE' : '#FEF3C7') : '#fff',
                        border: `1px solid ${action === a ? (a === 'do_now' ? TEAL : a === 'delegate' ? '#C4B5FD' : '#FCD34D') : BD}`,
                        color: action === a ? (a === 'do_now' ? TEALD : a === 'delegate' ? '#5B21B6' : '#92400E') : TX3,
                      }}>
                        {a === 'do_now' ? 'Do now' : a === 'delegate' ? 'Delegate' : 'Defer'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Messages</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
            {messages.map(msg => (
              <div key={msg.id}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: TEAL, flexShrink: 0 }}>{msg.from?.[0]}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX }}>{msg.from} <span style={{ fontWeight: 500, color: TX3 }}>{msg.time}</span></div>
                    <div style={{ fontSize: 13, color: TX2 }}>{msg.text}</div>
                  </div>
                </div>
                <input
                  type="text"
                  value={msgReplies[msg.id] || ''}
                  onChange={e => setMsgReplies(p => ({ ...p, [msg.id]: e.target.value }))}
                  placeholder="Reply..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, color: TX, outline: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Today's Schedule</span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            {fixed.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: TX3, width: 44, flexShrink: 0 }}>{m.time}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{m.title}</span>
              </div>
            ))}
            {gaps.map((g, i) => (
              <div key={`gap-${i}`} style={{ padding: '8px 0', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: FM, fontSize: 11, color: TEAL, width: 44, flexShrink: 0 }}>{g.time}</span>
                  <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>{g.context}</span>
                </div>
                <input
                  type="text"
                  value={gapPlans[i] || ''}
                  onChange={e => setGapPlans(p => ({ ...p, [i]: e.target.value }))}
                  placeholder="What will you do in this slot?"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, color: TX, outline: 'none', marginLeft: 54 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `2px solid ${TEAL}` }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: F }}>
          Reply to at least 2 emails and action at least 3 tasks to submit
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: canSubmit ? TEAL : 'rgba(255,255,255,0.1)',
            color: canSubmit ? NAVY : 'rgba(255,255,255,0.3)',
            fontFamily: F, fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>Submit my morning</button>
          <button onClick={onSkip} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Skip</button>
        </div>
      </div>
    </div>
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
  // Guard params in case Next.js ever hands us something unexpected. In 14.x
  // params is a plain object, but better safe than crashing a candidate mid-flow.
  const uniqueToken = params?.uniqueToken || null

  const [uiState, setUiState] = useState('loading') // loading | error | already_complete | intro | active | calendar | workspace | submitting | rating | preview | complete
  const [errorMessage, setErrorMessage] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [pendingResponses, setPendingResponses] = useState(null) // stored between active→calendar→submit

  useEffect(() => {
    if (!uniqueToken) {
      setUiState('error')
      setErrorMessage('Assessment link is missing or invalid.')
      return
    }
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
        setCandidate(data?.candidate || null)
        setAssessment(data?.assessment || null)
        setCompanyName(data?.company_name || 'The hiring team')

        if (data?.candidate?.status === 'completed') {
          setUiState('already_complete')
        } else if (data?.candidate) {
          setUiState('intro')
        } else {
          setUiState('error')
          setErrorMessage('Assessment data is incomplete. Please contact the hiring team.')
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
    const currentMode = (assessment?.assessment_mode || '').toLowerCase()
    // Rapid mode skips calendar, goes straight to submit
    if (currentMode === 'rapid') {
      doSubmit(responses)
    } else if (assessment?.calendar_events) {
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
  if (uiState === 'already_complete') return <AlreadyCompletedPage candidateName={candidate?.name} token={uniqueToken} />
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
        fetch(`/api/assessment/${assessment.id}/calendar-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: calendarData }),
        }).catch(() => {})
        // Route to workspace for Strategy-Fit, otherwise submit
        const isAdvanced = (assessment.assessment_mode || '').toLowerCase() === 'advanced'
        if (isAdvanced) { setUiState('workspace') } else { doSubmit(pendingResponses) }
      }}
      onSkip={() => {
        const isAdvanced = (assessment.assessment_mode || '').toLowerCase() === 'advanced'
        if (isAdvanced) { setUiState('workspace') } else { doSubmit(pendingResponses) }
      }}
    />
  )
  if (uiState === 'workspace') return (
    <WorkspacePage
      assessment={assessment}
      candidate={candidate}
      onSubmit={(workspaceData) => {
        doSubmit(pendingResponses)
        // Score workspace async
        fetch(`/api/assessment/${assessment.id}/calendar-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: { workspace_data: workspaceData } }),
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
      onComplete={() => setUiState('preview')}
    />
  )
  if (uiState === 'preview') return (
    <CandidatePreviewPage
      candidateName={candidate?.name}
      uniqueToken={uniqueToken}
      onContinue={() => setUiState('complete')}
    />
  )
  if (uiState === 'complete') return <CompletePage candidateName={candidate?.name} assessment={assessment} />

  return null
}
