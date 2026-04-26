import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectRoleProfile } from '@/lib/role-profile-detector'
import { generateScenario, selectBlocks, findCanonicalEntry } from '@/lib/scenario-generator'

// Phase 1 admin test harness API. Runs the detector + canonical block
// selection + scenario generator for a hand-picked role and returns the
// result without writing anything to the database. Used by
// /admin/workspace-test to preview what the live generate flow would
// produce for a given role title and override set.
//
// Optional flags in the request body:
//   dry_run: true  -> skip the scenario generator, just return the
//                     detected profile and the canonical block selection
//                     (fast path for "what blocks would this role get?")
//   block_override: [string]  -> bypass the canonical lookup and use
//                                these block ids in this order. Used to
//                                test edge cases.
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
  const { roleTitle, jobDescription, profileOverrides, dry_run, block_override } = body
  if (!roleTitle || typeof roleTitle !== 'string') {
    return NextResponse.json({ error: 'roleTitle_required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Detector always runs so the admin can see the raw classification.
  const detected = await detectRoleProfile(client, {
    roleTitle,
    jobDescription: jobDescription || '',
    employmentType: profileOverrides?.employment_type || 'permanent',
    mode: 'advanced',
  })
  if (!detected) {
    return NextResponse.json({ error: 'detector_failed' }, { status: 500 })
  }

  // UI overrides applied on top of the detected profile.
  const profile = {
    ...detected.profile,
    ...(profileOverrides?.sector_context ? { sector_context: profileOverrides.sector_context } : {}),
    ...(profileOverrides?.company_size ? { company_size: profileOverrides.company_size } : {}),
    ...(profileOverrides?.employment_type ? { employment_type: profileOverrides.employment_type } : {}),
  }
  const shell_family = detected.shell_family

  // Canonical lookup runs even on dry_run so the harness can show the
  // chosen blocks without burning a generator call. Only meaningful for
  // the Office shell.
  let preview = null
  if (shell_family === 'office') {
    const { entry, match_type } = findCanonicalEntry(roleTitle, profile)
    const selected = selectBlocks(profile, roleTitle)
    preview = {
      canonical_id: entry?.id || null,
      canonical_label: entry?.label || null,
      match_type,
      level: entry?.level || null,
      blocks: selected.map(s => ({
        block_id: s.block_id,
        order: s.order,
        duration_seconds: s.suggested_duration_seconds,
      })),
    }
  }

  // Dry run stops here.
  if (dry_run) {
    return NextResponse.json({
      profile,
      shell_family,
      preview,
      scenario: null,
      fallback_reason: shell_family !== 'office' ? `${shell_family}_shell_not_yet_built` : null,
    })
  }

  // Full generation only runs for the Office shell. Other shells get
  // legacy fallback notice without an AI call.
  let scenario = null
  if (shell_family === 'office') {
    scenario = await generateScenario(client, profile, {
      roleTitle,
      jobDescription: jobDescription || '',
      ...(Array.isArray(block_override) && block_override.length > 0 ? { blockOverride: block_override } : {}),
    })
  }

  return NextResponse.json({
    profile,
    shell_family,
    preview,
    scenario,
    fallback_reason: shell_family === 'office' && !scenario ? 'generator_failed'
      : shell_family === 'out_of_scope' ? 'out_of_scope_role'
      : shell_family !== 'office' ? `${shell_family}_shell_not_yet_built`
      : null,
  })
}
