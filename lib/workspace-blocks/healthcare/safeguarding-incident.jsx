'use client'

// Safeguarding incident, healthcare shell.
//
// Receives an anonymised, fictional safeguarding scenario from the
// healthcare scenario generator: scenario_summary, full_scenario_text,
// who_reported, when_observed, who_at_risk, current_location_context,
// plus a threshold_factors[] ground-truth array that is used at scoring
// time and never surfaced during the scenario.
//
// The candidate works through six structured outputs:
//   1. Threshold decision (radio: yes / no / need more information)
//   2. Who needs to be informed immediately (multi-select + free text)
//   3. Immediate action (textarea)
//   4. Documentation required (textarea)
//   5. External authority notification (multi-select + free text)
//   6. Formal documentation entry written to the record (textarea)
//
// Compliance and tone:
//   - All scenarios are fictional and anonymised. The block UI carries a
//     professional, serious tone — no alarm red, no graphic styling.
//   - Subject matter is treated with appropriate gravity throughout.
//   - The threshold_factors array is for scoring only; never rendered.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['safeguarding-incident']

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
  { id: 'yes',                    label: 'Yes — meets safeguarding threshold',     description: 'Concern is serious enough that safeguarding processes apply now.' },
  { id: 'need_more_information',  label: 'Need more information',                  description: 'Threshold may apply; you would gather more before deciding.' },
  { id: 'no',                     label: 'No — does not meet threshold',            description: 'Concern noted but does not meet the threshold for safeguarding action.' },
]

const INFORMANT_OPTIONS = [
  { id: 'line_manager',                label: 'Line manager / nurse in charge' },
  { id: 'designated_safeguarding_lead', label: 'Designated Safeguarding Lead' },
  { id: 'registered_manager',          label: 'Registered manager / care home manager' },
  { id: 'gp_on_call',                  label: 'GP or on-call doctor' },
  { id: 'senior_social_worker',        label: 'Senior social worker / team manager' },
  { id: 'safeguarding_team_local_authority', label: 'Local authority safeguarding team' },
]

const AUTHORITY_OPTIONS = [
  { id: 'police',              label: 'Police' },
  { id: 'la_safeguarding_adults', label: 'Local Authority Safeguarding (Adults)' },
  { id: 'la_safeguarding_children', label: 'Local Authority Safeguarding (Children)' },
  { id: 'cqc',                 label: 'CQC' },
  { id: 'ofsted',              label: 'Ofsted' },
  { id: 'care_inspectorate',   label: 'Care Inspectorate' },
  { id: 'icb',                 label: 'Integrated Care Board' },
  { id: 'none_at_this_time',   label: 'None at this time' },
]

const ACTION_MIN = 30
const DOC_REQ_MIN = 20
const DOC_ENTRY_MIN = 50

