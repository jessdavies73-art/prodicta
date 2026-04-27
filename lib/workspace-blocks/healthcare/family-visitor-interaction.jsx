'use client'

// Family / visitor interaction, healthcare shell.
//
// Multi-turn conversation simulation between the candidate and a family
// member or visitor. block_content carries the opener (the counterpart's
// first message) and the counterpart_persona (a richer healthcare-flavoured
// persona than the office shell uses). Live counterpart turns are
// produced by reusing the existing /api/workspace/conversation-turn
// endpoint; this block maps the healthcare persona shape onto the
// generic counterparty shape that endpoint expects.
//
// Turn budget: 3 to 6 candidate turns. After MAX_TURNS the conversation
// closes naturally and the candidate writes a short reflection ("What
// would you do differently next time?").
//
// Compliance:
//   - The opener and counterpart persona are produced by the healthcare
//     scenario generator with placeholder language only.
//   - Counterpart replies are generated live via Claude Haiku 4.5 with
//     a 200-token cap. The system prompt instructs the model to stay
//     in character and to use UK English without dashes.
//   - No clinical advice is given by the candidate UI; the candidate
//     writes their own replies and the model only produces counterpart
//     dialogue.

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['family-visitor-interaction']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const NAVY_TINT = '#E1E7EE'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const MAX_TURNS = 6
const MIN_TURNS = 3
const REFLECTION_MIN = 20

// Map the richer healthcare persona shape to the generic counterparty
// shape that /api/workspace/conversation-turn expects. The endpoint's
// system prompt slots these into role / stance / ask / personality
// without needing a healthcare-specific code path.
function personaToCounterparty(persona = {}) {
  const secondaries = Array.isArray(persona.secondary_concerns)
    ? persona.secondary_concerns.filter(Boolean)
    : []
  const stanceParts = [persona.primary_concern, ...secondaries].filter(Boolean)
  return {
    name: persona.name || 'Family member',
    role: persona.relationship_to_patient || 'Family member',
    relationship: 'external',
    stance: stanceParts.join(' ').trim(),
    ask: persona.what_makes_them_feel_heard || '',
    personality: persona.how_they_push_back || 'direct, persistent',
  }
}

export default function FamilyVisitorInteractionBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const opener = block_content?.opener || ''
  const persona = block_content?.counterpart_persona || null
  const setting = block_content?.conversation_setting || ''

  const counterparty = useMemo(() => persona ? personaToCounterparty(persona) : null, [persona])

  const [transcript, setTranscript] = useState(() =>
    opener ? [{ from: 'counterparty', text: opener, timestamp: new Date().toISOString() }] : []
  )
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(null)
  const [ended, setEnded] = useState(false)
  const [reflection, setReflection] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())
  const transcriptEndRef = useRef(null)
  const lastSendAtRef = useRef(null)

  // Reset when the underlying block changes.
  useEffect(() => {
    setTranscript(opener ? [{ from: 'counterparty', text: opener, timestamp: new Date().toISOString() }] : [])
    setDraft('')
    setThinking(false)
    setError(null)
    setEnded(false)
    setReflection('')
    lastSendAtRef.current = null
  }, [persona?.name, opener])

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [transcript, thinking])

  const candidateTurnCount = transcript.filter(t => t.from === 'candidate').length

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || thinking || ended || !counterparty) return
    setError(null)
    const sendAt = new Date().toISOString()
    const turnNumber = candidateTurnCount + 1
    const candidateTurn = {
      from: 'candidate',
      text,
      timestamp: sendAt,
      turn_number: turnNumber,
      time_taken_seconds: lastSendAtRef.current
        ? Math.max(0, Math.round((new Date(sendAt) - new Date(lastSendAtRef.current)) / 1000))
        : null,
    }
    lastSendAtRef.current = sendAt
    const nextTranscript = [...transcript, candidateTurn]
    setTranscript(nextTranscript)
    setDraft('')

    // Hard close after MAX_TURNS without one more counterpart reply: the
    // conversation lands cleanly on the candidate's last message.
    if (turnNumber >= MAX_TURNS) {
      setEnded(true)
      return
    }

    setThinking(true)
    try {
      const res = await fetch('/api/workspace/conversation-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: nextTranscript,
          counterparty,
          scenario_context,
          role_profile,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.reply) {
        setError(body?.error || `Counterpart unavailable (${res.status})`)
      } else {
        setTranscript(prev => [...prev, {
          from: 'counterparty',
          text: body.reply,
          timestamp: new Date().toISOString(),
        }])
      }
    } catch (e) {
      setError(e?.message || 'Network error')
    } finally {
      setThinking(false)
    }
  }

  const handleEndEarly = () => {
    if (candidateTurnCount < MIN_TURNS) return
    setEnded(true)
  }

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    // Pair candidate turns with the immediately-following counterpart
    // reply (if any) for the capture payload's turn_responses array.
    const turn_responses = []
    for (let i = 0; i < transcript.length; i++) {
      const t = transcript[i]
      if (t.from !== 'candidate') continue
      const next = transcript[i + 1]
      const counterpartReply = next && next.from === 'counterparty' ? next.text : null
      turn_responses.push({
        turn_number: t.turn_number || (turn_responses.length + 1),
        candidate_response: t.text,
        counterpart_response: counterpartReply,
        time_taken_seconds: t.time_taken_seconds || null,
      })
    }
    onComplete && onComplete({
      block_id: 'family-visitor-interaction',
      counterpart_persona: persona || null,
      conversation_setting: setting || null,
      turn_responses,
      full_transcript: transcript,
      candidate_turns: candidateTurnCount,
      final_reflection: reflection.trim(),
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  if (!counterparty || !counterparty.name || !opener) {
    return (
      <div style={{ fontFamily: F }}>
        <BlockScenarioHeader
          scenario_context={scenario_context}
          block_content={block_content}
          blockName="Family / visitor interaction"
        />
        <FallbackPanel block_content={block_content} onComplete={() => onComplete && onComplete({
          block_id: 'family-visitor-interaction',
          fallback: true,
          completed_at: new Date().toISOString(),
        })} />
      </div>
    )
  }

  const remainingTurns = MAX_TURNS - candidateTurnCount

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Family / visitor interaction"
      />

      <div style={{ maxWidth: 760, margin: '0 auto 16px' }}>
        {/* Persona card */}
        <div style={{
          background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
          padding: 14, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>
              {persona.name}
            </span>
            {persona.relationship_to_patient ? (
              <span style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>
                · {persona.relationship_to_patient}
              </span>
            ) : null}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: NAVY_TINT, color: NAVY,
              fontFamily: FM, fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              External
            </span>
            {setting ? (
              <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>
                · {setting}
              </span>
            ) : null}
          </div>
          {persona.primary_concern ? (
            <div style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.5, marginBottom: 4 }}>
              <span style={fieldLabelStyle}>What they want</span>
              {persona.primary_concern}
            </div>
          ) : null}
          {persona.what_makes_them_feel_heard ? (
            <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
              <span style={fieldLabelStyle}>What lands with them</span>
              {persona.what_makes_them_feel_heard}
            </div>
          ) : null}
        </div>

        {/* Turn counter */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, marginBottom: 8, flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>
            Turn <b style={{ color: NAVY }}>{Math.min(candidateTurnCount + (ended ? 0 : 1), MAX_TURNS)}</b> of up to {MAX_TURNS}
            {ended ? ' · conversation ended' : ` · ${Math.max(0, remainingTurns)} left`}
          </div>
          {!ended && candidateTurnCount >= MIN_TURNS ? (
            <button
              type="button"
              onClick={handleEndEarly}
              style={{
                fontFamily: F, fontSize: 12, fontWeight: 700,
                padding: '6px 12px', borderRadius: 999,
                border: `1px solid ${BD}`, background: '#fff', color: NAVY,
                cursor: 'pointer',
              }}
            >
              End conversation
            </button>
          ) : null}
        </div>

        {/* Chat surface */}
        <div style={{
          background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
          padding: 14, minHeight: 240, maxHeight: 480, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {transcript.map((t, i) => (
            <Bubble key={i} entry={t} counterpartName={persona.name} />
          ))}
          {thinking ? (
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
              background: '#f1f5f9', color: TX3,
              fontFamily: F, fontSize: 13, fontStyle: 'italic',
            }}>
              {persona.name} is typing...
            </div>
          ) : null}
          <div ref={transcriptEndRef} />
        </div>

        {error ? (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8,
            fontFamily: F, fontSize: 13, color: '#92400e',
          }}>
            {error}
          </div>
        ) : null}

        {/* Composer or reflection */}
        {!ended ? (
          <div style={{ marginTop: 12 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={`Reply to ${persona.name}. Cmd or Ctrl + Enter to send.`}
              disabled={thinking}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.5,
                padding: 10, borderRadius: 8,
                border: `1px solid ${BD}`, background: '#f8fafc',
                outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, marginTop: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>
                {draft.trim().length > 0 ? `${draft.trim().length} chars` : 'Compose your next reply'}
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={thinking || !draft.trim() || !counterparty}
                style={{
                  fontFamily: F, fontSize: 14, fontWeight: 700,
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: (thinking || !draft.trim()) ? '#cbd5e1' : TEAL,
                  color: '#fff',
                  cursor: (thinking || !draft.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                {thinking ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: 16, padding: 16,
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
          }}>
            <div style={{
              fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
            }}>
              Reflection
            </div>
            <div style={{ fontFamily: F, fontSize: 13.5, color: NAVY, fontWeight: 700, marginBottom: 6 }}>
              What would you do differently next time?
            </div>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Two or three sentences. Be honest with yourself."
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.55,
                padding: 10, borderRadius: 8,
                border: `1px solid ${BD}`, background: '#f8fafc',
                outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{ marginTop: 6, fontFamily: FM, fontSize: 11, color: TX3 }}>
              {reflection.trim().length} / {REFLECTION_MIN} characters minimum
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={reflection.trim().length < REFLECTION_MIN}
                style={{
                  fontFamily: F, fontSize: 14, fontWeight: 700,
                  padding: '10px 18px', borderRadius: 8, border: 'none',
                  background: reflection.trim().length >= REFLECTION_MIN ? TEAL : '#cbd5e1',
                  color: '#fff',
                  cursor: reflection.trim().length >= REFLECTION_MIN ? 'pointer' : 'not-allowed',
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const fieldLabelStyle = {
  fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginRight: 6,
}

function Bubble({ entry, counterpartName }) {
  const isCandidate = entry.from === 'candidate'
  return (
    <div style={{
      alignSelf: isCandidate ? 'flex-end' : 'flex-start',
      maxWidth: '82%',
      display: 'flex', flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{
        padding: '10px 14px', borderRadius: 12,
        background: isCandidate ? TEAL_TINT : '#f1f5f9',
        color: NAVY,
        fontFamily: F, fontSize: 13.5, lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}>
        {entry.text}
      </div>
      <div style={{
        fontFamily: FM, fontSize: 10, color: TX3,
        textAlign: isCandidate ? 'right' : 'left',
      }}>
        {isCandidate ? 'You' : counterpartName}
      </div>
    </div>
  )
}

function FallbackPanel({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Counterpart persona missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the counterpart persona and opener. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
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
        Skip block
      </button>
    </div>
  )
}
