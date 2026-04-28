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
import {
  CANONICAL_ROLE_MAPPING,
  HEALTHCARE_CANONICAL_ROLE_MAPPING,
  EDUCATION_CANONICAL_ROLE_MAPPING,
} from '@/lib/scenario-generator'
import { BLOCK_CATALOGUE } from '@/lib/workspace-blocks/office/catalogue'
import { BLOCK_CATALOGUE as EDUCATION_BLOCK_CATALOGUE } from '@/lib/workspace-blocks/education/catalogue'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

// Canonical level -> display label (office shell).
const LEVEL_LABELS = {
  1: 'Office L1: Front desk / Coordination (4 blocks)',
  2: 'Office L2: Execution + Judgement (4 blocks)',
  3: 'Office L3: Management (5 blocks)',
  4: 'Office L4: Senior / Leadership (4 blocks)',
}

// Healthcare shell levels mirror the office shape but with clinical and
// care framing. Block counts per level match the office shell so the
// orchestrator's duration scaler stays consistent across shells.
const HEALTHCARE_LEVEL_LABELS = {
  1: 'Healthcare L1: Direct care delivery (4 blocks)',
  2: 'Healthcare L2: Experienced delivery + judgement (4 blocks)',
  3: 'Healthcare L3: Clinical and team management (5 blocks)',
  4: 'Healthcare L4: Senior leadership (4 blocks)',
}

