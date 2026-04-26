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

import { PD_WORKSPACE_RUBRIC_VERSION, PD_WORKSPACE_BLOCK_LIBRARY_VERSION } from './constants.js'
import { streamFinal, extractJson } from './workspace-blocks/office/scoring/_shared.js'
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

const SYNTHESIS_MODEL = 'claude-haiku-4-5-20251001'

// ─────────────────────────────────────────────────────────────────────────
// Block-id to scorer dispatch table. Adding a new block scorer in the
// future is one line here plus one import above.
// ─────────────────────────────────────────────────────────────────────────
const SCORERS = {
  'inbox':                   scoreInbox,
  'task-prioritisation':     scoreTaskPrioritisation,
  'calendar-planning':       scoreCalendarPlanning,
  'decision-queue':          scoreDecisionQueue,
  'conversation-simulation': scoreConversationSimulation,
  'stakeholder-conflict':    scoreStakeholderConflict,
  'reading-summarising':     scoreReadingSummarising,
  'document-writing':        scoreDocumentWriting,
  'spreadsheet-data':        scoreSpreadsheetData,
  'crisis-simulation':       scoreCrisisSimulation,
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

  // Filter to blocks that (a) actually have captured candidate output and
  // (b) have a registered scorer. Anything else is silently skipped.
  const toScore = ordered.filter(bid => block_data[bid] && SCORERS[bid])

  if (toScore.length === 0) return emptyResult(workspace_data)

  // ─── Parallel per-block scoring ────────────────────────────────────────
  const blockResults = await Promise.all(toScore.map(async (block_id) => {
    const scorer = SCORERS[block_id]
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
    role_title,
    role_profile,
    account_type,
    employment_type,
    workspace_score,
    blockScores,
  }) || stitchFallbackNarrative(blockScores)

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
    workspace_block_library_version: PD_WORKSPACE_BLOCK_LIBRARY_VERSION,
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
function stitchFallbackNarrative(blockScores) {
  if (!blockScores.length) return null
  const scored = blockScores.filter(b => Number.isFinite(b.score))
  if (!scored.length) return blockScores[0]?.narrative || null
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (best.block_id === worst.block_id) {
    return best.narrative
  }
  return `Strongest on ${labelFor(best.block_id)} (${best.score}). ${best.narrative} Weakest on ${labelFor(worst.block_id)} (${worst.score}). ${worst.narrative}`
}

function labelFor(block_id) {
  const map = {
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
  }
  return map[block_id] || block_id
}

// ─────────────────────────────────────────────────────────────────────────
// Synthesis call. Combines per-block narratives into a single 3-4 sentence
// paragraph that reads at the same level as the current workspace_narrative
// on the report page. Compact prompt so it stays fast.
// ─────────────────────────────────────────────────────────────────────────
async function synthesiseNarrative({ anthropic, role_title, role_profile, account_type, employment_type, workspace_score, blockScores }) {
  if (!anthropic || !blockScores.length) return null

  const perBlock = blockScores.map(b => ({
    block: labelFor(b.block_id),
    score: b.score,
    strengths: b.strengths || [],
    watch_outs: b.watch_outs || [],
    narrative: b.narrative || '',
  }))

  const acct = account_type || 'employer'
  const emp = employment_type || 'permanent'

  const prompt = `You are writing a 3-4 sentence Workspace narrative for a candidate report. The report is being read by a ${acct === 'agency' ? 'recruitment agency consultant about to place this candidate' : 'hiring manager about to make a decision'} for a ${role_title || 'role'} (${emp}).

Per-block scoring summary:
${JSON.stringify(perBlock)}

Aggregate workspace score: ${workspace_score ?? 'unscored'}.

Synthesise the cross-block performance: lead with the dominant pattern, name one strong area and one watch-out by block, close with the implication for fitness in this role. Be evidence-based: cite the block names and reference concrete observations from the per-block narratives. Do not list bullet points. Single paragraph, UK English, no emoji, no em dashes.

Compliance: never write "will fail", "cannot", "do not hire", or any definitive claim about future behaviour. Use "evidence suggests", "indicators show", "patterns suggest". This is a risk indicator, not a definitive prediction.

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
