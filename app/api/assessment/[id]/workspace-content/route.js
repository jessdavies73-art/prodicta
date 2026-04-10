import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

// -- ALTER TABLE assessments ADD COLUMN IF NOT EXISTS workspace_content JSONB;

export async function GET(request, { params }) {
  try {
    const admin = createServiceClient()
    const { data: assessment } = await admin
      .from('assessments')
      .select('id, role_title, role_level, workspace_content')
      .eq('id', params.id)
      .single()

    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (assessment.workspace_content) return NextResponse.json(assessment.workspace_content)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Generate realistic Day 1 morning workspace content for a "${assessment.role_title}" role (${assessment.role_level || 'LEADERSHIP'} level). This simulates the candidate's first morning inbox, messages, and tasks.

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
      }],
    })

    const text = msg.content[0]?.text || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    const content = JSON.parse(match[0].replace(/[\u2014\u2013]/g, ', '))

    await admin.from('assessments').update({ workspace_content: content }).eq('id', params.id)
    return NextResponse.json(content)
  } catch (err) {
    console.error('Workspace content error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
