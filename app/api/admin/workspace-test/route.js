import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectRoleProfile } from '@/lib/role-profile-detector'
import { generateScenario } from '@/lib/scenario-generator'

// Phase 1 admin test harness API. Runs the detector + scenario generator
// for a hand-picked role and returns the result without writing anything
// to the database. Used by /admin/workspace-test to preview what the live
// generate flow would produce for a given role title and override set.
//
// Auth: requires an authenticated user. There is no admin-role table in
// this codebase yet, so we stop at "must be signed in". Tighten to an
// admin allowlist or role check when that infrastructure lands.

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
  const { roleTitle, jobDescription, profileOverrides } = body
  if (!roleTitle || typeof roleTitle !== 'string') {
    return NextResponse.json({ error: 'roleTitle_required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Step 1: detector. The harness lets the admin override fields after
  // detection so the UI can experiment with different sector contexts and
  // employment types without re-running the model. Detector still runs so
  // the admin can see the raw classification.
  const detected = await detectRoleProfile(client, {
    roleTitle,
    jobDescription: jobDescription || '',
    employmentType: profileOverrides?.employment_type || 'permanent',
    mode: 'advanced',
  })
  if (!detected) {
    return NextResponse.json({ error: 'detector_failed' }, { status: 500 })
  }

  // Apply UI overrides on top of the detected profile.
  const profile = {
    ...detected.profile,
    ...(profileOverrides?.sector_context ? { sector_context: profileOverrides.sector_context } : {}),
    ...(profileOverrides?.company_size ? { company_size: profileOverrides.company_size } : {}),
    ...(profileOverrides?.employment_type ? { employment_type: profileOverrides.employment_type } : {}),
  }
  const shell_family = detected.shell_family

  // Step 2: scenario generator runs only for the Office shell. Other
  // shells (Phase 2/3) and out-of-scope roles return without a scenario
  // so the harness can demonstrate the legacy fallback path.
  let scenario = null
  if (shell_family === 'office') {
    scenario = await generateScenario(client, profile, {
      roleTitle,
      jobDescription: jobDescription || '',
    })
  }

  return NextResponse.json({
    profile,
    shell_family,
    scenario,
    fallback_reason: shell_family === 'office' && !scenario ? 'generator_failed'
      : shell_family === 'out_of_scope' ? 'out_of_scope_role'
      : shell_family !== 'office' ? `${shell_family}_shell_not_yet_built`
      : null,
  })
}
