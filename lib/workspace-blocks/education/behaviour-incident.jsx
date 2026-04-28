'use client'

// Behaviour Incident, education shell.
//
// Receives a typed behaviour incident payload from the education
// scenario generator: incident_setting, trigger_event, pupils_involved[],
// other_pupils_reaction, time_pressure, adult_to_be_informed, plus
// scoring-only policy_anchors.
//
// The candidate works through five structured outputs:
//   1. Immediate intervention (textarea)
//   2. De-escalation approach (textarea)
//   3. Recording / logging requirements (multi-select + notes)
//   4. Who they would inform and when (multi-select with timing)
//   5. Safeguarding considerations (multi-select + notes)
//
// Tone: professional, calm. The trigger event is anonymised, no
// graphic detail. The UI keeps the time-pressure context visible so
// the candidate feels the pressure of a live decision.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['behaviour-incident']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const SLATE_BG = '#eef1f5'
const SLATE_BORDER = '#c7cfd9'
const CLAY_TINT = '#FAF1E4'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const RECORDING_OPTIONS = [
  { id: 'school_behaviour_log',     label: 'School behaviour management system' },
  { id: 'cpoms',                    label: 'CPOMS or equivalent safeguarding log' },
  { id: 'incident_form',            label: 'Paper incident form / accident book' },
  { id: 'support_plan_update',      label: 'Update to behaviour or support plan' },
  { id: 'witness_statement',        label: 'Witness statement from another adult' },
  { id: 'parent_log_entry',         label: 'Parent / carer contact log' },
]

const INFORM_OPTIONS = [
  { id: 'class_teacher',  label: 'Class Teacher' },
  { id: 'year_leader',    label: 'Year leader / Head of Year' },
  { id: 'senco',          label: 'SENCO' },
  { id: 'pastoral_lead',  label: 'Pastoral Lead' },
  { id: 'dsl',            label: 'Designated Safeguarding Lead' },
  { id: 'on_call_slt',    label: 'On-call SLT' },
  { id: 'headteacher',    label: 'Headteacher' },
  { id: 'parent_carer',   label: 'Parent or carer' },
]

const TIMING_OPTIONS = [
  { id: 'immediately',          label: 'Immediately' },
  { id: 'end_of_lesson',        label: 'End of this lesson' },
  { id: 'end_of_day',           label: 'End of the school day' },
  { id: 'next_morning',         label: 'Next morning briefing' },
]

const SAFEGUARDING_OPTIONS = [
  { id: 'pupil_with_send',          label: 'Pupil with SEND — reasonable adjustments apply' },
  { id: 'recent_disclosure',        label: 'Recent disclosure or pastoral concern' },
  { id: 'home_circumstances',       label: 'Home circumstances may be a factor' },
  { id: 'pattern_of_concern',       label: 'Pattern of incidents over time' },
  { id: 'other_pupils_at_risk',     label: 'Other pupils may be at risk' },
  { id: 'no_safeguarding_link',     label: 'No safeguarding link at this point' },
]

const INTERVENTION_MIN = 60
const DEESCALATION_MIN = 60
const NOTES_MIN = 0

