import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectRoleProfile } from '@/lib/role-profile-detector'
import { generateStrategicThinking } from '@/lib/strategy-fit-components/strategic-thinking'
import { scoreStrategicThinking } from '@/lib/strategy-fit-components/strategic-thinking-scoring'

// Admin-only Strategic Thinking Evaluation preview. Two modes:
//
//   action: 'generate'  -> generate the Strategic Thinking component
//                          for a role (without writing to DB) and
//                          return the questions so the admin can
//                          type fake responses.
//   action: 'score'     -> score a set of admin-supplied responses
//                          against a previously generated component
//                          and return the BlockScore. Used to confirm
//                          the scorer's output for senior vs junior-mid
//                          roles before exposing to live candidates.
//
// Auth: any authenticated user. There is no admin-role table yet; tighten
// when one lands.

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
  const { action, roleTitle, jobDescription, profileOverrides, component, responses } = body
  if (!roleTitle || typeof roleTitle !== 'string') {
    return NextResponse.json({ error: 'roleTitle_required' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const detected = await detectRoleProfile(client, {
    roleTitle,
    jobDescription: jobDescription || '',
    employmentType: profileOverrides?.employment_type || 'permanent',
    mode: 'advanced',
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

  if (action === 'generate') {
    try {
      const generated = await generateStrategicThinking(client, {
        role_profile: profile,
        shell_family,
        scenario_context: null,
        roleTitle,
        canonical_level: null,
        role_level: null,
      })
      return NextResponse.json({
        profile,
        shell_family,
        component: generated,
      })
    } catch (err) {
      return NextResponse.json({ error: err?.message || 'generate_failed' }, { status: 500 })
    }
  }

  if (action === 'score') {
    if (!component || typeof component !== 'object') {
      return NextResponse.json({ error: 'component_required' }, { status: 400 })
    }
    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'responses_required' }, { status: 400 })
    }
    try {
      const score = await scoreStrategicThinking(client, {
        role_profile: profile,
        shell_family,
        roleTitle,
        component,
        responses,
        canonical_level: null,
        role_level: null,
      })
      return NextResponse.json({
        profile,
        shell_family,
        score,
      })
    } catch (err) {
      return NextResponse.json({ error: err?.message || 'score_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
