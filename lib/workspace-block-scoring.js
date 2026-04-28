// Modular Workspace scoring orchestrator.
//
// When a candidate completes the modular Office shell Workspace, the
// captured workspace_data has the shape:
//   {
//     schema: 'modular_v1',
//     scenario_id, shell_family,
//     block_data: { [block_id]: <onComplete payload from that block> },
//     started_at, completed_at, time_remaining_seconds
//   }
//
// This module:
//   1. Detects whether modular scoring should be used.
//   2. Fans out per-block scorers in parallel via Promise.all.
//   3. Aggregates the per-block results into the four top-level fields
//      already on the results table (workspace_score / workspace_narrative
//      / workspace_signals / workspace_watch_out) plus the new
//      workspace_block_scores array.
//   4. Returns the same overall shape lib/score-candidate.js expects from
//      Call 2f, so the integration is a clean drop-in branch.
//
// Total wall-clock time on a 5-block scenario is dominated by the slowest
// block scorer plus one short synthesis call; both are Haiku, both are
// 800 tokens or fewer. Real-world that is roughly 6 to 10 seconds, well
// inside the 30-second budget for a full scoring run.

import {
  PD_WORKSPACE_RUBRIC_VERSION,
  PD_WORKSPACE_BLOCK_LIBRARY_VERSION,
  PD_HEALTHCARE_BLOCK_LIBRARY_VERSION,
  PD_EDUCATION_BLOCK_LIBRARY_VERSION,
} from './constants.js'
import { streamFinal, extractJson } from './workspace-blocks/office/scoring/_shared.js'

// Office shell scorers (Phase 1, live).
import { scoreInbox } from './workspace-blocks/office/scoring/inbox-scoring.js'
import { scoreTaskPrioritisation } from './workspace-blocks/office/scoring/task-prioritisation-scoring.js'
import { scoreCalendarPlanning } from './workspace-blocks/office/scoring/calendar-planning-scoring.js'
import { scoreDecisionQueue } from './workspace-blocks/office/scoring/decision-queue-scoring.js'
import { scoreConversationSimulation } from './workspace-blocks/office/scoring/conversation-simulation-scoring.js'
import { scoreStakeholderConflict } from './workspace-blocks/office/scoring/stakeholder-conflict-scoring.js'
import { scoreReadingSummarising } from './workspace-blocks/office/scoring/reading-summarising-scoring.js'
import { scoreDocumentWriting } from './workspace-blocks/office/scoring/document-writing-scoring.js'
import { scoreSpreadsheetData } from './workspace-blocks/office/scoring/spreadsheet-data-scoring.js'
import { scoreCrisisSimulation } from './workspace-blocks/office/scoring/crisis-simulation-scoring.js'

// Healthcare/Care shell scorers (Phase 2.5).
import { scorePatientHandover } from './workspace-blocks/healthcare/scoring/patient-handover-scoring.js'
import { scoreBuzzerAlertQueue } from './workspace-blocks/healthcare/scoring/buzzer-alert-queue-scoring.js'
import { scoreMedicationRound } from './workspace-blocks/healthcare/scoring/medication-round-scoring.js'
import { scoreClinicalDecisionQueue } from './workspace-blocks/healthcare/scoring/clinical-decision-queue-scoring.js'
import { scoreDoctorInstructionHandling } from './workspace-blocks/healthcare/scoring/doctor-instruction-handling-scoring.js'
import { scoreFamilyVisitorInteraction } from './workspace-blocks/healthcare/scoring/family-visitor-interaction-scoring.js'
import { scoreCarePlanReview } from './workspace-blocks/healthcare/scoring/care-plan-review-scoring.js'
import { scoreSafeguardingIncident } from './workspace-blocks/healthcare/scoring/safeguarding-incident-scoring.js'
import { scoreClinicalCrisisSimulation } from './workspace-blocks/healthcare/scoring/clinical-crisis-simulation-scoring.js'
import { scorePatientFamilyConversation } from './workspace-blocks/healthcare/scoring/patient-family-conversation-scoring.js'