export default function BehaviourIncidentBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const trigger_event = block_content?.trigger_event || ''
  const incident_setting = block_content?.incident_setting || ''
  const pupils_involved = Array.isArray(block_content?.pupils_involved) ? block_content.pupils_involved : []
  const other_pupils_reaction = block_content?.other_pupils_reaction || ''
  const time_pressure = block_content?.time_pressure || ''
  const adult_to_be_informed = block_content?.adult_to_be_informed || ''

  const [intervention, setIntervention] = useState('')
  const [deescalation, setDeescalation] = useState('')
  const [recording, setRecording] = useState({})
  const [recordingNotes, setRecordingNotes] = useState('')
  const [inform, setInform] = useState({}) // { [id]: timing_id }
  const [safeguarding, setSafeguarding] = useState({})
  const [safeguardingNotes, setSafeguardingNotes] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setIntervention('')
    setDeescalation('')
    setRecording({})
    setRecordingNotes('')
    setInform({})
    setSafeguarding({})
    setSafeguardingNotes('')
  }, [trigger_event])

  const toggleRecording = (id) => {
    setRecording(prev => {
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
  const toggleSafeguarding = (id) => {
    setSafeguarding(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      if (id === 'no_safeguarding_link' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_safeguarding_link') delete next[k]
      } else if (id !== 'no_safeguarding_link' && next[id]) {
        delete next['no_safeguarding_link']
      }
      return next
    })
  }

  const interventionReady = intervention.trim().length >= INTERVENTION_MIN
  const deescalationReady = deescalation.trim().length >= DEESCALATION_MIN
  const recordingList = Object.keys(recording)
  const recordingReady = recordingList.length >= 1
  const informList = Object.keys(inform)
  const informReady = informList.length >= 1
  const safeguardingList = Object.keys(safeguarding)
  const safeguardingReady = safeguardingList.length >= 1

  const canSubmit = !!trigger_event
    && interventionReady
    && deescalationReady
    && recordingReady
    && informReady
    && safeguardingReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'behaviour-incident',
      immediate_intervention: intervention.trim(),
      deescalation_approach: deescalation.trim(),
      recording_actions: recordingList,
      recording_notes: recordingNotes.trim(),
      informed_parties: informList.map(id => ({ party_id: id, timing: inform[id] })),
      safeguarding_considerations: safeguardingList,
      safeguarding_notes: safeguardingNotes.trim(),
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
        blockName="Behaviour incident"
      />

      {!trigger_event ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the incident below. Describe your immediate intervention and de-escalation approach, name what you would record, who you would inform and when, and flag any safeguarding considerations.
          </div>

          {/* Incident panel */}
          <div style={{
            maxWidth: 880, margin: '0 auto 14px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Behaviour incident
            </div>
            {incident_setting ? (
              <div style={{ fontFamily: F, fontSize: 14, color: TX2, marginBottom: 8 }}>
                <b>Setting:</b> {incident_setting}
              </div>
            ) : null}
            <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', marginBottom: 10 }}>
              {trigger_event}
            </p>

            {pupils_involved.length ? (
              <div style={{ marginTop: 6, marginBottom: 8 }}>
                <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Pupils involved
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pupils_involved.map(p => (
                    <div key={p.pupil_id} style={{
                      background: '#fff', border: `1px solid ${BD}`, borderRadius: 8, padding: 8,
                      display: 'grid', gridTemplateColumns: 'auto 1fr 1.5fr', gap: 8, alignItems: 'baseline',
                    }}>
                      <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY }}>{p.anonymised_label}</span>
                      <span style={{ fontFamily: FM, fontSize: 11, color: TX2 }}>{p.year_group}</span>
                      <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, lineHeight: 1.4 }}>{p.relevant_context}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <Meta k="Other pupils" v={other_pupils_reaction} />
              <Meta k="Time pressure" v={time_pressure} />
              <Meta k="Adult to inform" v={adult_to_be_informed} />
            </div>

            {time_pressure ? (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                background: CLAY_TINT, border: '1px solid #ead0a8',
                fontFamily: F, fontSize: 13, color: '#8a5d24',
              }}>
                <b>Live pressure:</b> {time_pressure}
              </div>
            ) : null}
          </div>

          {/* 1. Immediate intervention */}
          <Section
            number={1}
            title="Your immediate intervention"
            hint={`Two or three sentences naming what you actually do in the next 60 seconds. Minimum ${INTERVENTION_MIN} characters.`}
            status={interventionReady ? 'ready' : 'incomplete'}
            counter={`${intervention.trim().length} / ${INTERVENTION_MIN}`}
          >
            <textarea
              value={intervention}
              onChange={(e) => setIntervention(e.target.value)}
              rows={3}
              placeholder="Where you stand, what you say, what you do with the rest of the class."
              style={textareaStyle}
            />
          </Section>

          {/* 2. De-escalation */}
          <Section
            number={2}
            title="Your de-escalation approach"
            hint={`Two or three sentences on how you would bring the temperature down for the pupil and the rest of the group. Minimum ${DEESCALATION_MIN} characters.`}
            status={deescalationReady ? 'ready' : 'incomplete'}
            counter={`${deescalation.trim().length} / ${DEESCALATION_MIN}`}
          >
            <textarea
              value={deescalation}
              onChange={(e) => setDeescalation(e.target.value)}
              rows={3}
              placeholder="Your tone, the choices you offer, the language you use, the recovery you set up."
              style={textareaStyle}
            />
          </Section>

          {/* 3. Recording */}
          <Section
            number={3}
            title="Recording and logging"
            hint="Tick everywhere you would log this and add a short note if helpful."
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
              placeholder="Optional note: anything specific to the entry, e.g. wording, witnesses."
              style={inputStyle}
            />
          </Section>

          {/* 4. Inform */}
          <Section
            number={4}
            title="Who would you inform, and when?"
            hint="Tick the people you would tell. For each, pick the timing."
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

          {/* 5. Safeguarding */}
          <Section
            number={5}
            title="Safeguarding considerations"
            hint="Tick anything that shapes how you would handle this incident."
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
              placeholder="Optional note: the specific factor and how it changes your approach."
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
        Five sections. Submit when each is complete.
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
        Incident detail missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed incident detail. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'behaviour-incident',
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
