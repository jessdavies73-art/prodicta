import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectRoleProfile } from '@/lib/role-profile-detector'
import { generateDepthFitComponents } from '@/lib/depth-fit-components'

// Admin-only Depth-Fit components preview. Generates the Day One
// Planning calendar + Inbox Overload events the candidate would see
// for a given role title and shell, without writing anything to the
// database. Used by /admin/workspace-test to verify that an HCA, a
// Class Teacher, a Care Home Manager, and a Headteacher each get
// role-appropriate content.
//
// Request body:
//   roleTitle:        required
//   jobDescription:   optional, improves detector classification
//   profileOverrides: optional sector_context, company_size,
//                     employment_type
//   scenarioCount:    optional, defaults to 3 (matches Depth-Fit). The
//                     generator only uses this for the inbox prompt.
//   mode:             optional, defaults to 'standard'. Pass 'quick'
//                     to suppress inbox generation (matches the
//                     Speed-Fit behaviour where inbox doesn't run).

export const maxDuration = 120

export async function POST(req) {
  let supabase
  try {
    supabase = await createServerSupabaseClient()
  } catch {
    return NextResponse.json({ error: 'auth_unavailable' }, { status: 500 })
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { roleTitle, jobDescription, profileOverrides, scenarioCount, mode } = body
  if (!roleTitle || typeof roleTitle !== 'string') {
    return NextResponse.json({ error: 'roleTitle_required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Detector always runs so we can show the seniority + shell routing.
  const detected = await detectRoleProfile(client, {
    roleTitle,
    jobDescription: jobDescription || '',
    employmentType: profileOverrides?.employment_type || 'permanent',
    mode: mode || 'standard',
  })
  if (!detected) {
    return NextResponse.json({ error: 'detector_failed' }, { status: 500 })
  }

  const profile = {
    ...detected.profile,
    ...(profileOverrides?.sector_context ? { sector_context: profileOverrides.sector_context } : {}),
    ...(profileOverrides?.company_size ? { company_size: profileOverrides.company_size } : {}),
    ...(profileOverrides?.employment_type ? { employment_type: profileOverrides.employment_type } : {}),
  }
  const shell_family = detected.shell_family

  // Out of scope and field_ops fall back to the legacy office templates;
  // we surface the reason but still attempt generation against the
  // office shell so the admin can see what would render.
  const SHIPPED_SHELLS = new Set(['office', 'healthcare', 'education'])
  const effectiveShell = SHIPPED_SHELLS.has(shell_family) ? shell_family : 'office'

  // Synthesise enough scenario stubs for the inbox generator. The real
  // scenario titles aren't needed; only the count matters.
  const count = Number.isFinite(scenarioCount) && scenarioCount > 0 ? scenarioCount : 3
  const scenarios = Array.from({ length: count }, (_, i) => ({ index: i }))

  let components = null
  let generationError = null
  try {
    components = await generateDepthFitComponents({
      client,
      role_title: roleTitle,
      role_profile: profile,
      role_level: profile?.seniority_band === 'junior' ? 'OPERATIONAL'
        : profile?.seniority_band === 'mid' ? 'MID_LEVEL'
        : profile?.seniority_band ? 'LEADERSHIP' : null,
      canonical_level: null,
      shell_family: effectiveShell,
      scenarios,
      mode: mode || 'standard',
    })
  } catch (err) {
    generationError = err?.message || 'generation_failed'
  }

  return NextResponse.json({
    profile,
    detected_shell_family: shell_family,
    effective_shell_family: effectiveShell,
    fallback_to_office: shell_family !== effectiveShell,
    components,
    error: generationError,
  })
}
