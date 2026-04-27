'use client'

// Buzzer / alert queue, healthcare shell.
//
// Receives block_content.alerts[] from the healthcare scenario
// generator. The candidate sees four to six concurrent alerts arriving
// in the same short window. Each alert carries a bed_or_room, a
// time_received, a short reason label, an urgency_type (clinical_urgent
// / comfort / welfare / administrative), and one to two sentences of
// context. The candidate orders the alerts by response priority and
// chooses one of four actions per alert. An optional reasoning note is
// captured for later scoring.
//
// The "elapsed since received" badge is decorative only. It is computed
// once at mount as the gap between each alert's time_received and the
// most recent alert plus a small offset; it does not tick or penalise
// the candidate.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['buzzer-alert-queue']

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

const URGENCY_STYLE = {
  clinical_urgent: { label: 'Clinical urgent',  bg: CLAY_TINT,    dot: CLAY,        fg: '#8a5d24' },
  comfort:         { label: 'Comfort',          bg: '#f1f5f9',    dot: '#64748b',   fg: '#475569' },
  welfare:         { label: 'Welfare',          bg: NAVY_TINT,    dot: NAVY,        fg: NAVY },
  administrative:  { label: 'Administrative',   bg: '#f8fafc',    dot: '#94a3b8',   fg: '#64748b' },
}

const ALERT_ACTIONS = [
  { id: 'respond_now',           label: 'Respond now',          help: 'You will go to the bed yourself within the next minute.' },
  { id: 'delegate_colleague',    label: 'Delegate to colleague', help: 'Hand to a named colleague who can pick this up safely.' },
  { id: 'acknowledge_and_queue', label: 'Acknowledge and queue', help: 'Acknowledge so the call light stops; come back in the round.' },
  { id: 'escalate_senior',       label: 'Escalate to senior',   help: 'Pass clinical concern to the nurse in charge or on-call doctor.' },
]

function timeStringToMinutes(s) {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!m) return null
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

function elapsedLabel(alertTime, nowMinutes) {
  const t = timeStringToMinutes(alertTime)
  if (t === null || nowMinutes === null) return null
  const diff = Math.max(0, nowMinutes - t)
  if (diff <= 0) return 'just now'
  if (diff < 60) return `${diff} min ago`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m === 0 ? `${h}h ago` : `${h}h ${m}m ago`
}

