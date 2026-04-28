'use client'

// Conversation Simulation, education shell.
//
// Receives a typed three-turn conversation payload from the education
// scenario generator: counterpart_type, counterpart_persona,
// conversation_setting, purpose, turns[3], plus scoring-only
// regulation_anchors.
//
// The candidate works through a turn-by-turn dialogue:
//   - Turn 1: counterpart speaks. Candidate writes their response.
//   - Turn 2: counterpart responds (already prepared by the generator
//     so the conversation does not require a live back-end). Candidate
//     writes their response.
//   - Turn 3: counterpart escalates. Candidate writes their response.
//
// After all three turns, the candidate captures:
//   A. Their emotional regulation strategy (textarea)
//   B. De-escalation tactics they used (multi-select + notes)
//   C. Safeguarding or escalation considerations (multi-select + notes)
//
// regulation_anchors is ground-truth, never rendered. Each turn
// records its own response length so the per-block scorer can read
// how the candidate's voice held across the arc.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['conversation-simulation']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const SLATE_BG = '#eef1f5'
const SLATE_BORDER = '#c7cfd9'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const COUNTERPART_LABEL = {
  parent: 'Parent / carer',
  pupil: 'Pupil',
  colleague: 'Colleague',
  governor: 'Governor',
  mat_or_la_representative: 'MAT / LA representative',
}

const PURPOSE_LABEL = {
  parent_complaint_response: 'Parent complaint response',
  pupil_supportive_conversation: 'Pupil supportive conversation',
  colleague_pushback: 'Colleague pushback',
  governor_or_mat_inquiry: 'Governor / MAT inquiry',
  la_or_external_inquiry: 'LA / external inquiry',
}

const DEESCALATION_OPTIONS = [
  { id: 'acknowledge_emotion',        label: 'Acknowledge emotion before content' },
  { id: 'name_back',                  label: 'Name back what the counterpart said' },
  { id: 'pace_slowed',                label: 'Slowed pace deliberately' },
  { id: 'concrete_next_step',         label: 'Offered a concrete next step' },
  { id: 'boundary_held',              label: 'Held a boundary without escalating affect' },
  { id: 'safeguarding_line_named',    label: 'Named the safeguarding line explicitly' },
  { id: 'paused_to_listen',           label: 'Paused to listen rather than explain' },
]

const ESCALATION_OPTIONS = [
  { id: 'safeguarding_concern',       label: 'Safeguarding concern raised in the conversation' },
  { id: 'complaint_likely_formal',    label: 'Likely to escalate to a formal complaint' },
  { id: 'governor_or_la_route',       label: 'Counterpart will likely route via governors / LA / MAT' },
  { id: 'pupil_at_risk',              label: 'Pupil at risk indicator surfaced' },
  { id: 'staff_conduct_question',     label: 'Staff-conduct question raised' },
  { id: 'no_escalation_needed',       label: 'No escalation required at this point' },
]

const TURN_RESPONSE_MIN = 200
const REGULATION_MIN = 80

