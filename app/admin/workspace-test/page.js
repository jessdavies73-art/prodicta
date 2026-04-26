'use client'

// Phase 1 admin test harness for the modular Workspace.
//
// The page lets an admin pick a role from a preset list (or type a custom
// one), tweak the role-profile overrides, run the detector + scenario
// generator via /api/admin/workspace-test, and inspect the output. A
// "Preview Workspace" button mounts ModularWorkspace inline with a
// synthetic assessment so the admin can walk through the stub blocks.
//
// Refinements in this revision:
//   - Role dropdown sourced from the canonical mapping in
//     lib/scenario-generator (so labels and groupings match the engine).
//   - After the API returns, we surface the canonical match diagnostics
//     (matched id, label, match_type, level) so it's clear whether the
//     role hit verbatim, fuzzy-matched on function+seniority, or fell
//     through to the level default.
//   - "Override blocks" toggle that exposes all 14 stubs as a checklist
//     so admins can force a custom block list for edge-case testing.
//
// Auth: gated behind authenticated users (any signed-in account). There
// is no admin-role table yet; tighten when that lands.
//
// IMPORTANT: this page does NOT create real assessment records. It only
// runs the in-memory detector and generator and renders their output.

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ModularWorkspace from '@/app/assess/[uniqueToken]/components/ModularWorkspace'
import { CANONICAL_ROLE_MAPPING } from '@/lib/scenario-generator'
import { BLOCK_CATALOGUE } from '@/lib/workspace-blocks/office/catalogue'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

// Canonical level -> display label.
const LEVEL_LABELS = {
  1: 'Level 1: Front desk / Coordination (4 blocks)',
  2: 'Level 2: Execution + Judgement (4 blocks)',
  3: 'Level 3: Management (5 blocks)',
  4: 'Level 4: Senior / Leadership (4 blocks)',
}

// Out-of-scope roles for verifying the legacy fallback path.
const OUT_OF_SCOPE_ROLES = [
  'Warehouse Operative', 'HGV Driver', 'Bartender', 'Hairdresser', 'Cleaner',
]

// Extrapolation roles to verify the function+seniority and level fallback
// passes. None of these match a canonical role_title verbatim.
const EXTRAPOLATION_ROLES = [
  'Procurement Manager',
  'Investor Relations Manager',
  'Compliance Officer',
  'Internal Auditor',
  'BD Manager',
]

