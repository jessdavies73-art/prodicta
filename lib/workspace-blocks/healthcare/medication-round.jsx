'use client'

// Medication round, healthcare shell.
//
// Receives block_content for medication-round from the healthcare
// scenario generator: chart_title, columns, rows, units (placeholder
// only), and a planted_issues ground-truth array. The candidate sees a
// sticky-header table; clicks a row to flag it as a spotted issue;
// chooses an action and adds notes per spotted row; and writes a short
// summary at the bottom ("What's the headline here, what would you do?").
//
// Compliance and clinical safety:
//   - The chart NEVER contains real drug names or doses. The
//     "Medication category" column carries placeholder labels only
//     ("analgesia", "anticoagulant", "diabetic medication", etc.).
//   - planted_issues are clinical-judgement signals (timing,
//     documentation, contraindication concept), not specific clinical
//     advice. The hint field is used only at scoring time and is never
//     surfaced in the candidate UI.
//   - Scoring narratives downstream use "indicators show" / "evidence
//     suggests" patterns, never definitive clinical claims.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['medication-round']

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

const ROW_ACTIONS = [
  { id: 'administer_now',    label: 'Administer missed dose now', help: 'Give now and document the late administration.' },
  { id: 'query_prescriber',  label: 'Query with prescriber',      help: 'Hold and query before going further.' },
  { id: 'escalate_senior',   label: 'Escalate to senior',         help: 'Pass to nurse in charge or pharmacist.' },
  { id: 'document_concern',  label: 'Document concern',           help: 'Record the concern in notes for the next round.' },
]

const SUMMARY_MIN = 20

