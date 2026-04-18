import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

// -- ALTER TABLE assessments ADD COLUMN IF NOT EXISTS workspace_content JSONB;
//
// IMPORTANT — response shape contract:
//   { emails: [...], messages: [...], tasks: [...],
//     calendar_gaps: [...], fixed_meetings: [...],
//     surprise_message: {...} }
//
// These exact field names are read by app/assess/[uniqueToken]/page.js
// (WorkspacePage, ~L1530). Do NOT rename to `inbox_items` or
// `calendar_events` — those names are used elsewhere in the codebase for
// unrelated data (scenario inbox overload, calendar-simulation stage) and
// renaming here would silently break the Strategy-Fit workspace stage.
// Auth is intentionally absent: candidates are anonymous (identified by
// unique_link on the assess page), so this endpoint accepts any assessment id.

// Haiku can occasionally stretch to 20-30s; give headroom so an intermittent
// slow call doesn't kill the function and leave the candidate stuck.
export const maxDuration = 120

export async function GET(request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: assessment } = await admin
      .from('assessments')
      .select('id, role_title, role_level, workspace_content')
      .eq('id', params.id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Cache hit — but validate. A prior generation may have stored malformed
    // data (truncated Claude output, corrupted row, or a plain-string JSONB
    // rather than an object). If the stored value can't be read as an object
    // with at least one expected shape key, fall through and regenerate.
    if (assessment.workspace_content) {
      let cached = null
      try {
        cached = typeof assessment.workspace_content === 'string'
          ? JSON.parse(assessment.workspace_content)
          : assessment.workspace_content
      } catch {
        console.log('[workspace-content] cached content parse error, regenerating', { assessmentId: params.id })
      }
      if (cached && (cached.emails || cached.tasks)) {
        console.log('[workspace-content] cache hit', { assessmentId: params.id })
        return NextResponse.json(cached)
      }
      if (cached) {
        console.log('[workspace-content] cached content malformed, regenerating', { assessmentId: params.id, keys: Object.keys(cached) })
      }
    }

    const prompt = `Generate realistic Day 1 morning workspace content for a "${assessment.role_title}" role (${assessment.role_level || 'LEADERSHIP'} level). This simulates the candidate's first morning inbox, messages, and tasks.

Return JSON only. UK English. No emoji. No em dashes.
{
  "emails": [
    {"id": "e1", "from": "Name (Role)", "subject": "string", "preview": "string (one line)", "body": "string (2-3 paragraphs, realistic)"},
    {"id": "e2", "from": "Name (Role)", "subject": "string", "preview": "string", "body": "string"},
    {"id": "e3", "from": "Name (Role)", "subject": "string", "preview": "string", "body": "string"}
  ],
  "messages": [
    {"id": "m1", "from": "Name", "role": "string", "text": "string (1-2 sentences)", "time": "09:12"},
    {"id": "m2", "from": "Name", "role": "string", "text": "string", "time": "09:18"}
  ],
  "surprise_message": {"id": "m3", "from": "Name", "role": "string", "text": "string", "time": "09:35"},
  "tasks": [
    {"id": "t1", "title": "string", "priority": "high", "context": "string (one line)"},
    {"id": "t2", "title": "string", "priority": "high", "context": "string"},
    {"id": "t3", "title": "string", "priority": "medium", "context": "string"},
    {"id": "t4", "title": "string", "priority": "medium", "context": "string"},
    {"id": "t5", "title": "string", "priority": "low", "context": "string"}
  ],
  "calendar_gaps": [
    {"time": "10:00-10:30", "context": "Free slot between meetings"},
    {"time": "11:30-12:00", "context": "Free slot before lunch"}
  ],
  "fixed_meetings": [
    {"time": "09:00", "title": "string"},
    {"time": "10:30", "title": "string"},
    {"time": "14:00", "title": "string"}
  ]
}

Make all content specific to the role. For senior/leadership roles use board-level language and strategic content. Each email should require a thoughtful response.`

    console.log('[workspace-content] prompt length', prompt.length)
    const claudeStart = Date.now()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    // Stream to keep the outbound connection active while Haiku generates;
    // finalMessage() aggregates the deltas into the same Message shape.
    const msg = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    }).finalMessage()

    const text = msg.content[0]?.text || ''
    console.log('[workspace-content] claude response', {
      elapsed_ms: Date.now() - claudeStart,
      stop_reason: msg.stop_reason,
      content_length: text.length,
      first_100_chars: text.substring(0, 100),
      input_tokens: msg.usage?.input_tokens,
      output_tokens: msg.usage?.output_tokens,
    })

    // Strip markdown code fences Claude sometimes wraps around JSON, then
    // match the first balanced {…} block in the cleaned text.
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      console.warn('[workspace-content] no JSON block found in response', { text_preview: text.substring(0, 300), cleaned_preview: cleaned.substring(0, 300) })
      return NextResponse.json({ error: 'Generation failed', message: 'Claude response did not contain a JSON block' }, { status: 500 })
    }
    let content
    try {
      content = JSON.parse(match[0].replace(/[\u2014\u2013]/g, ', '))
    } catch (parseErr) {
      console.error('[workspace-content] JSON parse failed', { parseErr: parseErr.message, match_preview: match[0].substring(0, 300) })
      return NextResponse.json({ error: 'Generation failed', message: 'Claude returned malformed JSON' }, { status: 500 })
    }

    await admin.from('assessments').update({ workspace_content: content }).eq('id', params.id)
    return NextResponse.json(content)
  } catch (err) {
    console.error('[workspace-content] error', err.message, err.status, err.stack)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