export default function SafeguardingIncidentBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const scenario_summary = block_content?.scenario_summary || ''
  const full_scenario_text = block_content?.full_scenario_text || ''
  const who_reported = block_content?.who_reported || ''
  const when_observed = block_content?.when_observed || ''
  const who_at_risk = block_content?.who_at_risk || ''
  const current_location_context = block_content?.current_location_context || ''

  const [thresholdDecision, setThresholdDecision] = useState(null)
  const [informants, setInformants] = useState({})
  const [informantsOther, setInformantsOther] = useState('')
  const [immediateAction, setImmediateAction] = useState('')
  const [documentationRequired, setDocumentationRequired] = useState('')
  const [authorities, setAuthorities] = useState({})
  const [authoritiesOther, setAuthoritiesOther] = useState('')
  const [documentationEntry, setDocumentationEntry] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  // Reset on new scenario.
  useEffect(() => {
    setThresholdDecision(null)
    setInformants({})
    setInformantsOther('')
    setImmediateAction('')
    setDocumentationRequired('')
    setAuthorities({})
    setAuthoritiesOther('')
    setDocumentationEntry('')
  }, [full_scenario_text])

  const toggleInformant = (id) => {
    setInformants(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }
  const toggleAuthority = (id) => {
    setAuthorities(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  const informantList = useMemo(() => {
    const ids = Object.keys(informants)
    const list = ids.map(id => INFORMANT_OPTIONS.find(o => o.id === id)?.label || id).filter(Boolean)
    if (informantsOther.trim()) list.push(informantsOther.trim())
    return list
  }, [informants, informantsOther])

  const authorityList = useMemo(() => {
    const ids = Object.keys(authorities)
    const list = ids.map(id => AUTHORITY_OPTIONS.find(o => o.id === id)?.label || id).filter(Boolean)
    if (authoritiesOther.trim()) list.push(authoritiesOther.trim())
    return list
  }, [authorities, authoritiesOther])

  const informantsReady = informantList.length >= 1
  const authoritiesReady = authorityList.length >= 1
  const actionReady = immediateAction.trim().length >= ACTION_MIN
  const docReqReady = documentationRequired.trim().length >= DOC_REQ_MIN
  const docEntryReady = documentationEntry.trim().length >= DOC_ENTRY_MIN
  const canSubmit = !!full_scenario_text
    && !!thresholdDecision
    && informantsReady
    && actionReady
    && docReqReady
    && authoritiesReady
    && docEntryReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'safeguarding-incident',
      threshold_decision: thresholdDecision,
      immediate_informants: informantList,
      immediate_action: immediateAction.trim(),
      documentation_required: documentationRequired.trim(),
      external_notification: authorityList,
      documentation_entry: documentationEntry.trim(),
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
        blockName="Safeguarding incident"
      />

      {!full_scenario_text ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the scenario carefully. Decide whether the safeguarding threshold is met. Name who you would inform immediately, what action you would take, what documentation is required, and whether external authorities need to be notified. Write the formal documentation entry as you would put it on the record.
          </div>

          {/* Scenario panel — serious professional tone, slate-tinted */}
          <div style={{
            maxWidth: 880, margin: '0 auto 18px',
            background: SLATE_BG, border: `1px solid ${SLATE_BORDER}`,
            borderLeft: `4px solid ${NAVY}`,
            borderRadius: 10, padding: 16,
          }}>
            <div style={{
              fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
            }}>
              Safeguarding scenario
            </div>
            {scenario_summary ? (
              <div style={{
                fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY,
                lineHeight: 1.45, marginBottom: 10,
              }}>
                {scenario_summary}
              </div>
            ) : null}
            <p style={{
              fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65,
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {full_scenario_text}
            </p>

            <div style={{
              marginTop: 14, display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10,
            }}>
              <ContextField label="Reported by" value={who_reported} />
              <ContextField label="When observed" value={when_observed} />
              <ContextField label="Person at risk" value={who_at_risk} />
              <ContextField label="Current location" value={current_location_context} />
            </div>
          </div>

          <div style={{ maxWidth: 880, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Threshold decision */}
            <Section
              number={1}
              title="Does this meet the safeguarding threshold?"
              hint="Make the call as if you were the person responsible. You can come back to it if you want to gather more information first."
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

            {/* 2. Immediate informants */}
            <Section
              number={2}
              title="Who would you inform immediately?"
              hint="Tick everyone you would notify in the first hour. Add any role not listed."
              status={informantsReady ? 'ready' : 'incomplete'}
            >
              <CheckboxGrid
                options={INFORMANT_OPTIONS}
                selectedMap={informants}
                onToggle={toggleInformant}
              />
              <input
                type="text"
                value={informantsOther}
                onChange={(e) => setInformantsOther(e.target.value)}
                placeholder="Other (free text)"
                style={inputStyle}
              />
            </Section>

            {/* 3. Immediate action */}
            <Section
              number={3}
              title="What immediate action would you take?"
              hint={`Two or three sentences on what you would do in the next hour, and in what order. Minimum ${ACTION_MIN} characters.`}
              status={actionReady ? 'ready' : 'incomplete'}
              counter={`${immediateAction.trim().length} / ${ACTION_MIN}`}
            >
              <textarea
                value={immediateAction}
                onChange={(e) => setImmediateAction(e.target.value)}
                rows={3}
                placeholder="Name the first action, who you call, what you secure, what you preserve."
                style={textareaStyle}
              />
            </Section>

            {/* 4. Documentation required */}
            <Section
              number={4}
              title="What documentation is required?"
              hint={`What needs to be created or completed in the next 24 hours. Minimum ${DOC_REQ_MIN} characters.`}
              status={docReqReady ? 'ready' : 'incomplete'}
              counter={`${documentationRequired.trim().length} / ${DOC_REQ_MIN}`}
            >
              <textarea
                value={documentationRequired}
                onChange={(e) => setDocumentationRequired(e.target.value)}
                rows={2}
                placeholder="Forms, body maps, witness statements, capacity assessments, referral forms — name them."
                style={textareaStyle}
              />
            </Section>

            {/* 5. External notification */}
            <Section
              number={5}
              title="Do external authorities need to be notified?"
              hint="Tick all that apply. Pick 'None at this time' if no external authority is appropriate yet."
              status={authoritiesReady ? 'ready' : 'incomplete'}
            >
              <CheckboxGrid
                options={AUTHORITY_OPTIONS}
                selectedMap={authorities}
                onToggle={toggleAuthority}
              />
              <input
                type="text"
                value={authoritiesOther}
                onChange={(e) => setAuthoritiesOther(e.target.value)}
                placeholder="Other (free text)"
                style={inputStyle}
              />
            </Section>

            {/* 6. Formal documentation entry */}
            <Section
              number={6}
              title="Write the formal documentation entry"
              hint={`The actual entry you would put on the record. Use professional, factual voice. Minimum ${DOC_ENTRY_MIN} characters.`}
              status={docEntryReady ? 'ready' : 'incomplete'}
              counter={`${documentationEntry.trim().length} / ${DOC_ENTRY_MIN}`}
            >
              <textarea
                value={documentationEntry}
                onChange={(e) => setDocumentationEntry(e.target.value)}
                rows={5}
                placeholder="Date, time, who reported, what was reported, what was observed, immediate action taken, who informed, agreed next steps. Use anonymised references."
                style={{ ...textareaStyle, minHeight: 120 }}
              />
            </Section>
          </div>

          <SubmitFooter canSubmit={canSubmit} onSubmit={handleSubmit} />
        </>
      )}
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

function ContextField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{
        fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
      }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.45 }}>
        {value}
      </div>
    </div>
  )
}

function Section({ number, title, hint, status, counter, children }) {
  return (
    <div style={{
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
          block_id: 'safeguarding-incident',
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
