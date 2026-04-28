'use client'

// Headteacher Message, education shell.
//
// Receives a typed head_message payload from the education scenario
// generator. The UI adapts to the head_message.scope:
//
//   respond_to_request          (TA / Class Teacher / SENCO / HoD / Pastoral Lead)
//                               — the head's message is rendered and the
//                               candidate writes a response
//   draft_school_wide_message   (SLT / Headteacher)
//                               — the brief is rendered and the candidate
//                               writes the message themselves
//
// Either way the candidate captures:
//   1. The drafted message or response (300-500 words)
//   2. Who else needs to be informed and why
//   3. Safeguarding or compliance considerations (multi-select + notes)
//   4. Strategic implications they would weigh (textarea)
//
// strategic_anchors is ground-truth, not rendered. The capture payload
// is consumed by the per-block scorer in the next prompt.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['head-teacher-message']

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

const ISSUE_LABEL = {
  governance_inquiry:           'Governance inquiry',
  inspection_or_regulator_prep: 'Inspection / regulator prep',
  mat_or_trust_priority:        'MAT / trust priority',
  parent_body_communication:    'Parent body communication',
  pastoral_or_safeguarding_followup: 'Pastoral / safeguarding follow-up',
  data_or_results_request:      'Data / results request',
  cover_or_resourcing:          'Cover / resourcing',
  crisis_briefing:              'Crisis briefing',
}

const COPY_IN_OPTIONS = [
  { id: 'class_teacher',  label: 'Class Teacher' },
  { id: 'year_leader',    label: 'Year leader / Head of Year' },
  { id: 'senco',          label: 'SENCO' },
  { id: 'pastoral_lead',  label: 'Pastoral Lead' },
  { id: 'dsl',            label: 'Designated Safeguarding Lead' },
  { id: 'deputy_head',    label: 'Deputy Headteacher' },
  { id: 'headteacher',    label: 'Headteacher' },
  { id: 'chair_governors',label: 'Chair of Governors' },
  { id: 'mat_lead',       label: 'MAT lead / Trust leadership' },
  { id: 'office_admin',   label: 'School office (for the record)' },
  { id: 'no_one',         label: 'No one — this is mine to handle' },
]

const COMPLIANCE_OPTIONS = [
  { id: 'safeguarding_line',          label: 'Safeguarding line cannot be inadvertently disclosed' },
  { id: 'data_protection',            label: 'Data protection / pupil records considerations' },
  { id: 'governance_accountability',  label: 'Governance accountability framing required' },
  { id: 'regulator_facing',           label: 'Regulator-facing tone and accuracy' },
  { id: 'employment_or_hr',           label: 'Employment or HR sensitivity' },
  { id: 'parent_body_optics',         label: 'Parent body optics and trust' },
  { id: 'no_compliance_flag',         label: 'No compliance flag at this point' },
]

const RESPONSE_MIN = 300
const RESPONSE_TARGET = 500
const COPYIN_NOTE_MIN = 40
const STRATEGIC_MIN = 80

