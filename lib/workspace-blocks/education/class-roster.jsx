'use client'

// Class Roster, education shell.
//
// Receives block_content.pupils[] from the education scenario generator.
// Each pupil entry carries an anonymised first name, year group / class,
// SEN / EAL / FSM / PP / EHCP flags, an optional behaviour note, an
// attendance pattern, an attainment band, and a priority signal that
// drives the row tint.
//
// The candidate works through four structured outputs:
//   1. Top three pupils needing immediate attention (ranked, with reasons)
//   2. First-week priorities for the class or cohort (textarea)
//   3. Safeguarding flags noticed in the roster (multi-select + notes)
//   4. One differentiation strategy (textarea)
//
// Scoring uses the priority_signal ground truth, the candidate's chosen
// three priorities, the safeguarding flagging, and the quality of the
// written priorities and differentiation strategy. The capture payload
// is consumed by the per-block scorer in the next prompt.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['class-roster']

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

const PRIORITY_STYLE = {
  immediate: { label: 'Immediate', bg: CLAY_TINT, dot: CLAY, fg: '#8a5d24' },
  monitor:   { label: 'Monitor',   bg: NAVY_TINT, dot: NAVY, fg: NAVY },
  routine:   { label: 'Routine',   bg: TEAL_TINT, dot: TEAL, fg: '#0e6e63' },
}

const FLAG_STYLE = {
  EHCP:          { fg: '#7c2d12', bg: '#fde68a' },
  'SEN support': { fg: '#7c2d12', bg: '#fef3c7' },
  EAL:           { fg: '#1e40af', bg: '#dbeafe' },
  FSM:           { fg: '#3730a3', bg: '#e0e7ff' },
  PP:            { fg: '#3730a3', bg: '#ede9fe' },
  LAC:           { fg: '#9d174d', bg: '#fce7f3' },
  YC:            { fg: '#065f46', bg: '#d1fae5' },
}

const ATTAINMENT_LABEL = {
  above:                 'Above ARE',
  at:                    'At ARE',
  working_towards:       'Working towards ARE',
  below_age_related:     'Below ARE',
}

const SAFEGUARDING_OPTIONS = [
  { id: 'attendance_pattern',     label: 'Attendance pattern of concern' },
  { id: 'behaviour_change',       label: 'Recent behaviour change' },
  { id: 'home_circumstances',     label: 'Home circumstances flagged' },
  { id: 'pupil_disclosure',       label: 'Pupil has disclosed something' },
  { id: 'unexplained_absence',    label: 'Unexplained absence' },
  { id: 'sibling_known_to_ss',    label: 'Sibling known to social care' },
  { id: 'no_safeguarding_flag',   label: 'No safeguarding flag at this point' },
]

const PRIORITY_SLOTS = 3
const PRIORITIES_NOTE_MIN = 60
const DIFFERENTIATION_MIN = 60

