'use client'

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['calendar-planning']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const DAY_START_MIN = 8 * 60   // 08:00
const DAY_END_MIN = 18 * 60    // 18:00

function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}
function toHHMM(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Build the day's timeline: ordered list of slot rows of either kind:
//   { kind: 'meeting', meeting }
//   { kind: 'gap', id, start, end, durationMin }
// Gaps fill any space between meetings within the working day.
function buildTimeline(meetings) {
  const rows = []
  const sorted = (meetings || [])
    .map(m => ({ ...m, _start: toMinutes(m.start), _end: toMinutes(m.end) }))
    .filter(m => m._start != null && m._end != null && m._end > m._start)
    .sort((a, b) => a._start - b._start)

  let cursor = DAY_START_MIN
  let gapIdx = 1
  for (const m of sorted) {
    const mStart = Math.max(m._start, DAY_START_MIN)
    const mEnd = Math.min(m._end, DAY_END_MIN)
    if (mStart > cursor) {
      rows.push({
        kind: 'gap',
        id: `gap-${gapIdx++}`,
        start: toHHMM(cursor),
        end: toHHMM(mStart),
        durationMin: mStart - cursor,
      })
    }
    rows.push({ kind: 'meeting', meeting: { ...m, start: toHHMM(mStart), end: toHHMM(mEnd) } })
    cursor = Math.max(cursor, mEnd)
  }
  if (cursor < DAY_END_MIN) {
    rows.push({
      kind: 'gap',
      id: `gap-${gapIdx++}`,
      start: toHHMM(cursor),
      end: toHHMM(DAY_END_MIN),
      durationMin: DAY_END_MIN - cursor,
    })
  }
  return rows
}

function useIsMobile(threshold = 760) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(typeof window !== 'undefined' && window.innerWidth < threshold)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [threshold])
  return mobile
}

