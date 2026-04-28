'use client'

// Crisis Simulation, education shell.
//
// Receives an anonymised, fictional crisis payload from the education
// scenario generator: scenario_summary, full_scenario_text, trigger_type,
// who_alerted_the_candidate, immediate_pressures[], framework_reminders[],
// stages[3] (each with new_information + decision_prompt), plus
// scoring-only post_crisis_anchors.
//
// The candidate works through:
//   - Stage 1: read the initial situation, write what they would do in
//     priority order (the immediate decision)
//   - Stage 2: situation shifts, write the next response
//   - Stage 3: final escalation, write the final response
//
// Then the candidate captures, after the crisis arc:
//   1. Who needs to be informed and when (multi-select with timing)
//   2. Recording requirements (multi-select + notes)
//   3. Safeguarding considerations (multi-select + notes)
//   4. Post-crisis follow-up (textarea)
//
// Compliance and tone:
//   - Scenarios are anonymised and fictional. The block UI uses a
//     slate-tinted serious tone — no alarm red, no graphic styling.
//   - Subject matter is treated with appropriate gravity.
//   - Mirrors the safeguarding-referral pattern.
//   - post_crisis_anchors is for scoring only; never rendered.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['crisis-simulation']

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

const TRIGGER_LABEL = {
  pupil_distress_in_lesson:                'Pupil distress in lesson',
  classroom_incident_requiring_intervention: 'Classroom incident requiring intervention',
  escalation_from_colleague:               'Escalation from colleague',
  mental_health_emergency:                 'Mental health emergency',
  family_or_disclosure_crisis:             'Family / disclosure crisis',
  school_wide_safeguarding_incident:       'School-wide safeguarding incident',
  media_or_regulator_inquiry:              'Media / regulator inquiry',
}

const INFORM_OPTIONS = [
  { id: 'class_teacher',          label: 'Class Teacher / form tutors' },
  { id: 'pastoral_lead',          label: 'Pastoral Lead' },
  { id: 'senco',                  label: 'SENCO' },
  { id: 'dsl',                    label: 'Designated Safeguarding Lead' },
  { id: 'deputy_dsl',             label: 'Deputy DSL' },
  { id: 'on_call_slt',            label: 'On-call SLT' },
  { id: 'headteacher',            label: 'Headteacher' },
  { id: 'parent_carer',           label: 'Parent / carer' },
  { id: 'la_or_mash',             label: 'LA / MASH' },
  { id: 'emergency_services',     label: 'Emergency services (999 / 101)' },
  { id: 'lado',                   label: 'LADO (staff-conduct concerns)' },
  { id: 'mat_lead',               label: 'MAT lead / Trust leadership' },
]

const TIMING_OPTIONS = [
  { id: 'immediately',          label: 'Immediately' },
  { id: 'within_the_hour',      label: 'Within the hour' },
  { id: 'end_of_day',           label: 'End of the school day' },
  { id: 'next_morning',         label: 'Next morning briefing' },
]

const RECORDING_OPTIONS = [
  { id: 'cpoms',                  label: 'CPOMS' },
  { id: 'myconcern',              label: 'MyConcern' },
  { id: 'paper_safeguarding_log', label: 'Paper safeguarding log' },
  { id: 'incident_form',          label: 'Critical incident / accident form' },
  { id: 'witness_statements',     label: 'Witness statements from staff' },
  { id: 'communications_log',     label: 'External communications log' },
]

const SAFEGUARDING_OPTIONS = [
  { id: 'pupil_immediate_risk',     label: 'Pupil at immediate risk of harm' },
  { id: 'other_pupils_witnessing',  label: 'Other pupils witnessing the incident' },
  { id: 'staff_wellbeing',          label: 'Staff wellbeing impact' },
  { id: 'media_or_external',        label: 'Media or external scrutiny in play' },
  { id: 'lado_threshold',           label: 'LADO threshold (staff-conduct concern)' },
  { id: 'no_additional_safeguarding', label: 'No additional safeguarding consideration' },
]

const STAGE_RESPONSE_MIN = 150
const FOLLOWUP_MIN = 100

