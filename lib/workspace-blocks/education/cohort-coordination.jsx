'use client'

// Cohort Coordination, education shell.
//
// Receives a typed coordination payload from the education scenario
// generator: scope, coordination_window, demands[], resource_constraints[],
// plus scoring-only escalation_anchors.
//
// The candidate works through five structured outputs:
//   1. Priority ranking of the demands (drag-style up / down ordering)
//   2. Per-demand decision (one of: handle_now / delegate / defer / escalate)
//   3. Coordination plan narrative (textarea, names actions and timing)
//   4. Briefing list (multi-select: who would be briefed and when)
//   5. Escalation pathway (textarea, what would force escalation and to whom)
//
// escalation_anchors is ground-truth, never rendered. The capture
// payload is consumed by the per-block scorer in the next prompt.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['cohort-coordination']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const CLAY = '#D4A06B'
const CLAY_TINT = '#FAF1E4'
const NAVY_TINT = '#E1E7EE'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const SCOPE_LABEL = {
  small_group:               'Small-group coordination',
  single_class_or_year:      'Class or year-group coordination',
  cross_class_or_department: 'Cross-class / department coordination',
  whole_school:              'Whole-school coordination',
}

const PRIORITY_STYLE = {
  critical: { label: 'Critical', bg: CLAY_TINT,  fg: '#8a5d24', dot: CLAY },
  high:     { label: 'High',     bg: '#fef3c7',  fg: '#92400e', dot: '#f59e0b' },
  medium:   { label: 'Medium',   bg: NAVY_TINT,  fg: NAVY,      dot: NAVY },
  low:      { label: 'Low',      bg: TEAL_TINT,  fg: '#0e6e63', dot: TEAL },
}

const ACTION_OPTIONS = [
  { id: 'handle_now', label: 'Handle now',          help: 'You would deal with this directly within the coordination window.' },
  { id: 'delegate',   label: 'Delegate',            help: 'Hand off to a named person with a specific timing.' },
  { id: 'defer',      label: 'Defer',               help: 'Push out beyond this window with a documented reason.' },
  { id: 'escalate',   label: 'Escalate',            help: 'Pass up the chain to SLT, the Head, or external decision-maker.' },
]

const BRIEF_OPTIONS = [
  { id: 'class_teacher',   label: 'Class Teacher / form tutors' },
  { id: 'year_leader',     label: 'Year leader / Head of Year' },
  { id: 'senco',           label: 'SENCO' },
  { id: 'pastoral_lead',   label: 'Pastoral Lead' },
  { id: 'dsl',             label: 'Designated Safeguarding Lead' },
  { id: 'on_call_slt',     label: 'On-call SLT' },
  { id: 'headteacher',     label: 'Headteacher' },
  { id: 'office_admin',    label: 'School office (cover / logistics)' },
  { id: 'mat_lead',        label: 'MAT lead / Trust leadership' },
  { id: 'governor_chair',  label: 'Chair of Governors' },
]

const PLAN_MIN = 120
const ESCALATION_MIN = 80