export default function CalendarPlanningBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  const meetings = useMemo(
    () => Array.isArray(block_content?.fixed_meetings) ? block_content.fixed_meetings : [],
    [block_content]
  )
  const todos = useMemo(
    () => Array.isArray(block_content?.todos) ? block_content.todos : [],
    [block_content]
  )

  const timeline = useMemo(() => buildTimeline(meetings), [meetings])
  const gapRows = timeline.filter(r => r.kind === 'gap')

  // gap_plans: gap.id -> { todo_id?, free_text? }
  const [gapPlans, setGapPlans] = useState({})
  // declined_meetings: meeting.id -> { reason }
  const [declined, setDeclined] = useState({})
  const [reasoning, setReasoning] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  // Reset state when underlying scenario data changes.
  useEffect(() => {
    setGapPlans({})
    setDeclined({})
    setReasoning('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings.map(m => m.id).join(','), todos.map(t => t.id).join(',')])

  // todo.id -> gap.id reverse index so the todo list can show where each
  // todo has been parked (and so the candidate can't put one todo in two
  // gaps).
  const todoAssignments = useMemo(() => {
    const out = {}
    for (const [gapId, plan] of Object.entries(gapPlans)) {
      if (plan?.todo_id) out[plan.todo_id] = gapId
    }
    return out
  }, [gapPlans])

  const filledGapCount = Object.values(gapPlans).filter(p =>
    (p?.todo_id) || ((p?.free_text || '').trim().length >= 4)
  ).length

  const canSubmit = filledGapCount >= Math.min(2, gapRows.length)

  const setGapTodo = (gapId, todoId) => {
    setGapPlans(prev => {
      // If candidate picks the same todo elsewhere, clear the previous slot.
      const next = { ...prev }
      for (const [gid, plan] of Object.entries(next)) {
        if (plan?.todo_id === todoId && gid !== gapId) {
          next[gid] = { ...plan, todo_id: undefined }
        }
      }
      next[gapId] = { ...(next[gapId] || {}), todo_id: todoId || undefined }
      return next
    })
  }
  const setGapText = (gapId, text) => {
    setGapPlans(prev => ({ ...prev, [gapId]: { ...(prev[gapId] || {}), free_text: text } }))
  }

  const toggleDecline = (meetingId) => {
    setDeclined(prev => {
      const next = { ...prev }
      if (next[meetingId]) delete next[meetingId]
      else next[meetingId] = { reason: '' }
      return next
    })
  }
  const setDeclineReason = (meetingId, reason) => {
    setDeclined(prev => ({ ...prev, [meetingId]: { ...(prev[meetingId] || {}), reason } }))
  }

  const handleSubmit = () => {
    onComplete && onComplete({
      block_id: 'calendar-planning',
      gap_plans: gapPlans,
      declined_meetings: Object.entries(declined).map(([id, v]) => ({ meeting_id: id, reason: v.reason || '' })),
      reasoning,
      total_gaps: gapRows.length,
      filled_gaps: filledGapCount,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Calendar planning"
      />

      {meetings.length === 0 && todos.length === 0 ? (
        <NoCalendarFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{
            maxWidth: 980, margin: '0 auto 18px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(360px, 1.4fr) minmax(280px, 1fr)',
            gap: 14,
          }}>
            <Timeline
              timeline={timeline}
              todos={todos}
              gapPlans={gapPlans}
              declined={declined}
              todoAssignments={todoAssignments}
              onGapTodo={setGapTodo}
              onGapText={setGapText}
              onToggleDecline={toggleDecline}
              onDeclineReason={setDeclineReason}
            />
            <SidePanel
              todos={todos}
              todoAssignments={todoAssignments}
              reasoning={reasoning}
              onReasoning={setReasoning}
            />
          </div>

          <SubmitFooter
            filledGapCount={filledGapCount}
            totalGaps={gapRows.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function Timeline({ timeline, todos, gapPlans, declined, todoAssignments, onGapTodo, onGapText, onToggleDecline, onDeclineReason }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Monday 08:00 - 18:00
      </div>
      <div>
        {timeline.map((row, i) => row.kind === 'meeting' ? (
          <MeetingRow
            key={`m-${row.meeting.id}-${i}`}
            meeting={row.meeting}
            declined={!!declined[row.meeting.id]}
            declineReason={declined[row.meeting.id]?.reason || ''}
            onToggle={() => onToggleDecline(row.meeting.id)}
            onReason={(text) => onDeclineReason(row.meeting.id, text)}
          />
        ) : (
          <GapRow
            key={`g-${row.id}`}
            gap={row}
            todos={todos}
            plan={gapPlans[row.id]}
            todoAssignments={todoAssignments}
            onGapTodo={onGapTodo}
            onGapText={onGapText}
          />
        ))}
      </div>
    </div>
  )
}

function MeetingRow({ meeting, declined, declineReason, onToggle, onReason }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderBottom: '1px solid #f1f5f9',
      background: declined ? '#fef2f2' : `${TEAL}06`,
      borderLeft: `3px solid ${declined ? '#fecaca' : TEAL}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: declined ? '#b91c1c' : NAVY }}>
          {meeting.start} - {meeting.end}
        </span>
        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: declined ? '#b91c1c' : NAVY, flex: 1, lineHeight: 1.3, textDecoration: declined ? 'line-through' : 'none' }}>
          {meeting.title}
        </span>
        {meeting.can_decline ? (
          <button
            type="button"
            onClick={onToggle}
            style={{
              fontFamily: F, fontSize: 11, fontWeight: 700,
              padding: '4px 10px', borderRadius: 6,
              background: declined ? '#b91c1c' : 'transparent',
              border: `1px solid ${declined ? '#b91c1c' : '#cbd5e1'}`,
              color: declined ? '#fff' : '#475569',
              cursor: 'pointer',
            }}
          >
            {declined ? 'Restore' : 'Decline / shorten'}
          </button>
        ) : null}
      </div>
      {meeting.with ? (
        <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', marginTop: 2 }}>
          With {meeting.with}
        </div>
      ) : null}
      {declined ? (
        <textarea
          value={declineReason}
          onChange={(e) => onReason(e.target.value)}
          rows={2}
          placeholder="Why are you declining or shortening this meeting?"
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 8,
            fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
            padding: 8, borderRadius: 6,
            border: '1px solid #fecaca', background: '#fff',
            outline: 'none', resize: 'vertical',
          }}
        />
      ) : null}
    </div>
  )
}

function GapRow({ gap, todos, plan, todoAssignments, onGapTodo, onGapText }) {
  const minutesLabel = gap.durationMin >= 60
    ? `${Math.floor(gap.durationMin / 60)}h${gap.durationMin % 60 ? ` ${gap.durationMin % 60}m` : ''}`
    : `${gap.durationMin}m`
  const selectedTodoId = plan?.todo_id || ''
  const freeText = plan?.free_text || ''
  // Hide already-assigned-to-other-gap todos from this dropdown unless this gap owns it.
  const availableTodos = todos.filter(t => !todoAssignments[t.id] || todoAssignments[t.id] === gap.id)
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
          {gap.start} - {gap.end}
        </span>
        <span style={{ fontFamily: FM, fontSize: 11, color: '#94a3b8' }}>
          ({minutesLabel} free)
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <select
          value={selectedTodoId}
          onChange={(e) => onGapTodo(gap.id, e.target.value)}
          style={{
            fontFamily: F, fontSize: 13, color: NAVY,
            padding: '6px 8px', borderRadius: 6,
            border: `1px solid ${selectedTodoId ? TEAL : '#cbd5e1'}`,
            background: selectedTodoId ? `${TEAL}10` : '#fff',
            cursor: 'pointer',
            flex: '0 1 auto',
          }}
        >
          <option value="">Park a todo here...</option>
          {availableTodos.map(t => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.estimated_minutes}m)
            </option>
          ))}
        </select>
        <span style={{ fontFamily: F, fontSize: 12, color: '#94a3b8' }}>or</span>
        <input
          type="text"
          value={freeText}
          onChange={(e) => onGapText(gap.id, e.target.value)}
          placeholder="...write what you'd do here"
          style={{
            flex: 1, minWidth: 200,
            fontFamily: F, fontSize: 13, color: NAVY,
            padding: '7px 10px', borderRadius: 6,
            border: '1px solid #cbd5e1', background: '#fff',
            outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function SidePanel({ todos, todoAssignments, reasoning, onReasoning }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          What you need to deliver today
        </div>
        <div>
          {todos.length === 0 ? (
            <div style={{ padding: 14, fontFamily: F, fontSize: 13, color: '#64748b' }}>
              No structured todos provided.
            </div>
          ) : todos.map(t => {
            const parkedAt = todoAssignments[t.id]
            return (
              <div key={t.id} style={{
                padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                background: parkedAt ? `${TEAL}08` : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, flex: 1, lineHeight: 1.3 }}>
                    {t.title}
                  </div>
                  <span style={{ fontFamily: FM, fontSize: 11, color: '#64748b' }}>
                    ~{t.estimated_minutes}m
                  </span>
                </div>
                {t.description ? (
                  <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 3 }}>
                    {t.description}
                  </div>
                ) : null}
                {parkedAt ? (
                  <div style={{ fontFamily: FM, fontSize: 11, color: TEAL, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Parked in {parkedAt}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
        <div style={{
          fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
        }}>
          Day shape (optional)
        </div>
        <textarea
          value={reasoning}
          onChange={(e) => onReasoning(e.target.value)}
          rows={4}
          placeholder="What's the shape of your day? Why did you push or shorten anything?"
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
            padding: 10, borderRadius: 8,
            border: '1px solid #cbd5e1', background: '#f8fafc',
            outline: 'none', resize: 'vertical',
          }}
        />
      </div>
    </div>
  )
}

function SubmitFooter({ filledGapCount, totalGaps, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        Planned <b style={{ color: NAVY }}>{filledGapCount}</b> of {totalGaps} gaps. Park a todo or write a plan into at least 2 gaps to move on.
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

function NoCalendarFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Calendar payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate fixed_meetings and todos. Showing the scenario summary below.
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
        onClick={() => onComplete && onComplete({ block_id: 'calendar-planning', fallback: true, completed_at: new Date().toISOString() })}
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
