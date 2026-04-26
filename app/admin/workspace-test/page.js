'use client'

// Phase 1 admin test harness for the modular Workspace.
//
// The page lets an admin pick a role from a preset list (or type a custom
// one), tweak the role-profile overrides, run the detector + scenario
// generator via /api/admin/workspace-test, and inspect the output. A
// "Preview Workspace" button mounts ModularWorkspace inline with a
// synthetic assessment so the admin can walk through the stub blocks.
//
// Auth: gated behind authenticated users (any signed-in account). There
// is no admin-role table yet; tighten when that lands.
//
// IMPORTANT: this page does NOT create real assessment records. It only
// runs the in-memory detector and generator and renders their output.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ModularWorkspace from '@/app/assess/[uniqueToken]/components/ModularWorkspace'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const ROLE_GROUPS = [
  {
    label: 'Office support',
    roles: ['Receptionist', 'PA to CEO', 'Office Manager', 'Operations Coordinator', 'General Administrator', 'Office Junior', 'Team Assistant'],
  },
  {
    label: 'Software',
    roles: ['Junior Developer', 'Software Developer', 'Senior Developer', 'Tech Lead', 'Engineering Manager', 'CTO'],
  },
  {
    label: 'Customer service',
    roles: ['Customer Service Advisor', 'Customer Service Team Leader', 'Customer Service Manager'],
  },
  {
    label: 'Operations',
    roles: ['Operations Analyst', 'Operations Manager', 'Operations Director', 'COO'],
  },
  {
    label: 'Finance',
    roles: ['Junior Accountant', 'Finance Manager', 'Financial Controller', 'FD', 'CFO'],
  },
  {
    label: 'Marketing',
    roles: ['Marketing Coordinator', 'Marketing Manager', 'Head of Marketing', 'CMO'],
  },
  {
    label: 'HR',
    roles: ['HR Coordinator', 'HR Manager', 'HR Director', 'CPO'],
  },
  {
    label: 'Recruitment',
    roles: ['Recruitment Resourcer', 'Recruitment Consultant', 'Senior Recruitment Consultant', 'Recruitment Director'],
  },
  {
    label: 'Legal',
    roles: ['Junior Solicitor', 'Solicitor', 'Senior Solicitor', 'Legal Director', 'General Counsel'],
  },
  {
    label: 'Sales',
    roles: ['Sales Executive', 'Account Manager', 'Sales Manager', 'Sales Director', 'Commercial Director'],
  },
  {
    label: 'Project',
    roles: ['Project Coordinator', 'Project Manager', 'Senior PM', 'PMO Director'],
  },
  {
    label: 'Top of house',
    roles: ['MD', 'CEO', 'Chair'],
  },
  {
    label: 'Out of scope (should fall back)',
    roles: ['Warehouse Operative', 'HGV Driver', 'Bartender', 'Hairdresser'],
  },
]

export default function WorkspaceTestHarness() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  const [roleTitle, setRoleTitle] = useState('Marketing Manager')
  const [customRole, setCustomRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [sectorContext, setSectorContext] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [employmentType, setEmploymentType] = useState('permanent')

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { profile, shell_family, scenario, fallback_reason }

  const [previewing, setPreviewing] = useState(false)

  // Auth gate. Redirect to /login if not signed in.
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

  async function handleGenerate() {
    setError(null)
    setResult(null)
    setPreviewing(false)
    if (!effectiveTitle) {
      setError('Pick or type a role title.')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/workspace-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: NAVY }}>
        Checking access...
      </div>
    )
  }
  if (!authed) return null

  // Preview mode mounts ModularWorkspace inline with a synthetic assessment.
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
                {ROLE_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.roles.map(r => (<option key={r} value={r}>{r}</option>))}
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

          <div style={{ marginTop: 18 }}>
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
              {generating ? 'Generating...' : 'Generate scenario'}
            </button>
            {error ? (
              <span style={{ marginLeft: 14, fontFamily: F, fontSize: 13, color: '#dc2626' }}>
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

function ResultPanel({ result, effectiveTitle, onPreview }) {
  const { profile, shell_family, scenario, fallback_reason } = result
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
