import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Admin-only score preview for a single Workspace block. The admin
// harness at /admin/workspace-test calls this with:
//   - role_profile + role_title (so framing matches a real run)
//   - shell_family ('office' | 'healthcare' | 'education')
//   - scenario_context (title / spine / trigger / scenario_arc) and
//     block_content (the typed payload the candidate would have seen)
//   - block_id and candidate_inputs (an admin-typed fake response in
//     the same shape the live block components emit via onComplete)
//
// Returns the per-block BlockScore (score, strengths, watch_outs,
// narrative, signals) without persisting anything. Used to sanity-check
// scoring quality before any real candidate runs through.
//
// Auth: requires an authenticated user (same gate as the parent admin
// harness route). Tighten to an admin allowlist when that infrastructure
// lands.

export const maxDuration = 60

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
  const {
    shell_family,
    role_profile,
    role_title,
    employment_type,
    account_type,
    scenario_context,
    block_id,
    block_content,
    candidate_inputs,
  } = body

  if (!shell_family || !block_id) {
    return NextResponse.json({ error: 'shell_family_and_block_id_required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Resolve scorer by shell + block_id. Mirrors the dispatch the live
  // scoring orchestrator uses.
  let scorer = null
  try {
    const mod = await import('@/lib/workspace-block-scoring')
    scorer = mod.resolveScorer(shell_family, block_id)
  } catch (err) {
    console.error('[admin/score-block] resolver import failed:', err?.message)
    return NextResponse.json({ error: 'resolver_unavailable' }, { status: 500 })
  }
  if (!scorer) {
    return NextResponse.json({
      error: 'no_scorer_for_block',
      shell_family,
      block_id,
    }, { status: 400 })
  }

  let result = null
  try {
    result = await scorer({
      anthropic,
      role_profile: role_profile || null,
      role_title: role_title || null,
      account_type: account_type || null,
      employment_type: employment_type || 'permanent',
      scenario_context: scenario_context || {},
      block_content: block_content || {},
      candidate_inputs: candidate_inputs || {},
    })
  } catch (err) {
    console.error(`[admin/score-block] scorer threw for ${block_id}:`, err?.message)
    return NextResponse.json({ error: 'scorer_failed', detail: err?.message }, { status: 500 })
  }

  return NextResponse.json({
    block_id,
    shell_family,
    score: result || null,
  })
}
