'use client'

// Clinical decision queue, healthcare shell.
//
// Receives block_content.decisions[] from the healthcare scenario
// generator. Each decision carries a role-specific title, a clinical
// or care context paragraph, 2 to 4 options with description, a
// constraint or risk, who is affected, and an urgency indicator. The
// candidate picks an option per decision and writes a short clinical
// reasoning. The capture payload feeds the scoring orchestrator in a
// follow-up prompt.
//
// Compliance:
//   - All medication references in the clinical_context use placeholder
//     language ("the prescribed analgesia", "current medication regime").
//   - Urgency colours follow the brand-safe palette: immediate = clay,
//     within_shift = navy, next_24_hours = neutral slate. No red, green,
//     or amber traffic-light tones.
//   - Scoring narratives downstream use "indicators show" / "evidence
//     suggests" patterns, never definitive clinical claims.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['clinical-decision-queue']

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
  immediate:      { label: 'Immediate',         bg: CLAY_TINT, dot: CLAY, fg: '#8a5d24' },
  within_shift:   { label: 'Within shift',      bg: NAVY_TINT, dot: NAVY, fg: NAVY },
  next_24_hours:  { label: 'Next 24 hours',     bg: '#f1f5f9', dot: '#64748b', fg: '#475569' },
}

const REASONING_MIN = 12

export default function ClinicalDecisionQueueBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const decisions = useMemo(
    () => Array.isArray(block_content?.decisions) ? block_content.decisions : [],
    [block_content]
  )

  const [choices, setChoices] = useState({}) // { [decision_id]: { option_id, reasoning, decided_at } }
  const [openTimes, setOpenTimes] = useState({})
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setChoices({})
    setOpenTimes({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions.map(d => d.decision_id).join(',')])

  // Track when each decision was first viewed so the capture payload
  // can carry a deliberation signal.
  useEffect(() => {
    const now = new Date().toISOString()
    setOpenTimes(prev => {
      const next = { ...prev }
      for (const d of decisions) {
        if (!next[d.decision_id]) next[d.decision_id] = now
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions.map(d => d.decision_id).join(',')])

  const setOption = (decisionId, optionId) => {
    setChoices(prev => ({
      ...prev,
      [decisionId]: {
        option_id: optionId,
        reasoning: prev[decisionId]?.reasoning || '',
        decided_at: new Date().toISOString(),
      },
    }))
  }
  const setReasoning = (decisionId, text) => {
    setChoices(prev => ({
      ...prev,
      [decisionId]: {
        option_id: prev[decisionId]?.option_id || null,
        reasoning: text,
        decided_at: prev[decisionId]?.decided_at || null,
      },
    }))
  }

  const completedCount = decisions.filter(d => {
    const c = choices[d.decision_id]
    return c?.option_id && (c?.reasoning || '').trim().length >= REASONING_MIN
  }).length
  const canSubmit = decisions.length > 0 && completedCount === decisions.length

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const payload = decisions.map(d => {
      const c = choices[d.decision_id] || {}
      const opened = openTimes[d.decision_id]
      const decided = c.decided_at
      const time_to_decide = opened && decided
        ? Math.max(0, Math.round((new Date(decided) - new Date(opened)) / 1000))
        : null
      return {
        decision_id: d.decision_id,
        chosen_option: c.option_id || null,
        clinical_reasoning: (c.reasoning || '').trim(),
        time_to_decide_seconds: time_to_decide,
      }
    })
    onComplete && onComplete({
      block_id: 'clinical-decision-queue',
      decisions: payload,
      total_decisions: decisions.length,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Clinical decision queue"
      />

      {decisions.length === 0 ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 16px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
            Make the call on each decision. Pick the option you would actually take and write one or two sentences of clinical reasoning. Submit when every decision has an option and a reason.
          </div>

          <div style={{ maxWidth: 880, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {decisions.map((d, i) => {
              const c = choices[d.decision_id] || {}
              const urg = URGENCY_STYLE[d.urgency_indicator] || URGENCY_STYLE.within_shift
              return (
                <div key={d.decision_id} style={{
                  background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3 }}>
                      Decision {i + 1} of {decisions.length}
                    </span>
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
                  </div>

                  <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, lineHeight: 1.3, margin: '0 0 10px' }}>
                    {d.title}
                  </h3>

                  {d.clinical_context ? (
                    <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.55, margin: '0 0 10px' }}>
                      {d.clinical_context}
                    </p>
                  ) : null}

                  {(d.constraint || d.who_affected) ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      marginBottom: 14, fontFamily: F, fontSize: 13, color: TX2,
                      background: '#f8fafc', border: `1px solid ${BD}`,
                      borderRadius: 8, padding: 10,
                    }}>
                      {d.constraint ? (
                        <div>
                          <span style={fieldLabelStyle}>Constraint</span>
                          {d.constraint}
                        </div>
                      ) : null}
                      {d.who_affected ? (
                        <div>
                          <span style={fieldLabelStyle}>Affects</span>
                          {d.who_affected}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(d.options || []).map(opt => {
                      const selected = c.option_id === opt.option_id
                      return (
                        <button
                          key={opt.option_id}
                          type="button"
                          onClick={() => setOption(d.decision_id, opt.option_id)}
                          style={{
                            display: 'block', textAlign: 'left',
                            padding: '10px 12px', borderRadius: 8,
                            background: selected ? TEAL_TINT : '#fff',
                            border: `1px solid ${selected ? TEAL : BD}`,
                            cursor: 'pointer', fontFamily: F,
                            transition: 'background 0.15s, border-color 0.15s',
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
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, lineHeight: 1.4 }}>
                                {opt.label}
                              </div>
                              {opt.description ? (
                                <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.45, marginTop: 4 }}>
                                  {opt.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div>
                    <div style={{
                      fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                    }}>
                      Clinical reasoning
                    </div>
                    <textarea
                      value={c.reasoning || ''}
                      onChange={(e) => setReasoning(d.decision_id, e.target.value)}
                      rows={2}
                      placeholder="One or two sentences on why this option, what trade-off you accept, and what you would document."
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
                        padding: 10, borderRadius: 8,
                        border: `1px solid ${BD}`, background: '#f8fafc',
                        outline: 'none', resize: 'vertical',
                      }}
                    />
                    <div style={{ marginTop: 4, fontFamily: FM, fontSize: 11, color: TX3 }}>
                      {(c.reasoning || '').trim().length} / {REASONING_MIN} characters minimum
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <SubmitFooter
            answeredCount={completedCount}
            total={decisions.length}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

const fieldLabelStyle = {
  fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginRight: 6,
}

function SubmitFooter({ answeredCount, total, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Decided <b style={{ color: NAVY }}>{answeredCount}</b> of {total}. Each decision needs an option and a reason of at least {REASONING_MIN} characters.
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
        Decisions payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed decisions list. Showing the scenario summary below.
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
          block_id: 'clinical-decision-queue',
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