export default function HeadTeacherMessageBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const scope = block_content?.scope || 'respond_to_request'
  const message = block_content?.head_message || null
  const isDraft = scope === 'draft_school_wide_message'

  const [draft, setDraft] = useState('')
  const [copyIn, setCopyIn] = useState({})
  const [copyInNote, setCopyInNote] = useState('')
  const [compliance, setCompliance] = useState({})
  const [complianceNote, setComplianceNote] = useState('')
  const [strategic, setStrategic] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setDraft('')
    setCopyIn({})
    setCopyInNote('')
    setCompliance({})
    setComplianceNote('')
    setStrategic('')
  }, [message?.full_text, scope])

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
  const toggleCompliance = (id) => {
    setCompliance(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_compliance_flag' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_compliance_flag') delete next[k]
      } else if (id !== 'no_compliance_flag' && next[id]) {
        delete next['no_compliance_flag']
      }
      return next
    })
  }

  const draftLen = draft.trim().length
  const draftReady = draftLen >= RESPONSE_MIN
  const copyInList = Object.keys(copyIn)
  const copyInReady = copyInList.length >= 1 && copyInNote.trim().length >= COPYIN_NOTE_MIN
  const complianceList = Object.keys(compliance)
  const complianceReady = complianceList.length >= 1
  const strategicReady = strategic.trim().length >= STRATEGIC_MIN

  const canSubmit = !!message
    && draftReady
    && copyInReady
    && complianceReady
    && strategicReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'head-teacher-message',
      scope,
      draft_text: draft.trim(),
      draft_word_count: draft.trim().split(/\s+/).filter(Boolean).length,
      copy_in: copyInList,
      copy_in_rationale: copyInNote.trim(),
      compliance_flags: complianceList,
      compliance_notes: complianceNote.trim(),
      strategic_implications: strategic.trim(),
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
        blockName={isDraft ? 'School-wide message to draft' : 'Headteacher message to respond to'}
      />

      {!message ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            {isDraft
              ? 'Draft the school-wide message. Decide who else needs to be informed, name compliance considerations, and outline the strategic implications you would weigh. Patterns suggest the strongest call here is the one that names the actual stakeholders and the binding constraint.'
              : 'Read the headteacher message below. Draft your response, name who else needs to be informed, flag compliance considerations, and outline the strategic implications you would weigh.'}
          </div>

          {/* Message panel */}
          <div style={{
            maxWidth: 880, margin: '0 auto 14px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isDraft ? 'Brief for the message you are drafting' : `From: ${message.from_role || 'Headteacher'}`}
              </div>
              {message.issue_type ? (
                <span style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999,
                  background: '#fff', color: NAVY, border: `1px solid ${BD}`,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {ISSUE_LABEL[message.issue_type] || message.issue_type}
                </span>
              ) : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
              {!isDraft ? <Meta k="From" v={message.from_role} /> : <Meta k="Writing as" v={message.from_role} />}
              <Meta k="Sent" v={message.sent_at} />
              <Meta k="Deadline" v={message.deadline} />
              <Meta k="Audience" v={message.audience} />
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

          {/* 1. Draft */}
          <Section
            number={1}
            title={isDraft ? 'Draft the school-wide message' : 'Draft your response'}
            hint={`Aim for around ${RESPONSE_TARGET} words; minimum ${RESPONSE_MIN} characters. Professional tone. UK English.`}
            status={draftReady ? 'ready' : 'incomplete'}
            counter={`${draftLen} chars`}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder={isDraft
                ? 'Dear all, ...'
                : `Dear ${message.from_role || 'Headteacher'}, thank you for your message...`}
              style={{ ...textareaStyle, minHeight: 200 }}
            />
          </Section>

          {/* 2. Copy in */}
          <Section
            number={2}
            title="Who else needs to be informed and why?"
            hint={`Tick the people you would loop in, then write a short rationale. Minimum ${COPYIN_NOTE_MIN} characters in the rationale.`}
            status={copyInReady ? 'ready' : 'incomplete'}
            counter={`${copyInNote.trim().length} / ${COPYIN_NOTE_MIN}`}
          >
            <CheckboxGrid
              options={COPY_IN_OPTIONS}
              selectedMap={copyIn}
              onToggle={toggleCopyIn}
            />
            <textarea
              value={copyInNote}
              onChange={(e) => setCopyInNote(e.target.value)}
              rows={2}
              placeholder="Why these people, and what specifically they need to know."
              style={textareaStyle}
            />
          </Section>

          {/* 3. Compliance */}
          <Section
            number={3}
            title="Safeguarding or compliance considerations"
            hint="Tick any considerations in play. Add a short note on how you would handle them."
            status={complianceReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={COMPLIANCE_OPTIONS}
              selectedMap={compliance}
              onToggle={toggleCompliance}
            />
            <input
              type="text"
              value={complianceNote}
              onChange={(e) => setComplianceNote(e.target.value)}
              placeholder="Optional note: the specific compliance line and how the message handles it."
              style={inputStyle}
            />
          </Section>

          {/* 4. Strategic */}
          <Section
            number={4}
            title="Strategic implications you would weigh"
            hint={`Two or three sentences naming the strategic factors behind your draft: tone, governance positioning, follow-on consequences. Minimum ${STRATEGIC_MIN} characters.`}
            status={strategicReady ? 'ready' : 'incomplete'}
            counter={`${strategic.trim().length} / ${STRATEGIC_MIN}`}
          >
            <textarea
              value={strategic}
              onChange={(e) => setStrategic(e.target.value)}
              rows={3}
              placeholder="Strategic factors: tone, what is being committed to, what is being held back, what comes next."
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
  outline: 'none', resize: 'vertical', marginTop: 8,
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
        Headteacher message missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed head message. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'head-teacher-message',
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
