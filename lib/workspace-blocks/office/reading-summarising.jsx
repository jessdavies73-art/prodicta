'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['reading-summarising']

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

export default function ReadingSummarisingBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  const docType = (block_content?.document_type || '').trim()
  const docText = (block_content?.document_text || '').trim()
  const docMeta = block_content?.document_metadata || {}

  const startedAtRef = useRef(new Date().toISOString())
  const startTimeRef = useRef(Date.now())

  const [bullets, setBullets] = useState(['', '', ''])
  const [recommendation, setRecommendation] = useState('')
  const [question, setQuestion] = useState('')

  // Reset all candidate state when the document text changes (new generation).
  useEffect(() => {
    setBullets(['', '', ''])
    setRecommendation('')
    setQuestion('')
    startedAtRef.current = new Date().toISOString()
    startTimeRef.current = Date.now()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docText.slice(0, 80)])

  const setBullet = (i, value) => {
    setBullets(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const filledBullets = bullets.filter(b => b.trim().length >= 5).length
  const recOk = recommendation.trim().length >= 30
  const qOk = question.trim().length >= 8
  const canSubmit = filledBullets >= 3 && recOk && qOk && docText.length > 0

  const handleSubmit = () => {
    const elapsedMs = Date.now() - startTimeRef.current
    onComplete && onComplete({
      block_id: 'reading-summarising',
      summary_bullets: bullets.map(b => b.trim()),
      recommendation: recommendation.trim(),
      question: question.trim(),
      time_reading_seconds: Math.round(elapsedMs / 1000),
      document_type: docType,
      document_word_count: docText ? docText.split(/\s+/).length : 0,
      started_at: startedAtRef.current,
      completed_at: new Date().toISOString(),
    })
  }

  // Split body on blank lines to render real paragraphs even though the
  // generator ships one string.
  const paragraphs = useMemo(
    () => docText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    [docText]
  )

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Reading and summarising"
      />

      {!docText ? (
        <NoDocumentFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <div style={{
          maxWidth: 980, margin: '0 auto 18px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: 16,
        }}>
          {/* Document panel */}
          <div style={{
            background: '#FAF9F4', border: '1px solid #e2e8f0', borderRadius: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0',
            }}>
              <div style={{
                fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
              }}>
                {docType || 'Document'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontFamily: FM, fontSize: 11, color: '#475569' }}>
                {docMeta?.author ? <span><b style={{ color: NAVY }}>From:</b> {docMeta.author}</span> : null}
                {docMeta?.date ? <span><b style={{ color: NAVY }}>Date:</b> {docMeta.date}</span> : null}
                {docMeta?.audience ? <span><b style={{ color: NAVY }}>To:</b> {docMeta.audience}</span> : null}
              </div>
            </div>
            <div style={{
              maxHeight: isMobile ? 'none' : 560, overflowY: isMobile ? 'visible' : 'auto',
              padding: '20px 24px',
              fontFamily: F, fontSize: 15, color: NAVY, lineHeight: 1.7,
            }}>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>{p}</p>
              ))}
            </div>
          </div>

          {/* Response panel */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div>
              <div style={{
                fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Three-bullet headline summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%',
                      background: bullets[i].trim().length >= 5 ? TEAL : '#cbd5e1',
                      color: '#fff', fontFamily: FM, fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 200ms ease',
                    }}>{i + 1}</span>
                    <input
                      type="text"
                      value={bullets[i]}
                      onChange={(e) => setBullet(i, e.target.value)}
                      placeholder={i === 0 ? 'Headline point that drives the rest' : i === 1 ? 'Second key signal' : 'Third key signal'}
                      style={{
                        flex: 1, fontFamily: F, fontSize: 14, color: NAVY,
                        padding: '9px 12px', borderRadius: 8,
                        border: '1px solid #cbd5e1', background: '#f8fafc',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{
                fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Your recommendation
              </div>
              <textarea
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                rows={4}
                placeholder="What should we do, given what this document says? One paragraph, plain English."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.55,
                  padding: 12, borderRadius: 8,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  outline: 'none', resize: 'vertical', minHeight: 96,
                }}
              />
            </div>

            <div>
              <div style={{
                fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                One question you would ask before deciding
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="The single question that would change your recommendation"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: F, fontSize: 14, color: NAVY,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {docText ? (
        <SubmitFooter
          filledBullets={filledBullets}
          recOk={recOk}
          qOk={qOk}
          canSubmit={canSubmit}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}

function SubmitFooter({ filledBullets, recOk, qOk, canSubmit, onSubmit }) {
  const checks = [
    { ok: filledBullets >= 3, label: `Three summary bullets (${filledBullets}/3)` },
    { ok: recOk, label: 'Recommendation paragraph (30+ chars)' },
    { ok: qOk, label: 'One question to ask' },
  ]
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontFamily: F, fontSize: 12, color: '#475569' }}>
        {checks.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: c.ok ? TEAL : '#cbd5e1',
            }} />
            {c.label}
          </span>
        ))}
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
        Submit summary
      </button>
    </div>
  )
}

function NoDocumentFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Document payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        This scenario was generated before the typed reading payload shipped. Re-generate the workspace_scenario to populate the document. Showing the scenario summary below so the run can continue.
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
        onClick={() => onComplete && onComplete({ block_id: 'reading-summarising', fallback: true, completed_at: new Date().toISOString() })}
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
