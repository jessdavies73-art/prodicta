// Strategic Thinking Evaluation scorer.
//
// Reads the candidate's responses to the 2-3 evaluation questions on
// the Strategic Thinking component and scores them against role-and-
// seniority-aware criteria.
//
// Senior-tier criteria:
//   - Strategic vision and system-level thinking
//   - Awareness of competing priorities and trade-offs
//   - Ability to articulate the call and the cost
//   - Professional judgement at scale (regulatory, governance,
//     stakeholder relationships beyond the team)
//
// Junior-mid criteria:
//   - Decision-making capacity within the candidate's actual scope
//   - Capacity for growth (recognising the stretch, planning the
//     ramp, asking for support)
//   - Awareness of own development edges
//   - Ability to articulate priorities and trade-offs at IC level
//
// Output shape mirrors the existing per-block BlockScore so the
// scorer's output can be appended to results.workspace_block_scores
// alongside Workspace block scores. Block id is 'strategic-thinking'.
//
// Returns null on any failure; the score row simply has no
// strategic-thinking entry, which the report and PDF render treats as
// "not scored".

import {
  deriveSeniority,
  shellComplianceLanguage,
  roleContextLine,
} from './_shared.js'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 1200

function buildPrompt({ role_profile, shell_family, roleTitle, component, responses, seniority }) {
  const compliance = shellComplianceLanguage(shell_family)
  const context = roleContextLine({ role_profile, roleTitle })
  const isSenior = seniority === 'senior'

  const responseEntries = (component.evaluation_questions || []).map(q => {
    const r = responses?.[q.id]
    return {
      question_id: q.id,
      prompt: q.prompt,
      response: typeof r === 'string' ? r.trim().slice(0, 1200) : '',
    }
  })

  const criteria = isSenior
    ? `Senior-tier criteria:
1. Strategic vision and system-level thinking. Did the candidate read across the situation rather than focus narrowly on one strand?
2. Trade-off awareness. Did they name the cost of their chosen path and the alternative they rejected?
3. Articulation of the call. Was their decision specific, with named people and a named time, or generic?
4. Professional judgement at scale. Did they reference the relevant governance, regulatory, or stakeholder context that a senior practitioner would?`
    : `Junior-mid criteria (this candidate is being assessed for an IC or experienced delivery role, NOT a leadership role; do not score them down for not thinking at scale):
1. Decision-making capacity within scope. Did they weigh the trade-off they would actually face, given their actual responsibilities?
2. Capacity for growth. Did they recognise the stretch, name what they would need from their manager or team, and plan the ramp?
3. Awareness of own development edges. Did they notice where their gaps would surface and how they would close them?
4. Articulation of priorities. Was their reasoning specific, with named priorities and a named order, or vague?`

  return `You are scoring a candidate's responses to a Strategic Thinking Evaluation component. Output JSON only. UK English. No emoji. No em dashes.

Role context: ${context}
Seniority framing: ${seniority}

Component title: ${component.title || 'Strategic Thinking Evaluation'}
Component scenario:
${component.scenario_text || ''}

Candidate responses:
${JSON.stringify(responseEntries)}

${criteria}

${compliance}

Output schema:
{
  "block_id": "strategic-thinking",
  "score": integer 0-100,
  "strengths": ["string", ...],   // 1 to 3 items, evidence-based, cite the specific candidate output
  "watch_outs": ["string", ...],  // 0 to 2 items, can be empty
  "narrative": "string",            // 2-4 sentences, evidence-based, follows compliance rules
  "signals": [
    { "type": "string", "evidence": "string", "weight": "high" | "medium" | "low" }
  ]                                 // 2 to 4 signals, each cites concrete evidence from a candidate response
}`
}

function parseJson(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v, max) => Array.isArray(v) ? v.map(safeStr).filter(Boolean).slice(0, max) : []
  const rawScore = Number(raw.score)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : null
  const WEIGHT = ['high', 'medium', 'low']
  const signals = Array.isArray(raw.signals)
    ? raw.signals.slice(0, 4).map(s => ({
        type: safeStr(s?.type),
        evidence: safeStr(s?.evidence),
        weight: WEIGHT.includes(s?.weight) ? s.weight : 'medium',
      })).filter(s => s.type && s.evidence)
    : []
  const strengths = safeArr(raw.strengths, 3)
  const watch_outs = safeArr(raw.watch_outs, 2)
  const narrative = safeStr(raw.narrative)
  if (score == null && !narrative && strengths.length === 0 && signals.length === 0) {
    return null
  }
  return {
    block_id: 'strategic-thinking',
    score,
    strengths,
    watch_outs,
    narrative,
    signals,
  }
}

export async function scoreStrategicThinking(client, {
  role_profile,
  shell_family,
  roleTitle,
  component,            // assessments.strategy_fit_components.strategic_thinking
  responses,            // { [question_id]: response_text }
  canonical_level,
  role_level,
} = {}) {
  if (!client || !component || !responses) return null
  const seniority = deriveSeniority({ role_profile, canonical_level, role_level })
  const prompt = buildPrompt({ role_profile, shell_family, roleTitle, component, responses, seniority })

  let stream
  try {
    stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[strategic-thinking-scoring] stream init failed', err?.message)
    return null
  }
  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[strategic-thinking-scoring] stream completion failed', err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = parseJson(text)
  return normalise(raw)
}
