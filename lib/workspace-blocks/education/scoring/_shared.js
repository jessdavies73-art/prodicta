// Shared scaffolding for the 9 per-block Education Workspace scorers.
// Mirrors lib/workspace-blocks/healthcare/scoring/_shared.js but with
// education-specific account framing and compliance language so scoring
// narratives use professional, classroom-appropriate phrasing without
// drifting into definitive claims about teaching competence or pupil
// outcomes.
//
// Per-scorer files (class-roster-scoring.js, etc.) only own:
//   - block_id constant
//   - the criteria text
//   - the function signature accepted by the orchestrator
//
// Everything else lives here so a tightening pass on tone, compliance,
// or output structure changes one file, not nine.

import {
  streamFinal,
  extractJson,
  roleProfileBlurb,
  normaliseBlockScore,
  OUTPUT_SCHEMA,
  SCORING_MODEL_ID,
} from '../../office/scoring/_shared.js'

const SCORING_MODEL = SCORING_MODEL_ID
const SCORING_MAX_TOKENS = 800

// ─────────────────────────────────────────────────────────────────────────
// Re-exports. Office helpers that have no shell-specific tone (JSON
// extraction, role profile blurb, output-shape contract, normaliser) are
// shared verbatim. Education overrides live below.
// ─────────────────────────────────────────────────────────────────────────
export {
  streamFinal,
  extractJson,
  roleProfileBlurb,
  normaliseBlockScore,
  OUTPUT_SCHEMA,
}

// ─────────────────────────────────────────────────────────────────────────
// Education account framing. Branches on role_profile.function and
// role_profile.sector_context to land on a setting-appropriate framing.
// Settings: state primary, state secondary, sixth form / FE, MAT-wide,
// independent, SEN specialist, alternative provision. Falls through to
// state-mainstream as the safe default.
// ─────────────────────────────────────────────────────────────────────────
function looksLike(needles, haystack) {
  if (!haystack) return false
  const h = haystack.toLowerCase()
  return needles.some(n => h.includes(n))
}

export function educationAccountFraming(role_profile, employment_type) {
  const fn = (role_profile?.function || '').toLowerCase()
  const sector = role_profile?.sector_context || ''
  const sectorLower = sector.toLowerCase()
  const emp = (employment_type || '').toLowerCase()
  const isTemporary = emp === 'temporary'
    || looksLike(['supply', 'agency', 'cover', 'fixed-term', 'fixed term', 'maternity'], sectorLower)

  // SEN specialist / alternative provision settings carry distinct
  // safeguarding and pupil-vulnerability pressures.
  if (looksLike(['sen specialist', 'special school', 'alternative provision', 'pru', 'pupil referral'], sectorLower)) {
    return 'Frame impact in terms of pupil vulnerability, EHCP defensibility and safeguarding standards in a SEND-rich setting: a poor early-tenure pattern in a specialist or AP context affects pupils who already carry significant vulnerability and exposes the provider to safeguarding and provision-quality challenge.'
  }

  // MAT-wide / trust leadership.
  if (looksLike(['mat ', 'multi-academy trust', 'academy trust', 'trust-wide', 'mat-wide', 'executive head', 'trust ceo'], sectorLower) || fn === 'education_trust_leadership') {
    return 'Frame impact in terms of trust-wide standards, governance accountability and regulator readiness: a senior leader inside a MAT carries the trust\'s position with the regulator, the chair of trustees and the parent body across multiple sites.'
  }

  // Independent sector.
  if (looksLike(['independent', 'private school', 'fee-paying', 'isi', 'hmc', 'gsa'], sectorLower)) {
    return 'Frame impact in terms of fee-payer expectations, ISI standards and the school\'s reputation in the local market: an independent setting lives by parent confidence and inspection outcomes, and a poor early-tenure pattern shows up quickly in retention and reputation.'
  }

  // Sixth form / FE / college.
  if (looksLike(['sixth form', 'further education', ' fe ', 'fe college', 'college ', 'post-16', 'post 16', '16-19', '16 to 19'], sectorLower) || fn === 'education_fe') {
    return 'Frame impact in terms of learner outcomes, awarding body compliance and Ofsted readiness in a 16-to-19 setting: FE and sixth form roles sit inside a regulatory framework where awarding body standards and learner progression data drive the inspection narrative.'
  }

  // State secondary by sector keywords.
  const isSecondary = looksLike(['secondary', 'high school', 'comprehensive', 'grammar', 'academy ', 'foundation school'], sectorLower)
  if (isSecondary) {
    if (isTemporary) {
      return 'Frame impact in terms of cover continuity, behaviour management defensibility and exam-cohort risk in a state secondary setting: supply or fixed-term cover that breaks behaviour patterns, drops marking, or lets safeguarding lapse exposes both the school and the practitioner.'
    }
    return 'Frame impact in terms of pupil progress, behaviour management standards, safeguarding accountability and Ofsted readiness in a state secondary setting: a substantive role inside a regulated framework where the school\'s position with the regulator and the parent body is shaped by classroom practice.'
  }

  // State primary / default.
  if (isTemporary) {
    return 'Frame impact in terms of cover continuity, classroom behaviour patterns and safeguarding readiness in a state primary setting: supply or fixed-term cover that lets routines slip, breaks behaviour expectations, or misses safeguarding signals exposes the class and the practitioner.'
  }
  return 'Frame impact in terms of pupil progress, classroom standards, safeguarding accountability and Ofsted readiness in a state primary setting: a substantive role inside a regulated framework where outcomes for pupils and the school\'s position with the regulator depend on the day-to-day practice.'
}