export default function WorkspaceTestHarness() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  // Build the preset list from the canonical mapping plus extrapolation
  // and out-of-scope examples. Each entry is { value, label, group }.
  const presetGroups = useMemo(() => {
    const byLevel = { 1: [], 2: [], 3: [], 4: [] }
    for (const entry of CANONICAL_ROLE_MAPPING) {
      const exemplar = entry.role_titles[0]
        .split(/\s+/)
        .map(w => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
        .join(' ')
      byLevel[entry.level].push({ value: exemplar, label: `${exemplar} (canonical: ${entry.id})` })
    }
    return [
      { label: LEVEL_LABELS[1], options: byLevel[1] },
      { label: LEVEL_LABELS[2], options: byLevel[2] },
      { label: LEVEL_LABELS[3], options: byLevel[3] },
      { label: LEVEL_LABELS[4], options: byLevel[4] },
      { label: 'Extrapolation tests (function + seniority match)', options: EXTRAPOLATION_ROLES.map(r => ({ value: r, label: r })) },
      { label: 'Out of scope (should fall back to legacy)', options: OUT_OF_SCOPE_ROLES.map(r => ({ value: r, label: r })) },
    ]
  }, [])

  const [roleTitle, setRoleTitle] = useState('Marketing Manager')
  const [customRole, setCustomRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [sectorContext, setSectorContext] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [employmentType, setEmploymentType] = useState('permanent')

  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [overrideBlocks, setOverrideBlocks] = useState([])

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { profile, shell_family, preview, scenario, fallback_reason }

  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          router.replace('/login?next=/admin/workspace-test')
          return
        }
        setAuthed(true)
      } catch {
        if (!cancelled) router.replace('/login?next=/admin/workspace-test')
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  const effectiveTitle = customRole.trim() || roleTitle

  async function runRequest({ dryRun }) {
    setError(null)
    setPreviewing(false)
    if (!effectiveTitle) {
      setError('Pick or type a role title.')
      return
    }
    setGenerating(true)
    if (!dryRun) setResult(null)
    try {
      const res = await fetch('/api/admin/workspace-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle: effectiveTitle,
          jobDescription,
          dry_run: !!dryRun,
          ...(overrideEnabled && overrideBlocks.length > 0 ? { block_override: overrideBlocks } : {}),
          profileOverrides: {
            ...(sectorContext.trim() ? { sector_context: sectorContext.trim() } : {}),
            ...(companySize ? { company_size: companySize } : {}),
            ...(employmentType ? { employment_type: employmentType } : {}),
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || `Request failed: ${res.status}`)
      } else {
        setResult(body)
      }
    } catch (e) {
      setError(e?.message || 'Network error')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerate = () => runRequest({ dryRun: false })
  const handlePreviewBlocks = () => runRequest({ dryRun: true })

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: NAVY }}>
        Checking access...
      </div>
    )
  }
  if (!authed) return null

  if (previewing && result?.scenario) {
    const fakeAssessment = {
      id: 'admin-test',
      role_title: effectiveTitle,
      assessment_mode: 'advanced',
      use_modular_workspace: true,
      shell_family: result.shell_family,
      role_profile: result.profile,
      workspace_scenario: result.scenario,
    }
    return (
      <div>
        <div style={{ background: NAVY, color: '#fff', padding: '10px 16px', fontFamily: FM, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Admin preview &middot; {effectiveTitle} &middot; {result.scenario.title}</span>
          <button
            onClick={() => setPreviewing(false)}
            style={{ fontFamily: F, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: TEAL, color: '#fff', cursor: 'pointer' }}
          >
            Exit preview
          </button>
        </div>
        <ModularWorkspace
          assessment={fakeAssessment}
          candidate={{ id: 'admin-test', name: 'Admin tester' }}
          onSubmit={(payload) => {
            console.log('[admin-preview] workspace submit payload', payload)
            alert('Workspace complete. Check console for the submitted payload.')
            setPreviewing(false)
          }}
          onSkip={() => setPreviewing(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: F, padding: '40px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Modular Workspace test harness
          </div>
          <h1 style={{ fontFamily: F, fontSize: 28, fontWeight: 800, color: NAVY, lineHeight: 1.2 }}>
            Pick a role, generate a connected scenario
          </h1>
          <p style={{ fontFamily: F, fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 1.5 }}>
            Phase 1. Office shell only. Out-of-scope roles, healthcare, education, and field-ops fall back to the legacy WorkspacePage. Nothing is written to the database from this page.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 18 }}>
          <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 14 }}>Inputs</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Preset role">
              <select
                value={roleTitle}
                onChange={(e) => { setRoleTitle(e.target.value); setCustomRole('') }}
                style={selectStyle}
              >
                {presetGroups.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Or type a custom role">
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g. Compliance Officer"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Optional job description (paste a few lines)">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
              placeholder="Improves detector accuracy. Optional."
              style={{ ...inputStyle, fontFamily: F, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
            <Field label="Sector context override">
              <input
                type="text"
                value={sectorContext}
                onChange={(e) => setSectorContext(e.target.value)}
                placeholder="e.g. NHS trust"
                style={inputStyle}
              />
            </Field>
            <Field label="Company size override">
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} style={selectStyle}>
                <option value="">(detected)</option>
                <option value="startup">startup</option>
                <option value="scaleup">scaleup</option>
                <option value="mid_market">mid_market</option>
                <option value="corporate">corporate</option>
              </select>
            </Field>
            <Field label="Employment type">
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} style={selectStyle}>
                <option value="permanent">permanent</option>
                <option value="temporary">temporary</option>
              </select>
            </Field>
          </div>

          <BlockOverridePanel
            enabled={overrideEnabled}
            onToggle={(v) => setOverrideEnabled(v)}
            selected={overrideBlocks}
            onChange={setOverrideBlocks}
          />

          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                fontFamily: F, fontSize: 15, fontWeight: 700,
                padding: '12px 22px', borderRadius: 8, border: 'none',
                background: generating ? '#94a3b8' : TEAL, color: '#fff',
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Working...' : 'Generate scenario'}
            </button>
            <button
              onClick={handlePreviewBlocks}
              disabled={generating}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 600,
                padding: '11px 18px', borderRadius: 8,
                background: 'transparent', border: '1px solid #cbd5e1',
                color: '#475569',
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              Preview block selection only (no AI call)
            </button>
            {error ? (
              <span style={{ marginLeft: 6, fontFamily: F, fontSize: 13, color: '#dc2626' }}>
                {error}
              </span>
            ) : null}
          </div>
        </div>

        {result ? (
          <ResultPanel result={result} effectiveTitle={effectiveTitle} onPreview={() => setPreviewing(true)} />
        ) : null}
      </div>
    </div>
  )
}

function BlockOverridePanel({ enabled, onToggle, selected, onChange }) {
  const allBlocks = Object.values(BLOCK_CATALOGUE)
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id))
    else onChange([...selected, id])
  }
  const move = (id, dir) => {
    const idx = selected.indexOf(id)
    if (idx === -1) return
    const next = [...selected]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }
  return (
    <div style={{ marginTop: 18, padding: 16, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, fontWeight: 700, color: '#92400e', cursor: 'pointer' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        Override block selection (testing only)
      </label>
      {enabled ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Pick blocks in execution order. The canonical lookup is bypassed.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 10 }}>
            {allBlocks.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, color: '#1f2937', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(b.id)}
                  onChange={() => toggle(b.id)}
                />
                <span style={{ fontFamily: FM, fontSize: 11, color: '#475569' }}>{b.id}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>&middot; {b.category}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 ? (
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 8, padding: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Order ({selected.length} blocks)
              </div>
              {selected.map((id, i) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: F, fontSize: 13, color: NAVY }}>
                  <span style={{ fontFamily: FM, fontSize: 11, color: '#64748b', width: 22 }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{BLOCK_CATALOGUE[id]?.name || id}</span>
                  <button onClick={() => move(id, -1)} disabled={i === 0} style={tinyBtn}>up</button>
                  <button onClick={() => move(id, 1)} disabled={i === selected.length - 1} style={tinyBtn}>down</button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ResultPanel({ result, effectiveTitle, onPreview }) {
  const { profile, shell_family, preview, scenario, fallback_reason } = result
  const matchInfo = scenario?.match_info || preview
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 32 }}>
      <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 14 }}>Output</h2>

      <Section title="Role profile">
        <Pre json={profile} />
      </Section>

      <Section title={`Shell family: ${shell_family}`}>
        {fallback_reason ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: 12, fontFamily: F, fontSize: 13, color: '#9a3412', lineHeight: 1.5 }}>
            <b>Falls back to legacy Workspace.</b> Reason: <code style={{ fontFamily: FM }}>{fallback_reason}</code>.
            {shell_family === 'out_of_scope' ? ' This role is not in the Phase 1 in-scope list.' : null}
            {shell_family && shell_family !== 'office' && shell_family !== 'out_of_scope' ? ' This shell is reserved for a later phase.' : null}
          </div>
        ) : (
          <div style={{ fontFamily: F, fontSize: 13, color: '#475569' }}>
            Office shell. Connected scenario generated below.
          </div>
        )}
      </Section>

      {matchInfo ? (
        <Section title="Canonical match">
          <div style={{ background: matchInfo.match_type === 'role_title' ? '#ecfdf5' : matchInfo.match_type === 'override' ? '#fff7ed' : '#eff6ff', border: '1px solid', borderColor: matchInfo.match_type === 'role_title' ? '#a7f3d0' : matchInfo.match_type === 'override' ? '#fdba74' : '#bfdbfe', borderRadius: 8, padding: 14 }}>
            <KV k="canonical_id" v={matchInfo.canonical_id || matchInfo.canonical_id} mono />
            {matchInfo.canonical_label ? <KV k="canonical_label" v={matchInfo.canonical_label} /> : null}
            <KV k="match_type" v={matchTypeLabel(matchInfo.match_type)} />
            {matchInfo.level ? <KV k="level" v={`L${matchInfo.level}`} /> : null}
          </div>
        </Section>
      ) : null}

      {preview && !scenario ? (
        <Section title="Block selection (preview)">
          <ol style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7 }}>
            {(preview.blocks || []).map(b => (
              <li key={b.block_id}>
                <b>{b.block_id}</b>
                <span style={{ color: '#64748b', marginLeft: 6, fontFamily: FM, fontSize: 12 }}>
                  ({Math.round((b.duration_seconds || 0) / 60)} min)
                </span>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 8, fontFamily: F, fontSize: 12, color: '#64748b' }}>
            Total target: {Math.round((preview.blocks || []).reduce((s, b) => s + (b.duration_seconds || 0), 0) / 60)} min across {preview.blocks?.length || 0} blocks.
          </div>
        </Section>
      ) : null}

      {scenario ? (
        <>
          <Section title="Scenario header">
            <KV k="scenario_id" v={scenario.scenario_id} mono />
            <KV k="title" v={scenario.title} />
            <KV k="spine" v={scenario.spine} />
            <KV k="trigger" v={scenario.trigger} />
          </Section>

          <Section title={`Selected blocks (${scenario.selected_blocks?.length || 0})`}>
            <ol style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7 }}>
              {(scenario.selected_blocks || []).map(b => (
                <li key={b.block_id}>
                  <b>{b.block_id}</b>
                  <span style={{ color: '#64748b', marginLeft: 6, fontFamily: FM, fontSize: 12 }}>
                    ({Math.round((b.duration_seconds || 0) / 60)} min)
                  </span>
                </li>
              ))}
            </ol>
            <div style={{ marginTop: 8, fontFamily: F, fontSize: 12, color: '#64748b' }}>
              Total: {Math.round((scenario.selected_blocks || []).reduce((s, b) => s + (b.duration_seconds || 0), 0) / 60)} min across {scenario.selected_blocks?.length || 0} blocks.
            </div>
          </Section>

          <Section title="Scenario arc">
            <KV k="stage 1 setup" v={scenario.scenario_arc?.stage_1_setup} />
            <KV k="stage 2 context" v={scenario.scenario_arc?.stage_2_context} />
            <KV k="stage 3 output" v={scenario.scenario_arc?.stage_3_output} />
            <KV k="stage 4 pressure" v={scenario.scenario_arc?.stage_4_pressure} />
            <KV k="stage 5 resolution" v={scenario.scenario_arc?.stage_5_resolution} />
          </Section>

          <Section title="Block content payload">
            <Pre json={scenario.block_content} />
          </Section>

          <PractitionerTestPanel
            key={scenario.scenario_id}
            scenario={scenario}
            roleTitle={effectiveTitle}
          />

          <button
            onClick={onPreview}
            style={{
              fontFamily: F, fontSize: 15, fontWeight: 700,
              padding: '12px 22px', borderRadius: 8, border: 'none',
              background: TEAL, color: '#fff', cursor: 'pointer',
            }}
          >
            Preview Workspace with stub blocks
          </button>
        </>
      ) : null}
    </div>
  )
}