export default function ClassRosterBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const pupils = useMemo(
    () => Array.isArray(block_content?.pupils) ? block_content.pupils : [],
    [block_content]
  )
  const rosterLabel = block_content?.roster_label || ''
  const rosterContext = block_content?.roster_context || ''

  const [selectedPriorities, setSelectedPriorities] = useState([]) // [{pupil_id, reason}]
  const [firstWeekPriorities, setFirstWeekPriorities] = useState('')
  const [safeguardingFlags, setSafeguardingFlags] = useState({})
  const [safeguardingNotes, setSafeguardingNotes] = useState('')
  const [differentiationStrategy, setDifferentiationStrategy] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setSelectedPriorities([])
    setFirstWeekPriorities('')
    setSafeguardingFlags({})
    setSafeguardingNotes('')
    setDifferentiationStrategy('')
  }, [pupils.map(p => p.pupil_id).join(',')])

  const togglePriority = (pupilId) => {
    setSelectedPriorities(prev => {
      const existing = prev.find(p => p.pupil_id === pupilId)
      if (existing) return prev.filter(p => p.pupil_id !== pupilId)
      if (prev.length >= PRIORITY_SLOTS) return prev
      return [...prev, { pupil_id: pupilId, reason: '' }]
    })
  }
  const setPriorityReason = (pupilId, text) => {
    setSelectedPriorities(prev => prev.map(p =>
      p.pupil_id === pupilId ? { ...p, reason: text } : p
    ))
  }
  const toggleSafeguardingFlag = (id) => {
    setSafeguardingFlags(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      // 'no_safeguarding_flag' is mutually exclusive with the others.
      if (id === 'no_safeguarding_flag' && next[id]) {
        for (const k of Object.keys(next)) if (k !== 'no_safeguarding_flag') delete next[k]
      } else if (id !== 'no_safeguarding_flag' && next[id]) {
        delete next['no_safeguarding_flag']
      }
      return next
    })
  }

  const safeguardingList = Object.keys(safeguardingFlags)
  const prioritiesReady = selectedPriorities.length === PRIORITY_SLOTS
    && selectedPriorities.every(p => p.reason.trim().length >= 12)
  const firstWeekReady = firstWeekPriorities.trim().length >= PRIORITIES_NOTE_MIN
  const safeguardingReady = safeguardingList.length >= 1
  const differentiationReady = differentiationStrategy.trim().length >= DIFFERENTIATION_MIN
  const canSubmit = pupils.length > 0
    && prioritiesReady
    && firstWeekReady
    && safeguardingReady
    && differentiationReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'class-roster',
      priority_pupils: selectedPriorities.map((p, i) => ({
        pupil_id: p.pupil_id,
        rank: i + 1,
        reason: p.reason.trim(),
      })),
      first_week_priorities: firstWeekPriorities.trim(),
      safeguarding_flags: safeguardingList,
      safeguarding_notes: safeguardingNotes.trim(),
      differentiation_strategy: differentiationStrategy.trim(),
      total_pupils_in_roster: pupils.length,
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
        blockName="Class roster"
      />

      {pupils.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 980, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            Read the roster. Pick the three pupils who need your immediate attention, write a one-line reason for each. Then outline your first-week priorities, flag any safeguarding signals, and plan one differentiation strategy.
          </div>

          {(rosterLabel || rosterContext) ? (
            <div style={{
              maxWidth: 980, margin: '0 auto 14px',
              background: '#fff', border: `1px solid ${BD}`, borderLeft: `4px solid ${TEAL}`,
              borderRadius: 10, padding: 14,
            }}>
              {rosterLabel ? (
                <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                  {rosterLabel}
                </div>
              ) : null}
              {rosterContext ? (
                <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
                  {rosterContext}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Roster table */}
          <div style={{
            maxWidth: 980, margin: '0 auto 18px',
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1.2fr 0.7fr 1.4fr 0.8fr 0.8fr 0.7fr',
              padding: '10px 14px', background: '#f8fafc', borderBottom: `1px solid ${BD}`,
              fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <div>Pick</div>
              <div>Pupil</div>
              <div>Year</div>
              <div>Flags &amp; notes</div>
              <div>Attendance</div>
              <div>Attainment</div>
              <div>Priority</div>
            </div>
            {pupils.map(p => {
              const picked = selectedPriorities.find(s => s.pupil_id === p.pupil_id)
              const rank = picked ? selectedPriorities.findIndex(s => s.pupil_id === p.pupil_id) + 1 : null
              const priority = PRIORITY_STYLE[p.priority_signal] || PRIORITY_STYLE.routine
              return (
                <div key={p.pupil_id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1.2fr 0.7fr 1.4fr 0.8fr 0.8fr 0.7fr',
                  alignItems: 'start', gap: 8,
                  padding: '12px 14px',
                  borderBottom: `1px solid ${BD}`,
                  background: picked ? TEAL_TINT : '#fff',
                  fontFamily: F, fontSize: 13, color: NAVY,
                }}>
                  <div>
                    <button
                      type="button"
                      onClick={() => togglePriority(p.pupil_id)}
                      disabled={!picked && selectedPriorities.length >= PRIORITY_SLOTS}
                      title={picked ? 'Remove from priorities' : 'Mark as priority'}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1.5px solid ${picked ? TEAL : BD}`,
                        background: picked ? TEAL : '#fff',
                        color: picked ? '#fff' : TX3,
                        fontFamily: FM, fontSize: 12, fontWeight: 700,
                        cursor: (!picked && selectedPriorities.length >= PRIORITY_SLOTS) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {picked ? rank : '+'}
                    </button>
                  </div>
                  <div style={{ fontWeight: 700 }}>{p.anonymised_name}</div>
                  <div style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{p.year_group_or_class}</div>
                  <div>
                    {p.flags?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: p.behaviour_note ? 6 : 0 }}>
                        {p.flags.map(f => {
                          const fs = FLAG_STYLE[f] || { fg: NAVY, bg: '#f1f5f9' }
                          return (
                            <span key={f} style={{
                              fontFamily: FM, fontSize: 10, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 999,
                              background: fs.bg, color: fs.fg,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {f}
                            </span>
                          )
                        })}
                      </div>
                    ) : null}
                    {p.behaviour_note ? (
                      <div style={{ fontFamily: F, fontSize: 12, color: TX2, lineHeight: 1.4 }}>
                        {p.behaviour_note}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{p.attendance_pattern}</div>
                  <div style={{ fontFamily: F, fontSize: 12, color: TX2 }}>
                    {ATTAINMENT_LABEL[p.attainment_band] || p.attainment_band}
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: priority.bg, color: priority.fg,
                      fontFamily: FM, fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 999,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: priority.dot }} />
                      {priority.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 1. Priority pupils with reasons */}
          <Section
            number={1}
            title="Three pupils needing your immediate attention"
            hint={`Pick three from the roster (use the + buttons), then write a short reason for each. Patterns suggest the strongest call here is the one that names the actual indicator.`}
            status={prioritiesReady ? 'ready' : 'incomplete'}
            counter={`${selectedPriorities.length} / ${PRIORITY_SLOTS}`}
          >
            {selectedPriorities.length === 0 ? (
              <div style={{ fontFamily: F, fontSize: 13, color: TX3, fontStyle: 'italic' }}>
                Use the pick buttons in the roster to choose three pupils.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedPriorities.map((sel, i) => {
                  const pupil = pupils.find(p => p.pupil_id === sel.pupil_id)
                  return (
                    <div key={sel.pupil_id} style={{
                      background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>Priority {i + 1}</span>
                        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
                          {pupil?.anonymised_name || sel.pupil_id}
                        </span>
                        {pupil?.year_group_or_class ? (
                          <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>{pupil.year_group_or_class}</span>
                        ) : null}
                      </div>
                      <input
                        type="text"
                        value={sel.reason}
                        onChange={(e) => setPriorityReason(sel.pupil_id, e.target.value)}
                        placeholder="One line on why this pupil tops the list."
                        style={inputStyle}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* 2. First-week priorities */}
          <Section
            number={2}
            title="Your first-week priorities for this class or cohort"
            hint={`Two or three sentences naming what you would actually do this week. Minimum ${PRIORITIES_NOTE_MIN} characters.`}
            status={firstWeekReady ? 'ready' : 'incomplete'}
            counter={`${firstWeekPriorities.trim().length} / ${PRIORITIES_NOTE_MIN}`}
          >
            <textarea
              value={firstWeekPriorities}
              onChange={(e) => setFirstWeekPriorities(e.target.value)}
              rows={3}
              placeholder="Name the actions, the named pupils or sub-groups, and what you would have nailed by Friday."
              style={textareaStyle}
            />
          </Section>

          {/* 3. Safeguarding flags */}
          <Section
            number={3}
            title="Safeguarding signals you would raise"
            hint="Tick anything you would raise with the DSL or pastoral lead. Add a short note if helpful."
            status={safeguardingReady ? 'ready' : 'incomplete'}
          >
            <CheckboxGrid
              options={SAFEGUARDING_OPTIONS}
              selectedMap={safeguardingFlags}
              onToggle={toggleSafeguardingFlag}
            />
            <input
              type="text"
              value={safeguardingNotes}
              onChange={(e) => setSafeguardingNotes(e.target.value)}
              placeholder="Optional note: any specific pupil or pattern you would raise."
              style={inputStyle}
            />
          </Section>

          {/* 4. Differentiation strategy */}
          <Section
            number={4}
            title="One differentiation strategy you would use this week"
            hint={`Two or three sentences. Make it specific to a named pupil or sub-group on this roster. Minimum ${DIFFERENTIATION_MIN} characters.`}
            status={differentiationReady ? 'ready' : 'incomplete'}
            counter={`${differentiationStrategy.trim().length} / ${DIFFERENTIATION_MIN}`}
          >
            <textarea
              value={differentiationStrategy}
              onChange={(e) => setDifferentiationStrategy(e.target.value)}
              rows={3}
              placeholder="Name the strategy, who it serves, and how you would know it landed."
              style={textareaStyle}
            />
          </Section>

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
      maxWidth: 980, margin: '0 auto', padding: 16,
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
        Roster payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed pupils list. Showing the scenario summary below.
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
          block_id: 'class-roster',
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