export default function CohortCoordinationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const scope = block_content?.scope || 'single_class_or_year'
  const window_label = block_content?.coordination_window || ''
  const demands = useMemo(
    () => Array.isArray(block_content?.demands) ? block_content.demands : [],
    [block_content]
  )
  const resourceConstraints = Array.isArray(block_content?.resource_constraints)
    ? block_content.resource_constraints : []

  const [order, setOrder] = useState(() => demands.map(d => d.demand_id))
  const [actions, setActions] = useState({}) // { [demand_id]: action_id }
  const [plan, setPlan] = useState('')
  const [briefs, setBriefs] = useState({}) // { [option_id]: timing string }
  const [escalation, setEscalation] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setOrder(demands.map(d => d.demand_id))
    setActions({})
    setPlan('')
    setBriefs({})
    setEscalation('')
  }, [demands.map(d => d.demand_id).join(',')])

  const move = (demandId, direction) => {
    setOrder(prev => {
      const i = prev.indexOf(demandId)
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
  const setAction = (demandId, actionId) => {
    setActions(prev => ({ ...prev, [demandId]: actionId }))
  }
  const toggleBrief = (id) => {
    setBriefs(prev => {
      const next = { ...prev }
      if (next[id] !== undefined) delete next[id]
      else next[id] = 'before the window starts'
      return next
    })
  }
  const setBriefTiming = (id, timing) => {
    setBriefs(prev => ({ ...prev, [id]: timing }))
  }

  const demandsById = useMemo(() => {
    const m = {}
    for (const d of demands) m[d.demand_id] = d
    return m
  }, [demands])

  const orderedDemands = order.map(id => demandsById[id]).filter(Boolean)
  const allActioned = orderedDemands.length > 0 && orderedDemands.every(d => actions[d.demand_id])
  const planReady = plan.trim().length >= PLAN_MIN
  const briefList = Object.keys(briefs)
  const briefsReady = briefList.length >= 1
  const escalationReady = escalation.trim().length >= ESCALATION_MIN

  const canSubmit = orderedDemands.length > 0
    && allActioned
    && planReady
    && briefsReady
    && escalationReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'cohort-coordination',
      scope,
      priority_order: order.slice(),
      demand_actions: Object.fromEntries(orderedDemands.map(d => [d.demand_id, actions[d.demand_id] || null])),
      coordination_plan: plan.trim(),
      briefing_plan: briefList.map(id => ({ party_id: id, timing: briefs[id] })),
      escalation_pathway: escalation.trim(),
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
        blockName="Cohort coordination"
      />

      {orderedDemands.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 980, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Order the demands in the priority you would actually work in, pick an action for each, write the coordination plan, name who you would brief and when, and outline the escalation pathway.
          </div>

          <div style={{
            maxWidth: 980, margin: '0 auto 14px',
            background: '#fff', border: `1px solid ${BD}`, borderLeft: `4px solid ${TEAL}`,
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY }}>
                {SCOPE_LABEL[scope] || 'Cohort coordination'}
              </div>
              {window_label ? (
                <div style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>
                  Coordination window: <b style={{ color: NAVY }}>{window_label}</b>
                </div>
              ) : null}
            </div>
            {resourceConstraints.length ? (
              <div>
                <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Resource constraints
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
                  {resourceConstraints.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Demands list */}
          <div style={{ maxWidth: 980, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orderedDemands.map((d, i) => {
              const action = actions[d.demand_id]
              const priority = PRIORITY_STYLE[d.priority_signal] || PRIORITY_STYLE.medium
              return (
                <div
                  key={d.demand_id}
                  style={{
                    background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14,
                    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() => move(d.demand_id, -1)}
                      disabled={i === 0}
                      style={priorityBtnStyle(i === 0)}
                    >
                      <span aria-hidden="true">▲</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() => move(d.demand_id, 1)}
                      disabled={i === orderedDemands.length - 1}
                      style={priorityBtnStyle(i === orderedDemands.length - 1)}
                    >
                      <span aria-hidden="true">▼</span>
                    </button>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>Priority {i + 1}</span>
                      <span style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY }}>
                        {d.title}
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: priority.bg, color: priority.fg,
                        fontFamily: FM, fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: priority.dot }} />
                        {priority.label}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 8 }}>
                      <Meta k="Stakeholder" v={d.stakeholder} />
                      <Meta k="Deadline" v={d.deadline} />
                    </div>
                    {d.constraint ? (
                      <div style={{ fontFamily: F, fontSize: 13, color: TX, lineHeight: 1.5, marginBottom: 8 }}>
                        <b style={{ color: NAVY }}>Constraint:</b> {d.constraint}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ACTION_OPTIONS.map(a => {
                        const selected = action === a.id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAction(d.demand_id, a.id)}
                            title={a.help}
                            style={{
                              fontFamily: F, fontSize: 12.5, fontWeight: 700,
                              padding: '6px 12px', borderRadius: 999,
                              border: `1.5px solid ${selected ? TEAL : BD}`,
                              background: selected ? TEAL : '#fff',
                              color: selected ? '#fff' : NAVY,
                              cursor: 'pointer',
                            }}
                          >
                            {a.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 1. Plan */}
          <Section
            number={1}
            title="Coordination plan"
            hint={`Three or four sentences naming the actual moves you would make: who does what, in what order, and how the day actually plays out. Minimum ${PLAN_MIN} characters.`}
            status={planReady ? 'ready' : 'incomplete'}
            counter={`${plan.trim().length} / ${PLAN_MIN}`}
          >
            <textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={4}
              placeholder="By 09:30 ... by 11:00 ... before the window closes..."
              style={textareaStyle}
            />
          </Section>

          {/* 2. Briefing */}
          <Section
            number={2}
            title="Who you would brief, and when"
            hint="Tick everyone you would brief. For each, name the timing in your own words."
            status={briefsReady ? 'ready' : 'incomplete'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BRIEF_OPTIONS.map(o => {
                const checked = briefs[o.id] !== undefined
                return (
                  <div key={o.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 8, alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8,
                    background: checked ? TEAL_TINT : '#fff',
                    border: `1px solid ${checked ? TEAL : BD}`,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, color: NAVY, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrief(o.id)}
                        style={{ accentColor: TEAL, width: 16, height: 16, cursor: 'pointer', margin: 0 }}
                      />
                      {o.label}
                    </label>
                    {checked ? (
                      <input
                        type="text"
                        value={briefs[o.id]}
                        onChange={(e) => setBriefTiming(o.id, e.target.value)}
                        placeholder="Timing, e.g. 'before 09:00', 'at end of day'"
                        style={{
                          fontFamily: FM, fontSize: 12, color: NAVY,
                          padding: '4px 8px', borderRadius: 6,
                          border: `1px solid ${BD}`, background: '#fff',
                          outline: 'none',
                        }}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* 3. Escalation */}
          <Section
            number={3}
            title="Escalation pathway"
            hint={`Two or three sentences naming what would force escalation and to whom. Minimum ${ESCALATION_MIN} characters.`}
            status={escalationReady ? 'ready' : 'incomplete'}
            counter={`${escalation.trim().length} / ${ESCALATION_MIN}`}
          >
            <textarea
              value={escalation}
              onChange={(e) => setEscalation(e.target.value)}
              rows={3}
              placeholder="Trigger that forces escalation, who you escalate to, and what you hand them."
              style={textareaStyle}
            />
          </Section>

          <SubmitFooter
            actionedCount={orderedDemands.filter(d => actions[d.demand_id]).length}
            total={orderedDemands.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
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

function Meta({ k, v }) {
  if (!v) return null
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{k}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.45 }}>{v}</div>
    </div>
  )
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
      maxWidth: 980, margin: '0 auto 12px',
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

function SubmitFooter({ actionedCount, total, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Actioned <b style={{ color: NAVY }}>{actionedCount}</b> of {total} demand{total === 1 ? '' : 's'}. Each demand needs an action; the plan, briefing, and escalation must be complete.
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
        Coordination payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed demands list. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'cohort-coordination',
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
