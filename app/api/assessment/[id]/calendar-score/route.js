import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export const maxDuration = 120

// -- ALTER TABLE results ADD COLUMN day_planning_score INTEGER;
// -- ALTER TABLE results ADD COLUMN day_planning_narrative TEXT;
// -- ALTER TABLE results ADD COLUMN calendar_data JSONB;

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { candidate_id, calendar_layout } = await request.json()
    if (!candidate_id || !calendar_layout) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data: assessment } = await admin
      .from('assessments')
      .select('role_title, role_level')
      .eq('id', params.id)
      .single()

    const fixed = (calendar_layout.fixed_events || []).map(e => `${e.time} - ${e.title} (fixed)`).join('\n')
    const scheduled = (calendar_layout.scheduled_tasks || []).map(e =>
      `${e.scheduled_time || 'NOT SCHEDULED'} - ${e.title}${e.note ? ` [Note: ${e.note}]` : ''}`
    ).join('\n')
    const unscheduled = (calendar_layout.scheduled_tasks || []).filter(t => !t.scheduled_time).map(t => t.title).join(', ')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyse this candidate's day one planning for a "${assessment?.role_title}" role (${assessment?.role_level || 'MID_LEVEL'} level).

FIXED EVENTS (cannot be moved):
${fixed}

CANDIDATE'S SCHEDULED TASKS:
${scheduled}

${unscheduled ? `UNSCHEDULED (candidate failed to place these): ${unscheduled}` : 'All tasks were scheduled.'}

Analyse: Did they protect time for deep work? Did they batch or spread tasks inefficiently? Did they leave buffer for unexpected requests? Did they schedule deadline tasks with enough time? Did they add thoughtful notes? Were any tasks left unscheduled?

Return JSON only. UK English. No emoji.
{
  "day_planning_score": 0-100,
  "day_planning_narrative": "2-3 sentences analysing their planning approach",
  "planning_signals": ["string", "string"],
  "watch_out": "string or null (only if poor planning detected)"
}`
      }],
    }).finalMessage()

    const text = msg.content[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    const result = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

    // Save to results table
    await admin
      .from('results')
      .update({
        day_planning_score: result.day_planning_score,
        day_planning_narrative: result.day_planning_narrative,
        calendar_data: calendar_layout,
      })
      .eq('candidate_id', candidate_id)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Calendar score error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