export default function ConversationSimulationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const counterpart_type = block_content?.counterpart_type || 'parent'
  const persona = block_content?.counterpart_persona || null
  const setting = block_content?.conversation_setting || ''
  const purpose = block_content?.purpose || ''
  const turns = Array.isArray(block_content?.turns) ? block_content.turns : []

  const [activeTurn, setActiveTurn] = useState(0) // 0,1,2 visible based on progress
  const [responses, setResponses] = useState(['', '', ''])
  const [regulation, setRegulation] = useState('')
  const [deescalation, setDeescalation] = useState({})
  const [deescalationNotes, setDeescalationNotes] = useState('')
  const [escalation, setEscalation] = useState({})
  const [escalationNotes, setEscalationNotes] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setActiveTurn(0)
    setResponses(['', '', ''])
    setRegulation('')
    setDeescalation({})
    setDeescalationNotes('')
    setEscalation({})
    setEscalationNotes('')
  }, [turns.map(t => t.counterpart_says).join('|')])

  const setResponse = (i, text) => {
    setResponses(prev => prev.map((r, idx) => idx === i ? text : r))
  }
  const advanceTurn = (from) => {
    if (from < turns.length - 1 && activeTurn === from) {
      setActiveTurn(from + 1)
    }
  }
  const toggleDeescalation = (id) => {
    setDeescalation(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleEscalation = (id) => {
    setEscalation(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_escalation_needed' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_escalation_needed') delete next[k]
      } else if (id !== 'no_escalation_needed' && next[id]) {
        delete next['no_escalation_needed']
      }
      return next
    })
  }

  const turnReady = (i) => responses[i].trim().length >= TURN_RESPONSE_MIN
  const allTurnsReady = turns.length > 0 && turns.every((_, i) => turnReady(i))
  const regulationReady = regulation.trim().length >= REGULATION_MIN
  const deescalationList = Object.keys(deescalation)
  const deescalationReady = deescalationList.length >= 1
  const escalationList = Object.keys(escalation)
  const escalationReady = escalationList.length >= 1

  const canSubmit = turns.length === 3
    && allTurnsReady
    && regulationReady
    && deescalationReady
    && escalationReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'conversation-simulation',
      counterpart_type,
      purpose,
      turn_responses: turns.map((t, i) => ({
        turn_index: t.turn_index || (i + 1),
        response_text: responses[i].trim(),
        response_word_count: responses[i].trim().split(/\s+/).filter(Boolean).length,
      })),
      regulation_strategy: regulation.trim(),
      deescalation_tactics: deescalationList,
      deescalation_notes: deescalationNotes.trim(),
      escalation_considerations: escalationList,
      escalation_notes: escalationNotes.trim(),
      time_in_block_seconds,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Conversation simulation"
      />

      {turns.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Three-turn conversation. Read what {persona?.name || 'the counterpart'} says, then write what you would actually say back. The conversation continues turn-by-turn. Patterns suggest the strongest call here is the one that holds professional judgement under interpersonal pressure.
          </div>

          {/* Counterpart panel */}
          {persona ? (
            <div style={{
              maxWidth: 880, margin: '0 auto 14px',
              background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
              borderLeft: `4px solid ${NAVY}`,
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {COUNTERPART_LABEL[counterpart_type] || 'Counterpart'}
              </div>
              <div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.35, marginBottom: 8 }}>
                {persona.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 8 }}>
                <Meta k="Relationship" v={persona.relationship_to_situation} />
                <Meta k="Setting" v={setting} />
                <Meta k="Purpose" v={PURPOSE_LABEL[purpose] || purpose} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <Meta k="Emotional state" v={persona.emotional_state} />
                <Meta k="Core position" v={persona.core_position} />
              </div>
            </div>
          ) : null}

          {/* Turn-by-turn */}
          <div style={{ maxWidth: 880, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {turns.map((t, i) => {
              const isOpen = i <= activeTurn
              const ready = turnReady(i)
              return (
                <div key={i} style={{
                  background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden',
                  opacity: isOpen ? 1 : 0.55,
                }}>
                  <div style={{
                    padding: '10px 14px', background: '#f8fafc', borderBottom: `1px solid ${BD}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden="true" style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: FM, fontSize: 11, fontWeight: 700,
                        background: ready ? TEAL : '#f1f5f9',
                        color: ready ? '#fff' : TX3,
                        border: `1px solid ${ready ? TEAL : BD}`,
                      }}>
                        {t.turn_index || (i + 1)}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
                        Turn {t.turn_index || (i + 1)}
                      </span>
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 11, color: ready ? TEAL : TX3 }}>
                      {responses[i].trim().length} / {TURN_RESPONSE_MIN}
                    </span>
                  </div>
                  {isOpen ? (
                    <div style={{ padding: 14 }}>
                      <div style={{
                        background: '#fff', border: `1px solid ${BD}`, borderLeft: `4px solid ${NAVY}`,
                        borderRadius: 8, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          {persona?.name || 'Counterpart'} says
                        </div>
                        <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                          {t.counterpart_says}
                        </p>
                      </div>
                      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Your response
                      </div>
                      <textarea
                        value={responses[i]}
                        onChange={(e) => setResponse(i, e.target.value)}
                        rows={6}
                        placeholder={`Write what you would actually say back, in your own voice. Minimum ${TURN_RESPONSE_MIN} characters.`}
                        style={{ ...textareaStyle, minHeight: 140 }}
                      />
                      {i < turns.length - 1 ? (
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => advanceTurn(i)}
                            disabled={!ready || activeTurn !== i}
                            style={{
                              fontFamily: F, fontSize: 13, fontWeight: 700,
                              padding: '8px 14px', borderRadius: 8, border: 'none',
                              background: (ready && activeTurn === i) ? TEAL : '#cbd5e1',
                              color: '#fff',
                              cursor: (ready && activeTurn === i) ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Continue to turn {(t.turn_index || (i + 1)) + 1}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* A. Regulation */}
          <Section
            number={1}
            title="Emotional regulation strategy"
            hint={`Two or three sentences naming how you held your composure across the arc. Minimum ${REGULATION_MIN} characters.`}
            status={regulationReady ? 'ready' : 'incomplete'}
            counter={`${regulation.trim().length} / ${REGULATION_MIN}`}
          >
            <textarea
              value={regulation}
              onChange={(e) => setRegulation(e.target.value)}
              rows={3}
              placeholder="Pace, breathing, what you noticed in your own response, where you felt the pull and how you held."
              style={textareaStyle}
            />
          </Section>

          {/* B. De-escalation */}
          <Section
            number={2}
            title="De-escalation tactics you used"
            hint="Tick the tactics you actively chose. Add a short note if helpful."
            status={deescalationReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={DEESCALATION_OPTIONS}
              selectedMap={deescalation}
              onToggle={toggleDeescalation}
            />
            <input
              type="text"
              value={deescalationNotes}
              onChange={(e) => setDeescalationNotes(e.target.value)}
              placeholder="Optional note: a specific phrase you used, or a moment that turned the conversation."
              style={inputStyle}
            />
          </Section>

          {/* C. Escalation / safeguarding */}
          <Section
            number={3}
            title="Safeguarding or escalation considerations"
            hint="Tick anything you would now follow up on after the conversation."
            status={escalationReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={ESCALATION_OPTIONS}
              selectedMap={escalation}
              onToggle={toggleEscalation}
            />
            <input
              type="text"
              value={escalationNotes}
              onChange={(e) => setEscalationNotes(e.target.value)}
              placeholder="Optional note: who you would follow up with and on what timing."
              style={inputStyle}
            />
          </Section>

          <SubmitFooter canSubmit={canSubmit} onSubmit={handleSubmit} />
        </>
      )}
    </div>
  )
}

function Meta({ k, v }) {
  if (!v) return null
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{k}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.45 }}>{v}</div>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: F, fontSize: 13, color: NAVY,
  padding: '8px 10px', borderRadius: 8,
  border: `1px solid ${BD}`, background: '#f8fafc',
  outline: 'none', marginTop: 8,
}

const textareaStyle = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.55,
  padding: 10, borderRadius: 8,
  border: `1px solid ${BD}`, background: '#f8fafc',
  outline: 'none', resize: 'vertical',
}

function Section({ number, title, hint, status, counter, children }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto 12px',
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 4, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FM, fontSize: 11, fontWeight: 700,
            background: status === 'ready' ? TEAL : '#f1f5f9',
            color: status === 'ready' ? '#fff' : TX3,
            border: `1px solid ${status === 'ready' ? TEAL : BD}`,
          }}>
            {number}
          </span>
          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
            {title}
          </span>
        </div>
        {counter ? (
          <span style={{ fontFamily: FM, fontSize: 11, color: status === 'ready' ? TEAL : TX3 }}>
            {counter}
          </span>
        ) : null}
      </div>
      {hint ? (
        <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, lineHeight: 1.45, marginBottom: 8 }}>
          {hint}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function CheckboxGrid({ options, selectedMap, onToggle }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 6,
    }}>
      {options.map(o => {
        const checked = !!selectedMap[o.id]
        return (
          <label
            key={o.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              background: checked ? TEAL_TINT : '#fff',
              border: `1px solid ${checked ? TEAL : BD}`,
              cursor: 'pointer',
              fontFamily: F, fontSize: 13, color: NAVY,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(o.id)}
              style={{ accentColor: TEAL, width: 16, height: 16, cursor: 'pointer', margin: 0 }}
            />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

function SubmitFooter({ canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Three turns plus three sections. Submit when each is complete.
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: canSubmit ? TEAL : '#cbd5e1', color: '#fff',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </button>
    </div>
  )
}

function FallbackPanel({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Conversation payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed turns. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'conversation-simulation',
          fallback: true,
          completed_at: new Date().toISOString(),
        })}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: TEAL, color: '#fff', cursor: 'pointer',
        }}
      >
        Skip block
      </button>
    </div>
  )
}
