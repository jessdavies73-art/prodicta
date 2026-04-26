'use client'

// Phase 1 connected-scenario orchestrator. Mounts when
//   assessment.use_modular_workspace === true
//   AND assessment.workspace_scenario is populated
//   AND assessment.shell_family === 'office'
// Otherwise the legacy WorkspacePage in app/assess/[uniqueToken]/page.js
// continues to render. Same prop signature as the legacy component
// (assessment, candidate, onSubmit, onSkip) so the call-site swap is a
// single conditional.
//
// Stages: opening (spine + trigger setup) -> sequential blocks ->
// reflection (recap of what was produced) -> onSubmit. A single master
// timer counts down across the full sequence; when it hits zero we jump
// to the reflection stage regardless of which block we were on.
//
// workspace_data shape this writes:
//   {
//     schema: 'modular_v1',
//     scenario_id: string,
//     block_data: { [block_id]: { ...whatever the block sent on complete } },
//     started_at: ISO,
//     completed_at: ISO,
//     time_remaining_seconds: number
//   }

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadBlock, BLOCK_CATALOGUE } from '@/lib/workspace-blocks/office'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

function formatTime(seconds) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function ModularWorkspace({ assessment, candidate, onSubmit, onSkip }) {
  const scenario = assessment?.workspace_scenario
  const role_profile = assessment?.role_profile

  // Defensive: if the gate at the call site somehow fails and we mount
  // without a usable scenario, render a "skip" affordance rather than a
  // blank screen.
  if (!scenario || !Array.isArray(scenario.selected_blocks) || scenario.selected_blocks.length === 0) {
    return (
      <FallbackPanel
        title="Workspace not available"
        body="The Workspace simulation has not been generated for this assessment yet."
        onSkip={onSkip}
      />
    )
  }

  const selected = scenario.selected_blocks
  const totalSeconds = useMemo(
    () => selected.reduce((s, b) => s + (b.duration_seconds || 0), 0),
    [selected]
  )

  const [stage, setStage] = useState('opening') // 'opening' | 'block' | 'reflection'
  const [currentIndex, setCurrentIndex] = useState(0)
  const [blockData, setBlockData] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(totalSeconds)
  const [started, setStarted] = useState(false)
  const startedAtRef = useRef(null)

  // Master countdown. Starts when stage moves to 'block'. If it hits 0 we
  // jump to reflection so the candidate is not stuck mid-block when time
  // runs out.
  useEffect(() => {
    if (!started) return
    if (stage === 'reflection') return
    if (timeRemaining <= 0) {
      setStage('reflection')
      return
    }
    const tid = setTimeout(() => setTimeRemaining(t => t - 1), 1000)
    return () => clearTimeout(tid)
  }, [started, stage, timeRemaining])

  const handleStart = () => {
    startedAtRef.current = new Date().toISOString()
    setStarted(true)
    setStage('block')
  }

  const handleBlockComplete = (data) => {
    const blockId = selected[currentIndex].block_id
    setBlockData(prev => ({ ...prev, [blockId]: data }))
    if (currentIndex < selected.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setStage('reflection')
    }
  }

  const handleSubmit = () => {
    const payload = {
      schema: 'modular_v1',
      scenario_id: scenario.scenario_id,
      shell_family: scenario.shell_family,
      block_data: blockData,
      started_at: startedAtRef.current,
      completed_at: new Date().toISOString(),
      time_remaining_seconds: Math.max(0, timeRemaining),
    }
    onSubmit && onSubmit(payload)
  }

  // ─────────────────────────────────────────────────────────────────────
  // Stage: opening — show the scenario spine + trigger before the timer
  // starts. Candidate clicks Start to begin block 1.
  // ─────────────────────────────────────────────────────────────────────
  if (stage === 'opening') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc', fontFamily: F,
        padding: '60px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>Workspace simulation &middot; Monday 9:00am</div>
          <h1 style={{ fontFamily: F, fontSize: 30, fontWeight: 800, color: NAVY, lineHeight: 1.15, marginBottom: 14 }}>
            {scenario.title}
          </h1>
          <p style={{ fontFamily: F, fontSize: 17, color: '#1f2937', lineHeight: 1.55, marginBottom: 22 }}>
            {scenario.spine}
          </p>

          {scenario.trigger ? (
            <div style={{ background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Trigger
              </div>
              <div style={{ fontFamily: F, fontSize: 15, color: NAVY, lineHeight: 1.55 }}>
                {scenario.trigger}
              </div>
            </div>
          ) : null}

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              You will work through {selected.length} blocks &middot; {Math.round(totalSeconds / 60)} minutes total
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7 }}>
              {selected.map((b, i) => {
                const meta = BLOCK_CATALOGUE[b.block_id]
                return (
                  <li key={b.block_id}>
                    <b>{meta?.name || b.block_id}</b>
                    <span style={{ color: '#64748b', marginLeft: 6, fontFamily: FM, fontSize: 12 }}>
                      ({Math.round((b.duration_seconds || 0) / 60)} min)
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleStart}
              style={{
                fontFamily: F, fontSize: 16, fontWeight: 700,
                padding: '14px 28px', borderRadius: 10, border: 'none',
                background: TEAL, color: '#fff', cursor: 'pointer',
              }}
            >
              Start Workspace
            </button>
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                style={{
                  fontFamily: F, fontSize: 14, fontWeight: 600,
                  padding: '12px 18px', borderRadius: 10, background: 'transparent',
                  border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer',
                }}
              >
                Skip Workspace
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // Stage: block — render the current block component with scenario context
  // ─────────────────────────────────────────────────────────────────────
  if (stage === 'block') {
    const current = selected[currentIndex]
    const BlockComponent = loadBlock(current.block_id)
    const block_content = scenario.block_content?.[current.content_ref || current.block_id] || {}
    const scenario_context = {
      title: scenario.title,
      spine: scenario.spine,
      trigger: scenario.trigger,
      order: current.order,
      total: selected.length,
    }

    return (
      <div style={{ minHeight: '100vh', background: TEAL_TINT, fontFamily: F, padding: '24px 16px' }}>
        <ProgressBar
          current={currentIndex + 1}
          total={selected.length}
          timeRemaining={timeRemaining}
          totalSeconds={totalSeconds}
        />
        <div style={{ marginTop: 18 }}>
          {BlockComponent ? (
            <BlockComponent
              role_profile={role_profile}
              block_content={block_content}
              scenario_context={scenario_context}
              onComplete={handleBlockComplete}
            />
          ) : (
            <FallbackPanel
              title="Block not available"
              body={`Block "${current.block_id}" is not registered in the office shell loader.`}
              onSkip={() => handleBlockComplete({ block_id: current.block_id, error: 'unknown_block' })}
            />
          )}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────
  // Stage: reflection — recap of the completed blocks before submission
  // ─────────────────────────────────────────────────────────────────────
  if (stage === 'reflection') {
    const completedBlockIds = Object.keys(blockData)
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc', fontFamily: F,
        padding: '60px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div style={{
            fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
          }}>Workspace complete</div>
          <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1.15, marginBottom: 14 }}>
            Here is what you produced today
          </h1>
          <p style={{ fontFamily: F, fontSize: 16, color: '#1f2937', lineHeight: 1.55, marginBottom: 22 }}>
            {scenario.scenario_arc?.stage_5_resolution || 'Submit to send your responses to the hiring team.'}
          </p>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Blocks completed ({completedBlockIds.length} of {selected.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7 }}>
              {selected.map((b) => {
                const meta = BLOCK_CATALOGUE[b.block_id]
                const done = completedBlockIds.includes(b.block_id)
                return (
                  <li key={b.block_id} style={{ color: done ? NAVY : '#94a3b8' }}>
                    {meta?.name || b.block_id}
                    {done ? <span style={{ color: TEAL, marginLeft: 8, fontFamily: FM, fontSize: 12 }}>complete</span> : null}
                  </li>
                )
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            style={{
              fontFamily: F, fontSize: 16, fontWeight: 700,
              padding: '14px 28px', borderRadius: 10, border: 'none',
              background: TEAL, color: '#fff', cursor: 'pointer',
            }}
          >
            Submit Workspace
          </button>
        </div>
      </div>
    )
  }

  return null
}

function ProgressBar({ current, total, timeRemaining, totalSeconds }) {
  const elapsedPct = totalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalSeconds - timeRemaining) / totalSeconds) * 100))
    : 0
  const lowTime = timeRemaining <= 60 && timeRemaining > 0
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: NAVY }}>
          Block {current} of {total}
        </div>
        <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: lowTime ? '#dc2626' : NAVY }}>
          {formatTime(timeRemaining)} remaining
        </div>
      </div>
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${elapsedPct}%`,
          background: lowTime ? '#dc2626' : TEAL,
          transition: 'width 0.4s linear',
        }} />
      </div>
    </div>
  )
}

function FallbackPanel({ title, body, onSkip }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: F }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 8 }}>{title}</h2>
        <p style={{ fontFamily: F, fontSize: 14, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>{body}</p>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            style={{
              fontFamily: F, fontSize: 14, fontWeight: 700,
              padding: '12px 22px', borderRadius: 8, border: 'none',
              background: TEAL, color: '#fff', cursor: 'pointer',
            }}
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  )
}