// ─────────────────────────────────────────────────────────────────────────
// Education compliance language. Extends the office base rules with
// education-specific compliance: scoring narratives must never make
// definitive claims about teaching competence, pupil outcomes, or
// safeguarding determinations. Uses observation language that reads as
// professional and defensible. Pupil references must be anonymised.
// ─────────────────────────────────────────────────────────────────────────
export const EDUCATION_COMPLIANCE_RULES = `Compliance language (mandatory):
- Never write "will fail", "cannot", "is unable to", "do not hire", "will leave", "guarantees", or any other definitive claim about future behaviour.
- Never make definitive claims about teaching competence or pupil harm. Avoid "would have failed pupils", "incompetent teaching", "unsafe classroom practice", "should have known", "failed to safeguard", "negligent practice".
- Never make definitive claims about safeguarding outcomes. The threshold call sits with the DSL; the candidate's role is to recognise and refer.
- Use evidence-based observation language: "evidence suggests", "indicators show", "patterns suggest", "the response reads as".
- Use education compliance language for teaching, pastoral and safeguarding judgements: "professional judgement appeared sound", "patterns suggest classroom-management awareness", "the response reflected appropriate scope", "evidence of safeguarding awareness", "indicators of escalation discipline", "patterns suggest the candidate would carry the safeguarding line correctly".
- Anonymise pupil references in narrative output. Use "Pupil A", "the Year 4 pupil", "the pupil at the centre of the concern" rather than any name surfaced in the candidate\'s response. If the candidate used a name, reframe to anonymised form in the narrative.
- Sensitive blocks (safeguarding-referral, crisis-simulation): focus narrative on professional judgement and pathway. Never repeat graphic detail from the scenario, never speculate about cause or perpetrator, and treat the threshold call with appropriate gravity.
- This is a risk indicator, not a definitive prediction or a teaching observation.`

// ─────────────────────────────────────────────────────────────────────────
// Education-specific failure pattern reference. Surfaced into scorers so
// watch-outs can reference the named patterns the rest of PRODICTA
// already uses (lib/score-candidate.js). Scorers select the patterns the
// candidate's evidence supports; they do not list patterns without
// supporting evidence.
// ─────────────────────────────────────────────────────────────────────────
export const EDUCATION_FAILURE_PATTERNS = `Education-specific failure patterns (use these named patterns in watch-outs when the evidence supports them; do not invent new pattern names; do not list patterns the evidence does not support):
- "Did not log behaviour incident"
- "Missed safeguarding referral to DSL"
- "Parent confrontation escalated"
- "Did not flag SEN concern"
- "Skipped DSL involvement on disclosure"
- "Lesson preparation gap"
- "Pupil progress concern unaddressed"

Universal failure patterns also apply: "Hesitation under pressure", "Works in isolation", "Defaults to escalation", "Overcomplicates under pressure", "Rushes without considering consequences", "Avoids difficult conversations", "Externalises blame".`

// ─────────────────────────────────────────────────────────────────────────
// Build the full prompt for an education scorer. Each per-block scorer
// supplies the criteria string; this composes the preamble + criteria +
// context + education compliance + failure patterns + schema into the
// user content the model receives.
// ─────────────────────────────────────────────────────────────────────────
export function buildEducationScorerPrompt({
  blockName,
  role_profile,
  role_title,
  employment_type,
  scenario_context,
  block_content,
  candidate_inputs,
  criteria,
}) {
  const role = roleProfileBlurb(role_profile, role_title)
  const framing = educationAccountFraming(role_profile, employment_type)
  const spine = scenario_context?.spine ? `Scenario spine: ${scenario_context.spine}` : ''
  const blockSummary = block_content?.summary ? `Block summary: ${block_content.summary}` : ''
  return [
    `You are an expert assessor evaluating a candidate's performance on the ${blockName} component of an education workplace simulation. Read what they did and score it against the role-appropriate teaching, pastoral and safeguarding criteria below. Be evidence-based: cite the specific candidate output. Never make definitive claims about teaching competence, pupil outcomes or safeguarding determinations; this is a behavioural assessment, not a teaching observation.`,
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
    EDUCATION_COMPLIANCE_RULES,
    '',
    EDUCATION_FAILURE_PATTERNS,
    '',
    OUTPUT_SCHEMA,
  ].filter(Boolean).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Default education scorer runner. Per-block files call this with their
// criteria and input shape; this owns the Anthropic call, the JSON
// extract, and the normalise. Returns a normalised BlockScore or null on
// failure.
// ─────────────────────────────────────────────────────────────────────────
export async function runEducationScorer({
  anthropic,
  block_id,
  blockName,
  role_profile,
  role_title,
  // account_type accepted for orchestrator parity but ignored: education
  // framing reads from role_profile.function, role_profile.sector_context,
  // and employment_type.
  account_type, // eslint-disable-line no-unused-vars
  employment_type,
  scenario_context,
  block_content,
  candidate_inputs,
  criteria,
}) {
  if (!anthropic) return null
  const prompt = buildEducationScorerPrompt({
    blockName,
    role_profile,
    role_title,
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
    console.error(`[education-block-scoring] ${block_id} stream failed:`, err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = extractJson(text)
  return normaliseBlockScore(block_id, raw)
}

export const EDUCATION_SCORING_MODEL_ID = SCORING_MODEL