// Education shell levels (Phase 2, live with all 9 real blocks plus
// per-block scorers). Block counts per level match the office and
// healthcare shells so the duration scaler stays consistent.
const EDUCATION_LEVEL_LABELS = {
  1: 'Education L1: Direct delivery (4 blocks)',
  2: 'Education L2: Experienced delivery + judgement (4 blocks)',
  3: 'Education L3: Subject and pastoral management (5 blocks)',
  4: 'Education L4: Senior leadership (4 blocks)',
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

  // Build the preset list from the office and healthcare canonical
  // mappings plus extrapolation and out-of-scope examples.
  const presetGroups = useMemo(() => {
    const exemplarFor = (entry) => entry.role_titles[0]
      .split(/\s+/)
      .map(w => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
      .join(' ')

    const officeByLevel = { 1: [], 2: [], 3: [], 4: [] }
    for (const entry of CANONICAL_ROLE_MAPPING) {
      const exemplar = exemplarFor(entry)
      officeByLevel[entry.level].push({ value: exemplar, label: `${exemplar} (canonical: ${entry.id})` })
    }
    const hcByLevel = { 1: [], 2: [], 3: [], 4: [] }
    for (const entry of HEALTHCARE_CANONICAL_ROLE_MAPPING) {
      const exemplar = exemplarFor(entry)
      hcByLevel[entry.level].push({ value: exemplar, label: `${exemplar} (canonical: ${entry.id})` })
    }
    const eduByLevel = { 1: [], 2: [], 3: [], 4: [] }
    for (const entry of EDUCATION_CANONICAL_ROLE_MAPPING) {
      const exemplar = exemplarFor(entry)
      eduByLevel[entry.level].push({ value: exemplar, label: `${exemplar} (canonical: ${entry.id})` })
    }
    return [
      { label: LEVEL_LABELS[1], options: officeByLevel[1] },
      { label: LEVEL_LABELS[2], options: officeByLevel[2] },
      { label: LEVEL_LABELS[3], options: officeByLevel[3] },
      { label: LEVEL_LABELS[4], options: officeByLevel[4] },
      { label: HEALTHCARE_LEVEL_LABELS[1], options: hcByLevel[1] },
      { label: HEALTHCARE_LEVEL_LABELS[2], options: hcByLevel[2] },
      { label: HEALTHCARE_LEVEL_LABELS[3], options: hcByLevel[3] },
      { label: HEALTHCARE_LEVEL_LABELS[4], options: hcByLevel[4] },
      { label: EDUCATION_LEVEL_LABELS[1], options: eduByLevel[1] },
      { label: EDUCATION_LEVEL_LABELS[2], options: eduByLevel[2] },
      { label: EDUCATION_LEVEL_LABELS[3], options: eduByLevel[3] },
      { label: EDUCATION_LEVEL_LABELS[4], options: eduByLevel[4] },
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

  // Depth-Fit components preview (Day One Planning calendar + Inbox
  // Overload). Independent of the modular Workspace generation above so
  // an admin can preview shell-aware candidate-facing content for any
  // role without burning a full scenario call.
  const [depthFitGenerating, setDepthFitGenerating] = useState(false)
  const [depthFitError, setDepthFitError] = useState(null)
  const [depthFitResult, setDepthFitResult] = useState(null)

  // Strategic Thinking Evaluation preview. Two-step: generate the
  // component (questions, role context, scenario), then score a set
  // of admin-typed responses. Lets us verify senior vs junior-mid
  // calibration without running a full live Strategy-Fit assessment.
  const [stGenerating, setStGenerating] = useState(false)
  const [stScoring, setStScoring] = useState(false)
  const [stError, setStError] = useState(null)
  const [stComponent, setStComponent] = useState(null)
  const [stResponses, setStResponses] = useState({})
  const [stScore, setStScore] = useState(null)

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

  async function handleGenerateDepthFit() {
    setDepthFitError(null)
    if (!effectiveTitle) {
      setDepthFitError('Pick or type a role title.')
      return
    }
    setDepthFitGenerating(true)
    setDepthFitResult(null)
    try {
      const res = await fetch('/api/admin/depth-fit-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleTitle: effectiveTitle,
          jobDescription,
          scenarioCount: 3,
          mode: 'standard',
          profileOverrides: {
            ...(sectorContext.trim() ? { sector_context: sectorContext.trim() } : {}),
            ...(companySize ? { company_size: companySize } : {}),
            ...(employmentType ? { employment_type: employmentType } : {}),
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDepthFitError(body?.error || `Request failed: ${res.status}`)
      } else {
        setDepthFitResult(body)
      }
    } catch (e) {
      setDepthFitError(e?.message || 'Network error')
    } finally {
      setDepthFitGenerating(false)
    }
  }

  async function handleGenerateStrategicThinking() {
    setStError(null)
    if (!effectiveTitle) {
      setStError('Pick or type a role title.')
      return
    }
    setStGenerating(true)
    setStComponent(null)
    setStResponses({})
    setStScore(null)
    try {
      const res = await fetch('/api/admin/strategic-thinking-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          roleTitle: effectiveTitle,
          jobDescription,
          profileOverrides: {
            ...(sectorContext.trim() ? { sector_context: sectorContext.trim() } : {}),
            ...(companySize ? { company_size: companySize } : {}),
            ...(employmentType ? { employment_type: employmentType } : {}),
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStError(body?.error || `Request failed: ${res.status}`)
      } else {
        setStComponent(body?.component || null)
      }
    } catch (e) {
      setStError(e?.message || 'Network error')
    } finally {
      setStGenerating(false)
    }
  }

  async function handleScoreStrategicThinking() {
    setStError(null)
    if (!stComponent || !Array.isArray(stComponent.evaluation_questions)) {
      setStError('Generate a component first.')
      return
    }
    const populated = Object.entries(stResponses || {}).filter(
      ([, v]) => typeof v === 'string' && v.trim().length >= 12
    )
    if (populated.length === 0) {
      setStError('Type a response of at least 12 characters into at least one question.')
      return
    }
    setStScoring(true)
    setStScore(null)
    try {
      const res = await fetch('/api/admin/strategic-thinking-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score',
          roleTitle: effectiveTitle,
          jobDescription,
          profileOverrides: {
            ...(sectorContext.trim() ? { sector_context: sectorContext.trim() } : {}),
            ...(companySize ? { company_size: companySize } : {}),
            ...(employmentType ? { employment_type: employmentType } : {}),
          },
          component: stComponent,
          responses: stResponses,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStError(body?.error || `Request failed: ${res.status}`)
      } else {
        setStScore(body?.score || null)
      }
    } catch (e) {
      setStError(e?.message || 'Network error')
    } finally {
      setStScoring(false)
    }
  }

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
      // Office, healthcare and education shells each have their own
      // modular gate flag. Set all three so the preview mounts
      // ModularWorkspace regardless of which shell the role classified
      // into.
      use_modular_workspace: true,
      healthcare_workspace_enabled: true,
      education_workspace_enabled: true,
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
            Office shell (Phase 1, live), Healthcare shell (Phase 2, live) and Education shell (Phase 2, live: all 9 blocks real, per-block scoring live) are previewable. Field-ops and out-of-scope roles still fall back to the legacy WorkspacePage. Nothing is written to the database from this page.
          </p>
          <EducationBlockStatusBanner />
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
            <button
              onClick={handleGenerateDepthFit}
              disabled={depthFitGenerating}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 700,
                padding: '11px 18px', borderRadius: 8,
                background: depthFitGenerating ? '#94a3b8' : '#0f2137',
                color: '#fff', border: 'none',
                cursor: depthFitGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {depthFitGenerating ? 'Working...' : 'Generate Depth-Fit components'}
            </button>
            <button
              onClick={handleGenerateStrategicThinking}
              disabled={stGenerating}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 700,
                padding: '11px 18px', borderRadius: 8,
                background: stGenerating ? '#94a3b8' : '#0f2137',
                color: '#fff', border: 'none',
                cursor: stGenerating ? 'not-allowed' : 'pointer',
              }}
            >
              {stGenerating ? 'Working...' : 'Generate Strategic Thinking'}
            </button>
            {error ? (
              <span style={{ marginLeft: 6, fontFamily: F, fontSize: 13, color: '#dc2626' }}>
                {error}
              </span>
            ) : null}
            {depthFitError ? (
              <span style={{ marginLeft: 6, fontFamily: F, fontSize: 13, color: '#dc2626' }}>
                Depth-Fit: {depthFitError}
              </span>
            ) : null}
            {stError ? (
              <span style={{ marginLeft: 6, fontFamily: F, fontSize: 13, color: '#dc2626' }}>
                Strategic Thinking: {stError}
              </span>
            ) : null}
          </div>
        </div>

        {result ? (
          <ResultPanel result={result} effectiveTitle={effectiveTitle} onPreview={() => setPreviewing(true)} />
        ) : null}

        {depthFitResult ? (
          <DepthFitPanel result={depthFitResult} effectiveTitle={effectiveTitle} />
        ) : null}

        {stComponent ? (
          <StrategicThinkingPanel
            effectiveTitle={effectiveTitle}
            component={stComponent}
            responses={stResponses}
            onChangeResponses={setStResponses}
            score={stScore}
            scoring={stScoring}
            onScore={handleScoreStrategicThinking}
          />
        ) : null}
      </div>
    </div>
  )
}

function StrategicThinkingPanel({ effectiveTitle, component, responses, onChangeResponses, score, scoring, onScore }) {
  const questions = Array.isArray(component?.evaluation_questions) ? component.evaluation_questions : []
  const setResp = (id, text) => onChangeResponses({ ...(responses || {}), [id]: text })
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 32 }}>
      <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 14 }}>
        Strategic Thinking Evaluation for {effectiveTitle}
      </h2>

      <Section title="Component">
        <KV k="title" v={component?.title} />
        <KV k="seniority_framing" v={component?.seniority_framing} />
        {component?.role_context_summary ? (
          <div style={{ fontFamily: F, fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 1.55 }}>
            {component.role_context_summary}
          </div>
        ) : null}
        {component?.scenario_text ? (
          <div style={{
            background: '#FAEFD9', border: '1px solid #e6d6ad',
            borderRadius: 8, padding: 12, marginTop: 10,
            fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {component.scenario_text}
          </div>
        ) : null}
      </Section>

      <Section title="Type fake responses to score">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.length === 0 ? <Empty>No evaluation questions returned.</Empty> : questions.map((q, i) => (
            <div key={q.id || i}>
              <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                {i + 1}. {q.prompt}
              </div>
              <textarea
                value={responses?.[q.id] || ''}
                onChange={(e) => setResp(q.id, e.target.value)}
                rows={3}
                placeholder="Type a response of at least 12 characters."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: F, fontSize: 13, color: NAVY,
                  padding: '8px 10px', borderRadius: 6,
                  border: '1px solid #cbd5e1', background: '#f8fafc',
                  outline: 'none', resize: 'vertical',
                }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={onScore}
          disabled={scoring || questions.length === 0}
          style={{
            marginTop: 14,
            fontFamily: F, fontSize: 14, fontWeight: 700,
            padding: '10px 18px', borderRadius: 8,
            background: scoring ? '#94a3b8' : '#00BFA5',
            color: '#fff', border: 'none',
            cursor: scoring ? 'not-allowed' : 'pointer',
          }}
        >
          {scoring ? 'Scoring...' : 'Score responses'}
        </button>
      </Section>

      {score ? (
        <Section title={`Score: ${score.score ?? 'unscored'}`}>
          {score.narrative ? (
            <div style={{ fontFamily: F, fontSize: 14, color: NAVY, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.55 }}>
              {score.narrative}
            </div>
          ) : null}
          {Array.isArray(score.strengths) && score.strengths.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#0f6e63', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Strengths</div>
              {score.strengths.map((s, i) => (
                <div key={i} style={{ fontFamily: F, fontSize: 13, color: NAVY, padding: '4px 0' }}>· {s}</div>
              ))}
            </div>
          ) : null}
          {Array.isArray(score.watch_outs) && score.watch_outs.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Watch-outs</div>
              {score.watch_outs.map((w, i) => (
                <div key={i} style={{ fontFamily: F, fontSize: 13, color: NAVY, padding: '4px 0' }}>· {w}</div>
              ))}
            </div>
          ) : null}
          {Array.isArray(score.signals) && score.signals.length > 0 ? (
            <div>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Signals</div>
              {score.signals.map((s, i) => (
                <div key={i} style={{ fontFamily: F, fontSize: 12.5, color: '#475569', padding: '4px 0', lineHeight: 1.5 }}>
                  <b style={{ color: NAVY }}>{s.type}</b> ({s.weight}) — {s.evidence}
                </div>
              ))}
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section title="Raw payload">
        <Pre json={{ component, responses, score }} />
      </Section>
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

          <ScoringPreviewPanel
            key={`score-${scenario.scenario_id}`}
            scenario={scenario}
            shell_family={shell_family}
            profile={profile}
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

// Depth-Fit components preview panel. Renders the Day One Planning
// calendar (fixed events, interruption, deadline, unscheduled tasks)
// and the Inbox Overload events (per-scenario inbox items + a mid-task
// interruption). Mobile responsive: collapses to a single column under
// 720px via a flex-wrap gap layout.
function DepthFitPanel({ result, effectiveTitle }) {
  const components = result?.components
  const dop = components?.day_one_planning
  const inbox = components?.inbox_overload
  const seniority = components?.seniority || components?.diagnostics?.day_one_planning?.seniority
    || components?.diagnostics?.inbox_overload?.seniority
    || null
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 32 }}>
      <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 14 }}>
        Depth-Fit components for {effectiveTitle}
      </h2>

      <Section title="Routing">
        <KV k="detected_shell_family" v={result.detected_shell_family} />
        <KV k="effective_shell_family" v={result.effective_shell_family} />
        {result.fallback_to_office ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: 10, fontFamily: F, fontSize: 13, color: '#9a3412', marginTop: 6 }}>
            Detected shell <code style={{ fontFamily: FM }}>{result.detected_shell_family}</code> falls through to office templates for Depth-Fit.
          </div>
        ) : null}
        <KV k="seniority_tier" v={seniority} />
      </Section>

      {result.error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, fontFamily: F, fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>
          Generation error: <code style={{ fontFamily: FM }}>{result.error}</code>
        </div>
      ) : null}

      <Section title="Day One Planning">
        {dop ? <DayOnePreview events={dop} /> : <Empty>No calendar events generated.</Empty>}
      </Section>

      <Section title="Inbox Overload">
        {inbox ? <InboxPreview inbox={inbox} /> : <Empty>Inbox not generated (mode may be quick or generator failed).</Empty>}
      </Section>

      <Section title="Raw payload">
        <Pre json={components} />
      </Section>
    </div>
  )
}