// Practitioner test: would someone who actually does this job recognise
// their work in each block? Tri-state per block (yes / partial / no) plus
// a free-text note. State is local to the panel; resets when a new
// scenario is generated (parent re-keys on scenario_id). Phase 1 does not
// persist this anywhere — it is a structured way for an admin to capture
// what's missing while reviewing a draft scenario.
function PractitionerTestPanel({ scenario, roleTitle }) {
  const blocks = scenario.selected_blocks || []
  const initial = {}
  for (const b of blocks) initial[b.block_id] = { verdict: null, note: '' }
  const [verdicts, setVerdicts] = useState(initial)

  const setVerdict = (blockId, verdict) => {
    setVerdicts(prev => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), verdict },
    }))
  }
  const setNote = (blockId, note) => {
    setVerdicts(prev => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), note },
    }))
  }

  const yesCount = blocks.filter(b => verdicts[b.block_id]?.verdict === 'yes').length
  const partialCount = blocks.filter(b => verdicts[b.block_id]?.verdict === 'partial').length
  const noCount = blocks.filter(b => verdicts[b.block_id]?.verdict === 'no').length
  const ratedCount = yesCount + partialCount + noCount
  const passing = yesCount === blocks.length && blocks.length > 0
  const failing = noCount > 0
  const summaryColour = passing ? '#047857' : failing ? '#b91c1c' : ratedCount > 0 ? '#92400e' : '#475569'

  return (
    <div style={{ marginTop: 22, marginBottom: 24, background: '#fff', border: `2px solid ${TEAL}33`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, margin: 0 }}>
          Practitioner test
        </h3>
        <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: summaryColour }}>
          {ratedCount === 0
            ? `Not yet rated (0 of ${blocks.length})`
            : `${yesCount}/${blocks.length} yes${partialCount ? `, ${partialCount} partial` : ''}${noCount ? `, ${noCount} no` : ''}`}
        </span>
      </div>
      <p style={{ fontFamily: F, fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
        Would someone who actually does this job recognise their work in each block? Mark yes if a real {roleTitle || 'practitioner'} would say "this is what I do". Mark partial or no if the block reads as generic office work. Capture what's missing in the note.
      </p>
      {blocks.map(b => {
        const v = verdicts[b.block_id] || {}
        const meta = BLOCK_CATALOGUE[b.block_id]
        return (
          <div
            key={b.block_id}
            style={{
              padding: '14px 0',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
                Block {b.order}: {meta?.name || b.block_id}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <VerdictButton
                  label="Yes"
                  active={v.verdict === 'yes'}
                  activeColour="#047857"
                  onClick={() => setVerdict(b.block_id, 'yes')}
                />
                <VerdictButton
                  label="Partial"
                  active={v.verdict === 'partial'}
                  activeColour="#b45309"
                  onClick={() => setVerdict(b.block_id, 'partial')}
                />
                <VerdictButton
                  label="No"
                  active={v.verdict === 'no'}
                  activeColour="#b91c1c"
                  onClick={() => setVerdict(b.block_id, 'no')}
                />
              </div>
            </div>
            {(v.verdict === 'partial' || v.verdict === 'no') ? (
              <textarea
                value={v.note}
                onChange={(e) => setNote(b.block_id, e.target.value)}
                rows={2}
                placeholder={v.verdict === 'no' ? 'What makes this read as generic office work?' : 'What is partial or missing?'}
                style={{
                  width: '100%',
                  fontFamily: F, fontSize: 13, color: NAVY,
                  padding: '8px 10px', borderRadius: 6,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  outline: 'none', resize: 'vertical',
                }}
              />
            ) : null}
          </div>
        )
      })}
      {ratedCount === blocks.length && blocks.length > 0 ? (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 8,
          background: passing ? '#ecfdf5' : failing ? '#fef2f2' : '#fffbeb',
          border: '1px solid',
          borderColor: passing ? '#a7f3d0' : failing ? '#fecaca' : '#fde68a',
          fontFamily: F, fontSize: 13, color: passing ? '#047857' : failing ? '#b91c1c' : '#92400e', lineHeight: 1.5,
        }}>
          {passing
            ? 'All blocks pass the practitioner test.'
            : failing
              ? 'One or more blocks fail the test. Capture the notes; the prompt or canonical mapping likely needs further tightening for this function.'
              : 'Some blocks are partial. Worth a tightening pass before flipping use_modular_workspace on for this role.'}
        </div>
      ) : null}
    </div>
  )
}

