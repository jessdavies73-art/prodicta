import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Conversation-simulation block: this endpoint produces the next
// counterparty turn. Called from
// lib/workspace-blocks/office/conversation-simulation.jsx after each
// candidate turn. The candidate-facing assess flow is unauthenticated
// (the URL token is the gate), so this route follows the same posture
// as /api/assessment/[id]/calendar-score and other candidate-side routes:
// no auth, just shape validation.
//
// Body shape:
//   {
//     transcript: [{ from: 'candidate' | 'counterparty', text: string }],
//     counterparty: { name, role, relationship, stance, ask, personality },
//     scenario_context: { title, spine, trigger, order, total },
//     role_profile: { function, seniority_band, sector_context, ... }
//   }
//
// Response: { reply: string }
//
// max_tokens hard-capped at 200 per the brief for speed. Returns the
// raw counterparty reply text. The block component decides when the
// conversation ends (turn count gate plus an explicit "end" button).

export const maxDuration = 30

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'no_anthropic_key' }, { status: 500 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const { transcript, counterparty, scenario_context, role_profile } = body
  if (!Array.isArray(transcript)) {
    return NextResponse.json({ error: 'transcript_required' }, { status: 400 })
  }
  if (!counterparty || typeof counterparty !== 'object') {
    return NextResponse.json({ error: 'counterparty_required' }, { status: 400 })
  }

  // Build the system prompt that puts Claude in character. The system
  // prompt does not count against the per-call max_tokens cap; the cap
  // applies to the model's reply only.
  const cpName = String(counterparty.name || 'Counterpart').slice(0, 80)
  const cpRole = String(counterparty.role || '').slice(0, 120)
  const cpStance = String(counterparty.stance || '').slice(0, 400)
  const cpAsk = String(counterparty.ask || '').slice(0, 300)
  const cpPersonality = String(counterparty.personality || '').slice(0, 200)
  const cpRel = String(counterparty.relationship || 'internal')

  const candidateRoleTitle = String(role_profile?.function || 'their role').slice(0, 60)
  const candidateSeniority = String(role_profile?.seniority_band || 'mid').slice(0, 30)
  const sectorContext = String(role_profile?.sector_context || '').slice(0, 240)

  const spine = String(scenario_context?.spine || '').slice(0, 400)
  const trigger = String(scenario_context?.trigger || '').slice(0, 400)

  const system = `You are ${cpName}${cpRole ? `, ${cpRole}` : ''}, in a written exchange with a candidate playing a ${candidateRoleTitle} at ${candidateSeniority} level${sectorContext ? ` in ${sectorContext}` : ''}.

Your character:
- Stance: ${cpStance || 'as established'}
- What you want from this exchange: ${cpAsk || 'as established'}
- Personality and tone: ${cpPersonality || 'direct, professional'}
- Your relationship to the candidate: ${cpRel}

Scenario the candidate is working on:
${spine || '(unspecified)'}
${trigger ? `Today's trigger event: ${trigger}` : ''}

Rules for your replies:
- Stay in character. Never reveal you are an AI or break the fourth wall.
- Reply in 1 to 3 sentences only. Be concise; you have things to do.
- Match your stated personality and stance. Push back if the candidate's reply is weak, vague, or evasive. Concede only when their reply genuinely addresses your concern.
- Hold your position consistent across turns. Don't soften without good reason.
- Use UK English. No emoji. No em dashes. Replace dashes with commas.
- Output your reply only: no labels, no JSON, no quotation marks.`

  // Send the turn history as standard chat messages. Trim to the last 12
  // turns so we never blow the context window if a candidate types
  // unusually long messages.
  const messages = transcript.slice(-12).map(t => ({
    role: t?.from === 'candidate' ? 'user' : 'assistant',
    content: typeof t?.text === 'string' ? t.text.slice(0, 1200) : '',
  })).filter(m => m.content)

  if (messages.length === 0) {
    // No prior turns: prompt the model with an opener cue. The block
    // component normally seeds the transcript with the counterparty's
    // opening_message before calling this endpoint, so we shouldn't
    // usually land here.
    messages.push({ role: 'user', content: '(opening turn — please begin the conversation in character)' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system,
      messages,
    })
  } catch (err) {
    console.error('[conversation-turn] stream init failed', err)
    return NextResponse.json({ error: 'model_unavailable' }, { status: 502 })
  }
  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[conversation-turn] stream completion failed', err)
    return NextResponse.json({ error: 'model_failed' }, { status: 502 })
  }

  let text = ''
  for (const block of final?.content || []) {
    if (block?.type === 'text' && typeof block?.text === 'string') {
      text += block.text
    }
  }
  text = text.replace(/[—–]/g, ', ').trim()
  if (!text) {
    return NextResponse.json({ error: 'empty_reply' }, { status: 502 })
  }
  // Cap response at 600 chars to keep the chat UI tidy if the model goes long.
  return NextResponse.json({ reply: text.slice(0, 600) })
}
