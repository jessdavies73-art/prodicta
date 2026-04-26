'use client'

import { useEffect, useMemo, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['stakeholder-conflict']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const POWER_STYLES = {
  high:   { label: 'High power',   bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
  medium: { label: 'Medium power', bg: '#fffbeb', fg: '#92400e', bd: '#fcd34d' },
  low:    { label: 'Low power',    bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' },
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

export default function StakeholderConflictBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()
  const stakeholders = useMemo(
    () => Array.isArray(block_content?.stakeholders) ? block_content.stakeholders : [],
    [block_content]
  )
  const centralDecision = block_content?.central_decision || ''

  const [responses, setResponses] = useState({})
  const [finalDecision, setFinalDecision] = useState('')
  const [publicMessage, setPublicMessage] = useState('')
  const [privateStrategy, setPrivateStrategy] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setResponses({})
    setFinalDecision('')
    setPublicMessage('')
    setPrivateStrategy('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeholders.map(s => s.id).join(',')])

  const setResponse = (id, text) => {
    setResponses(prev => ({ ...prev, [id]: text }))
  }

  const respondedCount = stakeholders.filter(s => (responses[s.id] || '').trim().length >= 8).length
  const allResponded = stakeholders.length > 0 && respondedCount === stakeholders.length
  const decisionOk = finalDecision.trim().length >= 12
  const publicOk = publicMessage.trim().length >= 12
  const privateOk = privateStrategy.trim().length >= 12
  const canSubmit = allResponded && decisionOk && publicOk && privateOk

  const handleSubmit = () => {
    onComplete && onComplete({
      block_id: 'stakeholder-conflict',
      central_decision: centralDecision,
      stakeholder_responses: stakeholders.map(s => ({
        stakeholder_id: s.id,
        name: s.name,
        response: (responses[s.id] || '').trim(),
      })),
      final_decision: finalDecision.trim(),
      public_message: publicMessage.trim(),
      private_strategy: privateStrategy.trim(),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Stakeholder conflict"
      />

      {stakeholders.length === 0 ? (
        <NoStakeholdersFallback block_content={block_content} onComplete={() => onComplete && onComplete({ block_id: 'stakeholder-conflict', fallback: true, completed_at: new Date().toISOString() })} />
      ) : (
        <>
          {centralDecision ? (
            <div style={{ maxWidth: 980, margin: '0 auto 16px', padding: 16, background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                The decision in front of you
              </div>
              <div style={{ fontFamily: F, fontSize: 15, color: NAVY, lineHeight: 1.5 }}>
                {centralDecision}
              </div>
            </div>
          ) : null}

          <div style={{ maxWidth: 980, margin: '0 auto 18px' }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Stakeholders pulling in different directions
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 12,
            }}>
              {stakeholders.map(s => {
                const power = POWER_STYLES[s.power] || POWER_STYLES.medium
                return (
                  <div key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>
                        {s.name}
                      </div>
                      <span style={{
                        fontFamily: FM, fontSize: 10, fontWeight: 700,
                        padding: '3px 8px', borderRadius: 10,
                        background: power.bg, color: power.fg, border: `1px solid ${power.bd}`,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {power.label}
                      </span>
                    </div>
                    {s.role ? (
                      <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                        {s.role}
                      </div>
                    ) : null}
                    {s.wants ? (
                      <div style={{ fontFamily: F, fontSize: 13, color: '#1f2937', lineHeight: 1.5, marginBottom: 4 }}>
                        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 6 }}>Wants:</span>
                        {s.wants}
                      </div>
                    ) : null}
                    {s.why ? (
                      <div style={{ fontFamily: F, fontSize: 13, color: '#1f2937', lineHeight: 1.5, marginBottom: 10 }}>
                        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 6 }}>Why:</span>
                        {s.why}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        How will you respond to {s.name.split(/\s+/)[0]}?
                      </div>
                      <textarea
                        value={responses[s.id] || ''}
                        onChange={(e) => setResponse(s.id, e.target.value)}
                        rows={3}
                        placeholder="One or two sentences. What do you say or do?"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
                          padding: 10, borderRadius: 8,
                          border: '1px solid #cbd5e1', background: '#f8fafc',
                          outline: 'none', resize: 'vertical', minHeight: 70,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ maxWidth: 980, margin: '0 auto 18px' }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Your call
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: 12,
            }}>
              <Field label="Final decision" placeholder="What is your call? Be specific. Two or three sentences." value={finalDecision} onChange={setFinalDecision} rows={4} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="What you'll say publicly" placeholder="The line everyone hears. Even-handed, defensible." value={publicMessage} onChange={setPublicMessage} rows={3} />
                <Field label="Private strategy" placeholder="What you actually do, who you talk to first, what you concede privately." value={privateStrategy} onChange={setPrivateStrategy} rows={3} />
              </div>
            </div>
          </div>

          <SubmitFooter
            respondedCount={respondedCount}
            stakeholderCount={stakeholders.length}
            decisionOk={decisionOk}
            publicOk={publicOk}
            privateOk={privateOk}
            canSubmit={canSubmit}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}

function Field({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5,
          padding: 10, borderRadius: 8,
          border: '1px solid #cbd5e1', background: '#f8fafc',
          outline: 'none', resize: 'vertical',
        }}
      />
    </div>
  )
}

function SubmitFooter({ respondedCount, stakeholderCount, decisionOk, publicOk, privateOk, canSubmit, onSubmit }) {
  const missing = []
  if (respondedCount < stakeholderCount) missing.push(`${stakeholderCount - respondedCount} stakeholder response${stakeholderCount - respondedCount === 1 ? '' : 's'}`)
  if (!decisionOk) missing.push('final decision')
  if (!publicOk) missing.push('public message')
  if (!privateOk) missing.push('private strategy')
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
        {canSubmit ? 'All set.' : `Still need: ${missing.join(', ')}.`}
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

function NoStakeholdersFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Stakeholders payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed stakeholders list. Showing the scenario summary below.
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
        onClick={onComplete}
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