function DayOnePreview({ events }) {
  const fixed = Array.isArray(events?.fixed_events) ? events.fixed_events : []
  const tasks = Array.isArray(events?.unscheduled_tasks) ? events.unscheduled_tasks : []
  const card = (label, item, accent) => (
    <div style={{
      background: '#fff', border: `1px solid ${accent || '#e2e8f0'}`, borderRadius: 8,
      padding: 12, minWidth: 200, flex: '1 1 220px',
    }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      {item?.time ? (
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: NAVY }}>{item.time}</div>
      ) : null}
      <div style={{ fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.5 }}>
        {item?.title || '—'}
      </div>
    </div>
  )
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {fixed.map((ev, i) => card(`Fixed ${i + 1}`, ev, '#bae6fd'))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        {events?.interruption ? card('Interruption', events.interruption, '#fdba74') : null}
        {events?.deadline ? card('Deadline', events.deadline, '#fecaca') : null}
      </div>
      <div style={{ background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: 8, padding: 12 }}>
        <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Unscheduled tasks (candidate places these into the day)
        </div>
        {tasks.length === 0 ? <Empty>No unscheduled tasks.</Empty> : (
          <ol style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 14, color: NAVY, lineHeight: 1.7 }}>
            {tasks.map((t, i) => <li key={i}>{t?.title || '—'}</li>)}
          </ol>
        )}
      </div>
    </div>
  )
}

