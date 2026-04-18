import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

/* ── GET: load existing manager DNA for this assessment ── */
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const { data: assessment } = await admin
      .from('assessments')
      .select('id, role_title, job_description, detected_role_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: dna } = await admin
      .from('manager_dna')
      .select('*')
      .eq('assessment_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ assessment, dna })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── POST: generate scenarios OR submit responses ── */
export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const body = await request.json()

    const { data: assessment } = await admin
      .from('assessments')
      .select('id, role_title, job_description, detected_role_type, skill_weights')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    /* ─── Action: generate scenarios ─── */
    if (body.action === 'generate') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are building a Manager DNA profile assessment. The hiring manager oversees a "${assessment.role_title}" role.

Generate exactly 2 management scenarios that reveal the manager's decision-making style, delegation approach, and conflict handling. These are NOT candidate scenarios — they are for the hiring manager themselves.

Scenario 1: DELEGATION & PRIORITISATION — A situation where the manager must delegate tasks and handle competing priorities within their team.
Scenario 2: TEAM CONFLICT & PERFORMANCE — A situation involving underperformance or interpersonal conflict the manager must resolve.

Each scenario should be specific to the "${assessment.role_title}" team context. 150-200 words each. UK English. No emoji. No em dashes.

Return JSON only:
{
  "scenarios": [
    {
      "type": "delegation_prioritisation",
      "title": "string",
      "context": "string (the situation)",
      "task": "string (what the manager must decide/do)",
      "time_minutes": 5
    },
    {
      "type": "conflict_performance",
      "title": "string",
      "context": "string",
      "task": "string",
      "time_minutes": 5
    }
  ]
}`
        }],
      })

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: 'Failed to generate scenarios' }, { status: 500 })
      const parsed = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

      return NextResponse.json({ scenarios: parsed.scenarios })
    }

    /* ─── Action: submit responses and score ─── */
    if (body.action === 'submit') {
      const { scenarios, responses } = body
      if (!responses || responses.length !== 2) {
        return NextResponse.json({ error: 'Two responses required' }, { status: 400 })
      }

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const responsesSummary = responses.map((r, i) => (
        `Scenario ${i + 1} (${scenarios[i].type}):\nContext: ${scenarios[i].context}\nTask: ${scenarios[i].task}\nManager's response:\n${r.response_text}\nTime taken: ${r.time_taken_seconds}s`
      )).join('\n\n')

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Analyse this hiring manager's responses to two management scenarios for a "${assessment.role_title}" team. Build a Manager DNA profile.

${responsesSummary}

Return JSON only. UK English. No emoji. No em dashes.
{
  "management_style": "string (2-3 word label e.g. 'Structured Delegator', 'Hands-On Coach', 'Strategic Director')",
  "delegation_approach": "string (1-2 sentences: how they delegate)",
  "conflict_style": "string (1-2 sentences: how they handle conflict)",
  "decision_speed": "fast|measured|cautious",
  "communication_preference": "direct|collaborative|structured",
  "accountability_style": "high_autonomy|guided|close_oversight",
  "ideal_candidate_traits": ["string", "string", "string"],
  "clash_risk_traits": ["string", "string", "string"],
  "alignment_dimensions": {
    "autonomy_vs_guidance": 0-100,
    "pace_tolerance": 0-100,
    "structure_preference": 0-100,
    "conflict_comfort": 0-100,
    "detail_orientation": 0-100
  },
  "summary": "string (3-4 sentences describing this manager's DNA)"
}`
        }],
      })

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: 'Failed to analyse responses' }, { status: 500 })
      const dnaResult = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

      // Upsert into manager_dna table
      const payload = {
        assessment_id: params.id,
        user_id: user.id,
        scenarios,
        responses: responses.map((r, i) => ({
          scenario_index: i,
          response_text: r.response_text,
          time_taken_seconds: r.time_taken_seconds,
        })),
        ...dnaResult,
        completed_at: new Date().toISOString(),
      }

      const { data: saved, error: saveErr } = await admin
        .from('manager_dna')
        .upsert(payload, { onConflict: 'assessment_id,user_id' })
        .select()
        .single()

      if (saveErr) {
        console.error('Manager DNA save error:', saveErr)
        // Return results even if save fails
        return NextResponse.json({ dna: { ...payload, save_error: saveErr.message } })
      }

      return NextResponse.json({ dna: saved })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Manager DNA error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