export default function BuzzerAlertQueueBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const initialAlerts = useMemo(
    () => Array.isArray(block_content?.alerts) ? block_content.alerts : [],
    [block_content]
  )

  // Frozen at mount: the latest alert's time + 2 minutes. This drives
  // the "elapsed" badge so the queue feels live without ticking.
  const nowMinutes = useMemo(() => {
    const times = initialAlerts.map(a => timeStringToMinutes(a.time_received)).filter(t => t !== null)
    if (!times.length) return null
    return Math.max(...times) + 2
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAlerts.map(a => a.time_received).join(',')])

  const [order, setOrder] = useState(() => initialAlerts.map(a => a.alert_id))
  const [actions, setActions] = useState({})
  const [reasoning, setReasoning] = useState({})
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setOrder(initialAlerts.map(a => a.alert_id))
    setActions({})
    setReasoning({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAlerts.map(a => a.alert_id).join(',')])

  const alertById = useMemo(() => {
    const m = {}
    for (const a of initialAlerts) m[a.alert_id] = a
    return m
  }, [initialAlerts])
  const orderedAlerts = order.map(id => alertById[id]).filter(Boolean)

  const move = (alertId, direction) => {
    setOrder(prev => {
      const i = prev.indexOf(alertId)
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

  const setAction = (alertId, actionId) => {
    setActions(prev => ({ ...prev, [alertId]: actionId }))
  }
  const setReason = (alertId, text) => {
    setReasoning(prev => ({ ...prev, [alertId]: text }))
  }

  const completedCount = orderedAlerts.filter(a => actions[a.alert_id]).length
  const canSubmit = orderedAlerts.length > 0 && completedCount === orderedAlerts.length

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const alert_actions = {}
    const alert_reasoning = {}
    for (const a of orderedAlerts) {
      alert_actions[a.alert_id] = actions[a.alert_id] || null
      alert_reasoning[a.alert_id] = (reasoning[a.alert_id] || '').trim()
    }
    onComplete && onComplete({
      block_id: 'buzzer-alert-queue',
      alert_priority_order: order.slice(),
      alert_actions,
      alert_reasoning,
      total_alerts: orderedAlerts.length,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Buzzer / alert queue"
      />

      {orderedAlerts.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 760, margin: '0 auto 16px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
            All of these arrived within the same short window. Order them in the priority you would respond. Choose an action for each. The elapsed-time labels are just for context, not a timer.
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orderedAlerts.map((a, i) => {
              const action = actions[a.alert_id]
              const urg = URGENCY_STYLE[a.urgency_type] || URGENCY_STYLE.comfort
              const elapsed = elapsedLabel(a.time_received, nowMinutes)
              return (
                <div
                  key={a.alert_id}
                  style={{
                    background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
                    padding: 14,
                    display: 'grid', gap: 12,
                    gridTemplateColumns: 'auto 1fr',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                    <button
                      type="button"
                      aria-label="Move up in priority"
                      onClick={() => move(a.alert_id, -1)}
                      disabled={i === 0}
                      style={priorityBtnStyle(i === 0)}
                    >
                      <span aria-hidden="true">▲</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Move down in priority"
                      onClick={() => move(a.alert_id, 1)}
                      disabled={i === orderedAlerts.length - 1}
                      style={priorityBtnStyle(i === orderedAlerts.length - 1)}
                    >
                      <span aria-hidden="true">▼</span>
                    </button>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3 }}>
                        Priority {i + 1}
                      </span>
                      <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>
                        {a.bed_or_room}
                      </span>
                      <span style={{ fontFamily: FM, fontSize: 12, color: TX3 }}>
                        {a.time_received}
                      </span>
                      {elapsed ? (
                        <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>
                          · {elapsed}
                        </span>
                      ) : null}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: urg.bg, color: urg.fg,
                        fontFamily: FM, fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: urg.dot }} />
                        {urg.label}
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

                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                      {a.reason}
                    </div>
                    {a.context_detail ? (
                      <p style={{ fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.55, margin: '0 0 12px' }}>
                        {a.context_detail}
                      </p>
                    ) : null}

                    <div>
                      <div style={subheadStyle}>Action</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {ALERT_ACTIONS.map(act => {
                          const selected = action === act.id
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => setAction(a.alert_id, act.id)}
                              title={act.help}
                              style={{
                                fontFamily: F, fontSize: 13, fontWeight: 700,
                                padding: '7px 12px', borderRadius: 999,
                                border: `1.5px solid ${selected ? TEAL : BD}`,
                                background: selected ? TEAL : '#fff',
                                color: selected ? '#fff' : NAVY,
                                cursor: 'pointer',
                                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                              }}
                            >
                              {act.label}
                            </button>
                          )
                        })}
                      </div>

                      <input
                        type="text"
                        value={reasoning[a.alert_id] || ''}
                        onChange={(e) => setReason(a.alert_id, e.target.value)}
                        placeholder="Optional: one line on why this priority order, why this action."
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          fontFamily: F, fontSize: 13, color: NAVY,
                          padding: '8px 10px', borderRadius: 8,
                          border: `1px solid ${BD}`, background: '#f8fafc',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <SubmitFooter
            answeredCount={completedCount}
            total={orderedAlerts.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
            label="alert"
          />
        </>
      )}
    </div>
  )
}

function labelForAction(actionId) {
  const a = ALERT_ACTIONS.find(x => x.id === actionId)
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

function SubmitFooter({ answeredCount, total, canSubmit, onSubmit, label }) {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Actioned <b style={{ color: NAVY }}>{answeredCount}</b> of {total} {label}{total === 1 ? '' : 's'}. Each {label} needs a position and an action.
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
        Alerts payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed alerts list. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'buzzer-alert-queue',
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
