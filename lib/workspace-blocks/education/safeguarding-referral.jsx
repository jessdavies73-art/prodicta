'use client'

// Safeguarding Referral, education shell.
//
// Receives an anonymised, fictional safeguarding scenario from the
// education scenario generator: scenario_summary, full_scenario_text,
// who_observed_or_disclosed, indicators_present[], framework_reminders[],
// recording_systems_in_use[], plus a threshold_factors[] ground-truth
// array used at scoring time and never surfaced to the candidate.
//
// The candidate works through six structured outputs:
//   1. Indicators noticed in the scenario (multi-select + notes)
//   2. Threshold decision (radio: yes / need more info / no)
//   3. Immediate action (textarea)
//   4. Recording approach (multi-select + notes on which system + what to record)
//   5. Who they would inform and when (multi-select with timing)
//   6. Conflicts of duty (multi-select + textarea)
//
// Compliance and tone:
//   - Scenarios are anonymised and fictional. The block UI carries a
//     professional, serious tone — no alarm red, no graphic styling.
//   - Subject matter is treated with appropriate gravity throughout.
//   - Framework references are to KCSIE, Working Together, the DSL role.
//   - threshold_factors is for scoring only; never rendered.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['safeguarding-referral']

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

const THRESHOLD_OPTIONS = [
  { id: 'yes',                    label: 'Yes — meets the threshold for safeguarding action',  description: 'Concern is serious enough that safeguarding processes apply now.' },
  { id: 'need_more_information',  label: 'Need more information before deciding',               description: 'Threshold may apply; you would gather more before the call is made.' },
  { id: 'no',                     label: 'No — does not meet the threshold',                    description: 'Concern noted and recorded but no safeguarding action at this point.' },
]

const INDICATOR_OPTIONS = [
  { id: 'pupil_disclosure',          label: 'Pupil disclosure (full or partial)' },
  { id: 'pattern_over_time',         label: 'Pattern of concern over time' },
  { id: 'unexplained_change',        label: 'Unexplained change in pupil presentation' },
  { id: 'attendance_pattern',        label: 'Attendance pattern of concern' },
  { id: 'home_circumstances',        label: 'Reported change in home circumstances' },
  { id: 'sibling_known_to_services', label: 'Sibling already known to services' },
  { id: 'third_party_concern',       label: 'Third-party concern (colleague, parent, peer)' },
  { id: 'other_indicator',           label: 'Other indicator (note below)' },
]

const RECORDING_OPTIONS = [
  { id: 'cpoms',                  label: 'CPOMS' },
  { id: 'myconcern',              label: 'MyConcern' },
  { id: 'paper_safeguarding_log', label: 'Paper safeguarding log' },
  { id: 'school_mis_safeguarding',label: 'School MIS safeguarding module' },
]

const INFORM_OPTIONS = [
  { id: 'class_teacher',          label: 'Class Teacher' },
  { id: 'pastoral_lead',          label: 'Pastoral Lead' },
  { id: 'senco',                  label: 'SENCO' },
  { id: 'dsl',                    label: 'Designated Safeguarding Lead' },
  { id: 'deputy_dsl',             label: 'Deputy DSL' },
  { id: 'headteacher',            label: 'Headteacher' },
  { id: 'mash_or_social_care',    label: 'MASH / Children’s Social Care' },
  { id: 'police',                 label: 'Police' },
  { id: 'parent_carer',           label: 'Parent or carer (where appropriate)' },
]

const TIMING_OPTIONS = [
  { id: 'immediately',          label: 'Immediately' },
  { id: 'within_the_hour',      label: 'Within the hour' },
  { id: 'end_of_day',           label: 'End of the school day' },
  { id: 'next_morning',         label: 'Next morning briefing' },
]

const CONFLICT_OPTIONS = [
  { id: 'confidentiality_vs_share', label: 'Confidentiality vs duty to share' },
  { id: 'pupil_consent',            label: 'Pupil consent and capacity to consent' },
  { id: 'parent_relationship',      label: 'Risk to the parent / school relationship' },
  { id: 'staff_member_named',       label: 'A staff member is named in the concern' },
  { id: 'no_conflict',              label: 'No conflict of duty at this point' },
]

const ACTION_MIN = 50
const CONFLICTS_MIN = 50

