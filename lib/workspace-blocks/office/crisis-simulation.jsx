'use client'

// Crisis simulation block. The dynamic Workspace block used heavily by
// management and director-level roles. A role-specific crisis triggers via
// a phone call, urgent message or breaking news alert at the start of the
// block. The candidate then works through three escalating stages, typing
// a free-text response at each. Captures stage_responses, final_reflection
// and total_time_in_block. Per-stage timer is informational only (no
// penalty) so the candidate feels real-world pressure without being cut
// off mid-thought.
//
// Visual treatment:
//   - Slightly more pronounced visual weight than other blocks.
//   - Subtle pulsing jade alert indicator on the trigger panel (no red,
//     amber or green: traffic light colours stay reserved for scoring).
//   - Stage advance animation (200ms slide left) signals momentum.
//
// Falls back to a "scenario summary + Skip" panel if the typed crisis
// payload is missing (older cached scenarios).

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['crisis-simulation']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const TRIGGER_LABELS = {
  phone_call:    { tag: 'Incoming call', verb: 'Take the call' },
  urgent_message: { tag: 'Urgent message', verb: 'Open the message' },
  breaking_news: { tag: 'Breaking news', verb: 'Read the alert' },
}

function useIsMobile(threshold = 760) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(typeof window !== 'undefined' && window.innerWidth < threshold)
    check()
    if (typeof window !== 'undefined') window.addEventListener('resize', check)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('resize', check) }
  }, [threshold])
  return mobile
}

function useStageElapsed(active) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  useEffect(() => {
    if (!active) return
    startRef.current = Date.now()
    setElapsed(0)
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [active])
  return elapsed
}

function formatSeconds(s) {
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function CrisisSimulationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  const crisis = useMemo(() => {
    const c = block_content || {}
    const stages = [c.stage_1, c.stage_2, c.stage_3].filter(s => s && (s.new_information || s.prompt))
    return {
      trigger_type: c.trigger_type || 'phone_call',
      initial_alert: typeof c.initial_alert === 'string' ? c.initial_alert.trim() : '',
      caller_or_sender: c.caller_or_sender || null,
      stages,
    }
  }, [block_content])

  const hasUsablePayload =
    crisis.initial_alert.length > 0 &&
    crisis.stages.length >= 1

  const [stageIndex, setStageIndex] = useState(-1) // -1 = intro; 0..n-1 = stages; n = reflection
  const [responses, setResponses] = useState([]) // [{ stage_number, candidate_response, time_per_stage }]
  const [draft, setDraft] = useState('')
  const [reflection, setReflection] = useState('')
  const [slideKey, setSlideKey] = useState(0) // bumps on advance to retrigger animation
  const [startedAt] = useState(() => new Date().toISOString())
  const blockStartRef = useRef(null)

  const stageActive = stageIndex >= 0 && stageIndex < crisis.stages.length
  const stageElapsed = useStageElapsed(stageActive)

  useEffect(() => {
    if (stageIndex === 0 && !blockStartRef.current) {
      blockStartRef.current = Date.now()
    }
  }, [stageIndex])

  if (!hasUsablePayload) {
    return (
      <div style={{ fontFamily: F }}>
        <BlockScenarioHeader
          scenario_context={scenario_context}
          block_content={block_content}
          blockName="Crisis simulation"
        />
        <NoCrisisFallback
          block_content={block_content}
          onComplete={() => onComplete && onComplete({
            block_id: 'crisis-simulation',
            fallback: true,
            started_at: startedAt,
            completed_at: new Date().toISOString(),
          })}
        />
      </div>
    )
  }

  const handleStartCall = () => {
    blockStartRef.current = Date.now()
    setStageIndex(0)
    setSlideKey(k => k + 1)
  }

  const handleSendResponse = () => {
    const text = draft.trim()
    if (text.length < 4) return
    const entry = {
      stage_number: stageIndex + 1,
      candidate_response: text,
      time_per_stage: stageElapsed,
    }
    const next = [...responses, entry]
    setResponses(next)
    setDraft('')
    setSlideKey(k => k + 1)
    setStageIndex(i => i + 1)
  }

  const handleSubmitReflection = () => {
    const totalSeconds = blockStartRef.current
      ? Math.floor((Date.now() - blockStartRef.current) / 1000)
      : null
    onComplete && onComplete({
      block_id: 'crisis-simulation',
      stage_responses: responses,
      final_reflection: reflection.trim(),
      full_transcript: buildTranscript(crisis, responses),
      decision_pattern: derivePattern(responses),
      trigger_type: crisis.trigger_type,
      caller_or_sender: crisis.caller_or_sender,
      total_time_in_block: totalSeconds,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Crisis simulation"
      />

      <PulseStyles />

      {stageIndex === -1 ? (
        <IntroPanel
          crisis={crisis}
          isMobile={isMobile}
          onStart={handleStartCall}
        />
      ) : null}

      {stageActive ? (
        <StagePanel
          key={slideKey}
          stage={crisis.stages[stageIndex]}
          stageNumber={stageIndex + 1}
          totalStages={crisis.stages.length}
          elapsed={stageElapsed}
          draft={draft}
          onDraft={setDraft}
          onSend={handleSendResponse}
          isMobile={isMobile}
        />
      ) : null}

      {stageIndex >= crisis.stages.length ? (
        <ReflectionPanel
          key={slideKey}
          totalStages={crisis.stages.length}
          completed={responses.length}
          reflection={reflection}
          onReflection={setReflection}
          onSubmit={handleSubmitReflection}
        />
      ) : null}
    </div>
  )
}

// Inline keyframes for the subtle pulse on the alert panel and the
// 200ms slide-in on stage advance. Scoped via unique class names so they
// do not collide with anything else in the workspace.
const PULSE_CSS = `
@keyframes prodictaCrisisPulse {
  0%   { box-shadow: 0 0 0 0 rgba(0, 191, 165, 0.45); }
  70%  { box-shadow: 0 0 0 14px rgba(0, 191, 165, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 191, 165, 0); }
}
.prodicta-crisis-alert {
  animation: prodictaCrisisPulse 2.4s ease-out infinite;
}
@keyframes prodictaCrisisDot {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50%      { transform: scale(1.18); opacity: 1; }
}
.prodicta-crisis-dot {
  animation: prodictaCrisisDot 1.4s ease-in-out infinite;
}
@keyframes prodictaCrisisSlide {
  0%   { transform: translateX(28px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
.prodicta-crisis-slide {
  animation: prodictaCrisisSlide 200ms ease-out both;
}
`

function PulseStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PULSE_CSS }} />
}

