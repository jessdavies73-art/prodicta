'use client'

// Patient handover, healthcare shell.
//
// Receives block_content.patients[] from the healthcare scenario
// generator. Each patient carries an anonymised header (initials, age
// range, condition placeholder), an acuity rating, observations from
// the previous shift, family notes, and any immediate concerns. The
// candidate clicks a patient to expand the handover detail, places
// them in priority order via up / down controls, and chooses one of
// four actions per patient. The capture payload feeds the scoring
// orchestrator in a follow-up prompt.
//
// Compliance notes:
//   - All clinical content uses placeholder language. The block UI
//     never displays a drug name or a dose. The category column
//     surfaces broad placeholder labels only.
//   - Acuity colours follow the brand-safe palette: stable = jade,
//     monitoring = navy, deteriorating = clay. No traffic-light tones.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['patient-handover']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const NAVY_TINT = '#E1E7EE'
const CLAY = '#D4A06B'
const CLAY_TINT = '#FAF1E4'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const ACUITY_STYLE = {
  stable:        { label: 'Stable',        bg: TEAL_TINT, dot: TEAL, fg: '#0e6e63' },
  monitoring:    { label: 'Monitoring',    bg: NAVY_TINT, dot: NAVY, fg: NAVY },
  deteriorating: { label: 'Deteriorating', bg: CLAY_TINT, dot: CLAY, fg: '#8a5d24' },
}

const HANDOVER_ACTIONS = [
  { id: 'review_now',         label: 'Review now',          help: 'Patient needs your hands-on attention this hour.' },
  { id: 'check_next_round',   label: 'Check in next round', help: 'Stable enough to fold into the planned round.' },
  { id: 'escalate_senior',    label: 'Escalate to senior',  help: 'Pass clinical concern up the chain.' },
  { id: 'update_care_plan',   label: 'Update care plan',    help: 'Document a change before the next shift.' },
]