function VerdictButton({ label, active, activeColour, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: F, fontSize: 12, fontWeight: 700,
        padding: '6px 14px', borderRadius: 6,
        border: '1px solid', borderColor: active ? activeColour : '#cbd5e1',
        background: active ? activeColour : '#fff',
        color: active ? '#fff' : '#475569',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function matchTypeLabel(type) {
  switch (type) {
    case 'role_title': return 'role_title (exact substring match)'
    case 'function_seniority': return 'function_seniority (extrapolated by function + seniority)'
    case 'level_fallback': return 'level_fallback (no specific match, defaulted by level)'
    case 'override': return 'override (admin-supplied block list)'
    default: return type || 'unknown'
  }
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY }}>
      <div style={{ marginBottom: 6, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FM, fontSize: 11 }}>{label}</div>
      {children}
    </label>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function KV({ k, v, mono }) {
  if (!v) return null
  return (
    <div style={{ marginBottom: 6, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.5 }}>
      <span style={{ fontFamily: FM, fontSize: 12, color: '#64748b' }}>{k}: </span>
      <span style={{ fontFamily: mono ? FM : F }}>{v}</span>
    </div>
  )
}

function Pre({ json }) {
  return (
    <pre style={{
      fontFamily: FM, fontSize: 11, color: NAVY, background: '#f1f5f9',
      padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 320,
      lineHeight: 1.5,
    }}>{JSON.stringify(json, null, 2)}</pre>
  )
}

const inputStyle = {
  width: '100%',
  fontFamily: FM, fontSize: 13, color: NAVY,
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid #cbd5e1', background: '#fff',
  outline: 'none',
}

const selectStyle = { ...inputStyle, cursor: 'pointer' }

const tinyBtn = {
  fontFamily: FM, fontSize: 11, fontWeight: 700,
  padding: '4px 8px', borderRadius: 6,
  background: '#fff', border: '1px solid #cbd5e1', color: '#475569',
  cursor: 'pointer',
}
