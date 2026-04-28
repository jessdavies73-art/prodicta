'use client'

// Parent / Carer Communication, education shell.
//
// Receives a typed parent_message payload from the education scenario
// generator: channel, parent_message (full text + tone + sender),
// candidate_role_in_response, plus scoring-only safeguarding_signals
// and expected_copy_in arrays.
//
// The candidate works through four structured outputs:
//   1. Draft response (300-500 word target)
//   2. Safeguarding flags noticed in the parent message (multi-select + notes)
//   3. Who else to copy in (multi-select)
//   4. Follow-up actions (textarea)
//
// safeguarding_signals and expected_copy_in are ground-truth and never
// rendered. The capture payload is consumed by the per-block scorer in
// the next prompt.
//
// Tone: professional, calm, no graphic content. The parent message
// itself may be emotional; the UI does not amplify the emotion.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['parent-communication']

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

const CHANNEL_LABEL = {
  email: 'Email',
  note_via_pupil: 'Note sent in via the pupil',
  voicemail_transcript: 'Voicemail (transcribed)',
  message_on_school_app: 'School app message',
}

const TONE_STYLE = {
  anxious:         { fg: '#1e3a8a', bg: '#dbeafe' },
  angry:           { fg: '#9f1239', bg: '#ffe4e6' },
  disappointed:    { fg: '#7c2d12', bg: '#fde68a' },
  curious:         { fg: '#0f766e', bg: '#ccfbf1' },
  urgent:          { fg: '#9f1239', bg: '#ffe4e6' },
  pleading:        { fg: '#5b21b6', bg: '#ede9fe' },
  formal_complaint:{ fg: '#92400e', bg: '#fef3c7' },
}

const SAFEGUARDING_OPTIONS = [
  { id: 'pattern_of_concern',     label: 'Pattern of concern over time' },
  { id: 'pupil_withdrawal',       label: 'Pupil withdrawal or change in behaviour' },
  { id: 'home_circumstances',     label: 'Home circumstances flagged' },
  { id: 'third_party_named',      label: 'Third party named in a sensitive way' },
  { id: 'unexplained_pattern',    label: 'Unexplained pattern (absence, injury, mood)' },
  { id: 'parent_distress_indicator', label: 'Parent distress indicator' },
  { id: 'no_safeguarding_flag',   label: 'No safeguarding-adjacent flag' },
]

const COPY_IN_OPTIONS = [
  { id: 'class_teacher',  label: 'Class Teacher' },
  { id: 'year_leader',    label: 'Year leader / Head of Year' },
  { id: 'senco',          label: 'SENCO' },
  { id: 'pastoral_lead',  label: 'Pastoral Lead' },
  { id: 'dsl',            label: 'Designated Safeguarding Lead' },
  { id: 'deputy_head',    label: 'Deputy Headteacher' },
  { id: 'headteacher',    label: 'Headteacher' },
  { id: 'office_admin',   label: 'School office (for the record)' },
  { id: 'no_one',         label: 'No one — this is mine to handle' },
]

const RESPONSE_MIN = 300
const RESPONSE_TARGET = 500
const FOLLOWUP_MIN = 50

