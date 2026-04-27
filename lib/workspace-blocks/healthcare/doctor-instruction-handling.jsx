'use client'

// Doctor / senior instruction handling, healthcare shell.
//
// Receives a single inbound instruction (block_content.full_instruction_text)
// from a senior doctor or consultant, plus the sender object, the
// instruction_type (phone_call / written_note / electronic_order),
// deadline_pressure, and supporting_context. The instruction may be
// intentionally ambiguous or carry a planted safety concern; the
// candidate's job is to read carefully and capture four short
// professional outputs:
//   1. Clarifications they would query before proceeding
//   2. Safety concerns they would raise (if any)
//   3. The documentation entry they would write into the patient record
//   4. Their immediate action plan
//
// The ambiguity_or_concern_planted object is ground truth for scoring
// and is never surfaced to the candidate.
//
// Compliance:
//   - The instruction text uses placeholder language only ("the
//     prescribed analgesia", "the planned anti-infective", "current
//     medication regime"). No real drug names or doses appear in the
//     UI.
//   - Scoring narratives downstream use "indicators show" / "evidence
//     suggests" patterns, never definitive clinical claims.

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['doctor-instruction-handling']

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

const INSTRUCTION_TYPE_LABEL = {
  phone_call:       'Phone call',
  written_note:     'Written note',
  electronic_order: 'Electronic order',
}

const PRESSURE_STYLE = {
  minutes:    { label: 'Minutes',    bg: CLAY_TINT, dot: CLAY,        fg: '#8a5d24' },
  hours:      { label: 'Hours',      bg: CLAY_TINT, dot: CLAY,        fg: '#8a5d24' },
  today:      { label: 'Today',      bg: NAVY_TINT, dot: NAVY,        fg: NAVY },
  this_week:  { label: 'This week',  bg: '#f1f5f9', dot: '#64748b',   fg: '#475569' },
}

const DOC_MIN = 30
const PLAN_MIN = 12

export default function DoctorInstructionHandlingBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const sender = block_content?.sender || {}
  const instructionType = block_content?.instruction_type || 'phone_call'
  const fullText = block_content?.full_instruction_text || ''
  const summary = block_content?.instruction_summary || ''
  const supportingContext = block_content?.supporting_context || ''
  const deadlinePressure = block_content?.deadline_pressure || 'today'

  const [clarifications, setClarifications] = useState('')
  const [safetyConcerns, setSafetyConcerns] = useState('')
  const [docEntry, setDocEntry] = useState('')
  const [actionPlan, setActionPlan] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  // Reset when the instruction changes (fresh scenario).
  useEffect(() => {
    setClarifications('')
    setSafetyConcerns('')
    setDocEntry('')
    setActionPlan('')
  }, [fullText])

  const docReady = docEntry.trim().length >= DOC_MIN
  const planReady = actionPlan.trim().length >= PLAN_MIN
  const canSubmit = !!fullText && docReady && planReady

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'doctor-instruction-handling',
      sender,
      instruction_type: instructionType,
      clarifications_raised: clarifications.trim(),
      safety_concerns: safetyConcerns.trim(),
      documentation_entry: docEntry.trim(),
      action_plan: actionPlan.trim(),
      time_in_block_seconds,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  const pressure = PRESSURE_STYLE[deadlinePressure] || PRESSURE_STYLE.today

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Doctor instruction handling"
      />

      {!fullText ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{
            maxWidth: 760, margin: '0 auto 16px',
            background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: '#fafbfc', borderBottom: `1px solid ${BD}`,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: NAVY_TINT, color: NAVY,
                fontFamily: FM, fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {INSTRUCTION_TYPE_LABEL[instructionType] || INSTRUCTION_TYPE_LABEL.phone_call}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: pressure.bg, color: pressure.fg,
                fontFamily: FM, fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 999,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: pressure.dot }} />
                Pressure: {pressure.label}
              </span>
              <div style={{ flex: 1, minWidth: 0, fontFamily: F, fontSize: 13, color: TX2, textAlign: 'right' }}>
                <b style={{ color: NAVY }}>{sender?.name || 'Sender unspecified'}</b>
                {sender?.role ? <span> · {sender.role}</span> : null}
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {summary ? (
                <p style={{
                  fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY,
                  margin: '0 0 12px', lineHeight: 1.45,
                }}>
                  {summary}
                </p>
              ) : null}

              <blockquote style={{
                margin: 0, padding: '14px 16px',
                background: '#f8fafc', borderLeft: `3px solid ${TEAL}`,
                borderRadius: 6,
                fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {fullText}
              </blockquote>

              {supportingContext ? (
                <div style={{
                  marginTop: 12, padding: '10px 12px',
                  background: NAVY_TINT, border: `1px solid ${BD}`, borderRadius: 8,
                  fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
                }}>
                  <div style={fieldLabelStyle}>Supporting context</div>
                  {supportingContext}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{
            maxWidth: 760, margin: '0 auto 18px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <FieldCard
              label="What would you query before proceeding?"
              hint="Anything you would clarify with the sender before you act, in their words. Leave blank if there is nothing to clarify."
              value={clarifications}
              onChange={setClarifications}
              rows={2}
            />
            <FieldCard
              label="What concerns would you raise, if any?"
              hint="Any safety or scope concern you would name, and to whom. Leave blank if you have no concerns."
              value={safetyConcerns}
              onChange={setSafetyConcerns}
              rows={2}
            />
            <FieldCard
              label="How would you document this instruction in the patient record?"
              hint="Write the actual note you would put in the record, in your professional voice. Minimum 30 characters."
              value={docEntry}
              onChange={setDocEntry}
              rows={4}
              required
              minChars={DOC_MIN}
              ready={docReady}
            />
            <FieldCard
              label="What is your immediate action plan?"
              hint="Two or three bullet points or one short paragraph on what you do next, and in what order. Minimum 12 characters."
              value={actionPlan}
              onChange={setActionPlan}
              rows={3}
              required
              minChars={PLAN_MIN}
              ready={planReady}
            />
          </div>

          <SubmitFooter
            docReady={docReady}
            planReady={planReady}
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
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
  display: 'block',
}

function FieldCard({ label, hint, value, onChange, rows = 2, required = false, minChars, ready }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14,
    }}>
      <label style={{ display: 'block' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, marginBottom: 4, flexWrap: 'wrap',
        }}>
          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
            {label}
            {required ? <span style={{ color: CLAY, marginLeft: 4 }} aria-label="required">*</span> : null}
          </span>
          {required && minChars ? (
            <span style={{
              fontFamily: FM, fontSize: 11,
              color: ready ? TEAL : TX3,
            }}>
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

function SubmitFooter({ docReady, planReady, canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 760, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Documentation entry {docReady ? 'ready' : 'still needs more'}. Action plan {planReady ? 'ready' : 'still needs more'}. Clarifications and concerns are optional.
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
        Submit response
      </button>
    </div>
  )
}

function FallbackPanel({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Instruction payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed instruction. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'doctor-instruction-handling',
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
