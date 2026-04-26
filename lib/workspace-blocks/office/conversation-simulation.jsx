'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['conversation-simulation']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const RELATIONSHIP_STYLES = {
  external: { label: 'External',  bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' },
  senior:   { label: 'Senior',    bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  peer:     { label: 'Peer',      bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  junior:   { label: 'Junior',    bg: '#f0f9ff', fg: '#075985', bd: '#bae6fd' },
  internal: { label: 'Internal',  bg: '#f8fafc', fg: '#475569', bd: '#cbd5e1' },
}

// Number of candidate turns before the conversation closes. The block
// invites a final reflection then; the candidate can also click End
// conversation any time after MIN_TURNS.
const MAX_TURNS = 5
const MIN_TURNS = 2

export default function ConversationSimulationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const counterparty = block_content?.counterparty || null
  const opening = block_content?.opening_message || ''

  const [transcript, setTranscript] = useState(() =>
    opening ? [{ from: 'counterparty', text: opening, timestamp: new Date().toISOString() }] : []
  )
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(null)
  const [ended, setEnded] = useState(false)
  const [reflection, setReflection] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())
  const transcriptEndRef = useRef(null)

  // Seed the transcript when the underlying block changes.
  useEffect(() => {
    setTranscript(opening ? [{ from: 'counterparty', text: opening, timestamp: new Date().toISOString() }] : [])
    setDraft('')
    setThinking(false)
    setError(null)
    setEnded(false)
    setReflection('')
  }, [counterparty?.name, opening])

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [transcript, thinking])

  const candidateTurnCount = transcript.filter(t => t.from === 'candidate').length

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || thinking || ended) return
    setError(null)
    const candidateTurn = { from: 'candidate', text, timestamp: new Date().toISOString() }
    const nextTranscript = [...transcript, candidateTurn]
    setTranscript(nextTranscript)
    setDraft('')

    // If the candidate has just hit MAX_TURNS, close out without one more
    // counterparty reply: it lands cleaner and stops the model from
    // looping past the natural close.
    const newCandidateTurns = nextTranscript.filter(t => t.from === 'candidate').length
    if (newCandidateTurns >= MAX_TURNS) {
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
        setError(body?.error || `Counterparty unavailable (${res.status})`)
      } else {
        setTranscript(prev => [...prev, { from: 'counterparty', text: body.reply, timestamp: new Date().toISOString() }])
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
    onComplete && onComplete({
      block_id: 'conversation-simulation',
      counterparty: counterparty || null,
      transcript,
      candidate_turns: candidateTurnCount,
      reflection: reflection.trim(),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  if (!counterparty || !counterparty.name) {
    return (
      <div style={{ fontFamily: F }}>
        <BlockScenarioHeader scenario_context={scenario_context} block_content={block_content} blockName="Conversation simulation" />
        <NoCounterpartyFallback block_content={block_content} onComplete={() => onComplete && onComplete({ block_id: 'conversation-simulation', fallback: true, completed_at: new Date().toISOString() })} />
      </div>
    )
  }

  const rel = RELATIONSHIP_STYLES[counterparty.relationship] || RELATIONSHIP_STYLES.internal

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Conversation simulation"
      />

      <div style={{ maxWidth: 760, margin: '0 auto 18px' }}>
        {/* Counterparty card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontFamily: FM, fontSize: 10, fontWeight: 700,
              padding: '3px 8px', borderRadius: 10,
              background: rel.bg, color: rel.fg, border: `1px solid ${rel.bd}`,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {rel.label}
            </span>
            <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>
              {counterparty.name}
            </div>
            {counterparty.role ? (
              <div style={{ fontFamily: F, fontSize: 13, color: '#64748b' }}>
                {counterparty.role}
              </div>
            ) : null}
          </div>
          {counterparty.stance ? (
            <div style={{ fontFamily: F, fontSize: 13, color: '#1f2937', lineHeight: 1.5, marginTop: 4 }}>
              <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 6 }}>Their stance:</span>
              {counterparty.stance}
            </div>
          ) : null}
          {counterparty.ask ? (
            <div style={{ fontFamily: F, fontSize: 13, color: '#1f2937', lineHeight: 1.5, marginTop: 4 }}>
              <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 6 }}>What they want:</span>
              {counterparty.ask}
            </div>
          ) : null}
        </div>

        {/* Transcript */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Conversation
            <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 600, color: '#94a3b8', marginLeft: 8 }}>
              {candidateTurnCount} of {MAX_TURNS} turns
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transcript.map((t, i) => (
              <Bubble key={i} entry={t} counterpartyName={counterparty.name} />
            ))}
            {thinking ? (
              <div style={{ alignSelf: 'flex-start', maxWidth: '78%', padding: '10px 14px', background: '#f1f5f9', borderRadius: 12, borderTopLeftRadius: 2, fontFamily: F, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
                {counterparty.name} is typing...
              </div>
            ) : null}
            {ended ? (
              <div style={{ alignSelf: 'center', padding: '8px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 16, fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Conversation closed
              </div>
            ) : null}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Composer or reflection */}
        {!ended ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleSend()
                }
              }}
              rows={3}
              placeholder={`Reply to ${counterparty.name}. Cmd or Ctrl + Enter to send.`}
              disabled={thinking}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5,
                padding: 10, borderRadius: 8,
                border: '1px solid #cbd5e1', background: '#f8fafc',
                outline: 'none', resize: 'vertical', minHeight: 70,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: F, fontSize: 12, color: '#64748b' }}>
                {error ? <span style={{ color: '#dc2626' }}>{error}</span> : null}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {candidateTurnCount >= MIN_TURNS ? (
                  <button
                    type="button"
                    onClick={handleEndEarly}
                    disabled={thinking}
                    style={{
                      fontFamily: F, fontSize: 13, fontWeight: 600,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'transparent', border: '1px solid #cbd5e1', color: '#475569',
                      cursor: thinking ? 'not-allowed' : 'pointer',
                    }}
                  >
                    End conversation
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={thinking || !draft.trim()}
                  style={{
                    fontFamily: F, fontSize: 13, fontWeight: 700,
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: thinking || !draft.trim() ? '#cbd5e1' : TEAL, color: '#fff',
                    cursor: thinking || !draft.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {thinking ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Reflection
            </div>
            <p style={{ fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 10px' }}>
              How would you follow up after this call? What is the next concrete action and who owns it?
            </p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Two or three sentences. Name the next action and the owner."
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5,
                padding: 10, borderRadius: 8,
                border: '1px solid #cbd5e1', background: '#f8fafc',
                outline: 'none', resize: 'vertical', minHeight: 80,
              }}
            />
          </div>
        )}
      </div>

      <SubmitFooter
        canSubmit={ended && reflection.trim().length >= 12}
        candidateTurns={candidateTurnCount}
        ended={ended}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function Bubble({ entry, counterpartyName }) {
  const isCandidate = entry.from === 'candidate'
  return (
    <div style={{
      alignSelf: isCandidate ? 'flex-end' : 'flex-start',
      maxWidth: '82%',
      padding: '10px 14px',
      borderRadius: 14,
      borderTopRightRadius: isCandidate ? 2 : 14,
      borderTopLeftRadius: isCandidate ? 14 : 2,
      background: isCandidate ? `${TEAL}18` : '#f1f5f9',
      border: `1px solid ${isCandidate ? `${TEAL}55` : '#e2e8f0'}`,
    }}>
      <div style={{
        fontFamily: FM, fontSize: 10, fontWeight: 700,
        color: isCandidate ? '#0f766e' : '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
      }}>
        {isCandidate ? 'You' : counterpartyName}
      </div>
      <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {entry.text}
      </div>
    </div>
  )
}

function SubmitFooter({ canSubmit, candidateTurns, ended, onSubmit }) {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        {!ended ? (
          <>You've taken <b style={{ color: NAVY }}>{candidateTurns}</b> of {MAX_TURNS} turns. End the conversation when you're ready.</>
        ) : (
          <>Add a reflection (at least 12 characters) to continue.</>
        )}
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

function NoCounterpartyFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Counterparty payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the counterparty persona and opening message. Showing the scenario summary below.
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
