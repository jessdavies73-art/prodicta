// Shared scaffolding for the 10 per-block Workspace scorers.
//
// Every block scorer composes:
//   1. A common preamble (role profile blurb, account-aware framing,
//      compliance language rules, output schema) so PRODICTA scoring
//      tone stays consistent across blocks.
//   2. The block-specific criteria block, supplied by each scorer.
//   3. A streamFinal helper that wraps anthropic.messages.stream so we
//      do not buffer the full response on the server (matches the
//      streamAnthropic pattern in lib/score-candidate.js).
//   4. A normaliser that hardens the raw JSON into the BlockScore shape
//      the orchestrator and the report page consume.
//
// Per-scorer files (inbox-scoring.js, etc.) only own:
//   - block_id constant
//   - the criteria text
//   - the input shape they want to send to the model
//
// Everything else lives here so a tightening pass on tone, compliance,
// or output structure changes one file, not ten.

const SCORING_MODEL = 'claude-haiku-4-5-20251001'
const SCORING_MAX_TOKENS = 800

// ─────────────────────────────────────────────────────────────────────────
// Anthropic streaming wrapper. Mirrors streamAnthropic in score-candidate.js
// so call-sites still see a Message with .content[0].text. Caller catches.
// ─────────────────────────────────────────────────────────────────────────
export function streamFinal(anthropic, config) {
  return anthropic.messages.stream(config).finalMessage()
}

