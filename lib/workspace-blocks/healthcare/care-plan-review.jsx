'use client'

// Care plan review, healthcare shell.
//
// Receives an existing care plan document (block_content.document_text) of
// 400 to 800 words plus document_type, document_metadata, and a
// planted_issues ground-truth array. The candidate reads the plan in a
// parchment-tinted document panel on the left and writes their response
// in the panel on the right: three short concerns spotted, recommended
// changes, a documentation entry showing how they would update the
// care plan record, and one question for the multidisciplinary team.
//
// Compliance:
//   - Document_text uses placeholder language only — no real drug names
//     or doses.
//   - planted_issues are clinical-judgement signals (governance,
//     documentation, family-wish, review-overdue) not specific clinical
//     advice. The hint field is used at scoring time and is never
//     surfaced in the candidate UI.
//   - Scoring narratives downstream use "indicators show" / "evidence
//     suggests" patterns, never definitive clinical claims.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['care-plan-review']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const PARCHMENT = '#FAEFD9'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const CONCERNS_REQUIRED = 3
const CONCERN_MIN = 8
const CHANGES_MIN = 30
const DOC_MIN = 30
const QUESTION_MIN = 8

export default function CarePlanReviewBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const document_type = block_content?.document_type || 'Care plan'
  const document_text = block_content?.document_text || ''
  const meta = block_content?.document_metadata || {}

  const [concerns, setConcerns] = useState(['', '', ''])
  const [changes, setChanges] = useState('')
  const [docEntry, setDocEntry] = useState('')
  const [mdtQuestion, setMdtQuestion] = useState('')
  const [openedAt] = useState(() => new Date().toISOString())
  const [firstScrolledAt, setFirstScrolledAt] = useState(null)

  // Reset on new scenario.
  useEffect(() => {
    setConcerns(['', '', ''])
    setChanges('')
    setDocEntry('')
    setMdtQuestion('')
    setFirstScrolledAt(null)
  }, [document_text])

  const setConcern = (i, text) => {
    setConcerns(prev => {
      const next = prev.slice()
      next[i] = text
      return next
    })
  }

  const concernsReady = concerns.every(c => c.trim().length >= CONCERN_MIN)
  const changesReady = changes.trim().length >= CHANGES_MIN
  const docReady = docEntry.trim().length >= DOC_MIN
  const questionReady = mdtQuestion.trim().length >= QUESTION_MIN
  const canSubmit = !!document_text && concernsReady && changesReady && docReady && questionReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_reading_seconds = firstScrolledAt
      ? Math.max(0, Math.round((new Date(completedAt) - new Date(openedAt)) / 1000))
      : Math.max(0, Math.round((new Date(completedAt) - new Date(openedAt)) / 1000))
    onComplete && onComplete({
      block_id: 'care-plan-review',
      document_type,
      summary_concerns: concerns.map(c => c.trim()),
      recommended_changes: changes.trim(),
      documentation_update: docEntry.trim(),
      mdt_question: mdtQuestion.trim(),
      time_reading_seconds,
      started_at: openedAt,
      completed_at: completedAt,
    })
  }

  const handleScroll = () => {
    if (!firstScrolledAt) setFirstScrolledAt(new Date().toISOString())
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Care plan review"
      />

      {!document_text ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 1080, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>
            Read the care plan on the left. Note three short concerns or gaps, recommend specific changes, write the documentation entry you would put on the record, and name one question for the multidisciplinary team.
          </div>

          <div className="pd-cpr-grid" style={{
            maxWidth: 1080, margin: '0 auto 18px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 16,
          }}>
            <style>{`
              @media (max-width: 880px) {
                .pd-cpr-grid { grid-template-columns: minmax(0, 1fr) !important; }
              }
            `}</style>

            {/* Document panel */}
            <div style={{
              background: PARCHMENT, border: `1px solid #e6d6ad`,
              borderRadius: 10, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              minHeight: 360,
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: `1px solid #e6d6ad`,
                background: '#fdf6e3',
              }}>
                <div style={{
                  fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#7a5d1f',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                }}>
                  {document_type}
                </div>
                {(meta.author || meta.date) ? (
                  <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                    {meta.author ? <b style={{ color: NAVY }}>{meta.author}</b> : null}
                    {meta.author && meta.date ? <span> · </span> : null}
                    {meta.date ? <span>{meta.date}</span> : null}
                  </div>
                ) : null}
                {(meta.last_reviewed || meta.next_review_due) ? (
                  <div style={{ fontFamily: FM, fontSize: 11, color: TX2, marginTop: 4 }}>
                    {meta.last_reviewed ? <span>Last reviewed: {meta.last_reviewed}</span> : null}
                    {meta.last_reviewed && meta.next_review_due ? <span> · </span> : null}
                    {meta.next_review_due ? <span>Next review: {meta.next_review_due}</span> : null}
                  </div>
                ) : null}
                {meta.audience ? (
                  <div style={{ fontFamily: FM, fontSize: 11, color: TX3, marginTop: 4 }}>
                    For: {meta.audience}
                  </div>
                ) : null}
              </div>
              <div
                onScroll={handleScroll}
                style={{
                  padding: 18, overflowY: 'auto',
                  maxHeight: 560,
                  fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {document_text}
              </div>
            </div>

            {/* Response panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14,
              }}>
                <div style={subheadStyle}>Three concerns or gaps spotted</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0, 1, 2].map(i => {
                    const filled = concerns[i].trim().length >= CONCERN_MIN
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span aria-hidden="true" style={{
                          flex: '0 0 auto', marginTop: 4,
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: FM, fontSize: 11, fontWeight: 700,
                          background: filled ? TEAL : '#f1f5f9',
                          color: filled ? '#fff' : TX3,
                          border: `1px solid ${filled ? TEAL : BD}`,
                        }}>
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={concerns[i]}
                          onChange={(e) => setConcern(i, e.target.value)}
                          placeholder={`Concern ${i + 1}: name a specific gap or risk`}
                          style={{
                            flex: 1, minWidth: 0, boxSizing: 'border-box',
                            fontFamily: F, fontSize: 13, color: NAVY,
                            padding: '8px 10px', borderRadius: 8,
                            border: `1px solid ${BD}`, background: '#f8fafc',
                            outline: 'none',
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              <FieldCard
                label="Recommended changes to the care plan"
                hint="Specific, actionable changes. Reference the section or risk by name. Minimum 30 characters."
                value={changes}
                onChange={setChanges}
                rows={3}
                minChars={CHANGES_MIN}
                ready={changesReady}
              />
              <FieldCard
                label="Documentation entry: how would you update the record?"
                hint="Write the actual note you would put on the care plan record, in your professional voice. Minimum 30 characters."
                value={docEntry}
                onChange={setDocEntry}
                rows={4}
                minChars={DOC_MIN}
                ready={docReady}
              />
              <FieldCard
                label="One question for the multidisciplinary team"
                hint="Name the question you would raise at the next MDT, addressed to a specific role where useful. Minimum 8 characters."
                value={mdtQuestion}
                onChange={setMdtQuestion}
                rows={2}
                minChars={QUESTION_MIN}
                ready={questionReady}
              />
            </div>
          </div>

          <SubmitFooter
            concernsReady={concernsReady}
            changesReady={changesReady}
            docReady={docReady}
            questionReady={questionReady}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

const subheadStyle = {
  fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
}

function FieldCard({ label, hint, value, onChange, rows, minChars, ready }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14 }}>
      <label style={{ display: 'block' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, marginBottom: 4, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
            {label}
          </span>
          {minChars ? (
            <span style={{ fontFamily: FM, fontSize: 11, color: ready ? TEAL : TX3 }}>
              {(value || '').trim().length} / {minChars}
            </span>
          ) : null}
        </div>
        {hint ? (
          <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, lineHeight: 1.45, marginBottom: 8 }}>
            {hint}
          </div>
        ) : null}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.55,
            padding: 10, borderRadius: 8,
            border: `1px solid ${BD}`, background: '#f8fafc',
            outline: 'none', resize: 'vertical',
          }}
        />
      </label>
    </div>
  )
}

function SubmitFooter({ concernsReady, changesReady, docReady, questionReady, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 1080, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Concerns {concernsReady ? 'ready' : 'incomplete'} · Recommended changes {changesReady ? 'ready' : 'incomplete'} · Documentation {docReady ? 'ready' : 'incomplete'} · MDT question {questionReady ? 'ready' : 'incomplete'}.
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
        Care plan payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the care plan document. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'care-plan-review',
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