export default function PatientHandoverBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const initialPatients = useMemo(
    () => Array.isArray(block_content?.patients) ? block_content.patients : [],
    [block_content]
  )

  const [order, setOrder] = useState(() => initialPatients.map(p => p.patient_id))
  const [expanded, setExpanded] = useState(() => initialPatients[0]?.patient_id || null)
  const [actions, setActions] = useState({})  // { [patient_id]: action_id }
  const [notes, setNotes] = useState({})      // { [patient_id]: string }
  const [firstViewed, setFirstViewed] = useState({}) // { [patient_id]: ISO }
  const [startedAt] = useState(() => new Date().toISOString())

  // Reset internal state when the patient list changes (e.g. fresh scenario).
  useEffect(() => {
    setOrder(initialPatients.map(p => p.patient_id))
    setExpanded(initialPatients[0]?.patient_id || null)
    setActions({})
    setNotes({})
    setFirstViewed({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatients.map(p => p.patient_id).join(',')])

  // Record the first time each patient was opened so the capture payload
  // can carry a deliberation signal.
  useEffect(() => {
    if (!expanded) return
    setFirstViewed(prev => prev[expanded] ? prev : { ...prev, [expanded]: new Date().toISOString() })
  }, [expanded])

  const patientById = useMemo(() => {
    const m = {}
    for (const p of initialPatients) m[p.patient_id] = p
    return m
  }, [initialPatients])

  const orderedPatients = order.map(id => patientById[id]).filter(Boolean)

  const move = (patientId, direction) => {
    setOrder(prev => {
      const i = prev.indexOf(patientId)
      if (i < 0) return prev
      const target = i + direction
      if (target < 0 || target >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[target]
      next[target] = next[i]
      next[i] = tmp
      return next
    })
  }

  const setAction = (patientId, actionId) => {
    setActions(prev => ({ ...prev, [patientId]: actionId }))
  }
  const setNote = (patientId, text) => {
    setNotes(prev => ({ ...prev, [patientId]: text }))
  }

  const completedCount = orderedPatients.filter(p => actions[p.patient_id]).length
  const canSubmit = orderedPatients.length > 0 && completedCount === orderedPatients.length

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const patient_actions = {}
    const patient_notes = {}
    const time_per_patient = {}
    for (const p of orderedPatients) {
      patient_actions[p.patient_id] = actions[p.patient_id] || null
      patient_notes[p.patient_id] = (notes[p.patient_id] || '').trim()
      const opened = firstViewed[p.patient_id]
      time_per_patient[p.patient_id] = opened
        ? Math.max(0, Math.round((new Date(completedAt) - new Date(opened)) / 1000))
        : null
    }
    onComplete && onComplete({
      block_id: 'patient-handover',
      patient_priority_order: order.slice(),
      patient_actions,
      patient_notes,
      time_per_patient,
      total_patients: orderedPatients.length,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Patient handover"
      />

      {orderedPatients.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 16px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
            Read each handover. Order the list in the priority you would actually work in for the first hour of the shift. Choose an action for each patient. You can add a short note where the judgement is not obvious.
          </div>

          <div style={{ maxWidth: 880, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orderedPatients.map((p, i) => {
              const isOpen = expanded === p.patient_id
              const action = actions[p.patient_id]
              const acuity = ACUITY_STYLE[p.acuity] || ACUITY_STYLE.monitoring
              return (
                <div
                  key={p.patient_id}
                  style={{
                    background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    borderBottom: isOpen ? `1px solid ${BD}` : 'none',
                    background: isOpen ? '#fafbfc' : '#fff',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        type="button"
                        aria-label="Move up in priority"
                        onClick={() => move(p.patient_id, -1)}
                        disabled={i === 0}
                        style={priorityBtnStyle(i === 0)}
                      >
                        <span aria-hidden="true">▲</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Move down in priority"
                        onClick={() => move(p.patient_id, 1)}
                        disabled={i === orderedPatients.length - 1}
                        style={priorityBtnStyle(i === orderedPatients.length - 1)}
                      >
                        <span aria-hidden="true">▼</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpanded(prev => prev === p.patient_id ? null : p.patient_id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', padding: 0, display: 'flex', flexDirection: 'column', gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3 }}>
                          Priority {i + 1}
                        </span>
                        <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>
                          {p.bed_or_room}
                        </span>
                        {p.patient_initials ? (
                          <span style={{ fontFamily: F, fontSize: 14, color: TX, fontWeight: 600 }}>
                            {p.patient_initials}
                          </span>
                        ) : null}
                        {p.age_range ? (
                          <span style={{ fontFamily: FM, fontSize: 12, color: TX3 }}>
                            {p.age_range}
                          </span>
                        ) : null}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: acuity.bg, color: acuity.fg,
                          fontFamily: FM, fontSize: 11, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 999,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: acuity.dot }} />
                          {acuity.label}
                        </span>
                        {action ? (
                          <span style={{
                            fontFamily: FM, fontSize: 11, fontWeight: 700,
                            color: TEAL, padding: '3px 8px', borderRadius: 999,
                            background: TEAL_TINT,
                          }}>
                            ✓ {labelForAction(action)}
                          </span>
                        ) : null}
                      </div>
                      {p.primary_condition_placeholder ? (
                        <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.4 }}>
                          {p.primary_condition_placeholder}
                        </span>
                      ) : null}
                    </button>

                    <span aria-hidden="true" style={{ fontFamily: FM, fontSize: 13, color: TX3 }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>

                  {isOpen ? (
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {p.observations ? (
                        <DetailRow label="Previous shift observations" body={p.observations} />
                      ) : null}
                      {p.family_notes ? (
                        <DetailRow label="Family contact" body={p.family_notes} />
                      ) : null}
                      {p.immediate_concerns ? (
                        <DetailRow label="Immediate concerns" body={p.immediate_concerns} highlight />
                      ) : null}

                      <div>
                        <div style={subheadStyle}>Action</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {HANDOVER_ACTIONS.map(a => {
                            const selected = action === a.id
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setAction(p.patient_id, a.id)}
                                title={a.help}
                                style={{
                                  fontFamily: F, fontSize: 13, fontWeight: 700,
                                  padding: '8px 14px', borderRadius: 999,
                                  border: `1.5px solid ${selected ? TEAL : BD}`,
                                  background: selected ? TEAL : '#fff',
                                  color: selected ? '#fff' : NAVY,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                                }}
                              >
                                {a.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <div style={subheadStyle}>Optional note</div>
                        <textarea
                          value={notes[p.patient_id] || ''}
                          onChange={(e) => setNote(p.patient_id, e.target.value)}
                          rows={2}
                          placeholder="Anything you want the next reviewer to know about your call here."
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
                            padding: 10, borderRadius: 8,
                            border: `1px solid ${BD}`, background: '#f8fafc',
                            outline: 'none', resize: 'vertical',
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          <SubmitFooter
            answeredCount={completedCount}
            total={orderedPatients.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
            label="patient"
          />
        </>
      )}
    </div>
  )
}

function labelForAction(actionId) {
  const a = HANDOVER_ACTIONS.find(x => x.id === actionId)
  return a ? a.label : actionId
}

function priorityBtnStyle(disabled) {
  return {
    width: 26, height: 22, padding: 0,
    fontFamily: FM, fontSize: 11, color: disabled ? '#cbd5e1' : NAVY,
    background: disabled ? '#f8fafc' : '#fff',
    border: `1px solid ${disabled ? '#e2e8f0' : BD}`,
    borderRadius: 6,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }
}

const subheadStyle = {
  fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
}

function DetailRow({ label, body, highlight = false }) {
  return (
    <div style={{
      background: highlight ? CLAY_TINT : '#f8fafc',
      border: `1px solid ${highlight ? '#ead0a8' : '#e2e8f0'}`,
      borderRadius: 8, padding: 12,
    }}>
      <div style={{
        fontFamily: FM, fontSize: 11, fontWeight: 700,
        color: highlight ? '#8a5d24' : TX3,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
      }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  )
}

function SubmitFooter({ answeredCount, total, canSubmit, onSubmit, label }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Actioned <b style={{ color: NAVY }}>{answeredCount}</b> of {total} {label}{total === 1 ? '' : 's'}. Each {label} needs a priority position and an action.
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
        Patients payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed patients list. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      {Array.isArray(block_content?.key_items) && block_content.key_items.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6, marginBottom: 14 }}>
          {block_content.key_items.map((k, i) => <li key={i}>{k}</li>)}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'patient-handover',
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