function InboxPreview({ inbox }) {
  const scenarios = Array.isArray(inbox?.scenarios) ? inbox.scenarios : []
  if (scenarios.length === 0) return <Empty>No scenario inbox blocks generated.</Empty>
  const priorityColour = (priority) => {
    if (priority === 'urgent') return { bg: '#fef2f2', bd: '#fecaca', fg: '#b91c1c' }
    if (priority === 'action_needed') return { bg: '#fff7ed', bd: '#fdba74', fg: '#9a3412' }
    return { bg: '#eff6ff', bd: '#bfdbfe', fg: '#1d4ed8' }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {scenarios.map((s, idx) => (
        <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Scenario {Number.isFinite(s.scenario_index) ? s.scenario_index + 1 : idx + 1}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {(s.inbox_items || []).map((item, i) => {
              const colours = priorityColour(item?.priority)
              return (
                <div key={i} style={{ background: colours.bg, border: `1px solid ${colours.bd}`, borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY }}>{item?.sender || '—'}</span>
                    <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: colours.fg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item?.priority || ''}{item?.type ? ` · ${item.type}` : ''}
                    </span>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
                    {item?.subject || ''}
                  </div>
                  <div style={{ fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    {item?.preview || ''}
                  </div>
                </div>
              )
            })}
          </div>
          {s.interruption ? (
            <div style={{ background: '#0f2137', color: '#fff', borderRadius: 8, padding: 12 }}>
              <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#00BFA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Mid-task interruption
              </div>
              <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {s.interruption.sender || '—'}{s.interruption.role ? ` · ${s.interruption.role}` : ''}
              </div>
              <div style={{ fontFamily: F, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                {s.interruption.message || ''}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Empty({ children }) {
  return (
    <div style={{ fontFamily: F, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>{children}</div>
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

// Scoring preview. For each selected block in the generated scenario,
// the admin can paste a JSON-shaped fake candidate response and POST it
// to /api/admin/workspace-test/score-block. The resulting BlockScore
// (score, strengths, watch_outs, narrative, signals) renders inline so
// scoring quality can be sanity-checked before any real candidate runs
// through. The candidate_inputs schema for each block matches the
// onComplete payload emitted by the live block components in
// lib/workspace-blocks/{shell}/{block}.jsx.
function ScoringPreviewPanel({ scenario, shell_family, profile, roleTitle }) {
  const blocks = Array.isArray(scenario?.selected_blocks) ? scenario.selected_blocks : []
  const block_content_map = scenario?.block_content || {}
  const scenario_context = {
    title: scenario?.title,
    spine: scenario?.spine,
    trigger: scenario?.trigger,
    scenario_arc: scenario?.scenario_arc,
  }
  // Per-block local state: { [block_id]: { input, scoring, score, error } }
  const [state, setState] = useState({})

  const setBlockState = (block_id, patch) => {
    setState(prev => ({ ...prev, [block_id]: { ...(prev[block_id] || {}), ...patch } }))
  }

  const scoreBlock = async (block_id) => {
    const inputText = state[block_id]?.input || ''
    let candidate_inputs = {}
    if (inputText.trim()) {
      try {
        candidate_inputs = JSON.parse(inputText)
      } catch (err) {
        setBlockState(block_id, { error: `Invalid JSON: ${err.message}`, score: null })
        return
      }
    }
    setBlockState(block_id, { scoring: true, error: null, score: null })
    try {
      const res = await fetch('/api/admin/workspace-test/score-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shell_family,
          role_profile: profile,
          role_title: roleTitle,
          employment_type: profile?.employment_type || 'permanent',
          scenario_context,
          block_id,
          block_content: block_content_map[block_id] || {},
          candidate_inputs,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setBlockState(block_id, {
          scoring: false,
          error: data?.error || `HTTP ${res.status}`,
          score: null,
        })
        return
      }
      setBlockState(block_id, { scoring: false, error: null, score: data?.score || null })
    } catch (err) {
      setBlockState(block_id, { scoring: false, error: err.message, score: null })
    }
  }

  if (blocks.length === 0) return null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 18, marginBottom: 18,
    }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        Block scoring preview
      </div>
      <div style={{ fontFamily: F, fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
        Paste a JSON candidate-inputs payload for any block (the shape the live block emits via onComplete) and score it. Use this to sanity-check scoring tone and calibration before a real candidate runs through. Empty input scores against an empty payload, which is useful for seeing the floor of the scorer.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.map(b => {
          const s = state[b.block_id] || {}
          const score = s.score
          return (
            <div key={b.block_id} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: NAVY }}>
                  {b.block_id}
                </span>
                <span style={{ fontFamily: FM, fontSize: 11, color: '#64748b' }}>
                  ({Math.round((b.duration_seconds || 0) / 60)} min)
                </span>
                {score?.score != null ? (
                  <span style={{
                    fontFamily: FM, fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 999,
                    background: scoreBg(score.score), color: scoreFg(score.score),
                  }}>
                    {score.score} / 100
                  </span>
                ) : null}
              </div>
              <textarea
                value={s.input || ''}
                onChange={(e) => setBlockState(b.block_id, { input: e.target.value })}
                rows={4}
                placeholder={`Paste candidate_inputs JSON for ${b.block_id}, or leave empty to score an empty response.`}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: FM, fontSize: 12, color: NAVY, lineHeight: 1.45,
                  padding: 10, borderRadius: 8,
                  border: '1px solid #cbd5e1', background: '#fff',
                  outline: 'none', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => scoreBlock(b.block_id)}
                  disabled={!!s.scoring}
                  style={{
                    fontFamily: F, fontSize: 13, fontWeight: 700,
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: s.scoring ? '#94a3b8' : NAVY,
                    color: '#fff',
                    cursor: s.scoring ? 'not-allowed' : 'pointer',
                  }}
                >
                  {s.scoring ? 'Scoring...' : 'Score this block'}
                </button>
                {s.error ? (
                  <span style={{ fontFamily: FM, fontSize: 12, color: '#dc2626' }}>
                    {s.error}
                  </span>
                ) : null}
              </div>
              {score ? (
                <div style={{ marginTop: 10 }}>
                  {Array.isArray(score.strengths) && score.strengths.length ? (
                    <ScoreList label="Strengths" colour="#047857" bg="#ecfdf5" border="#a7f3d0" items={score.strengths} />
                  ) : null}
                  {Array.isArray(score.watch_outs) && score.watch_outs.length ? (
                    <ScoreList label="Watch-outs" colour="#92400e" bg="#fffbeb" border="#fcd34d" items={score.watch_outs} />
                  ) : null}
                  {score.narrative ? (
                    <div style={{
                      marginTop: 8, padding: 10,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                      fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55, fontStyle: 'italic',
                    }}>
                      {score.narrative}
                    </div>
                  ) : null}
                  {Array.isArray(score.signals) && score.signals.length ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Signals
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 12.5, color: NAVY, lineHeight: 1.5 }}>
                        {score.signals.map((sig, i) => (
                          <li key={i}>
                            <b>{sig.type}</b> ({sig.weight}): {sig.evidence}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreList({ label, colour, bg, border, items }) {
  return (
    <div style={{
      marginTop: 8, padding: 10,
      background: bg, border: `1px solid ${border}`, borderRadius: 8,
    }}>
      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: colour, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  )
}

function scoreBg(s) {
  if (s >= 75) return '#ecfdf5'
  if (s >= 50) return '#fffbeb'
  return '#fef2f2'
}
function scoreFg(s) {
  if (s >= 75) return '#047857'
  if (s >= 50) return '#92400e'
  return '#b91c1c'
}

function EducationBlockStatusBanner() {
  const eduBlocks = Object.values(EDUCATION_BLOCK_CATALOGUE)
  const real = eduBlocks.filter(b => b.is_real)
  const stub = eduBlocks.filter(b => !b.is_real)
  const chipReal = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: FM, fontSize: 11, fontWeight: 700,
    padding: '4px 9px', borderRadius: 999,
    background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
  }
  const chipStub = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: FM, fontSize: 11, fontWeight: 700,
    padding: '4px 9px', borderRadius: 999,
    background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d',
  }
  const allReal = stub.length === 0
  return (
    <div style={{
      marginTop: 12, padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
    }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Education shell — block status (v1.0)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {real.map(b => (
          <span key={b.id} style={chipReal} title="Real interactive block">
            <span aria-hidden="true">✓</span> {b.id}
          </span>
        ))}
        {stub.map(b => (
          <span key={b.id} style={chipStub} title="Stub — not yet built">
            <span aria-hidden="true">○</span> {b.id} (stub - not yet built)
          </span>
        ))}
      </div>
      <div style={{ fontFamily: F, fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
        {allReal
          ? `All ${real.length} blocks real. Per-block scoring live.`
          : `${real.length} real, ${stub.length} stub. Stubs render the office BlockPlaceholder until each real component ships.`}
      </div>
    </div>
  )
}
