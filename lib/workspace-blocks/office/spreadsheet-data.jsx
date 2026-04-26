'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['spreadsheet-data']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

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

function cellKey(r, c) { return `${r}:${c}` }

function formatCell(value, units) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') {
    if (units === '£') return `£${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}`
    if (units === '%') return `${value}%`
    return value.toLocaleString('en-GB', { maximumFractionDigits: 2 })
  }
  return String(value)
}

export default function SpreadsheetDataBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  const tableTitle = (block_content?.table_title || '').trim()
  const units = (block_content?.units || '').trim()
  const columns = useMemo(
    () => Array.isArray(block_content?.columns) ? block_content.columns : [],
    [block_content]
  )
  const rows = useMemo(
    () => Array.isArray(block_content?.rows) ? block_content.rows : [],
    [block_content]
  )

  const startedAtRef = useRef(new Date().toISOString())
  const [highlights, setHighlights] = useState({}) // key -> true
  const [notes, setNotes] = useState({})           // key -> string
  const [summary, setSummary] = useState('')

  // Reset on a new dataset.
  const tableSig = `${tableTitle}|${columns.join('|')}|${rows.length}`
  useEffect(() => {
    setHighlights({})
    setNotes({})
    setSummary('')
    startedAtRef.current = new Date().toISOString()
  }, [tableSig])

  const toggleCell = (r, c) => {
    if (c === 0) return // first column is the row label, not a metric
    const key = cellKey(r, c)
    setHighlights(prev => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = true
      }
      return next
    })
    if (highlights[key]) {
      // unhighlighting clears the note too
      setNotes(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const setNote = (key, value) => {
    setNotes(prev => ({ ...prev, [key]: value }))
  }

  const highlightedKeys = Object.keys(highlights)
  const summaryOk = summary.trim().length >= 30
  const canSubmit = rows.length > 0 && summaryOk

  const handleSubmit = () => {
    const cellArray = highlightedKeys.map(k => {
      const [rs, cs] = k.split(':')
      const r = Number(rs), c = Number(cs)
      return {
        row_index: r,
        col_index: c,
        row_label: rows[r]?.[0] ?? null,
        column_label: columns[c] ?? null,
        value: rows[r]?.[c] ?? null,
        note: (notes[k] || '').trim(),
      }
    })
    onComplete && onComplete({
      block_id: 'spreadsheet-data',
      highlighted_cells: cellArray,
      cell_notes: notes,
      summary_text: summary.trim(),
      total_highlights: highlightedKeys.length,
      started_at: startedAtRef.current,
      completed_at: new Date().toISOString(),
    })
  }

  if (rows.length === 0 || columns.length === 0) {
    return (
      <div style={{ fontFamily: F }}>
        <BlockScenarioHeader
          scenario_context={scenario_context}
          block_content={block_content}
          blockName="Spreadsheet and data"
        />
        <NoDataFallback block_content={block_content} onComplete={handleSubmit} />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Spreadsheet and data"
      />

      <div style={{
        maxWidth: 1080, margin: '0 auto 18px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 2fr) minmax(280px, 1fr)',
        gap: 16,
      }}>
        {/* Table panel */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#FAF9F4' }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {units ? `Units: ${units}` : 'Data'}
            </div>
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>
              {tableTitle || 'Data table'}
            </div>
            <div style={{ marginTop: 6, fontFamily: F, fontSize: 12, color: '#64748b' }}>
              Click any cell to highlight it. Click again to remove. Add a note in the side panel for each highlight.
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: isMobile ? 'none' : 520, overflowY: isMobile ? 'visible' : 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              fontFamily: F, fontSize: 13, color: NAVY,
              minWidth: 560,
            }}>
              <thead>
                <tr>
                  {columns.map((col, ci) => (
                    <th key={ci} style={{
                      position: 'sticky', top: 0, zIndex: 1,
                      background: '#f1f5f9', borderBottom: '1px solid #cbd5e1',
                      padding: '10px 12px', textAlign: ci === 0 ? 'left' : 'right',
                      fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    {row.map((cell, ci) => {
                      const key = cellKey(ri, ci)
                      const isLabel = ci === 0
                      const highlighted = highlights[key]
                      return (
                        <td
                          key={ci}
                          onClick={() => toggleCell(ri, ci)}
                          style={{
                            padding: '9px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            textAlign: isLabel ? 'left' : 'right',
                            fontFamily: isLabel ? F : FM,
                            fontSize: isLabel ? 13 : 13,
                            fontWeight: isLabel ? 600 : 500,
                            color: NAVY,
                            background: highlighted ? `${TEAL}1f` : 'transparent',
                            boxShadow: highlighted ? `inset 0 0 0 2px ${TEAL}` : 'none',
                            cursor: isLabel ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'background 120ms ease',
                          }}
                        >
                          {formatCell(cell, units)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes sidebar */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Notes on highlighted cells
          </div>
          {highlightedKeys.length === 0 ? (
            <div style={{ fontFamily: F, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              No cells highlighted yet. Click a value in the table to mark it for attention.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {highlightedKeys.map(k => {
                const [rs, cs] = k.split(':')
                const r = Number(rs), c = Number(cs)
                const rowLabel = rows[r]?.[0] ?? `Row ${r + 1}`
                const colLabel = columns[c] ?? `Col ${c + 1}`
                const cellValue = rows[r]?.[c]
                return (
                  <div key={k} style={{ background: `${TEAL}0d`, border: `1px solid ${TEAL}55`, borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>
                        {rowLabel} <span style={{ color: '#475569', fontWeight: 600 }}>&middot; {colLabel}</span>
                      </div>
                      <div style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: NAVY }}>
                        {formatCell(cellValue, units)}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={notes[k] || ''}
                      onChange={(e) => setNote(k, e.target.value)}
                      placeholder="What stands out about this cell?"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontFamily: F, fontSize: 13, color: NAVY,
                        padding: '7px 10px', borderRadius: 6,
                        border: '1px solid #cbd5e1', background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ maxWidth: 1080, margin: '0 auto 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            What is the headline here, and what would you do?
          </div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="One paragraph. Name the signal you have spotted, what it points to, and your next action."
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.55,
              padding: 12, borderRadius: 8,
              border: '1px solid #cbd5e1', background: '#f8fafc',
              outline: 'none', resize: 'vertical', minHeight: 96,
            }}
          />
        </div>
      </div>

      <SubmitFooter
        highlightCount={highlightedKeys.length}
        summaryOk={summaryOk}
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function SubmitFooter({ highlightCount, summaryOk, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        Highlighted <b style={{ color: NAVY }}>{highlightCount}</b> cell{highlightCount === 1 ? '' : 's'}.
        {' '}{summaryOk ? 'Summary captured.' : 'Add a 30+ character summary to submit.'}
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
        Submit analysis
      </button>
    </div>
  )
}

function NoDataFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Data payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        This scenario was generated before the typed table payload shipped. Re-generate the workspace_scenario to populate the data. Showing the scenario summary below.
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
        onClick={() => onComplete && onComplete({ block_id: 'spreadsheet-data', fallback: true, completed_at: new Date().toISOString() })}
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