export default function SafeguardingReferralBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const scenario_summary = block_content?.scenario_summary || ''
  const full_scenario_text = block_content?.full_scenario_text || ''
  const who_observed_or_disclosed = block_content?.who_observed_or_disclosed || ''
  const indicators_present = Array.isArray(block_content?.indicators_present) ? block_content.indicators_present : []
  const framework_reminders = Array.isArray(block_content?.framework_reminders) ? block_content.framework_reminders : []
  const recording_systems_in_use = Array.isArray(block_content?.recording_systems_in_use) ? block_content.recording_systems_in_use : []

  const [indicators, setIndicators] = useState({})
  const [indicatorNotes, setIndicatorNotes] = useState('')
  const [thresholdDecision, setThresholdDecision] = useState(null)
  const [immediateAction, setImmediateAction] = useState('')
  const [recordingChoice, setRecordingChoice] = useState({})
  const [recordingNotes, setRecordingNotes] = useState('')
  const [inform, setInform] = useState({}) // { [id]: timing_id }
  const [conflicts, setConflicts] = useState({})
  const [conflictsNotes, setConflictsNotes] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setIndicators({})
    setIndicatorNotes('')
    setThresholdDecision(null)
    setImmediateAction('')
    setRecordingChoice({})
    setRecordingNotes('')
    setInform({})
    setConflicts({})
    setConflictsNotes('')
  }, [full_scenario_text])

  const toggleIndicator = (id) => {
    setIndicators(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleRecording = (id) => {
    setRecordingChoice(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleInform = (id) => {
    setInform(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 'immediately'
      return next
    })
  }
  const setInformTiming = (id, timing) => {
    setInform(prev => ({ ...prev, [id]: timing }))
  }
  const toggleConflict = (id) => {
    setConflicts(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_conflict' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_conflict') delete next[k]
      } else if (id !== 'no_conflict' && next[id]) {
        delete next['no_conflict']
      }
      return next
    })
  }

  const indicatorList = Object.keys(indicators)
  const indicatorsReady = indicatorList.length >= 1
  const actionReady = immediateAction.trim().length >= ACTION_MIN
  const recordingList = Object.keys(recordingChoice)
  const recordingReady = recordingList.length >= 1
  const informList = Object.keys(inform)
  const informReady = informList.length >= 1
  const conflictsList = Object.keys(conflicts)
  const conflictsReady = conflictsList.length >= 1 && conflictsNotes.trim().length >= CONFLICTS_MIN

  const canSubmit = !!full_scenario_text
    && indicatorsReady
    && !!thresholdDecision
    && actionReady
    && recordingReady
    && informReady
    && conflictsReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'safeguarding-referral',
      indicators_noticed: indicatorList,
      indicator_notes: indicatorNotes.trim(),
      threshold_decision: thresholdDecision,
      immediate_action: immediateAction.trim(),
      recording_systems: recordingList,
      recording_notes: recordingNotes.trim(),
      informed_parties: informList.map(id => ({ party_id: id, timing: inform[id] })),
      conflicts_of_duty: conflictsList,
      conflicts_notes: conflictsNotes.trim(),
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
        blockName="Safeguarding referral"
      />

      {!full_scenario_text ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the scenario carefully. Identify the indicators present, decide whether the safeguarding threshold is met, name the immediate action, describe how you would record it, name who you would inform and when, and flag any conflicts of duty. Anchored in KCSIE Part 1 and Working Together to Safeguard Children. Patterns suggest the strongest call here is the one that names the actual indicators and the named pathway.
          </div>

          {/* Scenario panel — serious professional tone */}
          <div style={{
            maxWidth: 880, margin: '0 auto 14px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Safeguarding scenario
            </div>
            {scenario_summary ? (
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 10 }}>
                {scenario_summary}
              </div>
            ) : null}
            <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {full_scenario_text}
            </p>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <ContextField label="Observed or disclosed by" value={who_observed_or_disclosed} />
              {recording_systems_in_use.length ? (
                <ContextField label="Recording systems in use" value={recording_systems_in_use.join(', ')} />
              ) : null}
            </div>

            {indicators_present.length ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Indicators noted in the scenario
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
                  {indicators_present.map((ind, i) => <li key={i}>{ind}</li>)}
                </ul>
              </div>
            ) : null}

            {framework_reminders.length ? (
              <div style={{ marginTop: 12, padding: 10, background: '#fff', border: `1px solid ${BD}`, borderRadius: 8 }}>
                <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Framework anchors
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.55 }}>
                  {framework_reminders.map((fr, i) => <li key={i}>{fr}</li>)}
                </ul>
              </div>
            ) : null}
          </div>

          {/* 1. Indicators */}
          <Section
            number={1}
            title="Indicators you would record"
            hint="Tick the indicators present in the scenario. Add a short note if helpful."
            status={indicatorsReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={INDICATOR_OPTIONS}
              selectedMap={indicators}
              onToggle={toggleIndicator}
            />
            <input
              type="text"
              value={indicatorNotes}
              onChange={(e) => setIndicatorNotes(e.target.value)}
              placeholder="Optional note: anything specific you noticed beyond the listed indicators."
              style={inputStyle}
            />
          </Section>

          {/* 2. Threshold */}
          <Section
            number={2}
            title="Does this meet the threshold for safeguarding action?"
            hint="Make the call as if you were the person responsible. You can choose to gather more information first."
            status={thresholdDecision ? 'ready' : 'incomplete'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {THRESHOLD_OPTIONS.map(opt => {
                const selected = thresholdDecision === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThresholdDecision(opt.id)}
                    style={{
                      display: 'block', textAlign: 'left',
                      padding: '10px 12px', borderRadius: 8,
                      background: selected ? TEAL_TINT : '#fff',
                      border: `1px solid ${selected ? TEAL : BD}`,
                      cursor: 'pointer', fontFamily: F,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        flex: '0 0 auto', marginTop: 2,
                        width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${selected ? TEAL : '#94a3b8'}`,
                        background: selected ? TEAL : '#fff',
                        boxShadow: selected ? 'inset 0 0 0 2px #fff' : 'none',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.4 }}>
                          {opt.label}
                        </div>
                        <div style={{ fontFamily: F, fontSize: 12.5, color: TX2, marginTop: 3 }}>
                          {opt.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* 3. Immediate action */}
          <Section
            number={3}
            title="Immediate action you would take"
            hint={`Two or three sentences naming what you would actually do in the next hour. Minimum ${ACTION_MIN} characters.`}
            status={actionReady ? 'ready' : 'incomplete'}
            counter={`${immediateAction.trim().length} / ${ACTION_MIN}`}
          >
            <textarea
              value={immediateAction}
              onChange={(e) => setImmediateAction(e.target.value)}
              rows={3}
              placeholder="Who you call first, what you secure, what you preserve, what you say to the pupil if relevant."
              style={textareaStyle}
            />
          </Section>

          {/* 4. Recording */}
          <Section
            number={4}
            title="Recording approach"
            hint="Tick the system you would record this on, and note what you would write."
            status={recordingReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={RECORDING_OPTIONS}
              selectedMap={recordingChoice}
              onToggle={toggleRecording}
            />
            <input
              type="text"
              value={recordingNotes}
              onChange={(e) => setRecordingNotes(e.target.value)}
              placeholder="One line on what you would actually record: time, words used, observed indicators, action taken."
              style={inputStyle}
            />
          </Section>

          {/* 5. Inform */}
          <Section
            number={5}
            title="Who would you inform, and when?"
            hint="Tick everyone you would notify. For each, pick the timing."
            status={informReady ? 'ready' : 'incomplete'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {INFORM_OPTIONS.map(o => {
                const checked = !!inform[o.id]
                return (
                  <div key={o.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8,
                    background: checked ? TEAL_TINT : '#fff',
                    border: `1px solid ${checked ? TEAL : BD}`,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, color: NAVY, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInform(o.id)}
                        style={{ accentColor: TEAL, width: 16, height: 16, cursor: 'pointer', margin: 0 }}
                      />
                      {o.label}
                    </label>
                    {checked ? (
                      <select
                        value={inform[o.id]}
                        onChange={(e) => setInformTiming(o.id, e.target.value)}
                        style={{
                          fontFamily: FM, fontSize: 12, color: NAVY,
                          padding: '4px 8px', borderRadius: 6,
                          border: `1px solid ${BD}`, background: '#fff',
                        }}
                      >
                        {TIMING_OPTIONS.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 6. Conflicts of duty */}
          <Section
            number={6}
            title="Conflicts of duty"
            hint={`Tick any conflicts of duty in play and write a short note on how you would handle them. Minimum ${CONFLICTS_MIN} characters in the note.`}
            status={conflictsReady ? 'ready' : 'incomplete'}
            counter={`${conflictsNotes.trim().length} / ${CONFLICTS_MIN}`}
          >
            <CheckboxGrid
              options={CONFLICT_OPTIONS}
              selectedMap={conflicts}
              onToggle={toggleConflict}
            />
            <textarea
              value={conflictsNotes}
              onChange={(e) => setConflictsNotes(e.target.value)}
              rows={3}
              placeholder="How you would handle the conflict in this case: who decides, who gets told what, and on what timing."
              style={textareaStyle}
            />
          </Section>

          <SubmitFooter canSubmit={canSubmit} onSubmit={handleSubmit} />
        </>
      )}
    </div>
  )
}

function ContextField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.45 }}>{value}</div>
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
        Six sections. Submit when each is complete.
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
        Submit response
      </button>
    </div>
  )
}

function FallbackPanel({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Safeguarding scenario missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed scenario fields. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'safeguarding-referral',
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