function IntroPanel({ crisis, isMobile, onStart }) {
  const trigger = TRIGGER_LABELS[crisis.trigger_type] || TRIGGER_LABELS.phone_call
  const sender = crisis.caller_or_sender || {}
  return (
    <div className="prodicta-crisis-slide" style={{
      maxWidth: 760, margin: '0 auto 18px',
    }}>
      <div className="prodicta-crisis-alert" style={{
        background: '#fff',
        border: `2px solid ${TEAL}`,
        borderRadius: 14,
        padding: isMobile ? 18 : 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="prodicta-crisis-dot" style={{
            width: 10, height: 10, borderRadius: '50%', background: TEAL,
            display: 'inline-block',
          }} />
          <span style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {trigger.tag} now
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1.25 }}>
            {sender.name || 'Caller'}
          </div>
          {sender.role ? (
            <div style={{ fontFamily: F, fontSize: 14, color: '#475569', marginTop: 2 }}>
              {sender.role}
              {sender.relationship ? <span style={{ fontFamily: FM, fontSize: 11, color: '#64748b', marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sender.relationship}</span> : null}
            </div>
          ) : null}
        </div>

        <blockquote style={{
          margin: 0,
          padding: isMobile ? '14px 16px' : '18px 20px',
          background: `${TEAL}14`,
          borderLeft: `4px solid ${TEAL}`,
          borderRadius: 8,
          fontFamily: F, fontSize: isMobile ? 16 : 18, color: NAVY,
          lineHeight: 1.55, fontStyle: 'normal',
        }}>
          {crisis.initial_alert}
        </blockquote>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            Three stages will follow. New information arrives at each. You cannot go back once you advance.
          </div>
          <button
            type="button"
            onClick={onStart}
            style={{
              fontFamily: F, fontSize: 16, fontWeight: 700,
              padding: '12px 22px', borderRadius: 10, border: 'none',
              background: TEAL, color: '#fff', cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(0,191,165,0.28)',
            }}
          >
            {trigger.verb}
          </button>
        </div>
      </div>
    </div>
  )
}

function StagePanel({ stage, stageNumber, totalStages, elapsed, draft, onDraft, onSend, isMobile }) {
  const canSend = draft.trim().length >= 4
  return (
    <div className="prodicta-crisis-slide" style={{
      maxWidth: 760, margin: '0 auto 18px',
    }}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Stage {stageNumber} of {totalStages}
          </div>
          <StageDots current={stageNumber} total={totalStages} />
        </div>
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: '#475569' }}>
          {formatSeconds(elapsed)} on this stage
        </div>
      </div>

      <div style={{
        background: `${TEAL}10`,
        border: `1px solid ${TEAL}55`,
        borderRadius: 12,
        padding: isMobile ? 14 : 18,
        marginBottom: 14,
      }}>
        <span style={{
          display: 'inline-block',
          fontFamily: FM, fontSize: 10, fontWeight: 800,
          padding: '3px 9px', borderRadius: 10,
          background: TEAL, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          Update
        </span>
        <div style={{ fontFamily: F, fontSize: isMobile ? 14 : 15, color: NAVY, lineHeight: 1.55 }}>
          {stage.new_information}
        </div>
      </div>

      {stage.prompt ? (
        <div style={{
          fontFamily: F, fontSize: isMobile ? 16 : 17, fontWeight: 700,
          color: NAVY, lineHeight: 1.45, marginBottom: 10,
        }}>
          {stage.prompt}
        </div>
      ) : null}

      <div style={{ fontFamily: FM, fontSize: 11, color: '#64748b', marginBottom: 6, letterSpacing: '0.06em' }}>
        Time pressure: 60-90 seconds suggested. No penalty if you take longer.
      </div>

      <textarea
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        rows={isMobile ? 5 : 6}
        placeholder="Type what you say or do. Who do you call or email, what is the first sentence, what do you commit to?"
        style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.55,
          padding: 12, borderRadius: 10,
          border: '1px solid #cbd5e1', background: '#f8fafc',
          outline: 'none', resize: 'vertical', minHeight: 110,
          marginBottom: 12,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: F, fontSize: 12, color: '#64748b' }}>
          You cannot go back once you send.
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          style={{
            fontFamily: F, fontSize: 15, fontWeight: 700,
            padding: '11px 20px', borderRadius: 10, border: 'none',
            background: canSend ? TEAL : '#cbd5e1',
            color: '#fff',
            cursor: canSend ? 'pointer' : 'not-allowed',
            boxShadow: canSend ? '0 4px 12px rgba(0,191,165,0.22)' : 'none',
          }}
        >
          {stageNumber === totalStages ? 'Send response' : 'Send and continue'}
        </button>
      </div>
    </div>
  )
}