// Education shell scorers (Phase 2.6).
import { scoreClassRoster } from './workspace-blocks/education/scoring/class-roster-scoring.js'
import { scoreLessonPlan } from './workspace-blocks/education/scoring/lesson-plan-scoring.js'
import { scoreParentCommunication } from './workspace-blocks/education/scoring/parent-communication-scoring.js'
import { scoreBehaviourIncident } from './workspace-blocks/education/scoring/behaviour-incident-scoring.js'
import { scoreSafeguardingReferral } from './workspace-blocks/education/scoring/safeguarding-referral-scoring.js'
import { scoreHeadTeacherMessage } from './workspace-blocks/education/scoring/head-teacher-message-scoring.js'
import { scoreCohortCoordination } from './workspace-blocks/education/scoring/cohort-coordination-scoring.js'
import { scoreEducationConversationSimulation } from './workspace-blocks/education/scoring/conversation-simulation-scoring.js'
import { scoreEducationCrisisSimulation } from './workspace-blocks/education/scoring/crisis-simulation-scoring.js'

const SYNTHESIS_MODEL = 'claude-haiku-4-5-20251001'

// ─────────────────────────────────────────────────────────────────────────
// Block-id to scorer dispatch table. Two levels: shell -> block_id ->
// scorer. Shell-level keying lets office and education share the same
// block_ids ('conversation-simulation', 'crisis-simulation') with
// distinct scoring logic per shell. Healthcare scorers stay distinct
// by block_id naming convention (clinical-crisis-simulation,
// patient-family-conversation).
//
// Adding a new block scorer is one line here plus one import above.
// ─────────────────────────────────────────────────────────────────────────
const SCORERS = {
  office: {
    'inbox':                       scoreInbox,
    'task-prioritisation':         scoreTaskPrioritisation,
    'calendar-planning':           scoreCalendarPlanning,
    'decision-queue':              scoreDecisionQueue,
    'conversation-simulation':     scoreConversationSimulation,
    'stakeholder-conflict':        scoreStakeholderConflict,
    'reading-summarising':         scoreReadingSummarising,
    'document-writing':            scoreDocumentWriting,
    'spreadsheet-data':            scoreSpreadsheetData,
    'crisis-simulation':           scoreCrisisSimulation,
  },
  healthcare: {
    'patient-handover':            scorePatientHandover,
    'buzzer-alert-queue':          scoreBuzzerAlertQueue,
    'medication-round':            scoreMedicationRound,
    'clinical-decision-queue':     scoreClinicalDecisionQueue,
    'doctor-instruction-handling': scoreDoctorInstructionHandling,
    'family-visitor-interaction':  scoreFamilyVisitorInteraction,
    'care-plan-review':            scoreCarePlanReview,
    'safeguarding-incident':       scoreSafeguardingIncident,
    'clinical-crisis-simulation':  scoreClinicalCrisisSimulation,
    'patient-family-conversation': scorePatientFamilyConversation,
  },
  education: {
    'class-roster':                scoreClassRoster,
    'lesson-plan':                 scoreLessonPlan,
    'parent-communication':        scoreParentCommunication,
    'behaviour-incident':          scoreBehaviourIncident,
    'safeguarding-referral':       scoreSafeguardingReferral,
    'head-teacher-message':        scoreHeadTeacherMessage,
    'cohort-coordination':         scoreCohortCoordination,
    'conversation-simulation':     scoreEducationConversationSimulation,
    'crisis-simulation':           scoreEducationCrisisSimulation,
  },
}

