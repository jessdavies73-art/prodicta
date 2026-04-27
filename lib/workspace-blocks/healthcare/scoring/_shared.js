// Shared scaffolding for the 10 per-block Healthcare/Care Workspace
// scorers. Mirrors lib/workspace-blocks/office/scoring/_shared.js but
// with healthcare-specific account framing and compliance language so
// scoring narratives use clinically appropriate phrasing without
// drifting into definitive claims about competence or harm.
//
// Per-scorer files (patient-handover-scoring.js, etc.) only own:
//   - block_id constant
//   - the criteria text
//   - the function signature accepted by the orchestrator
//
// Everything else lives here so a tightening pass on tone, compliance,
// or output structure changes one file, not ten.

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
// shared verbatim. Healthcare overrides live below.
// ─────────────────────────────────────────────────────────────────────────
export {
  streamFinal,
  extractJson,
  roleProfileBlurb,
  normaliseBlockScore,
  OUTPUT_SCHEMA,
}

// ─────────────────────────────────────────────────────────────────────────
// Healthcare account framing. The healthcare buyer/employment matrix is
// richer than the office shell: NHS, private healthcare, care home and
// social work each carry distinct compliance and commercial pressures.
// We pattern-match against role_profile.function and role_profile.
// sector_context to land on one of seven framings, falling through to
// NHS-permanent as the safe default if signals are ambiguous.
// ─────────────────────────────────────────────────────────────────────────
function looksLike(needles, haystack) {
  if (!haystack) return false
  const h = haystack.toLowerCase()
  return needles.some(n => h.includes(n))
}

export function healthcareAccountFraming(role_profile, employment_type) {
  const fn = (role_profile?.function || '').toLowerCase()
  const sector = role_profile?.sector_context || ''
  const sectorLower = sector.toLowerCase()
  const emp = (employment_type || '').toLowerCase()
  const isTemporary = emp === 'temporary'
    || looksLike(['locum', 'bank', 'agency'], sectorLower)

  // Social work shells route by employment_type only; the LA / private
  // distinction is rarely meaningful for scoring tone.
  if (fn === 'social_work') {
    if (isTemporary) {
      return 'Frame impact in terms of case continuity and statutory framework compliance: an agency or locum social worker who breaks a case mid-thread costs the local authority defensibility and often sets the case back weeks. Reference court readiness and the statutory timeframes that frame the role.'
    }
    return 'Frame impact in terms of case progression defensibility, court readiness, and child or adult safeguarding outcomes: a permanent social worker who lets a case drift exposes the local authority to challenge and risks the welfare of the person at the centre.'
  }

  // Care home / care worker shells. healthcare_care function is the
  // strong signal; sector keywords harden the read.
  const isCareHomeContext = fn === 'healthcare_care'
    || looksLike(['care home', 'residential', 'domiciliary', 'supported living', 'nursing home'], sectorLower)
  if (isCareHomeContext) {
    if (isTemporary) {
      return 'Frame impact in terms of shift continuity and agency liability: an agency care worker who hands over poorly leaves residents at risk for the next shift, and the agency carries the liability when CQC asks questions. Reference resident safety and safeguarding defensibility.'
    }
    return 'Frame impact in terms of CQC compliance, resident safety, family confidence, and safeguarding defensibility: a permanent care role sits at the heart of the home\'s registration and the family\'s trust. Reference what the next CQC inspection or family visit would surface.'
  }

  // Private healthcare. We accept fn in {clinical, care} and look for
  // private / independent / insurer keywords.
  const isPrivate = looksLike(['private', 'independent hospital', 'independent provider', 'bupa', 'spire', 'nuffield', 'circle', 'hca healthcare'], sectorLower)
  if (isPrivate) {
    return 'Frame impact in terms of private patient experience, regulatory standing, and insurer relationships: a private provider lives or dies on patient experience scores, on CQC standing, and on its relationships with insurers and self-pay clients. Reference the commercial as well as the clinical.'
  }

  // NHS clinical / care default. Locum / bank / agency = NHS temporary.
  if (isTemporary) {
    return 'Frame impact in terms of shift handover continuity, registration risk, and agency compliance: a locum or bank role that breaks a handover or drifts on documentation puts the substantive team at risk and exposes the registration of the individual. Reference NMC, GMC or HCPC standards where relevant.'
  }
  return 'Frame impact in terms of patient safety, care quality, and professional registration: a permanent NHS clinical role sits inside a regulated framework, and a poor early-tenure pattern affects both patient outcomes and the practitioner\'s own registration. Reference NMC, GMC, HCPC, GPhC or GDC standards where relevant.'
}