export default function MedicationRoundBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const chart_title = block_content?.chart_title || 'Medication round'
  const columns = useMemo(
    () => Array.isArray(block_content?.columns) ? block_content.columns : [],
    [block_content]
  )
  const rows = useMemo(
    () => Array.isArray(block_content?.rows) ? block_content.rows : [],
    [block_content]
  )
  const planted_issues = useMemo(
    () => Array.isArray(block_content?.planted_issues) ? block_content.planted_issues : [],
    [block_content]
  )

  const [spotted, setSpotted] = useState({}) // { [row_index]: true }
  const [rowNotes, setRowNotes] = useState({})
  const [rowActions, setRowActions] = useState({})
  const [summary, setSummary] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setSpotted({})
    setRowNotes({})
    setRowActions({})
    setSummary('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, columns.join('|')])

  const toggleSpot = (rowIndex) => {
    setSpotted(prev => {
      const next = { ...prev }
      if (next[rowIndex]) delete next[rowIndex]
      else next[rowIndex] = true
      return next
    })
  }

  const setNote = (rowIndex, text) => {
    setRowNotes(prev => ({ ...prev, [rowIndex]: text }))
  }
  const setAction = (rowIndex, actionId) => {
    setRowActions(prev => ({ ...prev, [rowIndex]: actionId }))
  }

  const spottedIndices = Object.keys(spotted).map(Number).sort((a, b) => a - b)
  const allSpottedHaveAction = spottedIndices.every(i => rowActions[i])
  const summaryReady = summary.trim().length >= SUMMARY_MIN
  const canSubmit = summaryReady && (spottedIndices.length === 0 || allSpottedHaveAction)

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const plantedSet = new Set(planted_issues.map(p => p.row_index))
    const correctly_identified = spottedIndices.filter(i => plantedSet.has(i))
    const false_positives = spottedIndices.filter(i => !plantedSet.has(i))
    const missed = planted_issues
      .map(p => p.row_index)
      .filter(i => !spotted[i])

    onComplete && onComplete({
      block_id: 'medication-round',
      chart_title,
      total_rows: rows.length,
      total_planted_issues: planted_issues.length,
      spotted_rows: spottedIndices,
      row_notes: rowNotes,
      row_actions: rowActions,
      summary_text: summary.trim(),
      anomalies_correctly_identified: correctly_identified,
      anomalies_false_positives: false_positives,
      anomalies_missed: missed,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  // Identify the bed/patient columns for sticky styling on mobile (the
  // first two columns by convention from the schema).
  const stickyCount = columns.length >= 2 ? 2 : 1

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Medication round"
      />

      {(rows.length === 0 || columns.length === 0) ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 1080, margin: '0 auto 12px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
            Read the chart. Click any row that you would not sign off as it stands. For each row you flag, choose what you would do and add a short note. Then write the headline at the bottom: what would you actually do next?
            <span style={{ display: 'block', marginTop: 6, fontFamily: FM, fontSize: 11, color: TX3 }}>
              Placeholder doses only. No real medication names appear in this chart. The simulation tests judgement, not clinical accuracy.
            </span>
          </div>

          <div style={{
            maxWidth: 1080, margin: '0 auto 18px',
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap',
              borderBottom: `1px solid ${BD}`, background: '#fafbfc',
            }}>
              <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY }}>
                {chart_title}
              </div>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {rows.length} rows · {spottedIndices.length} flagged
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                borderCollapse: 'separate',
                borderSpacing: 0,
                width: '100%', minWidth: 720,
                fontFamily: F, fontSize: 13, color: TX,
              }}>
                <thead>
                  <tr>
                    <th style={thStyle({ first: true })} aria-label="Flag">{' '}</th>
                    {columns.map((c, ci) => (
                      <th
                        key={ci}
                        style={thStyle({
                          sticky: ci < stickyCount,
                          last: ci === columns.length - 1,
                        })}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => {
                    const isSpotted = !!spotted[ri]
                    const rowBg = isSpotted ? TEAL_TINT : (ri % 2 === 0 ? '#fff' : '#fafbfc')
                    return (
                      <tr key={ri}
                        onClick={() => toggleSpot(ri)}
                        style={{
                          background: rowBg, cursor: 'pointer',
                          borderTop: `1px solid #eef2f6`,
                        }}
                      >
                        <td style={tdStyle({ first: true, spotted: isSpotted })}>
                          <span aria-hidden="true" style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 6,
                            border: `1.5px solid ${isSpotted ? TEAL : '#cbd5e1'}`,
                            background: isSpotted ? TEAL : '#fff',
                            color: '#fff', fontFamily: FM, fontSize: 13,
                          }}>
                            {isSpotted ? '✓' : ''}
                          </span>
                        </td>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            style={tdStyle({
                              sticky: ci < stickyCount,
                              spotted: isSpotted,
                              last: ci === columns.length - 1,
                              missing: cell === null,
                            })}
                          >
                            {cell === null ? <span style={{ color: TX3, fontStyle: 'italic' }}>—</span> : cell}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {spottedIndices.length > 0 ? (
            <div style={{
              maxWidth: 1080, margin: '0 auto 18px',
              background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Notes on flagged rows
              </div>
              {spottedIndices.map(ri => {
                const row = rows[ri] || []
                const action = rowActions[ri]
                const note = rowNotes[ri] || ''
                return (
                  <div key={ri} style={{
                    background: '#fafbfc', border: `1px solid ${BD}`, borderRadius: 8,
                    padding: 12,
                  }}>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
                      Row {ri + 1}: {(row[0] ?? '—')}{row[1] ? ` · ${row[1]}` : ''}{row[2] ? ` · ${row[2]}` : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {ROW_ACTIONS.map(a => {
                        const selected = action === a.id
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setAction(ri, a.id)}
                            title={a.help}
                            style={{
                              fontFamily: F, fontSize: 12.5, fontWeight: 700,
                              padding: '6px 10px', borderRadius: 999,
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
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(ri, e.target.value)}
                      placeholder="What is the issue, in your words?"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontFamily: F, fontSize: 13, color: NAVY,
                        padding: '8px 10px', borderRadius: 8,
                        border: `1px solid ${BD}`, background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          ) : null}

          <div style={{
            maxWidth: 1080, margin: '0 auto 18px',
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
            padding: 16,
          }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Headline summary
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="What is the headline here, and what would you do next? Two or three sentences."
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.55,
                padding: 10, borderRadius: 8,
                border: `1px solid ${BD}`, background: '#f8fafc',
                outline: 'none', resize: 'vertical',
              }}
            />
            <div style={{ marginTop: 6, fontFamily: FM, fontSize: 11, color: TX3 }}>
              {summary.trim().length} / {SUMMARY_MIN} characters minimum
            </div>
          </div>

          <SubmitFooter
            spottedCount={spottedIndices.length}
            spottedWithAction={spottedIndices.filter(i => rowActions[i]).length}
            summaryReady={summaryReady}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function thStyle({ first = false, sticky = false, last = false } = {}) {
  return {
    position: 'sticky', top: 0,
    background: '#f1f5f9', color: TX2,
    fontFamily: FM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `1px solid ${BD}`,
    whiteSpace: 'nowrap',
    width: first ? 38 : undefined,
    left: sticky ? 0 : undefined,
    zIndex: sticky ? 2 : 1,
  }
}

function tdStyle({ first = false, sticky = false, spotted = false, last = false, missing = false } = {}) {
  const base = {
    padding: '10px 12px',
    verticalAlign: 'top',
    fontFamily: F, fontSize: 13.5, color: NAVY,
    background: spotted ? TEAL_TINT : 'inherit',
    whiteSpace: missing ? 'nowrap' : 'normal',
  }
  if (first) {
    base.width = 38
    base.textAlign = 'center'
    base.padding = '8px 6px'
  }
  if (sticky) {
    base.position = 'sticky'
    base.left = first ? 0 : undefined
    base.background = spotted ? TEAL_TINT : '#fff'
    base.zIndex = 1
  }
  return base
}

function SubmitFooter({ spottedCount, spottedWithAction, summaryReady, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Flagged <b style={{ color: NAVY }}>{spottedCount}</b> row{spottedCount === 1 ? '' : 's'} ({spottedWithAction} with an action chosen). Summary {summaryReady ? 'ready' : 'still needs more'}.
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
        Medication chart payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed chart. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'medication-round',
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
