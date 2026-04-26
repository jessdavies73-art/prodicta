'use client'

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['task-prioritisation']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const DEADLINE_STYLES = {
  today:        { label: 'Today',          bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  tomorrow:     { label: 'Tomorrow',       bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' },
  this_week:    { label: 'This week',      bg: '#fffbeb', fg: '#92400e', bd: '#fcd34d' },
  no_deadline:  { label: 'No deadline',    bg: '#f1f5f9', fg: '#475569', bd: '#cbd5e1' },
}

const ACTION_OPTIONS = [
  { value: '',              label: 'Pick action...' },
  { value: 'do_now',        label: 'Do now' },
  { value: 'do_later_today',label: 'Do later today' },
  { value: 'tomorrow',      label: 'Tomorrow' },
  { value: 'delegate',      label: 'Delegate' },
  { value: 'decline_defer', label: 'Decline / Defer' },
]

export default function TaskPrioritisationBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const tasks = useMemo(
    () => Array.isArray(block_content?.tasks) ? block_content.tasks : [],
    [block_content]
  )

  const [order, setOrder] = useState(tasks.map(t => t.id))
  const [actions, setActions] = useState({})
  const [notes, setNotes] = useState({})
  const [openNotes, setOpenNotes] = useState({})
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setOrder(tasks.map(t => t.id))
    setActions({})
    setNotes({})
    setOpenNotes({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.map(t => t.id).join(',')])

  const tasksById = useMemo(() => {
    const m = {}
    for (const t of tasks) m[t.id] = t
    return m
  }, [tasks])

  const orderedTasks = order.map(id => tasksById[id]).filter(Boolean)
  const allActioned = orderedTasks.length > 0 && orderedTasks.every(t => actions[t.id])

  const move = (id, dir) => {
    setOrder(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const handleSubmit = () => {
    onComplete && onComplete({
      block_id: 'task-prioritisation',
      task_order: order,
      task_actions: actions,
      task_reasoning: notes,
      total_tasks: tasks.length,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Task prioritisation"
      />

      {orderedTasks.length === 0 ? (
        <NoTasksFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 760, margin: '0 auto 18px', fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            Order the work in priority order using the up and down arrows. Pick an action for each. Add a note where the call is non-obvious.
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto 18px' }}>
            {orderedTasks.map((t, i) => {
              const isFirst = i === 0
              const isLast = i === orderedTasks.length - 1
              const dline = DEADLINE_STYLES[t.deadline] || DEADLINE_STYLES.no_deadline
              const action = actions[t.id] || ''
              const noteOpen = openNotes[t.id]
              return (
                <div
                  key={t.id}
                  style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                    padding: 14, marginBottom: 10,
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => move(t.id, -1)}
                      disabled={isFirst}
                      aria-label="Move up"
                      style={arrowBtnStyle(isFirst)}
                    >
                      ▲
                    </button>
                    <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                      {i + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => move(t.id, 1)}
                      disabled={isLast}
                      aria-label="Move down"
                      style={arrowBtnStyle(isLast)}
                    >
                      ▼
                    </button>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.3, flex: 1 }}>
                        {t.title}
                      </div>
                      <span style={{
                        fontFamily: FM, fontSize: 10, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 10,
                        background: dline.bg, color: dline.fg, border: `1px solid ${dline.bd}`,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {dline.label}
                      </span>
                    </div>
                    {t.description ? (
                      <div style={{ fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 8 }}>
                        {t.description}
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 11, color: '#64748b', marginBottom: 10, flexWrap: 'wrap' }}>
                      {t.source ? <span>From: <b style={{ color: NAVY }}>{t.source}</b></span> : null}
                      {t.context ? <span>&middot; {t.context}</span> : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <select
                        value={action}
                        onChange={(e) => setActions(prev => ({ ...prev, [t.id]: e.target.value || undefined }))}
                        style={{
                          fontFamily: F, fontSize: 13, color: NAVY,
                          padding: '8px 10px', borderRadius: 8,
                          border: `1px solid ${action ? TEAL : '#cbd5e1'}`,
                          background: action ? `${TEAL}10` : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {ACTION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setOpenNotes(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                        style={{
                          fontFamily: F, fontSize: 12, fontWeight: 600,
                          padding: '7px 12px', borderRadius: 8,
                          background: 'transparent', border: '1px solid #cbd5e1', color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        {noteOpen ? 'Hide note' : (notes[t.id] ? 'Edit note' : 'Add note')}
                      </button>
                    </div>
                    {noteOpen ? (
                      <textarea
                        value={notes[t.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
                        rows={2}
                        placeholder="Why this action? What is the trade-off?"
                        style={{
                          width: '100%', boxSizing: 'border-box', marginTop: 8,
                          fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
                          padding: 10, borderRadius: 8,
                          border: '1px solid #cbd5e1', background: '#f8fafc',
                          outline: 'none', resize: 'vertical',
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          <SubmitFooter
            actionedCount={orderedTasks.filter(t => actions[t.id]).length}
            total={orderedTasks.length}
            canSubmit={allActioned}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function arrowBtnStyle(disabled) {
  return {
    fontFamily: FM, fontSize: 12, fontWeight: 700,
    width: 28, height: 24, borderRadius: 6,
    background: '#fff', border: '1px solid #cbd5e1',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: 0,
  }
}

function SubmitFooter({ actionedCount, total, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        Actioned <b style={{ color: NAVY }}>{actionedCount}</b> of {total}. Pick an action for every task to move on.
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

function NoTasksFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Tasks payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed task list. Showing the scenario summary below.
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
        onClick={() => onComplete && onComplete({ block_id: 'task-prioritisation', fallback: true, completed_at: new Date().toISOString() })}
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
