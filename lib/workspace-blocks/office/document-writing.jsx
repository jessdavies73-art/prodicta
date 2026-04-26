'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from './_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['document-writing']

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

function htmlToText(html) {
  if (!html) return ''
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return (tmp.textContent || tmp.innerText || '').trim()
}

function countWords(text) {
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export default function DocumentWritingBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const isMobile = useIsMobile()

  const docType = (block_content?.document_type || '').trim()
  const audience = (block_content?.audience || '').trim()
  const context = (block_content?.context || '').trim()
  const wordLimit = Number(block_content?.word_limit) > 0 ? Number(block_content.word_limit) : 250
  const mustInclude = Array.isArray(block_content?.must_include) ? block_content.must_include : []
  const noGos = Array.isArray(block_content?.no_gos) ? block_content.no_gos : []

  const briefAvailable = Boolean(docType || audience || context || mustInclude.length)

  const editorRef = useRef(null)
  const [html, setHtml] = useState('')
  const [briefOpen, setBriefOpen] = useState(true)

  const startedAtRef = useRef(new Date().toISOString())
  const startTimeRef = useRef(Date.now())
  const editCountRef = useRef(0)
  const previousLengthRef = useRef(0)

  // Reset on new generation. Brief signature changes => fresh draft.
  const briefKey = `${docType}|${audience}|${wordLimit}`
  useEffect(() => {
    setHtml('')
    if (editorRef.current) editorRef.current.innerHTML = ''
    startedAtRef.current = new Date().toISOString()
    startTimeRef.current = Date.now()
    editCountRef.current = 0
    previousLengthRef.current = 0
    setBriefOpen(true)
  }, [briefKey])

  const exec = (cmd, value) => {
    if (typeof document === 'undefined') return
    document.execCommand(cmd, false, value)
    handleEditorInput()
    if (editorRef.current) editorRef.current.focus()
  }

  const handleEditorInput = () => {
    if (!editorRef.current) return
    const newHtml = editorRef.current.innerHTML
    const newLength = htmlToText(newHtml).length
    // If the candidate cleared the editor while there was substantial
    // content, count it as an edit cycle (revising by clearing and retyping).
    if (previousLengthRef.current >= 30 && newLength < previousLengthRef.current * 0.4) {
      editCountRef.current += 1
    }
    previousLengthRef.current = newLength
    setHtml(newHtml)
  }

  const text = useMemo(() => htmlToText(html), [html])
  const wordCount = countWords(text)
  const overLimit = wordCount > wordLimit
  const approachingLimit = wordCount >= Math.round(wordLimit * 0.85) && !overLimit
  const minWords = Math.max(40, Math.round(wordLimit * 0.4))
  const meetsMinimum = wordCount >= minWords
  const canSubmit = meetsMinimum && wordCount <= Math.round(wordLimit * 1.4)

  const counterColour = overLimit ? '#b91c1c' : approachingLimit ? '#b45309' : TEAL

  const handleSubmit = () => {
    const elapsedMs = Date.now() - startTimeRef.current
    onComplete && onComplete({
      block_id: 'document-writing',
      document_html: html,
      document_text: text,
      word_count: wordCount,
      final_word_count: wordCount,
      word_limit: wordLimit,
      edit_count: editCountRef.current,
      time_writing_seconds: Math.round(elapsedMs / 1000),
      document_type: docType,
      started_at: startedAtRef.current,
      completed_at: new Date().toISOString(),
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Document writing"
      />

      {!briefAvailable ? (
        <NoBriefFallback block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <div style={{ maxWidth: 980, margin: '0 auto 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Brief panel */}
          <div style={{
            background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 10,
            overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => isMobile && setBriefOpen(o => !o)}
              style={{
                width: '100%', textAlign: 'left',
                background: '#FAF9F4', border: 'none',
                padding: '12px 16px', cursor: isMobile ? 'pointer' : 'default',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
              }}
            >
              <div>
                <div style={{
                  fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
                }}>
                  Brief
                </div>
                <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, lineHeight: 1.3 }}>
                  Write {docType || 'a document'}{audience ? <span> for <span style={{ color: TEAL }}>{audience}</span></span> : null}
                </div>
              </div>
              {isMobile ? (
                <span style={{ fontFamily: FM, fontSize: 11, color: '#475569' }}>{briefOpen ? 'Hide' : 'Show'}</span>
              ) : null}
            </button>
            {(briefOpen || !isMobile) ? (
              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {context ? (
                  <div>
                    <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Context
                    </div>
                    <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.55 }}>{context}</div>
                  </div>
                ) : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontFamily: FM, fontSize: 12, color: '#475569' }}>
                  <span><b style={{ color: NAVY }}>Word limit:</b> {wordLimit} (target {minWords}+)</span>
                  {audience ? <span><b style={{ color: NAVY }}>Audience:</b> {audience}</span> : null}
                </div>
                {mustInclude.length ? (
                  <div>
                    <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Must include
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6 }}>
                      {mustInclude.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                ) : null}
                {noGos.length ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                      Do not
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: '#7f1d1d', lineHeight: 1.55 }}>
                      {noGos.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Editor */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <Toolbar onCommand={exec} />
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              spellCheck={true}
              style={{
                minHeight: 320,
                padding: '18px 22px',
                fontFamily: F, fontSize: 15, color: NAVY, lineHeight: 1.7,
                outline: 'none',
                background: '#fff',
              }}
            />
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: '#FAF9F4',
            }}>
              <div style={{ fontFamily: FM, fontSize: 12, color: '#475569' }}>
                <b style={{ color: counterColour }}>{wordCount}</b> / {wordLimit} words
                {overLimit ? <span style={{ marginLeft: 8, color: '#b91c1c', fontWeight: 700 }}>over limit</span>
                  : approachingLimit ? <span style={{ marginLeft: 8, color: '#b45309', fontWeight: 700 }}>approaching limit</span>
                  : null}
                {editCountRef.current > 0 ? <span style={{ marginLeft: 12, color: '#64748b' }}>{editCountRef.current} revision{editCountRef.current === 1 ? '' : 's'}</span> : null}
              </div>
              <div style={{
                width: '100%', maxWidth: isMobile ? '100%' : 280, height: 6,
                borderRadius: 3, background: '#e2e8f0', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.min(100, (wordCount / wordLimit) * 100)}%`,
                  height: '100%', background: counterColour,
                  transition: 'width 200ms ease, background 200ms ease',
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {briefAvailable ? (
        <SubmitFooter
          wordCount={wordCount}
          minWords={minWords}
          wordLimit={wordLimit}
          canSubmit={canSubmit}
          meetsMinimum={meetsMinimum}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  )
}

function Toolbar({ onCommand }) {
  const btnStyle = (active) => ({
    fontFamily: F, fontSize: 13, fontWeight: 700,
    padding: '6px 11px', borderRadius: 6,
    border: '1px solid #cbd5e1', background: active ? '#f1f5f9' : '#fff',
    color: NAVY, cursor: 'pointer',
  })
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '10px 14px',
      borderBottom: '1px solid #e2e8f0', background: '#FAF9F4',
      flexWrap: 'wrap',
    }}>
      <button type="button" title="Bold" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); onCommand('bold') }}>
        <b>B</b>
      </button>
      <button type="button" title="Italic" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); onCommand('italic') }}>
        <i>I</i>
      </button>
      <span style={{ width: 1, background: '#cbd5e1', margin: '2px 4px' }} />
      <button type="button" title="Bullet list" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); onCommand('insertUnorderedList') }}>
        &bull; List
      </button>
      <button type="button" title="Numbered list" style={btnStyle()} onMouseDown={(e) => { e.preventDefault(); onCommand('insertOrderedList') }}>
        1. List
      </button>
    </div>
  )
}

function SubmitFooter({ wordCount, minWords, wordLimit, canSubmit, meetsMinimum, onSubmit }) {
  const note = !meetsMinimum
    ? `At least ${minWords} words to submit. Currently ${wordCount}.`
    : wordCount > wordLimit
      ? `Over the ${wordLimit}-word limit. Trim before submitting (you can submit up to ${Math.round(wordLimit * 1.4)}, but the brief asks ${wordLimit}).`
      : `Ready to submit at ${wordCount} words.`
  return (
    <div style={{
      maxWidth: 980, margin: '0 auto', padding: 16,
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>{note}</div>
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
        Submit document
      </button>
    </div>
  )
}

function NoBriefFallback({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Brief payload missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.55, marginBottom: 14 }}>
        This scenario was generated before the typed document brief shipped. Re-generate the workspace_scenario to populate the brief. Showing the scenario summary below.
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
        onClick={() => onComplete && onComplete({ block_id: 'document-writing', fallback: true, completed_at: new Date().toISOString() })}
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
