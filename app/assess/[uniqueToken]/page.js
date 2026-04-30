'use client'
// colour constants audit - all defined
import { useState, useEffect, useRef } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'
import ModularWorkspace from './components/ModularWorkspace'

// ─── Brand tokens ────────────────────────────────────────────────────────────
const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const TEALD  = '#009688'
const TEALLT = '#e0f2f0'
const BG     = '#f7f9fb'
const CARD   = '#fff'
const BD     = '#e4e9f0'
const TX     = '#0f172a'
const TX2    = '#5e6b7f'
const TX3    = '#94a1b3'
const AMB    = '#F59E0B'
const REDBG  = '#FEF2F2'
const F      = "'Outfit', system-ui, sans-serif"
const FM     = "'IBM Plex Mono', monospace"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.max(0, seconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Deterministic 30%-chance gate for the in-scenario interruption. The seed
// depends on the assessment's `interruption_keying`:
//   'candidate'  (default, anti-gaming): hash on (candidateId, scenarioIndex)
//                so two candidates on the same assessment see different
//                interruption patterns.
//   'assessment' (bulk-invite consistency): hash on (assessmentId, scenarioIndex)
//                so every candidate on the same assessment hits the curveball
//                on the same scenarios for apples-to-apples comparison.
// Same probability target in both modes. Same hashing function so a refresh
// of the same candidate produces the same result.
function shouldFireInterruption(keying, assessmentId, candidateId, scenarioIndex) {
  const mode = keying === 'assessment' ? 'assessment' : 'candidate'
  const primary = mode === 'assessment' ? assessmentId : candidateId
  const seed = String(primary || '') + '|' + String(scenarioIndex || 0)
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 100 < 30
}

function rankedSlotsHaveAtLeastOneAction(slots) {
  return Array.isArray(slots) && slots.length > 0 && (slots[0]?.action || '').trim().length > 0
}

function rankedSlotsAreFullyFilled(slots) {
  return Array.isArray(slots) && slots.length === 3 && slots.every(s =>
    (s?.action || '').trim().length > 0 && (s?.justification || '').trim().length > 0
  )
}

// ─── Progress save helpers ──────────────────────────────────────────────────
// Auto-save target for the typed-text scenario path on /assess/[token].
// Mirrors to localStorage for instant same-browser resume and to the
// candidates row (in_progress_state JSONB) for cross-device resume.
// Limited in this MVP to the ActivePage flow: ranked actions, forced-choice
// responses, free-text responses, scenarioIndex, timeTakens. Modular
// workspace, calendar, strategic-thinking, and audio are persisted by
// follow-up work, not this commit.
function progressStorageKey(token) {
  return `prodicta_assessment_progress_${token}`
}

// Returns true when the persisted progress blob represents meaningful work.
// A blob with scenarioIndex 0 and empty responses is the fresh state we'd
// see from a candidate clicking Start once and immediately closing the tab;
// treating that as "no progress" keeps the Resume page from appearing on
// essentially-fresh restarts.
function hasMeaningfulProgress(state) {
  if (!state || typeof state !== 'object') return false
  if ((state.scenarioIndex ?? 0) > 0) return true
  if (Array.isArray(state.responses) && state.responses.some(r => (r || '').trim().length > 0)) return true
  const ra = state.rankedActions || {}
  for (const key of Object.keys(ra)) {
    const slots = ra[key]?.slots || []
    if (slots.some(s => (s?.action || '').trim() || (s?.justification || '').trim())) return true
  }
  if (state.forcedChoiceResponses && Object.keys(state.forcedChoiceResponses).length > 0) return true
  return false
}

function readLocalProgress(token) {
  if (typeof window === 'undefined' || !token) return null
  try {
    const raw = window.localStorage.getItem(progressStorageKey(token))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function clearLocalProgress(token) {
  if (typeof window === 'undefined' || !token) return
  try { window.localStorage.removeItem(progressStorageKey(token)) } catch {}
}

function rankedActionsToText(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return ''
  return slots
    .map((s, i) => `Action ${i + 1}: ${s?.action || ''}\nWhy: ${s?.justification || ''}`)
    .join('\n\n')
}

function wordCount(text) {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

const TYPE_COLOURS = {
  'Core Task':          { bg: '#eff6ff', tx: '#2563eb' },
  'Pressure Test':      { bg: '#fff7ed', tx: '#9a3412' },
  'Judgment Call':      { bg: '#fdf4ff', tx: '#7e22ce' },
  'Staying Power':      { bg: '#E6F7F5', tx: '#006B5E' },
  // Legacy types for existing assessments
  'Email Response':     { bg: '#eff6ff', tx: '#2563eb' },
  'Prioritisation':     { bg: '#fef9c3', tx: '#854d0e' },
  'Strategic Thinking': { bg: '#E6F7F5', tx: '#006B5E' },
}
function typeBadgeStyle(type) {
  const c = TYPE_COLOURS[type] || { bg: TEALLT, tx: TEALD }
  return {
    display: 'inline-block',
    background: c.bg,
    color: c.tx,
    fontFamily: F,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    padding: '3px 10px',
    letterSpacing: 0.3,
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function NavBar({ candidateName }) {
  return (
    <div style={{
      background: NAVY,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <ProdictaLogo textColor="#ffffff" size={30} />
      {candidateName && (
        <span style={{
          fontFamily: F,
          fontSize: 14,
          color: 'rgba(255,255,255,0.75)',
        }}>
          {candidateName}
        </span>
      )}
    </div>
  )
}

function CentredCard({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      fontFamily: F,
    }}>
      <div style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '40px 20px 80px',
      }}>
        {children}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 16,
      padding: '32px 36px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── State: Error ─────────────────────────────────────────────────────────────
function ErrorPage({ message, context }) {
  const friendly = message || 'Something went wrong with your assessment.'
  // mailto body pre-fills the error details so the team can triage it fast.
  const mailtoBody = encodeURIComponent(
    `Hello,\n\nI hit an error while completing a PRODICTA assessment.\n\n` +
    `Error: ${friendly}\n` +
    `Context: ${context || 'candidate-assessment'}\n` +
    `Page: ${typeof window !== 'undefined' ? window.location.href : ''}\n` +
    `Time: ${new Date().toISOString()}\n\n` +
    `Thanks.`
  )
  const mailtoSubject = encodeURIComponent('PRODICTA assessment error')
  const reportHref = `mailto:hello@prodicta.co.uk?subject=${mailtoSubject}&body=${mailtoBody}`

  return (
    <>
      <NavBar />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '56px 36px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }} aria-hidden>⚠️</div>
          <h1 style={{ fontFamily: F, color: TX, fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
            Something went wrong
          </h1>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}>
            {friendly}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={reportHref}
              style={{
                display: 'inline-block',
                background: 'transparent', color: NAVY,
                fontFamily: F, fontSize: 14, fontWeight: 700,
                border: `1.5px solid ${BD}`, borderRadius: 10,
                padding: '11px 22px', textDecoration: 'none',
              }}
            >
              Report this problem
            </a>
            <button
              type="button"
              onClick={() => { if (typeof window !== 'undefined') window.location.reload() }}
              style={{
                background: TEAL, color: '#fff',
                fontFamily: F, fontSize: 14, fontWeight: 700,
                border: 'none', borderRadius: 10,
                padding: '11px 22px', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Already completed ─────────────────────────────────────────────────
function AlreadyCompletedPage({ candidateName, token }) {
  const firstName = (candidateName || '').split(' ')[0] || ''
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '56px 36px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, #00BFA5, #009688)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: `0 0 0 6px #E6F7F5`,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: F, color: TX, fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
            You have already completed this assessment
          </h1>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}>
            Thank you{firstName ? `, ${firstName}` : ''}. Your results have been shared with the hiring team.
          </p>
          {token && (
            <div style={{ marginBottom: 28 }}>
              <a
                href={`/assess/${token}/feedback`}
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  borderRadius: 10,
                  background: '#00BFA5',
                  color: '#fff',
                  fontFamily: F, fontSize: 15, fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0,191,165,0.28)',
                }}
              >
                Leave feedback and view your report
              </a>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <ProdictaLogo textColor={NAVY} size={28} />
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── Simplified Mode (Reasonable Adjustments Layer 2) ────────────────────────
// Candidate self-controlled visual simplification. Persisted in localStorage
// keyed on the assessment token so a refresh mid-session preserves state.
// Auto-prefilled when the candidate previously declared 'simplified_ui' in
// their Layer 1 adjustment_request. Cleared on submit / quit by the parent.
//
// Visual-only: timer continues, scoring is unchanged, integrity signals are
// unaffected. The class is applied to document.body via a useEffect inside
// the parent so the cascade reaches every screen state (intro / resume /
// active / submitted) without per-screen wrapping.
function simplifiedModeKey(token) {
  return `prodicta_simplified_mode_${token}`
}

function readSimplifiedMode(token) {
  if (typeof window === 'undefined' || !token) return false
  try { return window.localStorage.getItem(simplifiedModeKey(token)) === 'true' } catch { return false }
}

function writeSimplifiedMode(token, value) {
  if (typeof window === 'undefined' || !token) return
  try {
    if (value) window.localStorage.setItem(simplifiedModeKey(token), 'true')
    else window.localStorage.removeItem(simplifiedModeKey(token))
  } catch {}
}

function clearSimplifiedMode(token) {
  if (typeof window === 'undefined' || !token) return
  try { window.localStorage.removeItem(simplifiedModeKey(token)) } catch {}
}

function SimplifiedModeToggle({ enabled, onChange, disabled = false }) {
  return (
    <div style={{ marginTop: 14, padding: '12px 16px', background: '#f7f9fb', border: `1px solid ${BD}`, borderRadius: 10, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <label htmlFor="pd-simplified-mode-switch" style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY, cursor: disabled ? 'default' : 'pointer' }}>
          Simplified mode
        </label>
        <button
          id="pd-simplified-mode-switch"
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={() => onChange(!enabled)}
          data-no-lift
          data-no-resize
          style={{
            width: 44, height: 26, borderRadius: 999,
            background: enabled ? TEAL : '#cbd5e1',
            border: 'none', position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s', flexShrink: 0,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: enabled ? 21 : 3,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
      <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: '6px 0 0', lineHeight: 1.55 }}>
        Reduces animations, simplifies the visual layout, and de-emphasises time pressure indicators. Your assessment time and scoring are not affected.
      </p>
    </div>
  )
}

// ─── Reasonable Adjustments (Layer 1 disclosure) ─────────────────────────────
// Inline form rendered between the privacy disclosure and the Start button on
// the candidate landing screen. Captures Equality Act 2010 adjustment requests
// for audit trail and informs the inviting agency / employer. The candidate is
// NEVER blocked from starting the assessment; this is a disclosure layer, not
// a workflow gate. The actual technical accommodations land in Layer 2.
const ADJUSTMENT_OPTIONS = [
  { key: 'screen_reader',   label: 'Screen reader compatibility needed' },
  { key: 'simplified_ui',   label: 'Simplified visual layout (reduced animations, simpler UI)' },
  { key: 'audio_response',  label: 'Audio or voice response instead of typing' },
  { key: 'frequent_breaks', label: 'Frequent breaks needed' },
  { key: 'other',           label: 'Other (please describe)' },
]

function AdjustmentsPanel({ uniqueToken, demoPreview = false }) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState({})
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [demoFlash, setDemoFlash] = useState(false)
  // Focus management refs. WCAG 2.4.3 (Focus Order) and authoring practice
  // for disclosure widgets: move focus into the expanded panel on open,
  // return focus to the trigger when the panel closes.
  const triggerRef = useRef(null)
  const firstCheckboxRef = useRef(null)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && firstCheckboxRef.current) {
      firstCheckboxRef.current.focus()
    } else if (!open && wasOpenRef.current && triggerRef.current) {
      triggerRef.current.focus()
    }
    wasOpenRef.current = open
  }, [open])

  // Pre-fill on first open if a request already exists for this candidate.
  useEffect(() => {
    if (!open || demoPreview) return
    if (!uniqueToken) return
    let cancelled = false
    fetch(`/api/assess/${uniqueToken}/adjustment-request`).then(async r => {
      if (!r.ok) return
      const data = await r.json().catch(() => null)
      if (cancelled) return
      const row = data?.request
      if (!row) return
      const sel = {}
      for (const t of (row.adjustment_types || [])) sel[t] = true
      setSelected(sel)
      setNotes(row.additional_notes || '')
      setSubmitted(true)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [open, uniqueToken, demoPreview])

  const tickedCount = Object.values(selected).filter(Boolean).length
  const canSubmit = tickedCount > 0 || notes.trim().length > 0

  function toggle(key) {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function reset() {
    setSelected({})
    setNotes('')
    setError(null)
  }

  async function submit() {
    if (!canSubmit || busy) return
    if (demoPreview) {
      setDemoFlash(true)
      setTimeout(() => setDemoFlash(false), 4000)
      return
    }
    setBusy(true)
    setError(null)
    const adjustment_types = ADJUSTMENT_OPTIONS.map(o => o.key).filter(k => selected[k])
    try {
      const res = await fetch(`/api/assess/${uniqueToken}/adjustment-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment_types, additional_notes: notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not save your request. Please try again.')
        setBusy(false)
        return
      }
      setSubmitted(true)
      setOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const linkLabel = submitted
    ? 'Adjustment request submitted, update if needed'
    : 'Need adjustments? Tell us'

  if (!open) {
    return (
      <div style={{ marginTop: 18, textAlign: 'center' }}>
        {submitted && (
          <p style={{
            fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.6,
            margin: '0 auto 10px', maxWidth: 480,
          }}>
            Thanks, we have logged your request and informed the agency or employer who invited you. Where possible, your adjustments will be applied automatically. You can start the assessment now.
          </p>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="pd-adjustments-panel"
          style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: F, fontSize: 13.5, color: TX2,
            textDecoration: 'underline', cursor: 'pointer',
          }}
        >
          {linkLabel}
        </button>
      </div>
    )
  }

  return (
    <div
      id="pd-adjustments-panel"
      role="region"
      aria-labelledby="pd-adjustments-heading"
      style={{
        marginTop: 18, padding: '20px 22px',
        background: '#f7f9fb', border: `1px solid ${BD}`, borderRadius: 12,
        textAlign: 'left',
      }}
    >
      <h2 id="pd-adjustments-heading" style={{
        fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
        margin: '0 0 6px', lineHeight: 1.4,
      }}>
        Tell us if you need any adjustments to take this assessment fairly
      </h2>
      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 16px', lineHeight: 1.6 }}>
        Tick any that apply. Your request is logged and the agency or employer who invited you is informed. Where possible, the assessment will accommodate your needs automatically.
      </p>

      <div role="group" aria-labelledby="pd-adjustments-heading" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {ADJUSTMENT_OPTIONS.map((opt, idx) => (
          <label key={opt.key} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontFamily: F, fontSize: 13.5, color: TX, lineHeight: 1.5, cursor: 'pointer',
          }}>
            <input
              ref={idx === 0 ? firstCheckboxRef : null}
              type="checkbox"
              checked={!!selected[opt.key]}
              onChange={() => toggle(opt.key)}
              style={{ marginTop: 3, accentColor: TEAL, cursor: 'pointer' }}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>

      <label htmlFor="pd-adjustments-notes" style={{
        display: 'block', fontFamily: F, fontSize: 13, fontWeight: 700,
        color: NAVY, marginBottom: 6,
      }}>
        Additional notes (optional)
      </label>
      <textarea
        id="pd-adjustments-notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Any additional information that would help us provide adjustments"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', borderRadius: 8,
          border: `1px solid ${BD}`, background: '#fff',
          fontFamily: F, fontSize: 13.5, color: TX,
          resize: 'vertical', minHeight: 70,
        }}
      />

      {error && (
        <p role="alert" style={{
          fontFamily: F, fontSize: 13, color: '#b91c1c',
          margin: '10px 0 0', lineHeight: 1.5,
        }}>{error}</p>
      )}

      {demoFlash && (
        <p role="status" style={{
          fontFamily: F, fontSize: 13, color: TX2,
          margin: '10px 0 0', lineHeight: 1.5,
        }}>
          Demo preview, in real assessments this logs the request and informs the agency or employer.
        </p>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginTop: 16, flexWrap: 'wrap',
      }}>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || busy}
          aria-disabled={!canSubmit || busy}
          style={{
            background: canSubmit && !busy ? TEAL : '#cbd5e1',
            color: canSubmit && !busy ? '#fff' : '#64748b',
            fontFamily: F, fontWeight: 700, fontSize: 14,
            border: 'none', borderRadius: 8,
            padding: '10px 22px',
            cursor: canSubmit && !busy ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); if (!submitted) reset() }}
          style={{
            background: 'none', border: 'none', padding: 0,
            fontFamily: F, fontSize: 13.5, color: TX2,
            textDecoration: 'underline', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── State: Intro ─────────────────────────────────────────────────────────────
// Minimal "Before you start" landing screen. Shows the role context, a brief
// AI/UK GDPR disclosure, and the Start button. Pressing Start is the consent
// action; a timestamp is recorded server-side via /api/assess/[token]/consent
// before navigation to the first scenario.
function IntroPage({ candidate, assessment, companyName, uniqueToken, simplifiedMode, onSimplifiedModeChange, onBegin }) {
  return (
    <>
      <NavBar candidateName={candidate.name} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <Card style={{ textAlign: 'center', padding: '48px 28px' }}>
          <h1 style={{
            fontFamily: F,
            fontWeight: 800,
            fontSize: 24,
            color: TX,
            margin: '0 0 36px',
            lineHeight: 1.3,
          }}>
            {assessment.role_title} assessment
            {companyName ? <> for <span style={{ color: TX }}>{companyName}</span></> : null}
          </h1>
          <p style={{
            fontFamily: F,
            color: TX2,
            fontSize: 15,
            lineHeight: 1.7,
            margin: '0 auto 36px',
            maxWidth: 520,
          }}>
            AI will analyse your responses to produce a structured report for the agency or employer who invited you. They make the hiring decision. Your data is held securely under UK GDPR.
          </p>
          <button
            onClick={onBegin}
            style={{
              background: TEAL,
              color: '#fff',
              fontFamily: F,
              fontWeight: 700,
              fontSize: 17,
              border: 'none',
              borderRadius: 12,
              padding: '16px 56px',
              cursor: 'pointer',
              letterSpacing: 0.2,
              boxShadow: `0 4px 20px ${TEAL}44`,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = TEALD}
            onMouseLeave={e => e.currentTarget.style.background = TEAL}
          >
            Start assessment
          </button>
          <SimplifiedModeToggle
            enabled={simplifiedMode}
            onChange={onSimplifiedModeChange}
          />
          <AdjustmentsPanel uniqueToken={uniqueToken} />
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Resume ────────────────────────────────────────────────────────────
// Replaces the IntroPage when the candidate has saved in-progress data on
// arrival. Continue rehydrates ActivePage from the saved blob; Start over
// shows a confirmation, then clears localStorage + the DB JSONB column and
// drops the candidate back to the standard intro screen as if fresh.
function ResumePage({ candidate, assessment, savedProgress, onContinue, onStartOver }) {
  const firstName = (candidate?.name || '').split(' ')[0] || ''
  const scenarios = assessment?.scenarios || []
  const completedCount = Math.max(0, Math.min(savedProgress?.scenarioIndex ?? 0, scenarios.length))
  const totalCount = scenarios.length
  const totalTakenSeconds = (savedProgress?.timeTakens || []).reduce((s, n) => s + (n || 0), 0)
  const totalMinutes = totalTakenSeconds > 0 ? Math.max(1, Math.round(totalTakenSeconds / 60)) : 0
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <>
      <NavBar candidateName={candidate?.name} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <Card style={{ textAlign: 'center', padding: '48px 28px' }}>
          <h1 style={{ fontFamily: F, fontWeight: 800, fontSize: 24, color: TX, margin: '0 0 12px', lineHeight: 1.3 }}>
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, lineHeight: 1.7, margin: '0 auto 32px', maxWidth: 480 }}>
            You completed scenario {completedCount} of {totalCount}. Continue where you left off?
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              onClick={onContinue}
              style={{
                background: TEAL, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 16,
                border: 'none', borderRadius: 12, padding: '14px 36px', cursor: 'pointer',
                letterSpacing: 0.2, boxShadow: `0 4px 16px ${TEAL}44`,
              }}
            >
              Continue assessment
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              style={{
                background: '#fff', color: NAVY, fontFamily: F, fontWeight: 700, fontSize: 16,
                border: `1.5px solid ${NAVY}`, borderRadius: 12, padding: '14px 28px', cursor: 'pointer',
                letterSpacing: 0.2,
              }}
            >
              Start over
            </button>
          </div>
          <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Your previous answers are saved.{totalMinutes > 0 ? ` Total time so far: ${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}.` : ''}
          </p>
        </Card>
        {confirmOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
          }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <h2 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: TX, margin: '0 0 10px' }}>
                Are you sure?
              </h2>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.6, margin: '0 0 24px' }}>
                Your previous answers will be deleted. You will start the assessment from the beginning.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmOpen(false)}
                  style={{
                    background: '#fff', color: TX2, fontFamily: F, fontWeight: 600, fontSize: 14,
                    border: `1px solid ${BD}`, borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmOpen(false); onStartOver() }}
                  style={{
                    background: NAVY, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14,
                    border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
                  }}
                >
                  Yes, start over
                </button>
              </div>
            </div>
          </div>
        )}
      </CentredCard>
    </>
  )
}

// ─── State: Active scenario ───────────────────────────────────────────────────
function ActivePage({ candidate, assessment, onSubmit, uniqueToken, initialProgress, voicePrefilled = false }) {
  const scenarios = assessment.scenarios || []

  // Resume hydration. When initialProgress is supplied (Resume page → Continue
  // path), seed local state from the saved blob. Otherwise initialize as
  // before. A 60s soft floor is applied to the resumed scenario's remaining
  // time so a candidate doesn't hit a cliff-edge expiry on resume.
  const startIndex = Math.max(0, Math.min(initialProgress?.scenarioIndex ?? 0, Math.max(0, scenarios.length - 1)))
  const [scenarioIndex, setScenarioIndex] = useState(startIndex)
  const [responses, setResponses] = useState(() =>
    scenarios.map((_, i) => initialProgress?.responses?.[i] ?? '')
  )
  const [timeTakens, setTimeTakens] = useState(() =>
    scenarios.map((s, i) => {
      const total = (s.timeMinutes || 10) * 60
      const saved = initialProgress?.timeTakens?.[i] ?? 0
      // 60s soft floor on the resumed scenario only: if the saved taken
      // would leave less than 60s remaining, backdate so remaining ~ 60s.
      if (i === startIndex && saved > 0 && total - saved < 60) {
        return Math.max(0, total - 60)
      }
      return saved
    })
  )
  const [timeLefts, setTimeLefts] = useState(() =>
    scenarios.map((s, i) => {
      const total = (s.timeMinutes || 10) * 60
      const saved = initialProgress?.timeTakens?.[i] ?? 0
      if (i === startIndex && saved > 0 && total - saved < 60) return 60
      return Math.max(0, total - saved)
    })
  )
  // Forced choice state, keyed by scenario index. Shape depends on forced_choice.type:
  //   ranking:        { type: 'ranking',        response: { ranked: [...strings] } }
  //   select_exclude: { type: 'select_exclude', response: { selected: [...], excluded: '...', excluded_reason: '...' } }
  //   trade_off:      { type: 'trade_off',      response: { choices: [...strings] } }
  const [forcedChoiceResponses, setForcedChoiceResponses] = useState(() =>
    initialProgress?.forcedChoiceResponses && typeof initialProgress.forcedChoiceResponses === 'object'
      ? initialProgress.forcedChoiceResponses
      : {}
  )

  // Ranked-actions state, keyed by scenario index. Each entry holds three
  // slots; each slot has an action label and a 1 to 2 sentence justification.
  // Persisted on the response row as `responses.ranked_actions`.
  const [rankedActions, setRankedActions] = useState(() => {
    const fresh = () => ({ slots: [
      { action: '', justification: '' },
      { action: '', justification: '' },
      { action: '', justification: '' },
    ]})
    const saved = initialProgress?.rankedActions
    return Object.fromEntries(scenarios.map((_, i) => {
      const candidate = saved && (saved[i] || saved[String(i)])
      if (candidate && Array.isArray(candidate.slots)) {
        return [i, { slots: candidate.slots.map(s => ({
          action: s?.action || '',
          justification: s?.justification || '',
        })) }]
      }
      return [i, fresh()]
    }))
  })

  // In-scenario interruption state. After the candidate has filled in all
  // three ranked-action slots, a deterministic 30% gate per scenario fires
  // an interruption modal. Persisted as `responses.interruption_response`.
  const [scenarioInterruption, setScenarioInterruption] = useState({})
  const [interruptionModalOpen, setInterruptionModalOpen] = useState(false)
  const [interruptionDraftSlots, setInterruptionDraftSlots] = useState([
    { action: '', justification: '' },
    { action: '', justification: '' },
    { action: '', justification: '' },
  ])
  const [interruptionDraftReasoning, setInterruptionDraftReasoning] = useState('')

  // Micro-behaviour signal tracking, one entry per scenario.
  // Raw tracking state: captured as the candidate interacts with the scenario.
  // Final computed signals are derived on scenario advance inside handleNext.
  const [microRaw, setMicroRaw] = useState(() => scenarios.map(() => ({
    scenario_shown_time: null,
    first_keystroke_time: null,
    total_chars_typed: 0,
    reached_80_at: null,
  })))
  const [microSignals, setMicroSignals] = useState(() => scenarios.map(() => null))

  // Role level and voice recording state
  const mode = (assessment.assessment_mode || 'standard').toLowerCase()
  const roleLevel = assessment.role_level || 'MID_LEVEL'
  const isOperational = roleLevel === 'OPERATIONAL'
  const isLeadership = roleLevel === 'LEADERSHIP'
  // Default rule preserved for the standard candidate experience.
  // Reasonable Adjustments Layer 2: when the candidate previously declared
  // 'audio_response' in their Layer 1 adjustment_request, force the toggle
  // visible regardless of mode / role-level so candidates with motor or
  // dyslexia-related needs can use voice on Speed-Fit and Rapid Screen too.
  const showRecordToggle = voicePrefilled || (mode !== 'quick' && mode !== 'rapid' && !isOperational)
  const [inputModes, setInputModes] = useState(scenarios.map(() => voicePrefilled ? 'record' : 'type')) // 'type' or 'record'
  const [audioBlobs, setAudioBlobs] = useState(scenarios.map(() => null))
  const [audioUrls, setAudioUrls] = useState(scenarios.map(() => null))
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recordTimerRef = useRef(null)
  const audioChunksRef = useRef([])
  // Permission and announcement state for the voice-recording flow.
  // micPermissionState replaces the previous inline alert() calls so a
  // permission denial degrades gracefully back to typing instead of
  // popping a blocking alert. recordAnnouncement drives the visually
  // hidden aria-live span that surfaces start / stop events to screen
  // reader candidates.
  const [micPermissionState, setMicPermissionState] = useState('unknown') // 'unknown' | 'denied' | 'unsupported' | 'ok'
  const [recordAnnouncement, setRecordAnnouncement] = useState('')
  const [voicePrefillNoticeDismissed, setVoicePrefillNoticeDismissed] = useState(false)
  // Empty-submission validation (per audit follow-up). Held per-scenario
  // so a stale error from scenario N doesn't bleed into scenario N+1.
  // submitError shape: { type: 'type' | 'record', message: string } | null.
  const [submitError, setSubmitError] = useState(null)
  const responseTextareaRef = useRef(null)
  const recordButtonRef = useRef(null)
  const forcedChoiceContainerRef = useRef(null)

  // Inbox Overload state
  const showInbox = mode !== 'quick' && mode !== 'rapid' && assessment.inbox_events?.scenarios
  const inboxData = showInbox ? (assessment.inbox_events.scenarios || []) : []
  const currentInbox = inboxData.find(s => s.scenario_index === scenarioIndex) || null
  const [inboxActions, setInboxActions] = useState({}) // { `${scenarioIdx}-${itemIdx}`: 'action'|'defer' }
  const [inboxNotes, setInboxNotes] = useState({}) // { `${scenarioIdx}`: 'reason for deferral' }
  const [interruptionVisible, setInterruptionVisible] = useState(false)
  const [interruptionResponse, setInterruptionResponse] = useState({}) // { scenarioIdx: 'reply_now'|'note_later'|'focus' }
  const [interruptionReply, setInterruptionReply] = useState({}) // { scenarioIdx: 'text' }
  const [interruptionDismissed, setInterruptionDismissed] = useState({})
  const interruptionTimerRef = useRef(null)

  function startRecording() {
    // Guard against non-secure contexts / older browsers where mediaDevices
 // is undefined or null, reading `.getUserMedia` off that crashes with a
    // TypeError otherwise.
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermissionState('unsupported')
      setRecordAnnouncement('Voice recording is not supported on this browser. Use typing instead.')
      // Fall back to typing so the candidate is not stuck.
      setInputModes(prev => { const n = [...prev]; n[scenarioIndex] = 'type'; return n })
      return
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      setMicPermissionState('ok')
      audioChunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlobs(prev => { const n = [...prev]; n[scenarioIndex] = blob; return n })
        setAudioUrls(prev => { const n = [...prev]; n[scenarioIndex] = url; return n })
        setRecording(false)
        clearInterval(recordTimerRef.current)
        setRecordAnnouncement(`Recording stopped. Audio captured.`)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
      setRecordTime(0)
      setRecordAnnouncement('Recording started. Press Space or the Stop button to finish. Press Escape to cancel.')
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => {
          if (prev >= 59) { mr.stop(); return 60 }
          return prev + 1
        })
      }, 1000)
    }).catch(() => {
      setMicPermissionState('denied')
      setRecordAnnouncement('Microphone access was denied. Switched to typing.')
      // Fall back to typing automatically so the candidate is never blocked.
      setInputModes(prev => { const n = [...prev]; n[scenarioIndex] = 'type'; return n })
    })
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function cancelRecording() {
    // Escape key during recording. Stops the MediaRecorder and discards
    // anything captured so far. Differs from stopRecording in that no audio
    // blob is committed to the responses array.
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return
    audioChunksRef.current = []
    mediaRecorderRef.current.stop()
    setRecordAnnouncement('Recording cancelled. No audio saved.')
  }

  // Auto-clear submit error once the candidate fixes the cause: typed text
  // becomes non-empty, or a recording exists, the forced-choice picker
  // moves into a complete state, the input mode flips, or the candidate
  // moves to a different scenario.
  useEffect(() => {
    if (!submitError) return
    if (submitError.type === 'type' && (responses[scenarioIndex] || '').trim().length > 0) {
      setSubmitError(null)
      return
    }
    if (submitError.type === 'record' && audioBlobs[scenarioIndex]) {
      setSubmitError(null)
      return
    }
    if (submitError.type === 'forced_choice') {
      const sc = scenarios[scenarioIndex]
      const fc = sc?.forced_choice
      const v = forcedChoiceResponses[scenarioIndex]
      if (!fc) return
      let stillIncomplete = true
      if (fc.type === 'ranking') {
        const ranked = v?.response?.ranked
        stillIncomplete = !v || !Array.isArray(ranked) || ranked.length === 0
      } else if (fc.type === 'select_exclude') {
        const selectCount = fc.select_count || 3
        const sel = v?.response?.selected || []
        const exc = v?.response?.excluded
        stillIncomplete = sel.length < selectCount || !exc
      } else if (fc.type === 'trade_off') {
        const choices = v?.response?.choices || []
        const pairs = fc.pairs || []
        const made = choices.filter(Boolean).length
        stillIncomplete = pairs.length > 0 && made < pairs.length
      }
      if (!stillIncomplete) setSubmitError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, audioBlobs, forcedChoiceResponses, scenarioIndex, submitError?.type])

  useEffect(() => {
    setSubmitError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputModes[scenarioIndex], scenarioIndex])

  // Keyboard shortcuts for voice mode. Space toggles record / stop, Escape
  // cancels in flight. Only active when the current scenario is in 'record'
  // mode AND focus is not inside a text input (so Space in a textarea or
  // notes field still types a literal space). Bound at document-level so
  // candidates can hit Space without first focusing the record button.
  useEffect(() => {
    if (inputModes[scenarioIndex] !== 'record') return
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || ''
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)
      if (isEditable) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (recording) stopRecording()
        else if (!audioUrls[scenarioIndex]) startRecording()
      } else if (e.key === 'Escape' && recording) {
        e.preventDefault()
        cancelRecording()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputModes, scenarioIndex, recording, audioUrls])

  function clearRecording() {
    if (audioUrls[scenarioIndex]) URL.revokeObjectURL(audioUrls[scenarioIndex])
    setAudioBlobs(prev => { const n = [...prev]; n[scenarioIndex] = null; return n })
    setAudioUrls(prev => { const n = [...prev]; n[scenarioIndex] = null; return n })
    setRecordTime(0)
  }

  const intervalRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  // Snapshot of timeTakens[scenarioIndex] at the moment we (re)entered the
  // scenario. The interval below adds wall-clock elapsed since this moment
  // ON TOP OF this baseline, so a resumed scenario continues counting from
  // its previously-elapsed seconds rather than resetting to zero.
  const initialTakenRef = useRef(0)

  // ── Auto-save: localStorage + DB ──────────────────────────────────────────
  // Subtle "Saved" indicator that flashes briefly after each persistence call
  // and fades after 2 seconds. Positioned bottom-right of the viewport so it
  // doesn't displace the response area or compete with the timer.
  const [savedFlash, setSavedFlash] = useState(false)
  const savedFlashTimeoutRef = useRef(null)

  // persistProgressNow snapshots the persisted-shape fields and writes them
  // to localStorage synchronously and to the DB endpoint as a fire-and-forget
  // POST. Idempotent: a refresh-Continue cycle just rewrites the same blob.
  // Audio recordings, micro-signals, inbox/interruption state, and modes are
  // intentionally NOT persisted in this MVP - those reset on resume.
  function persistProgressNow() {
    if (!uniqueToken) return
    const state = {
      scenarioIndex,
      responses,
      timeTakens,
      rankedActions,
      forcedChoiceResponses,
      lastSavedAt: new Date().toISOString(),
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(progressStorageKey(uniqueToken), JSON.stringify(state))
      }
    } catch {}
    fetch(`/api/assess/${uniqueToken}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {})
    setSavedFlash(true)
    if (savedFlashTimeoutRef.current) clearTimeout(savedFlashTimeoutRef.current)
    savedFlashTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2000)
  }

  // Ref so the heartbeat interval below sees the latest closure on every
  // tick without forcing the interval to be re-created each render.
  const persistProgressNowRef = useRef(persistProgressNow)
  useEffect(() => { persistProgressNowRef.current = persistProgressNow })

  // Heartbeat save: every 30 seconds, regardless of user activity. Captures
  // the latest timeTakens / responses / ranked actions / forced choice
  // without thrashing the React render tree (no state read in the deps).
  useEffect(() => {
    if (!uniqueToken) return
    const id = setInterval(() => {
      persistProgressNowRef.current()
    }, 30000)
    return () => clearInterval(id)
  }, [uniqueToken])

  // Immediate save when scenarioIndex changes (i.e. on Next click). Ensures a
  // crash right after advance still has the just-completed scenario's response
  // and the new scenarioIndex on disk. Skipped on first render via a ref.
  const lastSavedScenarioIndexRef = useRef(scenarioIndex)
  useEffect(() => {
    if (lastSavedScenarioIndexRef.current !== scenarioIndex) {
      lastSavedScenarioIndexRef.current = scenarioIndex
      persistProgressNowRef.current()
    }
  }, [scenarioIndex])

  const scenario = scenarios[scenarioIndex]
  const isLast = scenarioIndex === scenarios.length - 1

 // Interruption trigger, 90 seconds into each scenario
  useEffect(() => {
    if (!showInbox || !currentInbox?.interruption || interruptionDismissed[scenarioIndex]) return
    setInterruptionVisible(false)
    const t = setTimeout(() => {
      if (!interruptionDismissed[scenarioIndex]) setInterruptionVisible(true)
    }, 90000)
    interruptionTimerRef.current = setTimeout(() => {
      setInterruptionVisible(false)
      setInterruptionDismissed(prev => ({ ...prev, [scenarioIndex]: true }))
    }, 105000) // auto-dismiss after 15 seconds
    return () => { clearTimeout(t); clearTimeout(interruptionTimerRef.current) }
  }, [scenarioIndex, showInbox])

  // Start/restart timer whenever scenarioIndex changes
  useEffect(() => {
    startTimeRef.current = Date.now()
    // Capture the time already taken on this scenario (zero on fresh entry,
    // or the previously-elapsed seconds when resuming). The interval below
    // accumulates on top so resumed sessions continue counting forward.
    initialTakenRef.current = timeTakens[scenarioIndex] || 0

    // Micro-signal: record when the scenario was first shown to the candidate.
    // Only set once per scenario so revisits (if any) don't overwrite.
    setMicroRaw(prev => {
      const next = [...prev]
      if (!next[scenarioIndex]) next[scenarioIndex] = { scenario_shown_time: null, first_keystroke_time: null, total_chars_typed: 0, reached_80_at: null }
      if (!next[scenarioIndex].scenario_shown_time) {
        next[scenarioIndex] = { ...next[scenarioIndex], scenario_shown_time: Date.now() }
      }
      return next
    })

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const sinceEntry = Math.floor((Date.now() - startTimeRef.current) / 1000)
      const totalTaken = (initialTakenRef.current || 0) + sinceEntry

      setTimeTakens(prev => {
        const next = [...prev]
        next[scenarioIndex] = totalTaken
        return next
      })

      setTimeLefts(prev => {
        const next = [...prev]
        const total = (scenarios[scenarioIndex]?.timeMinutes || 10) * 60
        next[scenarioIndex] = Math.max(0, total - totalTaken)
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [scenarioIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gate the in-scenario interruption: fires once per scenario, only when the
  // candidate has filled all three ranked slots and the deterministic 30%
  // gate based on (assessment.id, scenarioIndex) returns true. Opens the
  // modal seeded with the candidate's current slots; resolution writes to
  // scenarioInterruption[scenarioIndex] and the candidate continues.
  function maybeFireInterruption() {
    if (interruptionModalOpen) return false
    if (scenarioInterruption[scenarioIndex]?.fired) return false
    const slots = rankedActions[scenarioIndex]?.slots || []
    if (!rankedSlotsAreFullyFilled(slots)) return false
    if (!scenarios[scenarioIndex]?.interruption) return false
    const keying = assessment.interruption_keying === 'assessment' ? 'assessment' : 'candidate'
    if (!shouldFireInterruption(keying, assessment.id, candidate.id, scenarioIndex)) return false
    setInterruptionDraftSlots(slots.map(s => ({ action: s.action, justification: s.justification })))
    setInterruptionDraftReasoning('')
    setInterruptionModalOpen(true)
    return true
  }

  async function handleNext() {
    if (maybeFireInterruption()) return

    // Submission guard. Three paths:
    //   - free-text scenarios: must have non-empty typed text or a
    //     recorded audio blob (commit 3eea13d).
    //   - forced-choice scenarios: picker must be complete per its type
    //     (ranking interacted with at least once; select-exclude has
    //     enough selections plus an excluded option; trade-off has every
    //     pair decided). Respects scenario JSON config for selectCount
    //     and the pairs/items arrays.
    //   - workspace + calendar day-one: separate flows, never reach
    //     handleNext.
    // Validation is client-side only; the server still accepts whatever
    // it gets so this is a UX guard rail, not a security boundary. Timer
    // keeps running during the error display.
    const currentScenario = scenarios[scenarioIndex]
    if (currentScenario && !currentScenario.forced_choice) {
      const inputMode = inputModes[scenarioIndex]
      if (inputMode === 'type') {
        const trimmed = (responses[scenarioIndex] || '').trim()
        if (trimmed.length === 0) {
          setSubmitError({ type: 'type', message: 'Please write a response before continuing.' })
          if (responseTextareaRef.current) {
            try { responseTextareaRef.current.focus() } catch {}
          }
          return
        }
      } else if (inputMode === 'record') {
        if (!audioBlobs[scenarioIndex]) {
          setSubmitError({ type: 'record', message: 'Please record a response before continuing.' })
          if (recordButtonRef.current) {
            try { recordButtonRef.current.focus() } catch {}
          }
          return
        }
      }
      // Validation passed: clear any stale error before continuing.
      if (submitError) setSubmitError(null)
    } else if (currentScenario && currentScenario.forced_choice) {
      const fc = currentScenario.forced_choice
      const fcVal = forcedChoiceResponses[scenarioIndex]
      let fcError = null
      if (fc.type === 'ranking') {
        // value is set only once the candidate makes a move (RankingChoice
        // does not auto-commit on mount). An undefined response means the
        // candidate never engaged with the picker at all.
        const rankedArr = fcVal?.response?.ranked
        if (!fcVal || !Array.isArray(rankedArr) || rankedArr.length === 0) {
          fcError = 'Please rank the items in your preferred order before continuing.'
        }
      } else if (fc.type === 'select_exclude') {
        const selectCount = fc.select_count || 3
        const sel = fcVal?.response?.selected || []
        const exc = fcVal?.response?.excluded
        if (sel.length < selectCount) {
          const remaining = selectCount - sel.length
          fcError = sel.length === 0
            ? `Please select ${selectCount} option${selectCount === 1 ? '' : 's'} before continuing.`
            : `Please select ${remaining} more option${remaining === 1 ? '' : 's'} before continuing.`
        } else if (!exc) {
          fcError = 'Please choose one option to exclude before continuing.'
        }
      } else if (fc.type === 'trade_off') {
        const choices = fcVal?.response?.choices || []
        const pairs = fc.pairs || []
        const made = choices.filter(Boolean).length
        if (pairs.length === 0) {
          // Defensive: no pairs configured means there is nothing to validate.
        } else if (made < pairs.length) {
          const remaining = pairs.length - made
          fcError = made === 0
            ? `Please choose an option for ${pairs.length === 1 ? 'this trade-off' : `each of the ${pairs.length} trade-offs`} before continuing.`
            : `Please make ${remaining} more decision${remaining === 1 ? '' : 's'} before continuing.`
        }
      }
      if (fcError) {
        setSubmitError({ type: 'forced_choice', message: fcError })
        // Move focus to the first interactive control inside the picker
        // so the candidate can immediately act. Falls back to the
        // container itself if no focusable child is found.
        const block = forcedChoiceContainerRef.current
        if (block) {
          try {
            const focusable = block.querySelector('button:not([disabled]), [tabindex="0"]')
            if (focusable) focusable.focus()
            else if (typeof block.focus === 'function') block.focus()
          } catch {}
        }
        return
      }
      if (submitError) setSubmitError(null)
    }

    // Snapshot current time taken before switching. Accumulates wall-clock
    // elapsed since scenario entry on top of any previously-saved baseline,
    // so resumed sessions don't lose their pre-resume time on advance.
    const sinceEntry = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const totalTaken = (initialTakenRef.current || 0) + sinceEntry
    setTimeTakens(prev => {
      const next = [...prev]
      next[scenarioIndex] = totalTaken
      return next
    })

    // Compute and freeze the micro-signals for the scenario we are leaving.
    // Uses raw tracking state plus the final response text.
    const nowTs = Date.now()
    const rawCur = microRaw[scenarioIndex] || {}
    const responseText = responses[scenarioIndex] || ''
    const finalWords = (responseText.trim().match(/\S+/g) || []).length
    const finalChars = responseText.length
    const shownAt = rawCur.scenario_shown_time || startTimeRef.current || nowTs
    const firstKeyAt = rawCur.first_keystroke_time || nowTs
    const totalSecs = Math.max(1, Math.round((nowTs - shownAt) / 1000))
    const timeToFirstKey = rawCur.first_keystroke_time
      ? Math.max(0, Math.round((firstKeyAt - shownAt) / 1000))
      : totalSecs
    const wpm = finalWords > 0 ? Math.round((finalWords / (totalSecs / 60)) * 10) / 10 : 0
    const typed = rawCur.total_chars_typed || 0
    const editRatio = typed > 0 ? Math.round((finalChars / typed) * 100) / 100 : 1
    let completionPattern = 'considered'
    if (finalWords < 50) {
      completionPattern = 'minimal'
    } else if (rawCur.reached_80_at && (nowTs - rawCur.reached_80_at) < 10000) {
      completionPattern = 'immediate'
    }
    const frozenSignals = {
      time_to_first_keystroke_seconds: timeToFirstKey,
      total_time_seconds: totalSecs,
      words_per_minute: wpm,
      edit_ratio: editRatio,
      completion_pattern: completionPattern,
    }
    setMicroSignals(prev => {
      const next = [...prev]
      next[scenarioIndex] = frozenSignals
      return next
    })

    if (isLast) {
      clearInterval(intervalRef.current)
      // Upload any audio recordings to Supabase Storage
      const uploadedAudioUrls = [...audioUrls]
      for (let idx = 0; idx < scenarios.length; idx++) {
        if (audioBlobs[idx]) {
          try {
            const { createClient } = await import('@/lib/supabase')
            const supabase = createClient()
            const path = `recordings/${assessment.id}/${candidate.id}/scenario_${idx}.webm`
            const { error: upErr } = await supabase.storage.from('recordings').upload(path, audioBlobs[idx], {
              contentType: 'audio/webm', upsert: true,
            })
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('recordings').getPublicUrl(path)
              uploadedAudioUrls[idx] = urlData?.publicUrl || null
            }
          } catch {}
        }
      }

      const payload = scenarios.map((_, i) => {
        const slots = rankedActions[i]?.slots || []
        const rankedActionsPayload = rankedSlotsHaveAtLeastOneAction(slots)
          ? { slots: slots.map((s, idx) => ({
                rank: idx + 1,
                action: (s?.action || '').trim(),
                justification: (s?.justification || '').trim(),
              })),
              submitted_at: new Date().toISOString() }
          : null
        // Compose the free-text response: if the candidate also wrote text,
        // use that; otherwise derive a readable text representation from the
        // ranked actions so downstream code (scoring, narrative rendering)
        // still has a `response_text` to read.
        const freeText = (responses[i] || '').trim()
        const responseText = freeText
          ? (rankedActionsPayload ? `${rankedActionsToText(slots)}\n\nAdditional context:\n${freeText}` : freeText)
          : (rankedActionsPayload ? rankedActionsToText(slots) : (audioBlobs[i] ? '[Voice response recorded]' : ''))
        return {
          scenario_index: i,
          response_text: responseText,
          time_taken_seconds: i === scenarioIndex ? elapsed : timeTakens[i],
          audio_url: uploadedAudioUrls[i] || null,
          input_mode: inputModes[i],
          inbox_responses: currentInbox ? (currentInbox.inbox_items || []).map((item, idx) => ({
            item: item.subject,
            action: inboxActions[`${i}-${idx}`] || 'no_action',
          })) : null,
          interruption_response: interruptionResponse[i] || null,
          interruption_reply: interruptionReply[i] || null,
          inbox_note: inboxNotes[i] || null,
          forced_choice_response: forcedChoiceResponses[i] || null,
          ranked_actions: rankedActionsPayload,
          scenario_interruption: scenarioInterruption[i] || null,
        }
      })
      // Build the final micro_signals array. Include the signals we just froze
      // for the last scenario even though setMicroSignals above is async.
      const finalMicroSignals = microSignals.map((s, idx) =>
        idx === scenarioIndex ? frozenSignals : s
      )
      onSubmit({ responses: payload, micro_signals: finalMicroSignals })
    } else {
      setScenarioIndex(i => i + 1)
    }
  }

  const timeLeft = timeLefts[scenarioIndex]
  const isTimeLow = timeLeft < 60
  // Visually-hidden live-region announcement for screen-reader candidates.
  // Fires once when the timer crosses the 60-second threshold and once when
  // it reaches zero. The visual timer is read continuously by sighted users
  // but unannounced to screen readers; this surfaces the same warning.
  const timerAnnouncement = (() => {
    if (timeLeft === 0) return 'Time has ended for this scenario.'
    if (timeLeft === 60) return 'One minute remaining for this scenario.'
    return ''
  })()

  return (
    <>
      <span
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {timerAnnouncement}
      </span>
      <NavBar candidateName={candidate.name} />
      {savedFlash && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
            background: '#fff', border: `1px solid ${TEAL}55`, borderRadius: 10,
            padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: F, fontSize: 13, fontWeight: 600, color: TEALD,
            boxShadow: '0 4px 14px rgba(0,191,165,0.18)',
          }}
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Your response has been saved
        </div>
      )}
      <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
        {/* Progress + timer bar */}
        <div style={{
          background: CARD,
          borderBottom: `1px solid ${BD}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          position: 'sticky',
          top: 56,
          zIndex: 90,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            {!isOperational && (
              <span style={{ fontFamily: F, fontSize: 14, color: TX2, whiteSpace: 'nowrap' }}>
                {isLeadership ? `Step ${scenarioIndex + 1} of ${scenarios.length}` : `Scenario ${scenarioIndex + 1} of ${scenarios.length}`}
              </span>
            )}
            <div style={{
              flex: 1,
              height: 6,
              background: BD,
              borderRadius: 99,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((scenarioIndex + 1) / scenarios.length) * 100}%`,
                background: TEAL,
                borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
          <div className={isTimeLow ? 'timer-warning' : undefined} style={{
            fontFamily: FM,
            fontSize: 16,
            fontWeight: 600,
            color: isTimeLow ? '#dc2626' : TX,
            minWidth: 56,
            textAlign: 'right',
          }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 80px' }}>
          {/* Interruption Toast */}
          {interruptionVisible && currentInbox?.interruption && !interruptionResponse[scenarioIndex] && (
            <div style={{
              position: 'fixed', top: 80, right: 20, zIndex: 500, width: 340, maxWidth: 'calc(100vw - 40px)',
              background: CARD, border: `1.5px solid ${BD}`, borderRadius: 12,
              boxShadow: '0 8px 32px rgba(15,33,55,0.18)', padding: '16px 18px',
              animation: 'slideIn 0.3s ease',
            }}>
              <style>{`@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: TEAL, flexShrink: 0 }}>
                  {currentInbox.interruption.sender?.[0] || 'M'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX }}>{currentInbox.interruption.sender} <span style={{ fontWeight: 500, color: TX3 }}>({currentInbox.interruption.role})</span></div>
                  <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.5 }}>{currentInbox.interruption.message}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'reply_now', label: 'Reply now' },
                  { key: 'note_later', label: 'Note for later' },
                  { key: 'focus', label: 'Stay focused' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setInterruptionResponse(prev => ({ ...prev, [scenarioIndex]: opt.key }))
                    setInterruptionVisible(false)
                    setInterruptionDismissed(prev => ({ ...prev, [scenarioIndex]: true }))
                  }} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    fontFamily: F, cursor: 'pointer',
                    background: opt.key === 'reply_now' ? TEALLT : opt.key === 'focus' ? BG : '#FEF3C7',
                    border: `1px solid ${opt.key === 'reply_now' ? `${TEAL}55` : opt.key === 'focus' ? BD : '#FCD34D'}`,
                    color: opt.key === 'reply_now' ? TEALD : opt.key === 'focus' ? TX2 : '#92400E',
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reply field if they chose reply_now */}
          {interruptionResponse[scenarioIndex] === 'reply_now' && !interruptionReply[scenarioIndex] && currentInbox?.interruption && (
            <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEALD, marginBottom: 6 }}>Quick reply to {currentInbox.interruption.sender}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Type your quick reply..."
                  onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) setInterruptionReply(prev => ({ ...prev, [scenarioIndex]: e.target.value.trim() })) }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, outline: 'none' }}
                />
                <button onClick={e => {
                  const input = e.target.previousSibling
                  if (input.value.trim()) setInterruptionReply(prev => ({ ...prev, [scenarioIndex]: input.value.trim() }))
                }} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          )}

          {/* Inbox Panel */}
          {showInbox && currentInbox && (
            <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your inbox</div>
                <div style={{ fontFamily: F, fontSize: 11, color: TX3 }}>These arrived at the same time as this scenario</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(currentInbox.inbox_items || []).map((item, idx) => {
                  const key = `${scenarioIndex}-${idx}`
                  const action = inboxActions[key]
                  const priorityStyles = {
                    urgent: { bg: '#FEF2F2', bd: '#fecaca', color: '#dc2626', label: 'URGENT' },
                    action_needed: { bg: '#FEF3C7', bd: '#FCD34D', color: '#92400E', label: 'ACTION NEEDED' },
                    today: { bg: BG, bd: BD, color: NAVY, label: 'TODAY' },
                  }
                  const ps = priorityStyles[item.priority] || priorityStyles.today
                  return (
                    <div key={idx} style={{ background: ps.bg, border: `1px solid ${ps.bd}`, borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: ps.color, background: `${ps.color}18`, padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase', flexShrink: 0 }}>{ps.label}</span>
                          <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX }}>{item.sender}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => setInboxActions(prev => ({ ...prev, [key]: 'action' }))} style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                            background: action === 'action' ? TEALLT : '#fff', border: `1px solid ${action === 'action' ? TEAL : BD}`,
                            color: action === 'action' ? TEALD : TX3,
                          }}>Handle now</button>
                          <button onClick={() => setInboxActions(prev => ({ ...prev, [key]: 'defer' }))} style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                            background: action === 'defer' ? '#FEF3C7' : '#fff', border: `1px solid ${action === 'defer' ? '#FCD34D' : BD}`,
                            color: action === 'defer' ? '#92400E' : TX3,
                          }}>Defer</button>
                        </div>
                      </div>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 2 }}>{item.subject}</div>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{item.preview}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={inboxNotes[scenarioIndex] || ''}
                  onChange={e => setInboxNotes(prev => ({ ...prev, [scenarioIndex]: e.target.value }))}
                  placeholder="Optional: why did you defer or prioritise certain items?"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12.5, color: TX, outline: 'none' }}
                />
              </div>
            </div>
          )}

          <Card style={isOperational ? { background: '#f8f9fb', border: 'none', boxShadow: 'none', padding: '16px' } : {}}>
            {scenario.candidate_label && (
              <div style={{
                fontFamily: F, fontSize: 13, fontStyle: 'italic', color: TX3,
                marginBottom: 14, lineHeight: 1.55,
              }}>
                {scenario.candidate_label}
              </div>
            )}
            {isOperational ? (
              <>
                {/* Chat-style scenario display for operational roles */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: TEAL,
                  }}>Mgr</div>
                  <div style={{
                    background: CARD, border: `1px solid ${BD}`, borderRadius: '4px 16px 16px 16px',
                    padding: '14px 18px', flex: 1,
                  }}>
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEALD, marginBottom: 6 }}>Your manager</div>
                    <p style={{ fontFamily: F, fontSize: 15, color: TX, margin: '0 0 10px', lineHeight: 1.65 }}>{scenario.context}</p>
                    <div style={{ background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX, margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{scenario.task}</p>
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX3, textAlign: 'center', marginBottom: 8 }}>
                  Aim for 50-100 words. Be direct.
                </div>
              </>
            ) : (
              <>
                {/* Standard / Leadership scenario display */}
                <div style={{ marginBottom: 20 }}>
                  {isLeadership && (
                    <div style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: NAVY, background: '#E8B84B22', border: '1px solid #E8B84B55', padding: '4px 12px', borderRadius: 6, display: 'inline-block', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Boardroom Context
                    </div>
                  )}
                  <span style={typeBadgeStyle(scenario.type)}>{scenario.type}</span>
                  <h1 style={{ fontFamily: F, fontWeight: 700, fontSize: 22, color: TX, margin: '12px 0 0' }}>
                    {scenario.title}
                  </h1>
                </div>
                <div style={{
                  background: BG, border: `1px solid ${BD}`, borderRadius: 10,
                  padding: '18px 20px', marginBottom: 20,
                }}>
                  <div style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    {isLeadership ? 'Situation' : 'Context'}
                  </div>
                  <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {scenario.context}
                  </p>
                </div>
              </>
            )}

 {/* Task (hidden for operational, already in chat bubble) */}
            <div style={{
              background: TEALLT,
              border: `1px solid ${TEAL}55`,
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
              display: isOperational ? 'none' : 'block',
            }}>
              <div style={{
                fontFamily: F,
                fontSize: 12,
                fontWeight: 600,
                color: TEALD,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>
                Your Task
              </div>
              <p style={{
                fontFamily: F,
                fontSize: 15,
                fontWeight: 500,
                color: TX,
                margin: 0,
                lineHeight: 1.6,
              }}>
                {scenario.task}
              </p>
            </div>

            {/* Forced choice mechanic (Step 1).
                Wrapped in a focusable container so the submit-validation
                guard can move focus into the picker on a completeness
                failure. aria-invalid signals the error state to assistive
                tech; aria-describedby points at the inline error banner
                rendered just above the Submit button. */}
            {scenario.forced_choice && (
              <div
                ref={forcedChoiceContainerRef}
                tabIndex={-1}
                aria-invalid={submitError?.type === 'forced_choice' ? 'true' : undefined}
                aria-describedby={submitError?.type === 'forced_choice' ? `pd-response-error-${scenarioIndex}` : undefined}
                style={{ outline: 'none' }}
              >
                <ForcedChoiceBlock
                  scenarioIndex={scenarioIndex}
                  spec={scenario.forced_choice}
                  value={forcedChoiceResponses[scenarioIndex]}
                  onChange={(next) => setForcedChoiceResponses(prev => ({ ...prev, [scenarioIndex]: next }))}
                />
              </div>
            )}

            {/* Ranked actions: three slots, action plus 1 to 2 sentence justification, reorderable */}
            <RankedActionsBlock
              slots={rankedActions[scenarioIndex]?.slots || []}
              onChange={(nextSlots) => setRankedActions(prev => ({
                ...prev,
                [scenarioIndex]: { slots: nextSlots },
              }))}
            />
            {scenarioInterruption[scenarioIndex]?.fired && (
              <div style={{
                background: TEALLT, border: `1px solid ${TEAL}55`, borderRadius: 10,
                padding: '12px 16px', marginTop: 12,
              }}>
                <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEALD, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Interruption logged
                </div>
                <div style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
                  Your response to the in-scenario interruption has been recorded. {scenarioInterruption[scenarioIndex]?.changedRanking ? 'You revised your ranking.' : 'You held your original ranking.'}
                </div>
              </div>
            )}

            {/* Textarea */}
            <div>
              <label style={{
                fontFamily: F,
                fontSize: 13,
                fontWeight: 600,
                color: TX2,
                display: 'block',
                marginBottom: 8,
              }}>
                {scenario.forced_choice ? 'Step 2: Explain your thinking' : 'Your Response'}
              </label>
              {scenario.forced_choice && (
                <div style={{ fontFamily: F, fontSize: 13, color: TX2, marginBottom: 10, lineHeight: 1.55 }}>
                  Now explain the reasoning behind your decisions above. What factors drove your choices?
                </div>
              )}

              {/* Visually-hidden live region for record state announcements. */}
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{ position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}
              >
                {recordAnnouncement}
              </span>

              {/* Voice recording toggle */}
              {showRecordToggle && (
                <>
                  {voicePrefilled && !voicePrefillNoticeDismissed && (
                    <div role="note" style={{
                      marginBottom: 12, padding: '10px 14px',
                      background: '#e6f7f5', border: '1px solid #80dfd2', borderLeft: `4px solid ${TEAL}`,
                      borderRadius: 8, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                    }}>
                      <span>Voice mode is selected based on your adjustment request. You can switch to typing if you prefer.</span>
                      <button
                        type="button"
                        onClick={() => setVoicePrefillNoticeDismissed(true)}
                        aria-label="Dismiss notice"
                        style={{ background: 'none', border: 'none', padding: 0, fontFamily: F, fontSize: 13, color: TX2, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {micPermissionState === 'denied' && (
                    <div role="alert" style={{
                      marginBottom: 12, padding: '10px 14px',
                      background: '#fff7ed', border: '1px solid #fdba74', borderLeft: `4px solid ${AMB}`,
                      borderRadius: 8, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55,
                    }}>
                      Microphone access is needed for voice responses. Switched to typing for now. To use voice, allow microphone access in your browser and reselect the voice option.
                    </div>
                  )}
                  {micPermissionState === 'unsupported' && (
                    <div role="alert" style={{
                      marginBottom: 12, padding: '10px 14px',
                      background: '#fff7ed', border: '1px solid #fdba74', borderLeft: `4px solid ${AMB}`,
                      borderRadius: 8, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55,
                    }}>
                      Voice recording is not supported on this browser. Use the latest Chrome, Edge, Safari or Firefox on a secure (https) connection. Switched to typing.
                    </div>
                  )}
                  <div role="group" aria-label={`Choose how to answer scenario ${scenarioIndex + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {['type', 'record'].map(m => {
                      const active = inputModes[scenarioIndex] === m
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setInputModes(prev => { const n = [...prev]; n[scenarioIndex] = m; return n })}
                          aria-pressed={active}
                          aria-label={m === 'type'
                            ? `Switch to typed response for scenario ${scenarioIndex + 1}`
                            : `Switch to voice response for scenario ${scenarioIndex + 1}`}
                          style={{
                            minHeight: 44, padding: '10px 18px',
                            borderRadius: 8, fontFamily: F, fontSize: 14, fontWeight: 700,
                            cursor: 'pointer', border: `1.5px solid ${active ? TEAL : BD}`,
                            background: active ? TEALLT : '#fff',
                            color: active ? TEALD : TX2,
                          }}
                        >
                          {m === 'type' ? 'Type response' : 'Voice response'}
                        </button>
                      )
                    })}
                    {mode === 'advanced' && (
                      <span style={{ fontSize: 12, color: TEALD, fontFamily: F, fontWeight: 600 }}>Voice recommended for senior roles</span>
                    )}
                  </div>
                </>
              )}

              {/* Text input (default) */}
              {inputModes[scenarioIndex] === 'type' && (
                <>
                  <textarea
                    ref={responseTextareaRef}
                    value={responses[scenarioIndex]}
                    onKeyDown={() => {
                      // Record first keystroke time + increment total keystroke count.
                      // Used for time-to-first-keystroke and edit-ratio micro-signals.
                      setMicroRaw(prev => {
                        const next = [...prev]
                        const cur = next[scenarioIndex] || { scenario_shown_time: null, first_keystroke_time: null, total_chars_typed: 0, reached_80_at: null }
                        next[scenarioIndex] = {
                          ...cur,
                          first_keystroke_time: cur.first_keystroke_time || Date.now(),
                          total_chars_typed: (cur.total_chars_typed || 0) + 1,
                        }
                        return next
                      })
                    }}
                    onChange={e => {
                      const val = e.target.value
                      setResponses(prev => {
                        const next = [...prev]
                        next[scenarioIndex] = val
                        return next
                      })
                      // Capture when the response first crosses 80 words, for completion_pattern.
                      const words = (val.trim().match(/\S+/g) || []).length
                      if (words >= 80) {
                        setMicroRaw(prev => {
                          const next = [...prev]
                          const cur = next[scenarioIndex] || { scenario_shown_time: null, first_keystroke_time: null, total_chars_typed: 0, reached_80_at: null }
                          if (!cur.reached_80_at) {
                            next[scenarioIndex] = { ...cur, reached_80_at: Date.now() }
                          }
                          return next
                        })
                      }
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.max(200, e.target.scrollHeight) + 'px'
                    }}
                    placeholder="Write your response here..."
                    rows={8}
                    aria-label={`Your response to scenario ${scenarioIndex + 1} of ${scenarios.length}`}
                    aria-required="true"
                    aria-invalid={submitError?.type === 'type' ? 'true' : undefined}
                    aria-describedby={
                      submitError?.type === 'type'
                        ? `pd-response-error-${scenarioIndex} pd-response-help-${scenarioIndex}`
                        : `pd-response-help-${scenarioIndex}`
                    }
                    style={{
                      width: '100%', minHeight: 200, fontFamily: F, fontSize: 15, color: TX,
                      background: CARD, border: `1.5px solid ${BD}`, borderRadius: 10,
                      padding: '14px 16px', resize: 'vertical', outline: 'none',
                      lineHeight: 1.7, boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = TEAL}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = BD
                      // Immediate save when the candidate moves focus away from
                      // the response field. Complements the 30s heartbeat so
                      // pauses-to-think still hit storage.
                      persistProgressNow()
                    }}
                  />
                  <div id={`pd-response-help-${scenarioIndex}`} style={{ fontFamily: FM, fontSize: 13, color: TX3, marginTop: 6, textAlign: 'right' }}>
                    {wordCount(responses[scenarioIndex])} words{mode === 'rapid' ? ', keep your response under 100 words' : ''}
                  </div>
                  {mode === 'rapid' && (
                    <div style={{ fontFamily: F, fontSize: 12, color: AMB, marginTop: 4, textAlign: 'right' }}>
                      Keep your response under 100 words
                    </div>
                  )}
                </>
              )}

              {/* Voice recording interface */}
              {inputModes[scenarioIndex] === 'record' && (
                <div style={{ background: CARD, border: `1.5px solid ${BD}`, borderRadius: 12, padding: '24px', textAlign: 'center' }}>
                  {!audioUrls[scenarioIndex] && !recording && (
                    <div>
                      <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 16px' }}>
                        Press record and speak your response clearly. Maximum 60 seconds. You can also press the Space key to start or stop recording.
                      </p>
                      <button
                        ref={recordButtonRef}
                        type="button"
                        onClick={startRecording}
                        aria-label={`Start recording your voice response for scenario ${scenarioIndex + 1}`}
                        aria-invalid={submitError?.type === 'record' ? 'true' : undefined}
                        aria-describedby={submitError?.type === 'record' ? `pd-response-error-${scenarioIndex}` : undefined}
                        style={{
                          width: 64, height: 64, minHeight: 44, borderRadius: '50%', border: 'none',
                          background: '#dc2626', cursor: 'pointer', position: 'relative',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span aria-hidden style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                      </button>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 8 }}>Press to record (or Space)</div>
                    </div>
                  )}

                  {recording && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        <div aria-hidden style={{
                          width: 12, height: 12, borderRadius: '50%', background: '#dc2626',
                          animation: 'pulse 1s ease infinite',
                        }} />
                        <span style={{ fontFamily: FM, fontSize: 24, fontWeight: 700, color: TX }}>{formatTime(recordTime)}</span>
                        <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>/ 1:00</span>
                      </div>
                      {/* Simple bars animation, decorative only. */}
                      <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40, marginBottom: 16 }}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} style={{
                            width: 3, borderRadius: 2, background: TEAL,
                            height: `${15 + Math.random() * 25}px`,
                            animation: `pulse ${0.3 + Math.random() * 0.5}s ease infinite`,
                            animationDelay: `${i * 0.05}s`,
                          }} />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        aria-label={`Stop recording your voice response for scenario ${scenarioIndex + 1}`}
                        style={{
                          width: 56, height: 56, minHeight: 44, borderRadius: '50%', border: 'none',
                          background: '#dc2626', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span aria-hidden style={{ width: 18, height: 18, borderRadius: 3, background: '#fff' }} />
                      </button>
                      <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 8 }}>Press to stop (or Space)</div>
                    </div>
                  )}

                  {audioUrls[scenarioIndex] && !recording && (
                    <div>
                      <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TEALD, marginBottom: 12 }}>
                        Recording complete ({formatTime(recordTime)})
                      </div>
                      <audio
                        src={audioUrls[scenarioIndex]}
                        controls
                        aria-label={`Playback of your voice response for scenario ${scenarioIndex + 1}`}
                        style={{ width: '100%', maxWidth: 400, marginBottom: 12 }}
                      />
                      <div>
                        <button
                          type="button"
                          onClick={clearRecording}
                          aria-label={`Discard recording and re-record voice response for scenario ${scenarioIndex + 1}`}
                          style={{
                            minHeight: 44, padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${BD}`,
                            background: '#fff', color: TX2, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Re-record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Next / Submit */}
            {submitError && (
              <div
                id={`pd-response-error-${scenarioIndex}`}
                role="alert"
                style={{
                  marginTop: 16, padding: '10px 14px',
                  background: REDBG, border: '1px solid #fecaca', borderLeft: '4px solid #dc2626',
                  borderRadius: 8, color: '#b91c1c', fontFamily: F, fontSize: 13.5, fontWeight: 600,
                  lineHeight: 1.55,
                }}
              >
                {submitError.message}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={handleNext}
                style={{
                  background: TEAL,
                  color: '#fff',
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 40px',
                  cursor: 'pointer',
                  letterSpacing: 0.2,
                  boxShadow: `0 4px 16px ${TEAL}44`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = TEALD}
                onMouseLeave={e => e.currentTarget.style.background = TEAL}
              >
                {isLast ? (isOperational ? 'Send Reply' : 'Submit Assessment') : (isOperational ? 'Next' : 'Next Scenario →')}
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* In-scenario interruption modal: appears once per scenario, when the
          candidate has filled all three ranked slots and the deterministic
          gate (~30% per scenario) returns true. Captures whether the
          candidate revises their ranking or holds it under new information. */}
      {interruptionModalOpen && scenarios[scenarioIndex]?.interruption && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', maxWidth: 640, width: '100%',
            maxHeight: '90vh', overflow: 'auto',
            border: `1px solid ${BD}`, borderTop: `4px solid ${AMB}`, borderRadius: 14,
            padding: '28px 32px',
          }}>
            <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 800, color: AMB, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Mid-task interruption
            </div>
            <h2 style={{ fontFamily: F, fontSize: 19, fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.3 }}>
              While you were doing your first action, this just happened
            </h2>
            <p style={{ fontFamily: F, fontSize: 15, color: TX, lineHeight: 1.65, margin: '0 0 14px' }}>
              {scenarios[scenarioIndex].interruption.event}
            </p>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.65, margin: '0 0 18px' }}>
              {scenarios[scenarioIndex].interruption.question || 'Does this change your ranking? If so, restate your new top three in order and explain why.'}
            </p>

            {interruptionDraftSlots.map((slot, i) => (
              <div key={i} style={{
                background: '#f7f9fb', border: `1px solid ${BD}`, borderRadius: 10,
                padding: '12px 14px', marginBottom: 10,
              }}>
                <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: NAVY, letterSpacing: '0.04em', marginBottom: 6 }}>Action {i + 1}</div>
                <input
                  value={slot.action}
                  onChange={e => setInterruptionDraftSlots(prev => prev.map((s, idx) => idx === i ? { ...s, action: e.target.value } : s))}
                  placeholder="What you do"
                  style={{ width: '100%', fontFamily: F, fontSize: 14, padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, marginBottom: 6, color: TX, background: '#fff' }}
                />
                <textarea
                  value={slot.justification}
                  onChange={e => setInterruptionDraftSlots(prev => prev.map((s, idx) => idx === i ? { ...s, justification: e.target.value } : s))}
                  placeholder="Why this slot, 1 to 2 sentences"
                  rows={2}
                  style={{ width: '100%', fontFamily: F, fontSize: 13.5, padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, color: TX, background: '#fff', resize: 'vertical' }}
                />
              </div>
            ))}

            <label style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX2, display: 'block', marginTop: 8, marginBottom: 6 }}>
              Why are you holding or changing the ranking?
            </label>
            <textarea
              value={interruptionDraftReasoning}
              onChange={e => setInterruptionDraftReasoning(e.target.value)}
              placeholder="Two or three sentences."
              rows={3}
              style={{ width: '100%', fontFamily: F, fontSize: 14, padding: '10px 12px', border: `1px solid ${BD}`, borderRadius: 8, color: TX, background: '#fff', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => {
                  // Persist the response and continue.
                  const original = rankedActions[scenarioIndex]?.slots || []
                  const revised = interruptionDraftSlots.map(s => ({
                    action: (s.action || '').trim(),
                    justification: (s.justification || '').trim(),
                  }))
                  const changedRanking = revised.some((s, idx) =>
                    s.action !== ((original[idx]?.action || '').trim()) ||
                    s.justification !== ((original[idx]?.justification || '').trim())
                  )
                  setScenarioInterruption(prev => ({
                    ...prev,
                    [scenarioIndex]: {
                      fired: true,
                      prompt: scenarios[scenarioIndex].interruption?.event || '',
                      revised_slots: revised.map((s, idx) => ({ rank: idx + 1, ...s })),
                      changed_ranking: changedRanking,
                      reasoning: interruptionDraftReasoning.trim(),
                      responded_at: new Date().toISOString(),
                    },
                  }))
                  setInterruptionModalOpen(false)
                  // Auto-trigger handleNext after the interruption is closed.
                  setTimeout(() => { handleNext() }, 0)
                }}
                style={{ background: TEAL, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer' }}
              >
                Save and continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── State: Submitting ────────────────────────────────────────────────────────
function SubmittingPage({ candidateName }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
          <div style={{ marginBottom: 20 }}>
            <svg width={48} height={48} viewBox="0 0 48 48" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx={24} cy={24} r={20} fill="none" stroke={BD} strokeWidth={4} />
              <path d="M24 4 a20 20 0 0 1 20 20" fill="none" stroke={TEAL} strokeWidth={4} strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 8px' }}>
            Submitting your responses…
          </p>
          <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Your responses are being saved and scored. This can take up to 90 seconds.
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Strategic Thinking Evaluation (Strategy-Fit only) ────────────────
//
// Sits between the calendar/scenarios stage and the modular Workspace
// for Strategy-Fit assessments where the component was generated at
// creation time. The candidate reads a single role-and-seniority-aware
// scenario and types responses to 2-3 evaluation questions. On submit
// the responses are held in parent state and attached to the eventual
// /api/assess/[token]/submit payload so scoring can read them.
//
// Compliance: rendering is shell-agnostic; the AI generator handled
// the shell-specific framing and compliance language at creation time.
function StrategicThinkingScreen({ component, responses, onChange, onSubmit, onSkip }) {
  const questions = Array.isArray(component?.evaluation_questions) ? component.evaluation_questions : []
  const setResponse = (id, text) => onChange({ ...(responses || {}), [id]: text })
  const allAnswered = questions.length > 0
    && questions.every(q => ((responses?.[q.id] || '').trim().length >= 12))
  const totalChars = questions.reduce((s, q) => s + ((responses?.[q.id] || '').trim().length), 0)
  // Track the elapsed seconds the candidate spent on this screen. Captured
  // on mount and read at submit/skip time; the parent merges it into the
  // strategic_thinking_responses payload as time_in_component before the
  // final submit POST.
  const startedAtRef = useRef(Date.now())
  const handleSubmit = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
    onSubmit?.(seconds)
  }
  const handleSkip = () => {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
    onSkip?.(seconds)
  }
  return (
    <>
      <NavBar />
      <CentredCard>
        <Card style={{ padding: '32px 36px' }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>
            Strategic Thinking Evaluation
          </div>
          <h1 style={{
            fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY,
            lineHeight: 1.25, margin: '0 0 12px',
          }}>
            {component?.title || 'Strategic Thinking Evaluation'}
          </h1>
          {component?.role_context_summary ? (
            <div style={{
              fontFamily: F, fontSize: 12.5, color: TX3, marginBottom: 16,
            }}>
              {component.role_context_summary}
            </div>
          ) : null}
          <div style={{
            background: '#FAEFD9', border: '1px solid #e6d6ad',
            borderRadius: 10, padding: 16, marginBottom: 22,
            fontFamily: F, fontSize: 14.5, color: NAVY, lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}>
            {component?.scenario_text || ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {questions.map((q, i) => {
              const value = (responses?.[q.id] || '')
              const ready = value.trim().length >= 12
              return (
                <div key={q.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
                      {i + 1}. {q.prompt}
                    </div>
                    <span style={{ fontFamily: FM, fontSize: 11, color: ready ? TEAL : TX3 }}>
                      {value.trim().length} / 12 min
                    </span>
                  </div>
                  <textarea
                    value={value}
                    onChange={(e) => setResponse(q.id, e.target.value)}
                    rows={4}
                    placeholder="Type your response. There is no single right answer; we are reading what you actually do and why."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.6,
                      padding: 12, borderRadius: 8,
                      border: `1px solid ${BD}`, background: '#f8fafc',
                      outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginTop: 22, flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
              {allAnswered ? 'Ready to continue.' : `Each response needs at least 12 characters. Total: ${totalChars}.`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  fontFamily: F, fontSize: 13, fontWeight: 700, color: TX2,
                  background: 'transparent', border: `1px solid ${BD}`,
                  padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                }}
              >
                Skip this section
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                style={{
                  fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff',
                  background: allAnswered ? TEAL : BD,
                  border: 'none', padding: '10px 18px', borderRadius: 8,
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                Continue to Workspace
              </button>
            </div>
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Saved (scoring timed out client-side) ────────────────────────────
function SavedPage({ candidateName, onContinue }) {
  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
          <div style={{ marginBottom: 20 }}>
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>
            Your responses have been saved
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 14, margin: '0 0 28px', lineHeight: 1.7 }}>
            You will receive an email when your report is ready. You can safely close this page.
          </p>
          <button
            onClick={onContinue}
            style={{
              background: TEAL, color: '#fff', fontFamily: F,
              fontWeight: 700, fontSize: 15, border: 'none',
              borderRadius: 10, padding: '12px 32px', cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── State: Rating ───────────────────────────────────────────────────────────
function RatingPage({ candidateName, uniqueToken, onComplete }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmitRating() {
    setSubmitting(true)
    try {
      await fetch(`/api/assess/${uniqueToken}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedbackText }),
      })
    } catch {}
    onComplete()
  }

  const filled = hovered || rating

  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ProdictaLogo textColor={NAVY} size={36} />
        </div>
        <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌟</div>
          <h2 style={{ fontFamily: F, color: TX, fontSize: 24, fontWeight: 800, margin: '0 0 10px' }}>
            How was your experience?
          </h2>
          <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
            Your feedback helps us improve the assessment experience for everyone.
          </p>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  transition: 'transform 0.12s',
                  transform: filled >= n ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                <svg
                  width={36} height={36} viewBox="0 0 24 24"
                  fill={filled >= n ? '#f59e0b' : 'none'}
                  stroke={filled >= n ? '#f59e0b' : '#e4e9f0'}
                  strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>

          {/* Optional feedback */}
          {rating > 0 && (
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              <label style={{
                fontFamily: F, fontSize: 13, fontWeight: 600, color: TX2,
                display: 'block', marginBottom: 6,
              }}>
                Any other thoughts? (optional)
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="What went well? What could be improved?"
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: F,
                  fontSize: 14,
                  color: TX,
                  background: CARD,
                  border: `1.5px solid ${BD}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.65,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = TEAL}
                onBlur={e => e.currentTarget.style.borderColor = BD}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={onComplete}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 600, color: TX3,
                background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px',
              }}
            >
              Skip
            </button>
            {rating > 0 && (
              <button
                onClick={handleSubmitRating}
                disabled={submitting}
                style={{
                  background: TEAL, color: '#fff', fontFamily: F,
                  fontWeight: 700, fontSize: 15, border: 'none',
                  borderRadius: 10, padding: '12px 32px', cursor: 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </button>
            )}
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#00BFA5','#4F46E5','#F59E0B','#10B981','#F43F5E','#3B82F6','#7C3AED']
function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${(i * 3.33) % 100}%`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size: 6 + (i % 4) * 2,
    duration: `${0.9 + (i % 5) * 0.15}s`,
  }))
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -8,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: p.id % 3 === 0 ? '50%' : 2,
            background: p.color,
            animation: `confettiFall ${p.duration} ease-in ${p.delay} both`,
          }}
        />
      ))}
    </div>
  )
}

// ─── State: Complete ──────────────────────────────────────────────────────────
// ─── Candidate Self-Preview ──────────────────────────────────────────────────
function CandidatePreviewPage({ candidateName, uniqueToken, onContinue }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/assess/${uniqueToken}/feedback`)
        if (res.status === 425) {
 // Scoring not finished yet, poll
          if (pollCount < 30) {
            setTimeout(() => { if (!cancelled) setPollCount(c => c + 1) }, 3000)
          }
          return
        }
        if (res.status === 403) {
 // Feedback disabled, skip to complete
          onContinue()
          return
        }
        if (!res.ok) { setError('Unable to load preview'); setLoading(false); return }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Unable to load preview')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pollCount, uniqueToken])

  if (loading || (!data && !error && pollCount < 30)) {
    return (
      <>
        <NavBar candidateName={candidateName} />
        <CentredCard>
          <Card style={{ textAlign: 'center', padding: '64px 36px' }}>
            <div style={{
              width: 40, height: 40, border: `4px solid ${BD}`, borderTopColor: TEAL,
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
              Analysing your responses...
            </h2>
            <p style={{ fontFamily: F, color: TX3, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              This usually takes 30-60 seconds. Your personalised insights will appear shortly.
            </p>
          </Card>
        </CentredCard>
      </>
    )
  }

  if (error || !data) {
    // Skip preview gracefully
    return (
      <>
        <NavBar candidateName={candidateName} />
        <CentredCard>
          <Card style={{ textAlign: 'center', padding: '48px 36px' }}>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 20, fontWeight: 800, margin: '0 0 12px' }}>Your Assessment is Complete</h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}>
              Thank you for completing your assessment. The hiring team will be in touch.
            </p>
            <button onClick={onContinue} style={{ padding: '12px 28px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Continue
            </button>
          </Card>
        </CentredCard>
      </>
    )
  }

  const strengths = (data.strengths || []).slice(0, 3)
  const devArea = (data.development_plan || [])[0]

  return (
    <>
      <NavBar candidateName={candidateName} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${TEAL}, #009688)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 8px ${TEALLT}, 0 8px 28px rgba(0,191,165,0.25)`,
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>
            Your Assessment is Complete
          </h1>
          <p style={{ fontFamily: F, fontSize: 16, color: TX2, margin: '0 0 6px', lineHeight: 1.6 }}>
            Here is a snapshot of what the assessment revealed about you.
          </p>
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>
            This is a summary for you. The hiring team will receive a detailed report.
          </p>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Your Strengths
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {strengths.map((s, i) => (
                <Card key={i} style={{ borderLeft: `4px solid ${TEAL}`, padding: '16px 20px' }}>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 6 }}>
                    {s.text || s.strength || s.title}
                  </div>
                  {(s.detail || s.explanation) && (
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', lineHeight: 1.6 }}>
                      {s.detail || s.explanation}
                    </p>
                  )}
                  {s.evidence && (
                    <div style={{ fontFamily: F, fontSize: 12.5, color: TEALD, fontStyle: 'italic', lineHeight: 1.55 }}>
                      "{s.evidence}"
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Development opportunity */}
        {devArea && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: '#E8B84B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              One area to develop
            </div>
            <Card style={{ borderLeft: '4px solid #E8B84B', padding: '16px 20px' }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 6 }}>
                {devArea.area}
              </div>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 8px', lineHeight: 1.6 }}>
                {devArea.advice}
              </p>
              {devArea.actions && devArea.actions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {devArea.actions.map((a, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: TX, fontFamily: F }}>
                      <span style={{ color: '#E8B84B', fontWeight: 700, flexShrink: 0 }}>{j + 1}.</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Role expectations */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            What to expect in this role
          </div>
          <Card style={{ padding: '16px 20px' }}>
            <p style={{ fontFamily: F, fontSize: 14, color: TX, margin: 0, lineHeight: 1.7 }}>
              Your responses showed how you approach real work situations. The hiring team uses this alongside the rest of their process to understand how you are likely to perform and what support you may need in your first 90 days.
            </p>
          </Card>
        </div>

        {/* Benchmarks if available */}
        {data.benchmarks && data.benchmarks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              How you compare
            </div>
            <Card style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.benchmarks.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: F, fontSize: 13, color: TX }}>{b.skill}</span>
                    <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: TEAL }}>Top {100 - b.percentile}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: '0 0 20px', lineHeight: 1.65 }}>
            Thank you for completing your assessment. The hiring team will be in touch.
          </p>
          <button onClick={onContinue} style={{
            padding: '14px 32px', borderRadius: 10, border: 'none',
            background: TEAL, color: '#fff',
            fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer',
          }}>
            Done
          </button>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 16, borderTop: `1px solid ${BD}` }}>
          <ProdictaLogo textColor={NAVY} size={28} />
          <p style={{ fontFamily: F, color: TX3, fontSize: 12, margin: '6px 0 0' }}>Work simulation assessments</p>
        </div>
      </div>
    </>
  )
}