// Resolve a scorer by shell_family + block_id. When shell is provided
// and the (shell, block_id) entry exists, use it. Otherwise fall back
// to a flat search across shells (preserves behaviour for legacy
// assessments that pre-date the shell_family column on results).
//
// Order matters in the fallback: office is the longest-running shell
// and the most likely owner of an unlabelled block, healthcare next,
// education last. Education-only block_ids (class-roster, etc.) will
// only match in the education branch, so the order does not affect
// correctness — only the resolution path for shared block_ids when
// shell is missing.
export function resolveScorer(shell, block_id) {
  if (shell && SCORERS[shell] && SCORERS[shell][block_id]) {
    return SCORERS[shell][block_id]
  }
  for (const sh of ['office', 'healthcare', 'education']) {
    if (SCORERS[sh][block_id]) return SCORERS[sh][block_id]
  }
  return null
}

// Set of block_ids that uniquely belong to the healthcare shell. Used
// by the audit-trail logic to infer shell when assessment.shell_family
// is missing on a legacy row.
const HEALTHCARE_BLOCK_IDS = new Set(Object.keys(SCORERS.healthcare))

// Set of block_ids that uniquely belong to the education shell. Note
// that 'conversation-simulation' and 'crisis-simulation' are SHARED
// with the office shell — those are excluded from the unique set so a
// presence in blockScores of those block_ids does not trigger an
// education classification when the shell is genuinely office.
const EDUCATION_UNIQUE_BLOCK_IDS = new Set([
  'class-roster',
  'lesson-plan',
  'parent-communication',
  'behaviour-incident',
  'safeguarding-referral',
  'head-teacher-message',
  'cohort-coordination',
])

// Pick the right block library version constant for the audit trail.
// Branches on assessment.shell_family first; falls back to inspecting
// the scored block_ids when shell_family is missing (old assessments).
function blockLibraryVersionFor(assessment, blockScores) {
  const shell = assessment?.shell_family
  if (shell === 'healthcare') return PD_HEALTHCARE_BLOCK_LIBRARY_VERSION
  if (shell === 'education')  return PD_EDUCATION_BLOCK_LIBRARY_VERSION
  if (shell === 'office')     return PD_WORKSPACE_BLOCK_LIBRARY_VERSION
  // Defensive fallback: infer from the block_ids that were actually
  // scored. Education-unique block_ids beat healthcare which beats
  // office so a misclassified legacy assessment still gets the right
  // version stamp.
  if (Array.isArray(blockScores)) {
    if (blockScores.some(b => EDUCATION_UNIQUE_BLOCK_IDS.has(b.block_id))) {
      return PD_EDUCATION_BLOCK_LIBRARY_VERSION
    }
    if (blockScores.some(b => HEALTHCARE_BLOCK_IDS.has(b.block_id))) {
      return PD_HEALTHCARE_BLOCK_LIBRARY_VERSION
    }
  }
  return PD_WORKSPACE_BLOCK_LIBRARY_VERSION
}

