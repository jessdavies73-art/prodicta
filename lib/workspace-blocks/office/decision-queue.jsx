'use client'

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['decision-queue']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const PRESSURE_STYLES = {
  minutes:    { label: 'Minutes',    bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  hours:      { label: 'Hours',      bg: '#fff7ed', fg: '#9a3412', bd: '#fdba74' },
  today:      { label: 'Today',      bg: '#fffbeb', fg: '#92400e', bd: '#fcd34d' },
  this_week:  { label: 'This week',  bg: '#f1f5f9', fg: '#475569', bd: '#cbd5e1' },
}

export default function DecisionQueueBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const decisions = useMemo(
    () => Array.isArray(block_content?.decisions) ? block_content.decisions : [],
    [block_content]
  )

  // choices[decision_id] = { option_id, rationale, decided_at }
  const [choices, setChoices] = useState({})
  const [openTimes, setOpenTimes] = useState({})
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setChoices({})
    setOpenTimes({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions.map(d => d.id).join(',')])

  // Track when each decision was first "viewed" so we can compute
  // time_to_decide as a rough deliberation signal.
  useEffect(() => {
    const now = new Date().toISOString()
    setOpenTimes(prev => {
      const next = { ...prev }
      for (const d of decisions) {
        if (!next[d.id]) next[d.id] = now
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions.map(d => d.id).join(',')])

  const setOption = (decisionId, optionId) => {
    setChoices(prev => ({
      ...prev,
      [decisionId]: {
        option_id: optionId,
        rationale: prev[decisionId]?.rationale || '',
        decided_at: new Date().toISOString(),
      },
    }))
  }
  const setRationale = (decisionId, text) => {
    setChoices(prev => ({
      ...prev,
      [decisionId]: {
        option_id: prev[decisionId]?.option_id || null,
        rationale: text,
        decided_at: prev[decisionId]?.decided_at || null,
      },
    }))
  }

  // Submit gates: every decision has an option chosen and a rationale of
  // at least 12 characters (anything shorter is hand-waving).
  const fullyAnsweredCount = decisions.filter(d => {
    const c = choices[d.id]
    return c?.option_id && (c?.rationale || '').trim().length >= 12
  }).length
  const canSubmit = decisions.length > 0 && fullyAnsweredCount === decisions.length

  const handleSubmit = () => {
    const payload = decisions.map(d => {
      const c = choices[d.id] || {}
      const openedAt = openTimes[d.id]
      const decidedAt = c.decided_at
      const timeToDecide = openedAt && decidedAt
        ? Math.max(0, (new Date(decidedAt) - new Date(openedAt)) / 1000)
        : null
      return {
        decision_id: d.id,
        chosen_option: c.option_id || null,
        rationale: (c.rationale || '').trim(),
        time_to_decide_seconds: timeToDecide,
      }
    })
    onComplete && onComplete({
      block_id: 'decision-queue',
      decisions: payload,
      total_decisions: decisions.length,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Decision queue"
      />

      {decisions.length === 0 ? (
        <NoDecisionsFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 760, margin: '0 auto 18px', fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            Make the call on each item. Pick the option you would actually take and write a one or two sentence rationale. Submit when every decision has a choice and a reason.
          </div>

          <div style={{ maxWidth: 760, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {decisions.map((d, i) => {
              const c = choices[d.id] || {}
              const pressure = PRESSURE_STYLES[d.deadline_pressure] || PRESSURE_STYLES.today
              return (
                <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                      Decision {i + 1} of {decisions.length}
                    </span>
                    <span style={{
                      fontFamily: FM, fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 10,
                      background: pressure.bg, color: pressure.fg, border: `1px solid ${pressure.bd}`,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Pressure: {pressure.label}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, lineHeight: 1.3, margin: '0 0 8px' }}>
                    {d.title}
                  </h3>
                  {d.context ? (
                    <p style={{ fontFamily: F, fontSize: 14, color: '#1f2937', lineHeight: 1.55, marginBottom: 8 }}>
                      {d.context}
                    </p>
                  ) : null}
                  {(d.constraint || d.affects) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, fontFamily: F, fontSize: 12, color: '#475569' }}>
                      {d.constraint ? (
                        <div>
                          <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 4 }}>Constraint:</span>
                          {d.constraint}
                        </div>
                      ) : null}
                      {d.affects ? (
                        <div>
                          <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', marginRight: 4 }}>Affects:</span>
                          {d.affects}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(d.options || []).map(opt => {
                      const selected = c.option_id === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setOption(d.id, opt.id)}
                          style={{
                            display: 'block', textAlign: 'left',
                            padding: '10px 12px', borderRadius: 8,
                            background: selected ? `${TEAL}10` : '#fff',
                            border: `1px solid ${selected ? TEAL : '#cbd5e1'}`,
                            cursor: 'pointer', fontFamily: F,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <span style={{
                              flex: '0 0 auto', marginTop: 2,
                              width: 14, height: 14, borderRadius: '50%',
                              border: `2px solid ${selected ? TEAL : '#94a3b8'}`,
                              background: selected ? TEAL : '#fff',
                              boxShadow: selected ? `inset 0 0 0 2px #fff` : 'none',
                            }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.4 }}>
                                {opt.label}
                              </div>
                              {opt.implication ? (
                                <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 3 }}>
                                  {opt.implication}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Your rationale
                    </div>
                    <textarea
                      value={c.rationale || ''}
                      onChange={(e) => setRationale(d.id, e.target.value)}
                      rows={2}
                      placeholder="One or two sentences on why this option, what trade-off you accept."
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
            })}
          </div>

          <SubmitFooter
            answeredCount={fullyAnsweredCount}
            total={decisions.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function SubmitFooter({ answeredCount, total, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        Decided <b style={{ color: NAVY }}>{answeredCount}</b> of {total}. Each decision needs an option and a rationale of at least 12 characters.
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

function NoDecisionsFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Decisions payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed decisions list. Showing the scenario summary below.
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
        onClick={() => onComplete && onComplete({ block_id: 'decision-queue', fallback: true, completed_at: new Date().toISOString() })}
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