// ─────────────────────────────────────────────────────────────────────────
// JSON extractor. Same em-dash / en-dash scrubbing the rest of the scoring
// pipeline uses so a stray punctuation choice from the model does not
// blow up JSON.parse.
// ─────────────────────────────────────────────────────────────────────────
export function extractJson(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────
// Account-aware framing. Reused from the language patterns in
// score-candidate.js: agency-permanent reports frame impact as "rebate
// window risk", agency-temporary as "assignment completion risk",
// employer-permanent as "probation defence risk". These show up in the
// per-block narratives so the scoring tone matches the account viewing
// the report.
// ─────────────────────────────────────────────────────────────────────────
export function accountFraming(account_type, employment_type) {
  const acct = (account_type || '').toLowerCase()
  const emp  = (employment_type || '').toLowerCase()
  if (acct === 'agency' && emp === 'temporary') {
    return 'Frame impact in terms of assignment completion: this is a temporary placement, so the candidate has to ramp fast and not break the assignment.'
  }
  if (acct === 'agency') {
    return 'Frame impact in terms of the rebate window and the agency-client relationship: a placement that fails inside the rebate window costs the agency the fee and the relationship.'
  }
  if (acct === 'employer' && emp === 'temporary') {
    return 'Frame impact in terms of cover continuity: temporary cover that disrupts the team is worse than no cover.'
  }
  return 'Frame impact in terms of probation and the protected period: from January 2027 unfair dismissal protection applies after six months, so a poor early-tenure pattern carries real legal and financial cost.'
}

// ─────────────────────────────────────────────────────────────────────────
// Compliance language. Verbatim copy of the rules already enforced in
// score-candidate.js so block-level narratives never drift into definitive
// claims. Kept as a single string so a future update only touches one file.
// ─────────────────────────────────────────────────────────────────────────
export const COMPLIANCE_RULES = `Compliance language (mandatory):
- Never write "will fail", "cannot", "is unable to", "do not hire", "will leave", "guarantees", or any other definitive claim about future behaviour.
- Use "evidence suggests", "indicators show", "patterns suggest", "the response reads as".
- This is a risk indicator, not a definitive prediction.`

// ─────────────────────────────────────────────────────────────────────────
// Role profile blurb. Compact one-paragraph summary the model uses to
// calibrate its judgement to the role. We deliberately keep this short:
// the per-block criteria carry most of the role-specific weight.
// ─────────────────────────────────────────────────────────────────────────
export function roleProfileBlurb(role_profile, role_title) {
  if (!role_profile || typeof role_profile !== 'object') {
    return `Role: ${role_title || 'unknown'}.`
  }
  const parts = []
  if (role_title) parts.push(`Role: ${role_title}`)
  if (role_profile.function) parts.push(`function: ${role_profile.function}`)
  if (role_profile.seniority_band) parts.push(`seniority: ${role_profile.seniority_band}`)
  if (role_profile.ic_or_manager) parts.push(`IC/manager: ${role_profile.ic_or_manager}`)
  if (role_profile.interaction_internal_external) parts.push(`interaction style: ${role_profile.interaction_internal_external}`)
  if (role_profile.sector_context) parts.push(`sector: ${role_profile.sector_context}`)
  if (role_profile.company_size) parts.push(`company size: ${role_profile.company_size}`)
  return parts.join(' | ')
}

// ─────────────────────────────────────────────────────────────────────────
// Output-shape contract. Every per-block scorer asks the model for this
// exact JSON shape. The normaliser below clamps and trims so a model
// response that drops a field, adds an extra signal, or returns a
// non-integer score still parses into a stable BlockScore.
// ─────────────────────────────────────────────────────────────────────────
export const OUTPUT_SCHEMA = `Output schema (return JSON only, UK English, no emoji, no em dashes):
{
  "score": integer 0-100,
  "strengths": ["string", ...],   // 1 to 3 items, evidence-based, cite what the candidate did
  "watch_outs": ["string", ...],  // 0 to 2 items, can be empty array if performance was clean
  "narrative": "string",            // 2-4 sentences, evidence-based, follows compliance rules
  "signals": [
    { "type": "string", "evidence": "string", "weight": "high" | "medium" | "low" }
  ]                                 // 3 to 5 signals, each cites concrete evidence
}`

// ─────────────────────────────────────────────────────────────────────────
// Build the full prompt for a scorer. Each per-block scorer supplies the
// criteria string and the candidate-context block; this composes the
// preamble + criteria + context + schema into the user content the model
// receives. Returns a single string (we send as the only user turn).
// ─────────────────────────────────────────────────────────────────────────
export function buildScorerPrompt({
  blockName,
  role_profile,
  role_title,
  account_type,
  employment_type,
  scenario_context,
  block_content,
  candidate_inputs,
  criteria,
}) {
  const role = roleProfileBlurb(role_profile, role_title)
  const framing = accountFraming(account_type, employment_type)
  const spine = scenario_context?.spine ? `Scenario spine: ${scenario_context.spine}` : ''
  const blockSummary = block_content?.summary ? `Block summary: ${block_content.summary}` : ''
  return [
    `You are an expert assessor evaluating a candidate's performance on the ${blockName} component of a workplace simulation. Read what they did and score it against the criteria below. Be evidence-based: cite the specific candidate output, never write vague generalities.`,
    role,
    framing,
    spine,
    blockSummary,
    '',
    'Criteria for this block:',
    criteria,
    '',
    'Block content the candidate saw:',
    JSON.stringify(block_content || {}),
    '',
    'Candidate inputs (what they actually produced):',
    JSON.stringify(candidate_inputs || {}),
    '',
    COMPLIANCE_RULES,
    '',
    OUTPUT_SCHEMA,
  ].filter(Boolean).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Normaliser. Coerces the raw JSON parsed from the model into a stable
// BlockScore so downstream code does not have to defend against missing
// fields or stray types. Returns null when the result is so empty it is
// not worth surfacing in the report.
// ─────────────────────────────────────────────────────────────────────────
export function normaliseBlockScore(block_id, raw) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v, max) => Array.isArray(v) ? v.map(safeStr).filter(Boolean).slice(0, max) : []

  const rawScore = Number(raw.score)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : null

  const strengths = safeArr(raw.strengths, 3)
  const watch_outs = safeArr(raw.watch_outs, 2)
  const narrative = safeStr(raw.narrative)

  const WEIGHT = ['high', 'medium', 'low']
  const signals = Array.isArray(raw.signals)
    ? raw.signals.slice(0, 5).map(s => ({
        type: safeStr(s?.type),
        evidence: safeStr(s?.evidence),
        weight: WEIGHT.includes(s?.weight) ? s.weight : 'medium',
      })).filter(s => s.type && s.evidence)
    : []

  if (score == null && !narrative && strengths.length === 0 && signals.length === 0) {
    return null
  }
  return { block_id, score, strengths, watch_outs, narrative, signals }
}

// ─────────────────────────────────────────────────────────────────────────
// Default scorer runner. Per-block files call this with their criteria
// and input shape; this owns the Anthropic call, the JSON extract, and
// the normalise. Returns a normalised BlockScore or null on failure.
// ─────────────────────────────────────────────────────────────────────────
export async function runScorer({
  anthropic,
  block_id,
  blockName,
  role_profile,
  role_title,
  account_type,
  employment_type,
  scenario_context,
  block_content,
  candidate_inputs,
  criteria,
}) {
  if (!anthropic) return null
  const prompt = buildScorerPrompt({
    blockName,
    role_profile,
    role_title,
    account_type,
    employment_type,
    scenario_context,
    block_content,
    candidate_inputs,
    criteria,
  })
  let final
  try {
    final = await streamFinal(anthropic, {
      model: SCORING_MODEL,
      max_tokens: SCORING_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error(`[workspace-block-scoring] ${block_id} stream failed:`, err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = extractJson(text)
  return normaliseBlockScore(block_id, raw)
}

export const SCORING_MODEL_ID = SCORING_MODEL