function DemographicsPage({ candidateId, candidateName, onDone }) {
  const [ageBand, setAgeBand] = useState('')
  const [gender, setGender] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const firstName = (candidateName || '').split(' ')[0] || ''

  const AGE_OPTIONS = ['Under 25', '25-34', '35-44', '45-54', '55-64', '65 and over', 'Prefer not to say']
  const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Prefer to self-describe']
  const ETHNICITY_OPTIONS = [
    'Asian or Asian British',
    'Black or Black British',
    'Mixed or multiple ethnic groups',
    'White',
    'Other ethnic group',
    'Prefer not to say',
  ]

  async function submitAndContinue() {
    if (!candidateId) { onDone(); return }
    setSubmitting(true)
    try {
      await fetch('/api/candidates/demographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          age_band: ageBand || null,
          gender: gender || null,
          ethnicity: ethnicity || null,
        }),
      })
    } catch {}
    setSubmitting(false)
    onDone()
  }

  const selectStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${BD}`, background: '#fff', color: TX,
    fontFamily: F, fontSize: 14, outline: 'none', cursor: 'pointer',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    fontFamily: F, fontSize: 13, fontWeight: 600, color: TX2,
    display: 'block', marginBottom: 6, textAlign: 'left',
  }

  return (
    <>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
              Optional: Help us ensure fair hiring
            </h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 14, margin: '0 0 10px', lineHeight: 1.65 }}>
              This information is never shared with employers and is not used in your assessment score. It helps us monitor that our assessments are fair for everyone.
            </p>
            <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Your responses are stored separately from your assessment and are never used in scoring. View our{' '}
              <a
                href="https://prodicta.co.uk/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: TX3, textDecoration: 'underline' }}
              >
                privacy policy
              </a>{' '}
              at prodicta.co.uk/privacy.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Age band</label>
              <select value={ageBand} onChange={e => setAgeBand(e.target.value)} style={selectStyle}>
                <option value="">Select or skip</option>
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} style={selectStyle}>
                <option value="">Select or skip</option>
                {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ethnicity</label>
              <select value={ethnicity} onChange={e => setEthnicity(e.target.value)} style={selectStyle}>
                <option value="">Select or skip</option>
                {ETHNICITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={submitAndContinue}
              disabled={submitting}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: submitting ? '#a8d5d4' : '#00BFA5', color: '#fff',
                fontFamily: F, fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit and continue'}
            </button>
            <button
              onClick={onDone}
              disabled={submitting}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10,
                border: `1.5px solid ${NAVY}`, background: 'transparent',
                color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

function CompletePage({ candidateName, uniqueToken }) {
  const [textVisible, setTextVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setTextVisible(true), 700); return () => clearTimeout(t) }, [])
  const firstName = (candidateName || '').split(' ')[0] || 'you'

  return (
    <>
      <style>{`
        @keyframes drawCheck { from { stroke-dashoffset: 30 } to { stroke-dashoffset: 0 } }
        @keyframes popIn { 0%{transform:scale(0.35);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      `}</style>
      <NavBar candidateName={candidateName} />
      <CentredCard>
        <Card style={{ textAlign: 'center', padding: '64px 36px', position: 'relative', overflow: 'hidden' }}>
          <Confetti />
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: `linear-gradient(135deg, #00BFA5, #009688)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 0 0 8px #E6F7F5, 0 8px 28px rgba(0,191,165,0.35)`,
            animation: 'popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline
                points="20 6 9 17 4 12"
                strokeDasharray="30"
                strokeDashoffset="30"
                style={{ animation: 'drawCheck 0.4s ease-out 0.4s forwards' }}
              />
            </svg>
          </div>
          <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.45s ease, transform 0.45s ease' }}>
            <h2 style={{ fontFamily: F, color: TX, fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>
              Thank you{candidateName ? `, ${firstName}` : ''}.
            </h2>
            <p style={{ fontFamily: F, color: TX2, fontSize: 16, margin: '0 0 20px', lineHeight: 1.6 }}>
              Your assessment is complete. Your results have been shared with the hiring team.
            </p>
            {uniqueToken && (
              <div style={{ margin: '0 0 32px' }}>
                <a
                  href={`/assess/${uniqueToken}/feedback`}
                  style={{
                    display: 'inline-block',
                    padding: '14px 28px',
                    borderRadius: 10,
                    background: '#00BFA5',
                    color: '#fff',
                    fontFamily: F, fontSize: 15, fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(0,191,165,0.28)',
                  }}
                >
                  Leave feedback and view your report
                </a>
              </div>
            )}
          </div>
          <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ProdictaLogo textColor={NAVY} size={28} />
            <p style={{ fontFamily: F, color: TX3, fontSize: 13, margin: 0 }}>
              Work simulation assessments
            </p>
          </div>
        </Card>
      </CentredCard>
    </>
  )
}

// ─── Virtual Workspace: Day 1 Simulation ─────────────────────────────────────
function WorkspacePage({ assessment, candidate, onSubmit, onSkip }) {
  const [content, setContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(true)
  const [emailOpen, setEmailOpen] = useState(null)
  const [emailReplies, setEmailReplies] = useState({})
  const [emailRead, setEmailRead] = useState({})
  const [msgReplies, setMsgReplies] = useState({})
  const [taskActions, setTaskActions] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [gapPlans, setGapPlans] = useState({})
  const [surpriseShown, setSurpriseShown] = useState(false)
  const [surpriseReply, setSurpriseReply] = useState('')
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const timerRef = useRef(null)
  const surpriseRef = useRef(null)

  useEffect(() => {
    fetch(`/api/assessment/${assessment.id}/workspace-content`)
      .then(r => r.json())
      .then(data => { if (!data.error) setContent(data) })
      .catch(err => { console.error('[workspace] fetch error', err); setContent(null) })
      .finally(() => setLoadingContent(false))
  }, [assessment.id])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); return 0 }; return p - 1 })
    }, 1000)
    surpriseRef.current = setTimeout(() => setSurpriseShown(true), 180000) // 3 minutes
    return () => { clearInterval(timerRef.current); clearTimeout(surpriseRef.current) }
  }, [])

  const emailsReplied = Object.keys(emailReplies).filter(k => emailReplies[k]?.trim()).length
  const tasksHandled = Object.keys(taskActions).length
  const msgsReplied = Object.keys(msgReplies).filter(k => msgReplies[k]?.trim()).length
  const canSubmit = emailsReplied >= 2 && tasksHandled >= 3
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  function handleSubmit() {
    clearInterval(timerRef.current)
    onSubmit({
      email_replies: emailReplies,
      email_read: emailRead,
      message_replies: msgReplies,
      task_actions: taskActions,
      task_notes: taskNotes,
      gap_plans: gapPlans,
      surprise_reply: surpriseReply,
      time_remaining: timeLeft,
    })
  }

  if (loadingContent) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f5f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: TX2, fontSize: 14 }}>Preparing your workspace...</div>
        </div>
      </div>
    )
  }

  if (!content) return <ErrorPage message="Unable to load the workspace simulation. Your scenario responses are safe." context="workspace-content" />

  const emails = content.emails || []
  const messages = content.messages || []
  const tasks = content.tasks || []
  const gaps = content.calendar_gaps || []
  const fixed = content.fixed_meetings || []
  const surprise = content.surprise_message

  return (
    <div style={{ minHeight: '100vh', background: '#f3f5f8', fontFamily: F }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: TEAL }}>PRODICTA</span>
 <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{assessment.role_title}, Day 1, 9:00am</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className={timeLeft < 120 ? 'timer-warning' : undefined} style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: timeLeft < 120 ? '#dc2626' : '#fff' }}>{mins}:{String(secs).padStart(2, '0')}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Emails {emailsReplied}/{emails.length} | Tasks {tasksHandled}/{tasks.length} | Messages {msgsReplied}/{messages.length}</span>
        </div>
      </div>

      {/* Surprise notification */}
      {surpriseShown && surprise && !surpriseReply && (
        <div style={{ position: 'fixed', top: 60, right: 20, zIndex: 500, width: 320, background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(15,33,55,0.18)', padding: '14px 16px', animation: 'slideIn 0.3s ease' }}>
          <style>{`@keyframes slideIn { from { transform: translateX(120%); } to { transform: translateX(0); } }`}</style>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: TEAL, flexShrink: 0 }}>{surprise.from?.[0]}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: TX }}>{surprise.from} <span style={{ fontWeight: 500, color: TX3 }}>({surprise.role})</span></div>
              <div style={{ fontSize: 13, color: TX2 }}>{surprise.text}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" placeholder="Quick reply..." onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) setSurpriseReply(e.target.value.trim()) }} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, outline: 'none' }} />
            <button onClick={() => setSurpriseReply('noted')} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: '#fff', color: TX2, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Main workspace grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto' }}>

        {/* Email Inbox */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Email Inbox</span>
            <span style={{ fontSize: 11, color: TX3 }}>{emailsReplied}/{emails.length} replied</span>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {emails.map(email => (
              <div key={email.id}>
                <div
                  onClick={() => { setEmailOpen(emailOpen === email.id ? null : email.id); setEmailRead(p => ({ ...p, [email.id]: true })) }}
                  style={{ padding: '12px 18px', borderBottom: `1px solid ${BD}`, cursor: 'pointer', background: emailRead[email.id] ? '#fff' : '#f0fdfb' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: emailRead[email.id] ? 500 : 700, color: TX }}>{email.from}</span>
                    {emailReplies[email.id] && <span style={{ fontSize: 10, color: TEAL, fontWeight: 700 }}>REPLIED</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TX, marginBottom: 2 }}>{email.subject}</div>
                  <div style={{ fontSize: 12, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.preview}</div>
                </div>
                {emailOpen === email.id && (
                  <div style={{ padding: '14px 18px', background: BG, borderBottom: `1px solid ${BD}` }}>
                    <p style={{ fontSize: 13, color: TX, lineHeight: 1.65, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{email.body}</p>
                    <textarea
                      rows={3}
                      value={emailReplies[email.id] || ''}
                      onChange={e => setEmailReplies(p => ({ ...p, [email.id]: e.target.value }))}
                      placeholder="Type your reply..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 13, color: TX, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Tasks</span>
            <span style={{ fontSize: 11, color: TX3 }}>{tasksHandled}/{tasks.length} actioned</span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 360, overflowY: 'auto' }}>
            {tasks.map(task => {
              const action = taskActions[task.id]
              const pColor = task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#E8B84B' : TX3
              return (
                <div key={task.id} style={{ padding: '10px 18px', borderBottom: `1px solid ${BD}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: pColor, textTransform: 'uppercase' }}>{task.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{task.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: TX3, marginBottom: 6 }}>{task.context}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['do_now', 'delegate', 'defer'].map(a => (
                      <button key={a} onClick={() => setTaskActions(p => ({ ...p, [task.id]: a }))} style={{
                        padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F,
                        background: action === a ? (a === 'do_now' ? TEALLT : a === 'delegate' ? '#EDE9FE' : '#FEF3C7') : '#fff',
                        border: `1px solid ${action === a ? (a === 'do_now' ? TEAL : a === 'delegate' ? '#C4B5FD' : '#FCD34D') : BD}`,
                        color: action === a ? (a === 'do_now' ? TEALD : a === 'delegate' ? '#5B21B6' : '#92400E') : TX3,
                      }}>
                        {a === 'do_now' ? 'Do now' : a === 'delegate' ? 'Delegate' : 'Defer'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Messages */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Messages</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
            {messages.map(msg => (
              <div key={msg.id}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: TEAL, flexShrink: 0 }}>{msg.from?.[0]}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX }}>{msg.from} <span style={{ fontWeight: 500, color: TX3 }}>{msg.time}</span></div>
                    <div style={{ fontSize: 13, color: TX2 }}>{msg.text}</div>
                  </div>
                </div>
                <input
                  type="text"
                  value={msgReplies[msg.id] || ''}
                  onChange={e => setMsgReplies(p => ({ ...p, [msg.id]: e.target.value }))}
                  placeholder="Reply..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, color: TX, outline: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TX }}>Today's Schedule</span>
          </div>
          <div style={{ padding: '12px 18px' }}>
            {fixed.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BD}` }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: TX3, width: 44, flexShrink: 0 }}>{m.time}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TX }}>{m.title}</span>
              </div>
            ))}
            {gaps.map((g, i) => (
              <div key={`gap-${i}`} style={{ padding: '8px 0', borderBottom: `1px solid ${BD}` }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: FM, fontSize: 11, color: TEAL, width: 44, flexShrink: 0 }}>{g.time}</span>
                  <span style={{ fontSize: 12, color: TEAL, fontWeight: 600 }}>{g.context}</span>
                </div>
                <input
                  type="text"
                  value={gapPlans[i] || ''}
                  onChange={e => setGapPlans(p => ({ ...p, [i]: e.target.value }))}
                  placeholder="What will you do in this slot?"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', borderRadius: 6, border: `1px solid ${BD}`, fontFamily: F, fontSize: 12, color: TX, outline: 'none', marginLeft: 54 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: NAVY, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: `2px solid ${TEAL}` }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: F }}>
          Reply to at least 2 emails and action at least 3 tasks to submit
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: canSubmit ? TEAL : 'rgba(255,255,255,0.1)',
            color: canSubmit ? NAVY : 'rgba(255,255,255,0.3)',
            fontFamily: F, fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>Submit my morning</button>
          <button onClick={onSkip} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Skip</button>
        </div>
      </div>
    </div>
  )
}

// ─── Calendar: Plan Your First Monday ─────────────────────────────────────────
const TIME_SLOTS = []
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

function CalendarPage({ assessment, candidate, onSubmit, onSkip }) {
  const calEvents = assessment.calendar_events || {}
  const fixedEvents = [
    ...(calEvents.fixed_events || []),
    ...(calEvents.interruption ? [calEvents.interruption] : []),
    ...(calEvents.deadline ? [calEvents.deadline] : []),
  ]
  const unscheduled = (calEvents.unscheduled_tasks || []).map((t, i) => ({ ...t, id: `task-${i}` }))

  const [taskSlots, setTaskSlots] = useState({})
  const [taskNotes, setTaskNotes] = useState({})
  const [timeLeft, setTimeLeft] = useState(8 * 60)
  const [editingNote, setEditingNote] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  function handleSubmit() {
    clearInterval(timerRef.current)
    const scheduled_tasks = unscheduled.map(t => ({
      title: t.title,
      type: t.type,
      scheduled_time: taskSlots[t.id] || null,
      note: taskNotes[t.id] || null,
    }))
    onSubmit({
      fixed_events: fixedEvents,
      scheduled_tasks,
      event_notes: taskNotes,
    })
  }

  const allScheduled = unscheduled.every(t => taskSlots[t.id])
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isLow = timeLeft < 120

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, padding: '24px 20px 80px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Day One Planning</div>
          <h1 style={{ fontFamily: F, fontSize: 26, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>Plan Your First Monday</h1>
          <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: 0, lineHeight: 1.6 }}>
            Based on this role, here is what your first Monday looks like. Organise your day.
          </p>
        </div>

        {/* Timer */}
        <div className={isLow ? 'timer-warning' : undefined} style={{
          textAlign: 'center', marginBottom: 24,
          fontFamily: FM, fontSize: 20, fontWeight: 700,
          color: isLow ? '#dc2626' : TX,
        }}>
          {mins}:{String(secs).padStart(2, '0')} remaining
        </div>

        {/* Calendar timeline */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, background: NAVY }}>
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TEAL }}>Monday Schedule</span>
            <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>8:00am - 6:00pm</span>
          </div>

          <div style={{ padding: '12px 0' }}>
            {TIME_SLOTS.map(slot => {
              const fixedHere = fixedEvents.filter(e => e.time === slot)
              const tasksHere = unscheduled.filter(t => taskSlots[t.id] === slot)
              const isEmpty = fixedHere.length === 0 && tasksHere.length === 0

              return (
                <div key={slot} style={{
                  display: 'flex', gap: 12, padding: '4px 18px', minHeight: 36,
                  alignItems: 'center',
                  borderBottom: slot.endsWith(':00') ? `1px solid ${BD}` : 'none',
                }}>
                  <div style={{ width: 48, fontFamily: FM, fontSize: 11.5, color: TX3, flexShrink: 0 }}>{slot}</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {fixedHere.map((e, i) => (
                      <div key={i} style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: e.type === 'interruption' ? '#FEF3C7' : e.type === 'deadline' ? REDBG : TEALLT,
                        color: e.type === 'interruption' ? '#92400E' : e.type === 'deadline' ? '#dc2626' : TEALD,
                        border: `1px solid ${e.type === 'interruption' ? '#FCD34D' : e.type === 'deadline' ? '#fecaca' : `${TEAL}55`}`,
                      }}>
                        {e.title}
                        {e.type === 'interruption' && <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 800 }}>UNEXPECTED</span>}
                        {e.type === 'deadline' && <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 800 }}>DEADLINE</span>}
                      </div>
                    ))}
                    {tasksHere.map(t => (
                      <div key={t.id} style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        background: '#EDE9FE', color: '#5B21B6', border: '1px solid #C4B5FD',
                      }}>
                        {t.title}
                        {taskNotes[t.id] && <span style={{ fontSize: 11, color: '#7C3AED', marginLeft: 6 }}>({taskNotes[t.id]})</span>}
                      </div>
                    ))}
                    {isEmpty && <div style={{ height: 1 }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Unscheduled tasks */}
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Schedule these tasks into your day
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unscheduled.map(task => (
              <div key={task.id} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX, flex: 1 }}>{task.title}</span>
                  <select
                    value={taskSlots[task.id] || ''}
                    onChange={e => setTaskSlots(prev => ({ ...prev, [task.id]: e.target.value || null }))}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: `1px solid ${taskSlots[task.id] ? TEAL : BD}`,
                      fontFamily: F, fontSize: 12.5, color: taskSlots[task.id] ? TEALD : TX3,
                      background: taskSlots[task.id] ? TEALLT : '#fff', cursor: 'pointer',
                    }}
                  >
                    <option value="">When?</option>
                    {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setEditingNote(editingNote === task.id ? null : task.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 5, border: `1px solid ${BD}`,
                      background: taskNotes[task.id] ? TEALLT : '#fff',
                      color: taskNotes[task.id] ? TEALD : TX3,
                      fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {taskNotes[task.id] ? 'Edit note' : 'Add note'}
                  </button>
                </div>
                {editingNote === task.id && (
                  <input
                    type="text"
                    value={taskNotes[task.id] || ''}
                    onChange={e => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Why did you schedule it here?"
                    style={{
                      width: '100%', boxSizing: 'border-box', marginTop: 8,
                      padding: '8px 12px', borderRadius: 6, border: `1px solid ${BD}`,
                      fontFamily: F, fontSize: 13, color: TX, outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = TEAL}
                    onBlur={e => e.target.style.borderColor = BD}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleSubmit}
            style={{
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: allScheduled ? TEAL : BD,
              color: allScheduled ? '#fff' : TX3,
              fontFamily: F, fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            This is my day
          </button>
          <button
            onClick={onSkip}
            style={{
              padding: '14px 24px', borderRadius: 10, border: `1.5px solid ${BD}`,
              background: 'transparent', color: TX3,
              fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AssessPage({ params }) {
  // Guard params in case Next.js ever hands us something unexpected. In 14.x
  // params is a plain object, but better safe than crashing a candidate mid-flow.
  const uniqueToken = params?.uniqueToken || null

  const [uiState, setUiState] = useState('loading') // loading | error | already_complete | resume | intro | active | calendar | strategic_thinking | workspace | submitting | rating | preview | complete
  const [demographicsDone, setDemographicsDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [candidate, setCandidate] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [companyName, setCompanyName] = useState('')
  const [pendingResponses, setPendingResponses] = useState(null) // stored between active→calendar→submit
  // Simplified Mode (Reasonable Adjustments Layer 2). Owned at the page
  // level so a single useEffect can apply / remove the body class for the
  // whole assessment session and so localStorage stays in sync regardless
  // of which screen is on screen.
  const [simplifiedMode, setSimplifiedMode] = useState(() => readSimplifiedMode(uniqueToken))
  const simplifiedModeBootstrapped = useRef(false)
  // Resume state. Populated on mount from localStorage and the DB JSONB
  // column when the candidate has meaningful in-progress work; null when
  // they're a fresh start or have no recoverable state. Passed to
  // ActivePage as initialProgress when the candidate clicks Continue.
  const [savedProgress, setSavedProgress] = useState(null)
  // Strategic Thinking (Strategy-Fit only) candidate responses keyed
  // by question id. Captured locally as the candidate types, attached
  // to the final submit payload via doSubmit so scoring can read them
  // alongside the workspace_data.
  const [strategicThinkingResponses, setStrategicThinkingResponses] = useState({})
  // Seconds the candidate spent on the Strategic Thinking screen.
  // Captured from the screen's mount-to-submit timer and merged into
  // the submit payload as strategic_thinking_responses.time_in_component.
  const [strategicThinkingTime, setStrategicThinkingTime] = useState(0)

  // Apply / remove the simplified-mode body class. Cleanup on unmount so
  // a navigation away from /assess does not leave the global app body in
  // a stuck state.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const cls = 'pd-simplified-mode'
    if (simplifiedMode) document.body.classList.add(cls)
    else document.body.classList.remove(cls)
    return () => { document.body.classList.remove(cls) }
  }, [simplifiedMode])

  // Wrapped setter: keep state and localStorage in lock-step.
  const updateSimplifiedMode = (value) => {
    setSimplifiedMode(!!value)
    writeSimplifiedMode(uniqueToken, !!value)
  }

  // Layer 1 → Layer 2 auto-prefills. One round-trip pulls the candidate's
  // adjustment_requests row and applies any flags we have a Layer 2 surface
  // for: 'simplified_ui' and 'audio_response'. We treat any existing
  // simplified-mode localStorage value as the candidate's explicit choice
  // and do not override it. voicePrefilled is page-level so ActivePage can
  // initialise per-scenario inputModes to 'record' when first rendered.
  const [voicePrefilled, setVoicePrefilled] = useState(false)
  useEffect(() => {
    if (!uniqueToken) return
    if (simplifiedModeBootstrapped.current) return
    simplifiedModeBootstrapped.current = true
    let storedSimplified = null
    try { storedSimplified = window.localStorage.getItem(simplifiedModeKey(uniqueToken)) } catch {}
    let cancelled = false
    fetch(`/api/assess/${uniqueToken}/adjustment-request`).then(async r => {
      if (!r.ok) return
      const data = await r.json().catch(() => null)
      if (cancelled) return
      const types = Array.isArray(data?.request?.adjustment_types) ? data.request.adjustment_types : []
      if (storedSimplified === null && types.includes('simplified_ui')) updateSimplifiedMode(true)
      if (types.includes('audio_response')) setVoicePrefilled(true)
    }).catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueToken])

  useEffect(() => {
    if (!uniqueToken) {
      setUiState('error')
      setErrorMessage('Assessment link is missing or invalid.')
      return
    }
    async function load() {
      try {
        const res = await fetch(`/api/assess/${uniqueToken}`)
        if (res.status === 404) {
          setUiState('error')
          setErrorMessage('Assessment not found or link invalid.')
          return
        }
        if (!res.ok) {
          setUiState('error')
          setErrorMessage('Something went wrong. Please try again later.')
          return
        }
        const data = await res.json()
        setCandidate(data?.candidate || null)
        setAssessment(data?.assessment || null)
        setCompanyName(data?.company_name || 'The hiring team')

        if (data?.candidate?.status === 'completed') {
          setUiState('already_complete')
        } else if (data?.candidate) {
          // Look for in-progress saved state. Prefer localStorage (instant
          // on same browser) but fall back to the DB JSONB column for
          // cross-device resume. Only show the Resume page when the saved
          // blob represents meaningful work; an essentially-empty blob
          // (scenarioIndex 0, all responses blank) drops through to the
          // standard intro screen.
          let progress = readLocalProgress(uniqueToken)
          if (!hasMeaningfulProgress(progress)) {
            try {
              const pres = await fetch(`/api/assess/${uniqueToken}/progress`, { cache: 'no-store' })
              if (pres.ok) {
                const pdata = await pres.json().catch(() => ({}))
                if (pdata?.progress) progress = pdata.progress
              }
            } catch {
              // Network failure on progress lookup is non-fatal: candidate
              // continues to the standard intro and starts fresh.
            }
          }
          if (hasMeaningfulProgress(progress)) {
            setSavedProgress(progress)
            setUiState('resume')
          } else {
            setUiState('intro')
          }
        } else {
          setUiState('error')
          setErrorMessage('Assessment data is incomplete. Please contact the hiring team.')
        }
      } catch {
        setUiState('error')
        setErrorMessage('Failed to load assessment. Please check your connection.')
      }
    }
    load()
  }, [uniqueToken])

  function handleScenariosComplete(data) {
    // ActivePage now passes { responses, micro_signals }. Keep a defensive
    // shim so legacy callers that pass a bare array still work.
    const payload = Array.isArray(data) ? { responses: data, micro_signals: null } : data
    setPendingResponses(payload)
    const currentMode = (assessment?.assessment_mode || '').toLowerCase()
    // Rapid mode skips calendar, goes straight to submit
    if (currentMode === 'rapid') {
      doSubmit(payload)
    } else if (assessment?.calendar_events) {
      setUiState('calendar')
    } else {
      doSubmit(payload)
    }
  }

  async function doSubmit(data) {
    setUiState('submitting')
    const { responses, micro_signals } = Array.isArray(data)
      ? { responses: data, micro_signals: null }
      : (data || {})
    // Strategy-Fit Strategic Thinking responses, when the candidate
    // visited the Strategic Thinking screen and answered any question.
    // Merged with time_in_component (mounted-to-submit elapsed seconds)
    // and posted on the same call as the scenario responses; the
    // server persists it to assessments.strategic_thinking_responses.
    // Senders that didn't visit the screen send no key at all so the
    // server skips persistence entirely.
    const stKeys = Object.keys(strategicThinkingResponses || {})
    const hasStrategicThinking = stKeys.some(
      k => typeof strategicThinkingResponses[k] === 'string' && strategicThinkingResponses[k].trim().length > 0
    )
    const strategicThinkingPayload = hasStrategicThinking
      ? { ...strategicThinkingResponses, time_in_component: strategicThinkingTime }
      : null
    // 1) Submit responses. Server kicks off scoring in the background via
    //    waitUntil and returns quickly, so this request itself is fast.
    try {
      const res = await fetch(`/api/assess/${uniqueToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          micro_signals,
          ...(strategicThinkingPayload ? { strategic_thinking_responses: strategicThinkingPayload } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMessage(data.error || 'Submission failed. Please try again.')
        setUiState('error')
        return
      }
      // Clear in-progress save once the server has accepted the final
      // submission. localStorage immediately, DB best-effort. A stale
      // saved blob would otherwise pop the Resume page on a second
      // visit to a completed assessment, before the GET /progress
      // completed-status guard kicks in.
      clearLocalProgress(uniqueToken)
      clearSimplifiedMode(uniqueToken)
      fetch(`/api/assess/${uniqueToken}/progress`, { method: 'DELETE' }).catch(() => {})
    } catch {
      setErrorMessage('Submission failed. Please check your connection and try again.')
      setUiState('error')
      return
    }

    // 2) Poll /status every 5s for up to 3 minutes. When the results row
    //    appears, advance to the rating stage. On scoring_failed show error.
    //    Otherwise fall back to the saved page with a done button.
    const POLL_INTERVAL_MS = 5000
    const POLL_MAX_MS = 3 * 60 * 1000
    const started = Date.now()

    const poll = async () => {
      if (Date.now() - started >= POLL_MAX_MS) {
        setUiState('saved')
        return
      }
      try {
        const res = await fetch(`/api/assess/${uniqueToken}/status`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (data.error === 'scoring_failed') {
          setErrorMessage('We could not score your assessment automatically. Your responses are saved and the hiring team has been notified.')
          setUiState('error')
          return
        }
        if (data.complete) {
 // Single completion screen, no rating / preview steps.
          // Candidates are done; feedback collection, if ever wanted, lives
          // at /assess/[token]/feedback and is reachable from the
          // AlreadyCompletedPage next time they open the link.
          setUiState('complete')
          return
        }
      } catch {
 // Network blip, fall through to retry on next tick.
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    }
    setTimeout(poll, POLL_INTERVAL_MS)
  }

  if (uiState === 'loading') {
    const shimmer = {
      background: 'linear-gradient(90deg, #f0f4f8 25%, #e4eaf2 50%, #f0f4f8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
      borderRadius: 8,
    }
    return (
      <>
        <NavBar />
        <div style={{ background: BG, minHeight: '100vh', fontFamily: F }}>
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 16, padding: '32px 36px' }}>
              <div style={{ ...shimmer, width: 120, height: 22, marginBottom: 20 }} />
              <div style={{ ...shimmer, width: '75%', height: 14, marginBottom: 10 }} />
              <div style={{ ...shimmer, width: '55%', height: 14, marginBottom: 28 }} />
              <div style={{ ...shimmer, width: '100%', height: 120, borderRadius: 10, marginBottom: 20 }} />
              <div style={{ ...shimmer, width: '100%', height: 80, borderRadius: 10, marginBottom: 24 }} />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ ...shimmer, width: 200, height: 52, borderRadius: 12 }} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (uiState === 'error') return <ErrorPage message={errorMessage} />
  if (uiState === 'already_complete') return <AlreadyCompletedPage candidateName={candidate?.name} token={uniqueToken} />
  if (uiState === 'resume') return (
    <ResumePage
      candidate={candidate}
      assessment={assessment}
      savedProgress={savedProgress}
      onContinue={() => setUiState('active')}
      onStartOver={() => {
        // Wipe both stores so the candidate's next session is genuinely
        // fresh. Fire-and-forget on the DB delete so a network failure
        // doesn't block them from restarting; localStorage is the
        // authoritative same-browser signal anyway.
        clearLocalProgress(uniqueToken)
        fetch(`/api/assess/${uniqueToken}/progress`, { method: 'DELETE' }).catch(() => {})
        setSavedProgress(null)
        setUiState('intro')
      }}
    />
  )
  if (uiState === 'intro') return (
    <IntroPage
      candidate={candidate}
      assessment={assessment}
      companyName={companyName}
      uniqueToken={uniqueToken}
      simplifiedMode={simplifiedMode}
      onSimplifiedModeChange={updateSimplifiedMode}
      onBegin={() => {
        // Record consent timestamp server-side. Fire-and-forget: a network
        // blip should not block a candidate from starting their assessment;
        // the endpoint is idempotent so a refresh-then-Start does not
        // overwrite the original record.
        fetch(`/api/assess/${uniqueToken}/consent`, { method: 'POST' }).catch(() => {})
        setUiState('active')
      }}
    />
  )
  if (uiState === 'active') return (
    <ActivePage
      candidate={candidate}
      assessment={assessment}
      onSubmit={handleScenariosComplete}
      uniqueToken={uniqueToken}
      initialProgress={savedProgress}
      voicePrefilled={voicePrefilled}
    />
  )
  // Helper: after the calendar/scenarios stage, decide whether the
  // Strategy-Fit candidate goes through the new Strategic Thinking
  // screen first, or skips straight to the Workspace. Strategic
  // Thinking only fires when (a) mode is advanced, (b) the assessment
  // row carries a generated component on strategy_fit_components, and
  // (c) the candidate has not yet completed it. Legacy Strategy-Fit
  // assessments created before this launch carry no component on the
  // row and gracefully fall through to the Workspace as today.
  function advanceFromCalendar(submittedResponses) {
    const isAdvanced = (assessment?.assessment_mode || '').toLowerCase() === 'advanced'
    if (!isAdvanced) {
      doSubmit(submittedResponses)
      return
    }
    const hasStrategicThinking = !!assessment?.strategy_fit_components?.strategic_thinking?.evaluation_questions?.length
    if (hasStrategicThinking) {
      setUiState('strategic_thinking')
    } else {
      setUiState('workspace')
    }
  }

  if (uiState === 'calendar') return (
    <CalendarPage
      assessment={assessment}
      candidate={candidate}
      onSubmit={(calendarData) => {
        fetch(`/api/assessment/${assessment.id}/calendar-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: calendarData }),
        }).catch(() => {})
        // Route to Strategic Thinking screen for Strategy-Fit (when
        // the component is on the row), then to workspace, otherwise
        // submit straight away.
        advanceFromCalendar(pendingResponses)
      }}
      onSkip={() => {
        advanceFromCalendar(pendingResponses)
      }}
    />
  )
  if (uiState === 'strategic_thinking') {
    const component = assessment?.strategy_fit_components?.strategic_thinking
    if (!component || !Array.isArray(component.evaluation_questions) || component.evaluation_questions.length === 0) {
      // Defensive: no component on the row, skip to workspace.
      setTimeout(() => setUiState('workspace'), 0)
      return null
    }
    return (
      <StrategicThinkingScreen
        component={component}
        responses={strategicThinkingResponses}
        onChange={setStrategicThinkingResponses}
        onSubmit={(seconds) => {
          if (Number.isFinite(seconds)) setStrategicThinkingTime(seconds)
          setUiState('workspace')
        }}
        onSkip={(seconds) => {
          if (Number.isFinite(seconds)) setStrategicThinkingTime(seconds)
          setUiState('workspace')
        }}
      />
    )
  }
  if (uiState === 'workspace') {
    // Defensive: the workspace stage is Strategy-Fit only. If somehow we land
    // here without `advanced` mode (stale state, bug upstream), skip it and
    // submit directly so the candidate doesn't get stuck on "Unable to load
    // workspace" for an assessment that never had workspace content.
    const isAdvanced = (assessment?.assessment_mode || '').toLowerCase() === 'advanced'
    if (!isAdvanced) {
      // Defer to avoid calling setState during render.
      setTimeout(() => doSubmit(pendingResponses || []), 0)
      return null
    }
    // Modular Workspace gate. Each shell has its own per-assessment
    // flag so we can ramp them independently and roll one back without
    // touching the others:
    //   Office (Phase 1, live)        -> use_modular_workspace
    //   Healthcare (Phase 2, live)    -> healthcare_workspace_enabled
    //   Education (Phase 2, live)     -> education_workspace_enabled
    // Field-ops and out-of-scope roles continue to fall through to the
    // legacy WorkspacePage until their respective shells ship.
    const hasScenario = !!assessment?.workspace_scenario
    const officeReady = hasScenario
      && assessment?.shell_family === 'office'
      && assessment?.use_modular_workspace === true
    const healthcareReady = hasScenario
      && assessment?.shell_family === 'healthcare'
      && assessment?.healthcare_workspace_enabled === true
    const educationReady = hasScenario
      && assessment?.shell_family === 'education'
      && assessment?.education_workspace_enabled === true
    const useModular = officeReady || healthcareReady || educationReady
    if (useModular) {
      return (
        <ModularWorkspace
          assessment={assessment}
          candidate={candidate}
          onSubmit={(workspaceData) => {
            doSubmit(pendingResponses)
            fetch(`/api/assessment/${assessment.id}/calendar-score`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: { workspace_data: workspaceData } }),
            }).catch(() => {})
          }}
          onSkip={() => doSubmit(pendingResponses)}
        />
      )
    }
    return (
    <WorkspacePage
      assessment={assessment}
      candidate={candidate}
      onSubmit={(workspaceData) => {
        doSubmit(pendingResponses)
        // Score workspace async
        fetch(`/api/assessment/${assessment.id}/calendar-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_id: candidate.id, calendar_layout: { workspace_data: workspaceData } }),
        }).catch(() => {})
      }}
      onSkip={() => doSubmit(pendingResponses)}
    />
    )
  }
  if (uiState === 'submitting') return <SubmittingPage candidateName={candidate?.name} />
  if (uiState === 'saved') return <SavedPage candidateName={candidate?.name} onContinue={() => setUiState('complete')} />
  if (uiState === 'rating') return (
    <RatingPage
      candidateName={candidate?.name}
      uniqueToken={uniqueToken}
      onComplete={() => setUiState('preview')}
    />
  )
  if (uiState === 'preview') return (
    <CandidatePreviewPage
      candidateName={candidate?.name}
      uniqueToken={uniqueToken}
      onContinue={() => setUiState('complete')}
    />
  )
  if (uiState === 'complete') {
    if (!demographicsDone) {
      return <DemographicsPage candidateId={candidate?.id} candidateName={candidate?.name} onDone={() => setDemographicsDone(true)} />
    }
    return <CompletePage candidateName={candidate?.name} uniqueToken={uniqueToken} />
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Forced Choice UI: three interactive decision mechanics that render before
// the open text response. State is lifted to ActivePage and written back via
// `onChange`. If `spec` is null the block is not rendered (the parent already
// guards on `scenario.forced_choice`).
// ─────────────────────────────────────────────────────────────────────────────

const FC_SLATE = '#64748B'
const FC_RED = '#dc2626'

// Three-slot ranked-decision input. Each slot holds an action label and a
// 1 to 2 sentence justification. Up/down arrows reorder the slots without
// pulling in a drag-drop dependency. The block sits above the optional
// free-text response so candidates lead with structured ranking and only
// add free text as context.
function RankedActionsBlock({ slots, onChange }) {
  const set = (i, field, val) => {
    const next = (slots || []).map((s, idx) => idx === i ? { ...s, [field]: val } : s)
    onChange(next)
  }
  const move = (from, to) => {
    if (!Array.isArray(slots)) return
    if (to < 0 || to >= slots.length) return
    const next = slots.map(s => ({ ...s }))
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }
  const labels = ['First action', 'Second action', 'Third action']
  return (
    <div style={{
      background: '#f7f9fb', border: `1px solid ${BD}`, borderRadius: 12,
      padding: '20px 22px', marginBottom: 18,
    }}>
      <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 800, color: NAVY, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        Step 1: Rank your top three actions
      </div>
      <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, lineHeight: 1.6, margin: '0 0 16px' }}>
        Order matters. Action 1 fires first. For each action add a 1 to 2 sentence justification explaining why it sits in this slot.
      </p>
      {(slots || []).map((slot, i) => (
        <div key={i} style={{
          background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
          padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <div style={{
            background: TEAL, color: '#fff', fontFamily: F, fontWeight: 800, fontSize: 14,
            width: 28, height: 28, borderRadius: 8, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX2, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>{labels[i] || `Action ${i + 1}`}</div>
            <input
              value={slot?.action || ''}
              onChange={e => set(i, 'action', e.target.value)}
              placeholder="What you do"
              style={{ width: '100%', fontFamily: F, fontSize: 14, padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, marginBottom: 6, color: TX, background: '#fff' }}
            />
            <textarea
              value={slot?.justification || ''}
              onChange={e => set(i, 'justification', e.target.value)}
              placeholder="Why this is in this slot. 1 to 2 sentences."
              rows={2}
              style={{ width: '100%', fontFamily: F, fontSize: 13.5, padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, color: TX, background: '#fff', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => move(i, i - 1)}
              disabled={i === 0}
              aria-label="Move up"
              style={{
                background: i === 0 ? '#f0f3f7' : '#fff', border: `1px solid ${BD}`, borderRadius: 6,
                width: 28, height: 24, fontFamily: F, fontSize: 13, fontWeight: 700, color: i === 0 ? TX3 : NAVY,
                cursor: i === 0 ? 'not-allowed' : 'pointer',
              }}
            >↑</button>
            <button
              type="button"
              onClick={() => move(i, i + 1)}
              disabled={i === (slots?.length || 0) - 1}
              aria-label="Move down"
              style={{
                background: i === (slots?.length || 0) - 1 ? '#f0f3f7' : '#fff', border: `1px solid ${BD}`, borderRadius: 6,
                width: 28, height: 24, fontFamily: F, fontSize: 13, fontWeight: 700,
                color: i === (slots?.length || 0) - 1 ? TX3 : NAVY,
                cursor: i === (slots?.length || 0) - 1 ? 'not-allowed' : 'pointer',
              }}
            >↓</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ForcedChoiceBlock({ scenarioIndex, spec, value, onChange }) {
  const wrapper = (children) => (
    <div style={{
      marginBottom: 20, padding: '16px 18px',
      background: '#f8fafb', border: `1px solid #e4e9f0`, borderRadius: 12,
      borderLeft: `4px solid ${NAVY}`,
    }}>
      <div style={{
        fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY,
        marginBottom: 6, letterSpacing: '-0.1px',
      }}>
        Step 1: Make your decisions
      </div>
      <div style={{ fontFamily: F, fontSize: 13, color: '#4a5568', marginBottom: 14, lineHeight: 1.55 }}>
        {spec.instruction}
      </div>
      {children}
    </div>
  )

  if (spec.type === 'ranking') {
    return wrapper(
      <RankingChoice
        key={`rank-${scenarioIndex}`}
        items={spec.items || []}
        value={value}
        onChange={(order) => onChange({ type: 'ranking', response: { ranked: order } })}
      />
    )
  }
  if (spec.type === 'select_exclude') {
    return wrapper(
      <SelectExcludeChoice
        key={`se-${scenarioIndex}`}
        items={spec.items || []}
        selectCount={spec.select_count || 3}
        value={value}
        onChange={(v) => onChange({ type: 'select_exclude', response: v })}
      />
    )
  }
  if (spec.type === 'trade_off') {
    return wrapper(
      <TradeOffChoice
        key={`to-${scenarioIndex}`}
        pairs={spec.pairs || []}
        value={value}
        onChange={(choices) => onChange({ type: 'trade_off', response: { choices } })}
      />
    )
  }
  return null
}

// Visually-hidden style used for the aria-live region inside each
// forced-choice block. Same shape as the timer announcement helper used
// elsewhere in this file.
const FC_VISUALLY_HIDDEN = {
  position: 'absolute', width: 1, height: 1, margin: -1, padding: 0,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

function RankingChoice({ items, value, onChange }) {
  // Initial order: preserve existing response if present, otherwise the prompt order.
  const initial = Array.isArray(value?.response?.ranked) && value.response.ranked.length === items.length
    ? value.response.ranked
    : items
  const [order, setOrder] = useState(initial)
  const [dragIndex, setDragIndex] = useState(null)
  // Keyboard pick-up-and-drop state. pickedUpIndex is the index of the
  // row the candidate has marked as "grabbed" via Space; null when no
  // row is grabbed. Each Arrow press still commits-as-you-go (same
  // semantic as the existing Up/Down buttons), so a screen-reader user
  // can correct an accidental move with another Arrow in the opposite
  // direction. announce drives the visually-hidden aria-live region
  // below; we re-set the same string by appending a zero-width character
  // when needed so the screen reader re-announces a consecutive identical
  // event.
  const [pickedUpIndex, setPickedUpIndex] = useState(null)
  const [announce, setAnnounce] = useState('')
  const itemRefs = useRef([])

  function commit(next) {
    setOrder(next)
    onChange(next)
  }
  function move(i, dir, opts = {}) {
    const j = i + dir
    if (j < 0 || j >= order.length) return i
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
    if (opts.announce) {
      setAnnounce(`Moved ${order[i]} to position ${j + 1} of ${order.length}.`)
    }
    return j
  }
  function handleDrop(targetIndex) {
    if (dragIndex == null || dragIndex === targetIndex) return
    const next = [...order]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setDragIndex(null)
    commit(next)
  }
  function onRowKeyDown(e, i) {
    const item = order[i]
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      if (pickedUpIndex === i) {
        setPickedUpIndex(null)
        setAnnounce(`Dropped ${item} at position ${i + 1} of ${order.length}.`)
      } else if (pickedUpIndex == null) {
        setPickedUpIndex(i)
        setAnnounce(`Picked up ${item}. Use arrow keys to move. Press Space to drop. Press Escape to cancel.`)
      } else {
        // Pick up a different row: drop the previous, then pick this one.
        setPickedUpIndex(i)
        setAnnounce(`Picked up ${item}. Use arrow keys to move. Press Space to drop. Press Escape to cancel.`)
      }
      return
    }
    if (e.key === 'Escape' && pickedUpIndex != null) {
      e.preventDefault()
      setPickedUpIndex(null)
      setAnnounce('Move cancelled.')
      return
    }
    if (pickedUpIndex !== i) return
    // From here on: only handle arrow keys when this row is the picked-up row.
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = move(i, -1, { announce: true })
      // Move the picked-up marker with the row, and re-focus the moved row.
      if (newIdx !== i) {
        setPickedUpIndex(newIdx)
        // Re-focus on next paint when the DOM has settled.
        setTimeout(() => { itemRefs.current[newIdx]?.focus() }, 0)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = move(i, 1, { announce: true })
      if (newIdx !== i) {
        setPickedUpIndex(newIdx)
        setTimeout(() => { itemRefs.current[newIdx]?.focus() }, 0)
      }
    }
  }

  return (
    <div>
      <span role="status" aria-live="polite" aria-atomic="true" style={FC_VISUALLY_HIDDEN}>
        {announce}
      </span>
      <ul
        role="list"
        aria-label={`Ranking, ${order.length} items. Use arrow keys, Space to pick up, Space again to drop.`}
        style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {order.map((item, i) => {
          const isPickedUp = pickedUpIndex === i
          return (
            <li
              key={item}
              ref={el => { itemRefs.current[i] = el }}
              tabIndex={0}
              role="button"
              aria-roledescription="sortable item"
              aria-grabbed={isPickedUp}
              aria-label={`Item ${i + 1} of ${order.length}: ${item}. Press Space to pick up, arrow keys to move, Space again to drop.`}
              onKeyDown={(e) => onRowKeyDown(e, i)}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: isPickedUp ? '#e6f7f5' : '#fff',
                border: isPickedUp ? `2px solid ${TEAL}` : `1px solid ${NAVY}22`,
                borderRadius: 10,
                padding: isPickedUp ? '11px 13px' : '12px 14px',
                cursor: 'grab',
                opacity: dragIndex === i ? 0.6 : 1,
                transform: isPickedUp ? 'translateY(-1px)' : 'none',
                boxShadow: isPickedUp ? '0 4px 14px rgba(0,191,165,0.18)' : 'none',
                transition: 'opacity 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={FC_SLATE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx="9" cy="6" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="9" cy="18" r="1.2" />
                <circle cx="15" cy="6" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="15" cy="18" r="1.2" />
              </svg>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: TEAL, color: NAVY, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 800,
              }}>
                {i + 1}
              </span>
              <span style={{ fontFamily: F, fontSize: 13.5, color: '#0f2137', flex: 1, lineHeight: 1.5 }}>{item}</span>
              {isPickedUp && (
                <span aria-hidden style={{
                  fontFamily: F, fontSize: 11, fontWeight: 800, color: TEAL,
                  textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  Picked up
                </span>
              )}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => { move(i, -1, { announce: true }); itemRefs.current[i - 1]?.focus() }}
                  disabled={i === 0}
                  aria-label={`Move "${item}" up to position ${i} of ${order.length}`}
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: `1px solid #e4e9f0`, background: '#fff',
                    cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.35 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0f2137" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => { move(i, 1, { announce: true }); itemRefs.current[i + 1]?.focus() }}
                  disabled={i === order.length - 1}
                  aria-label={`Move "${item}" down to position ${i + 2} of ${order.length}`}
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: `1px solid #e4e9f0`, background: '#fff',
                    cursor: i === order.length - 1 ? 'not-allowed' : 'pointer', opacity: i === order.length - 1 ? 0.35 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#0f2137" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="6 9 12 15 18 9" /></svg>
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <div style={{ fontFamily: F, fontSize: 12, color: '#64748b', marginTop: 10 }}>
        Your ranking is saved automatically as you reorder. Mouse: drag rows to reorder. Keyboard: focus a row, press Space to pick up, arrow keys to move, Space to drop, or use the up and down buttons on the right.
      </div>
    </div>
  )
}

function SelectExcludeChoice({ items, selectCount, value, onChange }) {
  const initial = value?.response || { selected: [], excluded: null, excluded_reason: '' }
  const [state, setState] = useState(initial)

  function commit(next) {
    setState(next)
    onChange(next)
  }
  function toggleSelect(item) {
    if (state.excluded) return // locked once moved to exclude phase
    const has = state.selected.includes(item)
    let next
    if (has) {
      next = { ...state, selected: state.selected.filter(s => s !== item) }
    } else {
      if (state.selected.length >= selectCount) return
      next = { ...state, selected: [...state.selected, item] }
    }
    commit(next)
  }
  function toggleExclude(item) {
    if (state.selected.includes(item)) return
    const next = { ...state, excluded: state.excluded === item ? null : item }
    commit(next)
  }

  const phase = state.selected.length < selectCount ? 'select' : 'exclude'
  const selectedSet = new Set(state.selected)

  return (
    <div>
      <div
        role="group"
        aria-label={phase === 'select'
          ? `Select ${selectCount} options. ${state.selected.length} of ${selectCount} chosen.`
          : 'Now choose one option to exclude.'}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        {items.map((item) => {
          const isSelected = selectedSet.has(item)
          const isExcluded = state.excluded === item
          const disabled = !isSelected && !isExcluded && phase === 'exclude' ? false : (!isSelected && phase === 'select' && state.selected.length >= selectCount)
          const onClick = () => phase === 'select' ? toggleSelect(item) : toggleExclude(item)
          const border = isSelected ? TEAL : isExcluded ? FC_RED : `${NAVY}22`
          const bg = isSelected ? TEALLT : isExcluded ? '#fef2f2' : '#fff'
          const greyed = phase === 'exclude' && !isSelected && !isExcluded
          const pressed = isSelected || isExcluded
          const ariaLabel = phase === 'select'
            ? (isSelected ? `Selected: ${item}. Press to deselect.` : `Select: ${item}`)
            : (isExcluded ? `Excluded: ${item}. Press to undo.` : isSelected ? `Selected: ${item}` : `Exclude: ${item}`)
          return (
            <button
              key={item}
              type="button"
              onClick={onClick}
              aria-pressed={pressed}
              aria-label={ariaLabel}
              style={{
                textAlign: 'left', padding: '12px 14px',
                background: bg, border: `1.5px solid ${border}`, borderRadius: 10,
                cursor: 'pointer', opacity: greyed ? 0.7 : 1,
                fontFamily: F, fontSize: 13.5, color: '#0f2137', lineHeight: 1.5,
                display: 'flex', alignItems: 'flex-start', gap: 10,
                minHeight: 44,
              }}
            >
              <span aria-hidden style={{
                width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                background: isSelected ? TEAL : isExcluded ? FC_RED : '#fff',
                border: `1.5px solid ${isSelected ? TEAL : isExcluded ? FC_RED : '#e4e9f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', marginTop: 1,
              }}>
                {isSelected && (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                )}
                {isExcluded && (
                  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                )}
              </span>
              <span style={{ flex: 1 }}>{item}</span>
            </button>
          )
        })}
      </div>
      <div style={{ fontFamily: F, fontSize: 12.5, color: '#64748b', marginTop: 12 }}>
        {phase === 'select'
          ? `Selected ${state.selected.length} of ${selectCount}.`
          : state.excluded
            ? 'One action excluded. You can change your excluded action by clicking another option.'
            : 'Now identify one action you would NOT take at this stage.'}
      </div>
    </div>
  )
}

function TradeOffChoice({ pairs, value, onChange }) {
  const initial = Array.isArray(value?.response?.choices) ? value.response.choices : pairs.map(() => null)
  const [choices, setChoices] = useState(initial)

  function pick(i, side) {
    const next = [...choices]
    next[i] = pairs[i][side]
    setChoices(next)
    onChange(next)
  }

  const made = choices.filter(Boolean).length
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pairs.map((pair, i) => {
          const chosen = choices[i]
          return (
            <div
              key={i}
              role="group"
              aria-label={`Trade-off ${i + 1} of ${pairs.length}. Choose preferred option.`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                gap: 10,
                alignItems: 'stretch',
              }}
            >
              {['a', 'b'].map((side) => {
                const isChosen = chosen === pair[side]
                const other = side === 'a' ? 'b' : 'a'
                const isRejected = chosen === pair[other]
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => pick(i, side)}
                    aria-pressed={isChosen}
                    aria-label={isChosen
                      ? `Chosen: ${pair[side]}. Trade-off ${i + 1} of ${pairs.length}.`
                      : `Choose: ${pair[side]}. Trade-off ${i + 1} of ${pairs.length}.`}
                    style={{
                      textAlign: 'left', padding: '14px 16px',
                      background: isChosen ? TEALLT : '#fff',
                      border: `1.5px solid ${isChosen ? TEAL : `${NAVY}22`}`,
                      borderRadius: 10, cursor: 'pointer',
                      opacity: isRejected ? 0.45 : 1,
                      fontFamily: F, fontSize: 13.5, color: '#0f2137', lineHeight: 1.55,
                      minHeight: 44,
                      transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
                    }}
                  >
                    {pair[side]}
                  </button>
                )
              })}
              <div aria-hidden style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: F, fontSize: 11, fontWeight: 800, color: FC_SLATE,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                gridColumn: '2 / 3', gridRow: '1 / 2',
              }}>
                or
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontFamily: F, fontSize: 12.5, color: '#64748b', marginTop: 12 }}>
        {made} of {pairs.length} decisions made.
      </div>
    </div>
  )
}