export default function CrisisSimulationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const scenario_summary = block_content?.scenario_summary || ''
  const full_scenario_text = block_content?.full_scenario_text || ''
  const trigger_type = block_content?.trigger_type || ''
  const who_alerted = block_content?.who_alerted_the_candidate || ''
  const immediate_pressures = Array.isArray(block_content?.immediate_pressures) ? block_content.immediate_pressures : []
  const framework_reminders = Array.isArray(block_content?.framework_reminders) ? block_content.framework_reminders : []
  const stages = Array.isArray(block_content?.stages) ? block_content.stages : []

  const [activeStage, setActiveStage] = useState(0)
  const [responses, setResponses] = useState(['', '', ''])
  const [inform, setInform] = useState({}) // { [id]: timing_id }
  const [recording, setRecording] = useState({})
  const [recordingNotes, setRecordingNotes] = useState('')
  const [safeguarding, setSafeguarding] = useState({})
  const [safeguardingNotes, setSafeguardingNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setActiveStage(0)
    setResponses(['', '', ''])
    setInform({})
    setRecording({})
    setRecordingNotes('')
    setSafeguarding({})
    setSafeguardingNotes('')
    setFollowUp('')
  }, [full_scenario_text])

  const setResponse = (i, text) => {
    setResponses(prev => prev.map((r, idx) => idx === i ? text : r))
  }
  const advanceStage = (from) => {
    if (from < stages.length - 1 && activeStage === from) {
      setActiveStage(from + 1)
    }
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
  const toggleRecording = (id) => {
    setRecording(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleSafeguarding = (id) => {
    setSafeguarding(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_additional_safeguarding' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_additional_safeguarding') delete next[k]
      } else if (id !== 'no_additional_safeguarding' && next[id]) {
        delete next['no_additional_safeguarding']
      }
      return next
    })
  }

  const stageReady = (i) => responses[i].trim().length >= STAGE_RESPONSE_MIN
  const allStagesReady = stages.length > 0 && stages.every((_, i) => stageReady(i))
  const informList = Object.keys(inform)
  const informReady = informList.length >= 1
  const recordingList = Object.keys(recording)
  const recordingReady = recordingList.length >= 1
  const safeguardingList = Object.keys(safeguarding)
  const safeguardingReady = safeguardingList.length >= 1
  const followUpReady = followUp.trim().length >= FOLLOWUP_MIN

  const canSubmit = stages.length === 3
    && allStagesReady
    && informReady
    && recordingReady
    && safeguardingReady
    && followUpReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'crisis-simulation',
      trigger_type,
      stage_responses: stages.map((s, i) => ({
        stage_index: s.stage_index || (i + 1),
        response_text: responses[i].trim(),
        response_word_count: responses[i].trim().split(/\s+/).filter(Boolean).length,
      })),
      informed_parties: informList.map(id => ({ party_id: id, timing: inform[id] })),
      recording_actions: recordingList,
      recording_notes: recordingNotes.trim(),
      safeguarding_considerations: safeguardingList,
      safeguarding_notes: safeguardingNotes.trim(),
      post_crisis_followup: followUp.trim(),
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
        blockName="Crisis simulation"
      />

      {!full_scenario_text || stages.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the scenario carefully. Three stages, each with a decision under pressure. After the third stage, name who needs to be informed, what needs recording, the safeguarding considerations, and the post-crisis follow-up. Patterns suggest the strongest call here is the one that holds professional judgement under genuine time pressure.
          </div>

          {/* Scenario panel — slate-tinted, mirrors safeguarding-referral */}
          <div style={{
            maxWidth: 880, margin: '0 auto 14px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Crisis scenario
              </div>
              {trigger_type ? (
                <span style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999,
                  background: '#fff', color: NAVY, border: `1px solid ${BD}`,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {TRIGGER_LABEL[trigger_type] || trigger_type}
                </span>
              ) : null}
            </div>
            {scenario_summary ? (
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, lineHeight: 1.45, marginBottom: 10 }}>
                {scenario_summary}
              </div>
            ) : null}
            <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {full_scenario_text}
            </p>

            {who_alerted ? (
              <div style={{ marginTop: 12 }}>
                <ContextField label="How you were alerted" value={who_alerted} />
              </div>
            ) : null}

            {immediate_pressures.length ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Immediate pressures
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
                  {immediate_pressures.map((p, i) => <li key={i}>{p}</li>)}
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

          {/* Stage-by-stage */}
          <div style={{ maxWidth: 880, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stages.map((s, i) => {
              const isOpen = i <= activeStage
              const ready = stageReady(i)
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
                        {s.stage_index || (i + 1)}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
                        Stage {s.stage_index || (i + 1)}
                      </span>
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 11, color: ready ? TEAL : TX3 }}>
                      {responses[i].trim().length} / {STAGE_RESPONSE_MIN}
                    </span>
                  </div>
                  {isOpen ? (
                    <div style={{ padding: 14 }}>
                      <div style={{
                        background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`, borderLeft: `4px solid ${NAVY}`,
                        borderRadius: 8, padding: 12, marginBottom: 10,
                      }}>
                        <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          What you now know
                        </div>
                        <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                          {s.new_information}
                        </p>
                        <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                          Decision required
                        </div>
                        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.5 }}>
                          {s.decision_prompt}
                        </div>
                      </div>
                      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Your response
                      </div>
                      <textarea
                        value={responses[i]}
                        onChange={(e) => setResponse(i, e.target.value)}
                        rows={5}
                        placeholder={`Name what you do in priority order, who you call, what you secure. Minimum ${STAGE_RESPONSE_MIN} characters.`}
                        style={{ ...textareaStyle, minHeight: 120 }}
                      />
                      {i < stages.length - 1 ? (
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => advanceStage(i)}
                            disabled={!ready || activeStage !== i}
                            style={{
                              fontFamily: F, fontSize: 13, fontWeight: 700,
                              padding: '8px 14px', borderRadius: 8, border: 'none',
                              background: (ready && activeStage === i) ? TEAL : '#cbd5e1',
                              color: '#fff',
                              cursor: (ready && activeStage === i) ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Continue to stage {(s.stage_index || (i + 1)) + 1}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* 1. Inform */}
          <Section
            number={1}
            title="Who needs to be informed, and when"
            hint="Tick everyone you would notify after the crisis. For each, pick the timing."
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

          {/* 2. Recording */}
          <Section
            number={2}
            title="Recording requirements"
            hint="Tick where you would record this and add a short note on what you would write."
            status={recordingReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={RECORDING_OPTIONS}
              selectedMap={recording}
              onToggle={toggleRecording}
            />
            <input
              type="text"
              value={recordingNotes}
              onChange={(e) => setRecordingNotes(e.target.value)}
              placeholder="Optional note: what specifically would land in the entry."
              style={inputStyle}
            />
          </Section>

          {/* 3. Safeguarding */}
          <Section
            number={3}
            title="Safeguarding considerations"
            hint="Tick anything in play that shapes the response."
            status={safeguardingReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={SAFEGUARDING_OPTIONS}
              selectedMap={safeguarding}
              onToggle={toggleSafeguarding}
            />
            <input
              type="text"
              value={safeguardingNotes}
              onChange={(e) => setSafeguardingNotes(e.target.value)}
              placeholder="Optional note: the specific safeguarding line and how it shaped your response."
              style={inputStyle}
            />
          </Section>

          {/* 4. Post-crisis follow-up */}
          <Section
            number={4}
            title="Post-crisis follow-up"
            hint={`Two or three sentences naming what you would do in the 24 hours after the crisis. Minimum ${FOLLOWUP_MIN} characters.`}
            status={followUpReady ? 'ready' : 'incomplete'}
            counter={`${followUp.trim().length} / ${FOLLOWUP_MIN}`}
          >
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={3}
              placeholder="Pupil debrief plan, staff wellbeing check-in, log entry, parent communication, external comms log."
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
        Three stages plus four sections. Submit when each is complete.
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
        Crisis scenario missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed crisis stages. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'crisis-simulation',
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