// ─────────────────────────────────────────────────────────────────────────
// Healthcare compliance language. Extends the office base rules with
// clinical-specific compliance: scoring narratives must never stray into
// definitive claims about competence or harm. Uses observation language
// that reads as professional and defensible.
// ─────────────────────────────────────────────────────────────────────────
export const HEALTHCARE_COMPLIANCE_RULES = `Compliance language (mandatory):
- Never write "will fail", "cannot", "is unable to", "do not hire", "will leave", "guarantees", or any other definitive claim about future behaviour.
- Never make definitive clinical claims about competence or harm. Avoid "would have caused patient harm", "incompetent clinical practice", "unsafe practice", "put patients at risk", "breach of duty of care", "should have known better", "failed to recognise".
- Use evidence-based observation language: "evidence suggests", "indicators show", "patterns suggest", "the response reads as".
- Use clinical compliance language for healthcare judgements: "clinical judgement appeared sound", "patterns suggest care plan understanding", "documentation reflected appropriate professional standards", "evidence of safeguarding awareness", "indicators of escalation discipline", "the response reads as appropriate to scope".
- This is a risk indicator, not a definitive prediction or a clinical assessment.`

// ─────────────────────────────────────────────────────────────────────────
// Build the full prompt for a healthcare scorer. Each per-block scorer
// supplies the criteria string; this composes the preamble + criteria +
// context + healthcare compliance + schema into the user content the
// model receives.
// ─────────────────────────────────────────────────────────────────────────
export function buildHealthcareScorerPrompt({
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
  const framing = healthcareAccountFraming(role_profile, employment_type)
  const spine = scenario_context?.spine ? `Scenario spine: ${scenario_context.spine}` : ''
  const blockSummary = block_content?.summary ? `Block summary: ${block_content.summary}` : ''
  return [
    `You are an expert assessor evaluating a candidate's performance on the ${blockName} component of a healthcare workplace simulation. Read what they did and score it against the role-appropriate clinical and care criteria below. Be evidence-based: cite the specific candidate output. Never make definitive claims about clinical competence or patient harm; this is a behavioural assessment, not a clinical examination.`,
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
    HEALTHCARE_COMPLIANCE_RULES,
    '',
    OUTPUT_SCHEMA,
  ].filter(Boolean).join('\n')
}

// ─────────────────────────────────────────────────────────────────────────
// Default healthcare scorer runner. Per-block files call this with their
// criteria and input shape; this owns the Anthropic call, the JSON
// extract, and the normalise. Returns a normalised BlockScore or null on
// failure.
// ─────────────────────────────────────────────────────────────────────────
export async function runHealthcareScorer({
  anthropic,
  block_id,
  blockName,
  role_profile,
  role_title,
  // account_type is accepted for orchestrator parity but ignored: the
  // healthcare framing reads from role_profile.function and
  // role_profile.sector_context, plus employment_type.
  account_type, // eslint-disable-line no-unused-vars
  employment_type,
  scenario_context,
  block_content,
  candidate_inputs,
  criteria,
}) {
  if (!anthropic) return null
  const prompt = buildHealthcareScorerPrompt({
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
    console.error(`[healthcare-block-scoring] ${block_id} stream failed:`, err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = extractJson(text)
  return normaliseBlockScore(block_id, raw)
}

export const HEALTHCARE_SCORING_MODEL_ID = SCORING_MODEL