function StageDots({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1
        const isCurrent = idx === current
        const isDone = idx < current
        return (
          <span
            key={i}
            style={{
              width: isCurrent ? 26 : 10,
              height: 10,
              borderRadius: 6,
              background: isDone ? TEAL : isCurrent ? TEAL : '#cbd5e1',
              opacity: isDone ? 0.45 : 1,
              transition: 'all 200ms ease',
            }}
          />
        )
      })}
    </div>
  )
}

function ReflectionPanel({ totalStages, completed, reflection, onReflection, onSubmit }) {
  const canSubmit = reflection.trim().length >= 12
  return (
    <div className="prodicta-crisis-slide" style={{
      maxWidth: 760, margin: '0 auto 18px',
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22,
    }}>
      <div style={{
        fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        Crisis handled &middot; {completed} of {totalStages} stages
      </div>
      <h3 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, lineHeight: 1.2, marginBottom: 8 }}>
        Looking back, what would you do differently?
      </h3>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 12 }}>
        Two or three sentences. Be honest. What would you escalate sooner, what would you not commit to, what did the pressure cost you.
      </p>

      <textarea
        value={reflection}
        onChange={(e) => onReflection(e.target.value)}
        rows={5}
        placeholder="What would you change with hindsight?"
        style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.55,
          padding: 12, borderRadius: 10,
          border: '1px solid #cbd5e1', background: '#f8fafc',
          outline: 'none', resize: 'vertical', minHeight: 100,
          marginBottom: 14,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            fontFamily: F, fontSize: 15, fontWeight: 700,
            padding: '11px 22px', borderRadius: 10, border: 'none',
            background: canSubmit ? TEAL : '#cbd5e1',
            color: '#fff',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Submit reflection
        </button>
      </div>
    </div>
  )
}

function NoCrisisFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Crisis payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed crisis fields. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      {Array.isArray(block_content?.key_items) && block_content.key_items.length ? (
        <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
          {block_content.key_items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onComplete}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: TEAL, color: '#fff', cursor: 'pointer',
        }}
      >
        Skip and continue
      </button>
    </div>
  )
}

function buildTranscript(crisis, responses) {
  const lines = []
  const sender = crisis.caller_or_sender || {}
  const senderLabel = sender.name ? `${sender.name}${sender.role ? ` (${sender.role})` : ''}` : 'Caller'
  lines.push(`${senderLabel}: ${crisis.initial_alert}`)
  for (let i = 0; i < responses.length; i++) {
    const stage = crisis.stages[i]
    if (stage?.new_information) {
      lines.push(`Update (stage ${i + 1}): ${stage.new_information}`)
    }
    if (stage?.prompt) {
      lines.push(`Prompt: ${stage.prompt}`)
    }
    lines.push(`You: ${responses[i].candidate_response}`)
  }
  return lines.join('\n\n')
}

function derivePattern(responses) {
  if (!responses.length) return null
  const totalChars = responses.reduce((s, r) => s + (r.candidate_response || '').length, 0)
  const totalSeconds = responses.reduce((s, r) => s + (r.time_per_stage || 0), 0)
  const avgChars = Math.round(totalChars / responses.length)
  const avgSeconds = Math.round(totalSeconds / responses.length)
  let cadence = 'measured'
  if (avgSeconds <= 45) cadence = 'fast'
  else if (avgSeconds >= 120) cadence = 'deliberate'
  return {
    stages_completed: responses.length,
    average_response_seconds: avgSeconds,
    average_response_length_chars: avgChars,
    cadence,
  }
}