// ─────────────────────────────────────────────────────────────────────────
// Predicate: should this assessment use modular Workspace scoring?
// True when either the assessment row has the use_modular_workspace flag
// AND a scenario, OR the captured workspace_data carries the modular_v1
// schema marker. We accept both so legacy assessments that were toggled
// modular mid-flight still score correctly.
// ─────────────────────────────────────────────────────────────────────────
export function shouldUseModularWorkspaceScoring(assessment, workspace_data) {
  if (workspace_data && workspace_data.schema === 'modular_v1') return true
  if (assessment?.use_modular_workspace === true && assessment?.workspace_scenario) {
    return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────
// Main entry. Fan out to per-block scorers, await all in parallel, then
// aggregate. Returns:
//   {
//     workspace_score,     // integer 0-100 or null
//     workspace_narrative, // string or null
//     workspace_signals,   // array of strings (3-5 items) or null
//     workspace_watch_out, // string or null
//     workspace_block_scores, // array of BlockScore objects
//     workspace_data,      // pass-through of the input
//   }
// ─────────────────────────────────────────────────────────────────────────
export async function scoreModularWorkspace({
  anthropic,
  assessment,
  workspace_data,
  account_type,
  employment_type,
}) {
  if (!anthropic || !workspace_data) return emptyResult(workspace_data)

  const block_data = workspace_data.block_data || {}
  const scenario = assessment?.workspace_scenario || {}
  const block_content_map = scenario.block_content || {}
  const role_profile = assessment?.role_profile || null
  const role_title = assessment?.role_title || null
  const scenario_context = {
    title: scenario.title,
    spine: scenario.spine,
    trigger: scenario.trigger,
    scenario_arc: scenario.scenario_arc,
  }

  // Selected blocks in execution order. Use selected_blocks if present
  // (so the report renders blocks in the order the candidate did them);
  // fall back to the keys of block_data otherwise.
  const ordered = Array.isArray(scenario.selected_blocks) && scenario.selected_blocks.length
    ? scenario.selected_blocks.map(b => b.block_id)
    : Object.keys(block_data)

  // Resolve every (shell, block_id) pair to a scorer once. Filter to
  // blocks that (a) have captured candidate output and (b) resolve to a
  // registered scorer. Anything else is silently skipped.
  const shell = assessment?.shell_family || null
  const toScore = ordered
    .filter(bid => block_data[bid])
    .map(bid => ({ block_id: bid, scorer: resolveScorer(shell, bid) }))
    .filter(x => x.scorer)

  if (toScore.length === 0) return emptyResult(workspace_data)

  // ─── Parallel per-block scoring ────────────────────────────────────────
  const blockResults = await Promise.all(toScore.map(async ({ block_id, scorer }) => {
    try {
      const result = await scorer({
        anthropic,
        role_profile,
        role_title,
        account_type,
        employment_type,
        scenario_context,
        block_content: block_content_map[block_id] || {},
        candidate_inputs: block_data[block_id] || {},
      })
      return result
    } catch (err) {
      console.error(`[workspace-block-scoring] ${block_id} threw:`, err?.message)
      return null
    }
  }))

  // Drop nulls; preserve order. If everything failed, fall back to empty.
  const blockScores = blockResults.filter(Boolean)
  if (blockScores.length === 0) return emptyResult(workspace_data)

  // ─── Aggregation ───────────────────────────────────────────────────────
  // workspace_score: equal-weighted average of block scores. Phase 1
  // weighting; can be refined to weight dynamic blocks (crisis,
  // stakeholder-conflict) higher for management roles in a later pass.
  const scored = blockScores.filter(b => Number.isFinite(b.score))
  const workspace_score = scored.length
    ? Math.round(scored.reduce((s, b) => s + b.score, 0) / scored.length)
    : null

  // workspace_signals: top 3-5 signals across all blocks, ordered by
  // weight (high > medium > low) then by source-block score (lower-scoring
  // blocks surface first, so concerns lead).
  const WEIGHT_RANK = { high: 3, medium: 2, low: 1 }
  const allSignals = []
  for (const b of blockScores) {
    for (const s of (b.signals || [])) {
      allSignals.push({ ...s, block_id: b.block_id, block_score: b.score ?? 50 })
    }
  }
  allSignals.sort((a, c) => {
    const w = (WEIGHT_RANK[c.weight] || 0) - (WEIGHT_RANK[a.weight] || 0)
    if (w !== 0) return w
    return (a.block_score - c.block_score)
  })
  const topSignals = allSignals.slice(0, 5).map(s => signalToPill(s))

  // workspace_watch_out: the most critical watch-out across all blocks.
  // We take the watch-out attached to the lowest-scoring block that has
  // any watch-out at all. Falls back to null when nothing was flagged.
  const blocksByScore = [...blockScores].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
  let workspace_watch_out = null
  for (const b of blocksByScore) {
    if (b.watch_outs && b.watch_outs.length) {
      workspace_watch_out = b.watch_outs[0]
      break
    }
  }

  // workspace_narrative: short Haiku synthesis call. We pass the per-block
  // narratives, the score, and the role context. If the synthesis call
  // fails, fall back to a deterministic stitch of the per-block narratives
  // so the report still has copy.
  const workspace_narrative = await synthesiseNarrative({
    anthropic,
    assessment,
    role_title,
    role_profile,
    account_type,
    employment_type,
    workspace_score,
    blockScores,
    shell,
  }) || stitchFallbackNarrative(blockScores, shell)

  return {
    workspace_score,
    workspace_narrative,
    workspace_signals: topSignals.length ? topSignals : null,
    workspace_watch_out,
    workspace_block_scores: blockScores,
    workspace_data,
    // Audit-trail provenance. Stamped on every successful modular run
    // and persisted to results.workspace_rubric_version /
    // workspace_block_library_version so the Manager Brief and Evidence
    // Pack PDFs can defensibly show which scoring rubric and which block
    // library produced this report.
    workspace_rubric_version: PD_WORKSPACE_RUBRIC_VERSION,
    workspace_block_library_version: blockLibraryVersionFor(assessment, blockScores),
  }
}

function emptyResult(workspace_data) {
  return {
    workspace_score: null,
    workspace_narrative: null,
    workspace_signals: null,
    workspace_watch_out: null,
    workspace_block_scores: null,
    workspace_data: workspace_data || null,
    // No version stamps when no modular blocks scored. Legacy assessments
    // leave these columns null in the database, which the audit trail
    // panel reads as "this assessment did not use the modular Workspace".
    workspace_rubric_version: null,
    workspace_block_library_version: null,
  }
}

// Compact pill string for the existing workspace_signals array. The report
// renders these as small jade or red pills; the wording must be short
// enough to fit. Format: "<type>: <evidence (truncated)>".
function signalToPill(s) {
  const type = (s.type || 'signal').replace(/_/g, ' ')
  const evidence = (s.evidence || '').slice(0, 80)
  return evidence ? `${type}: ${evidence}` : type
}

// Deterministic fallback narrative if the synthesis Haiku call fails.
// Picks the strongest block and the weakest block and stitches a sentence
// for each, plus a bridging clause referencing the average.
function stitchFallbackNarrative(blockScores, shell) {
  if (!blockScores.length) return null
  const scored = blockScores.filter(b => Number.isFinite(b.score))
  if (!scored.length) return blockScores[0]?.narrative || null
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (best.block_id === worst.block_id) {
    return best.narrative
  }
  return `Strongest on ${labelFor(best.block_id, shell)} (${best.score}). ${best.narrative} Weakest on ${labelFor(worst.block_id, shell)} (${worst.score}). ${worst.narrative}`
}

function labelFor(block_id, shell) {
  // Education-shell overrides for block_ids shared with office.
  if (shell === 'education') {
    if (block_id === 'conversation-simulation') return 'difficult conversation handling'
    if (block_id === 'crisis-simulation')       return 'crisis response under pressure'
  }
  const map = {
    // Office shell
    'inbox': 'inbox handling',
    'task-prioritisation': 'task prioritisation',
    'calendar-planning': 'calendar planning',
    'decision-queue': 'decision making',
    'conversation-simulation': 'conversation handling',
    'stakeholder-conflict': 'stakeholder management',
    'reading-summarising': 'reading and summarising',
    'document-writing': 'document writing',
    'spreadsheet-data': 'data analysis',
    'crisis-simulation': 'crisis handling',
    // Healthcare/Care shell
    'patient-handover': 'patient handover',
    'buzzer-alert-queue': 'buzzer and alert triage',
    'medication-round': 'medication round',
    'clinical-decision-queue': 'clinical decisions',
    'doctor-instruction-handling': 'doctor instruction handling',
    'family-visitor-interaction': 'family and visitor interaction',
    'care-plan-review': 'care plan review',
    'safeguarding-incident': 'safeguarding decision',
    'clinical-crisis-simulation': 'clinical crisis handling',
    'patient-family-conversation': 'patient and family conversation',
    // Education shell
    'class-roster': 'class roster reading',
    'lesson-plan': 'lesson planning',
    'parent-communication': 'parent / carer communication',
    'behaviour-incident': 'behaviour incident response',
    'safeguarding-referral': 'safeguarding referral judgement',
    'head-teacher-message': 'headteacher message handling',
    'cohort-coordination': 'cohort coordination',
  }
  return map[block_id] || block_id
}

// ─────────────────────────────────────────────────────────────────────────
// Synthesis call. Combines per-block narratives into a single 3-4 sentence
// paragraph that reads at the same level as the current workspace_narrative
// on the report page. Compact prompt so it stays fast.
//
// Shell-aware framing. For healthcare assessments the cross-block lens
// is "clinical judgement / escalation pattern / professional standard"
// (NHS), "care plan understanding / family interaction / regulatory
// awareness" (care home), or "casework defensibility / threshold
// judgement / court readiness" (social work). For office assessments
// the original buyer-focused framing is preserved.
// ─────────────────────────────────────────────────────────────────────────
function shellSynthesisFraming({ assessment, role_profile, account_type }) {
  const shell = assessment?.shell_family
  const fn = (role_profile?.function || '').toLowerCase()
  const sectorLower = (role_profile?.sector_context || '').toLowerCase()

  if (shell === 'healthcare') {
    if (fn === 'social_work') {
      return {
        reader: 'reviewer or hiring lead in a local authority or social work team',
        lens: 'casework defensibility, threshold judgement and court readiness',
        compliance_extras: 'Never make definitive clinical or capacity claims; never name a specific clinical or legal outcome the candidate "would have caused".',
      }
    }
    const isCareHome = fn === 'healthcare_care'
      || /care home|residential|domiciliary|supported living|nursing home/.test(sectorLower)
    if (isCareHome) {
      return {
        reader: 'care home manager or registered provider lead about to take on this candidate',
        lens: 'care plan understanding, family interaction and regulatory awareness',
        compliance_extras: 'Never make definitive clinical claims; refer to indicators of safeguarding awareness and regulatory readiness rather than competence statements.',
      }
    }
    return {
      reader: 'NHS or private healthcare clinical lead about to take on this candidate',
      lens: 'clinical judgement, escalation pattern and professional standard',
      compliance_extras: 'Never make definitive clinical claims; never write "would have caused harm", "incompetent practice", "should have known". Stay in observation language.',
    }
  }

  if (shell === 'education') {
    if (/sen specialist|special school|alternative provision|pru|pupil referral/.test(sectorLower)) {
      return {
        reader: 'SEN or alternative-provision lead about to take on this candidate',
        lens: 'pupil vulnerability, EHCP defensibility and safeguarding standards in a SEND-rich setting',
        compliance_extras: 'Never make definitive claims about teaching competence, pupil outcomes or safeguarding determinations. Anonymise pupil references in the narrative.',
      }
    }
    if (/mat |multi-academy trust|academy trust|trust-wide|mat-wide|executive head|trust ceo/.test(sectorLower)) {
      return {
        reader: 'MAT executive lead or chair of trustees about to take on this candidate',
        lens: 'trust-wide standards, governance accountability and regulator readiness',
        compliance_extras: 'Never make definitive claims about leadership competence or governance outcomes. Anonymise pupil references.',
      }
    }
    if (/independent|private school|fee-paying|isi|hmc|gsa/.test(sectorLower)) {
      return {
        reader: 'independent school head or bursar about to take on this candidate',
        lens: 'fee-payer expectations, ISI standards and the school\'s position in the local market',
        compliance_extras: 'Never make definitive claims about teaching competence or pupil outcomes. Anonymise pupil references.',
      }
    }
    if (/sixth form|further education| fe |fe college|college |post-16|post 16|16-19|16 to 19/.test(sectorLower) || fn === 'education_fe') {
      return {
        reader: 'FE / sixth form principal or programme lead about to take on this candidate',
        lens: 'learner outcomes, awarding body compliance and Ofsted readiness in a 16-to-19 setting',
        compliance_extras: 'Never make definitive claims about teaching competence or learner outcomes. Anonymise learner references.',
      }
    }
    return {
      reader: 'state school headteacher or senior leader about to take on this candidate',
      lens: 'pupil progress, classroom standards, safeguarding accountability and Ofsted readiness',
      compliance_extras: 'Never make definitive claims about teaching competence, pupil outcomes or safeguarding determinations; the threshold call sits with the DSL. Anonymise pupil references in the narrative.',
    }
  }

  // Office shell (Phase 1, default).
  const isAgency = account_type === 'agency'
  return {
    reader: isAgency
      ? 'recruitment agency consultant about to place this candidate'
      : 'hiring manager about to make a decision',
    lens: isAgency
      ? 'placement risk inside the rebate window'
      : 'probation defence and protected-period risk',
    compliance_extras: '',
  }
}

async function synthesiseNarrative({ anthropic, assessment, role_title, role_profile, account_type, employment_type, workspace_score, blockScores, shell }) {
  if (!anthropic || !blockScores.length) return null

  const perBlock = blockScores.map(b => ({
    block: labelFor(b.block_id, shell),
    score: b.score,
    strengths: b.strengths || [],
    watch_outs: b.watch_outs || [],
    narrative: b.narrative || '',
  }))

  const emp = employment_type || 'permanent'
  const framing = shellSynthesisFraming({ assessment, role_profile, account_type })

  const prompt = `You are writing a 3-4 sentence Workspace narrative for a candidate report. The report is being read by a ${framing.reader} for a ${role_title || 'role'} (${emp}). Read across the per-block scores through the lens of ${framing.lens}.

Per-block scoring summary:
${JSON.stringify(perBlock)}

Aggregate workspace score: ${workspace_score ?? 'unscored'}.

Synthesise the cross-block performance: lead with the dominant pattern, name one strong area and one watch-out by block, close with the implication for fitness in this role. Be evidence-based: cite the block names and reference concrete observations from the per-block narratives. Do not list bullet points. Single paragraph, UK English, no emoji, no em dashes.

Compliance: never write "will fail", "cannot", "do not hire", or any definitive claim about future behaviour. Use "evidence suggests", "indicators show", "patterns suggest". This is a risk indicator, not a definitive prediction.${framing.compliance_extras ? ' ' + framing.compliance_extras : ''}

Return only the paragraph text, no JSON, no preamble.`

  let final
  try {
    final = await streamFinal(anthropic, {
      model: SYNTHESIS_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[workspace-block-scoring] synthesis failed:', err?.message)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const cleaned = text.replace(/[—–]/g, ', ').trim()
  return cleaned || null
}

// ─────────────────────────────────────────────────────────────────────────
// Helper for the integration in score-candidate.js. Returns a synthetic
// "Message" shape so the existing Promise.all in Call 2f can treat the
// modular branch identically to the legacy single-call branch. The text
// payload is JSON containing the four top-level fields, plus the
// workspace_block_scores array under a private key the parser pulls out.
// ─────────────────────────────────────────────────────────────────────────
export function modularResultToMessage(result) {
  const payload = {
    workspace_score: result?.workspace_score ?? null,
    workspace_narrative: result?.workspace_narrative ?? null,
    workspace_signals: result?.workspace_signals ?? null,
    workspace_watch_out: result?.workspace_watch_out ?? null,
    workspace_block_scores: result?.workspace_block_scores ?? null,
    workspace_rubric_version: result?.workspace_rubric_version ?? null,
    workspace_block_library_version: result?.workspace_block_library_version ?? null,
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    __modular: true,
  }
}

// Re-export for tests / callers that want to use the shared helpers.
export { extractJson }