export default function ParentCommunicationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const channel = block_content?.channel || ''
  const message = block_content?.parent_message || null
  const candidateRole = block_content?.candidate_role_in_response || ''

  const [draftResponse, setDraftResponse] = useState('')
  const [safeguardingFlags, setSafeguardingFlags] = useState({})
  const [safeguardingNotes, setSafeguardingNotes] = useState('')
  const [copyIn, setCopyIn] = useState({})
  const [followUp, setFollowUp] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setDraftResponse('')
    setSafeguardingFlags({})
    setSafeguardingNotes('')
    setCopyIn({})
    setFollowUp('')
  }, [message?.full_text])

  const toggleSafeguardingFlag = (id) => {
    setSafeguardingFlags(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_safeguarding_flag' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_safeguarding_flag') delete next[k]
      } else if (id !== 'no_safeguarding_flag' && next[id]) {
        delete next['no_safeguarding_flag']
      }
      return next
    })
  }
  const toggleCopyIn = (id) => {
    setCopyIn(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_one' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_one') delete next[k]
      } else if (id !== 'no_one' && next[id]) {
        delete next['no_one']
      }
      return next
    })
  }

  const draftLen = draftResponse.trim().length
  const draftReady = draftLen >= RESPONSE_MIN
  const safeguardingList = Object.keys(safeguardingFlags)
  const safeguardingReady = safeguardingList.length >= 1
  const copyInList = Object.keys(copyIn)
  const copyInReady = copyInList.length >= 1
  const followUpReady = followUp.trim().length >= FOLLOWUP_MIN

  const canSubmit = !!message
    && draftReady
    && safeguardingReady
    && copyInReady
    && followUpReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'parent-communication',
      channel,
      draft_response: draftResponse.trim(),
      response_word_count: draftResponse.trim().split(/\s+/).filter(Boolean).length,
      safeguarding_flags: safeguardingList,
      safeguarding_notes: safeguardingNotes.trim(),
      copy_in: copyInList,
      follow_up_actions: followUp.trim(),
      time_in_block_seconds,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  const tone = TONE_STYLE[message?.tone] || { fg: NAVY, bg: '#f1f5f9' }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Parent / carer communication"
      />

      {!message ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the message below. Draft your response, flag any safeguarding signals, name who you would copy in, and outline your follow-up actions.
          </div>

          {/* Parent message panel */}
          <div style={{
            maxWidth: 880, margin: '0 auto 14px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {CHANNEL_LABEL[channel] || 'Message'}
              </div>
              {message.tone ? (
                <span style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999,
                  background: tone.bg, color: tone.fg,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Tone: {message.tone.replace(/_/g, ' ')}
                </span>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
              <Meta k="From" v={message.from_name} />
              <Meta k="Relationship" v={message.relationship_to_pupil} />
              <Meta k="Received" v={message.received_at} />
            </div>
            {message.subject_line ? (
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 8 }}>
                {message.subject_line}
              </div>
            ) : null}
            <p style={{
              fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65,
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {message.full_text}
            </p>
          </div>

          {candidateRole ? (
            <div style={{
              maxWidth: 880, margin: '0 auto 14px',
              background: TEAL_TINT, border: `1px solid ${TEAL}55`,
              borderRadius: 10, padding: 12,
            }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#0e6e63', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Your role in responding
              </div>
              <div style={{ fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.5 }}>
                {candidateRole}
              </div>
            </div>
          ) : null}

          {/* 1. Draft response */}
          <Section
            number={1}
            title="Draft your response"
            hint={`Write the response you would actually send. Aim for around ${RESPONSE_TARGET} words; minimum ${RESPONSE_MIN} characters. Professional tone. UK English.`}
            status={draftReady ? 'ready' : 'incomplete'}
            counter={`${draftLen} chars`}
          >
            <textarea
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              rows={10}
              placeholder="Dear [parent name], thank you for getting in touch..."
              style={{ ...textareaStyle, minHeight: 200 }}
            />
          </Section>

          {/* 2. Safeguarding flags */}
          <Section
            number={2}
            title="Safeguarding flags in the parent message"
            hint="Tick anything in the message that you would raise with the DSL or pastoral lead, or pick the no-flag option. Add a short note if helpful."
            status={safeguardingReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={SAFEGUARDING_OPTIONS}
              selectedMap={safeguardingFlags}
              onToggle={toggleSafeguardingFlag}
            />
            <input
              type="text"
              value={safeguardingNotes}
              onChange={(e) => setSafeguardingNotes(e.target.value)}
              placeholder="Optional note: the specific phrase or pattern in the message that drew your attention."
              style={inputStyle}
            />
          </Section>

          {/* 3. Copy in */}
          <Section
            number={3}
            title="Who else would you copy in or brief?"
            hint="Tick everyone you would loop into this response."
            status={copyInReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={COPY_IN_OPTIONS}
              selectedMap={copyIn}
              onToggle={toggleCopyIn}
            />
          </Section>

          {/* 4. Follow-up */}
          <Section
            number={4}
            title="Follow-up actions you would take"
            hint={`Two or three sentences naming the actual follow-ups: a meeting, a call, a log entry, a check-in with a pupil, a referral. Minimum ${FOLLOWUP_MIN} characters.`}
            status={followUpReady ? 'ready' : 'incomplete'}
            counter={`${followUp.trim().length} / ${FOLLOWUP_MIN}`}
          >
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={3}
              placeholder="Specific follow-up: who, what, by when."
              style={textareaStyle}
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
        Four sections. Submit when each is complete.
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
        Parent message missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed parent message. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'parent-communication',
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
