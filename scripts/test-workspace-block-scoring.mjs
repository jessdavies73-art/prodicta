// Smoke-test the modular Workspace scoring orchestrator without hitting
// Anthropic. We stub the SDK with canned per-block responses, run the
// orchestrator end to end, and confirm:
//   - the dispatch table picks the right scorer per block_id
//   - per-block results are normalised to the BlockScore shape
//   - the aggregator produces a sensible workspace_score
//   - the synthesis call composes the cross-block narrative
//   - workspace_block_scores is preserved in the final result
//
// The orchestrator imports JSX-free .js modules only so this script can
// require it directly. The stub anthropic just records every request and
// hands back a Message-shaped object whose text is canned per block.

import { scoreModularWorkspace, modularResultToMessage, shouldUseModularWorkspaceScoring } from '../lib/workspace-block-scoring.js'

// ─── Stub Anthropic client. messages.stream({...}).finalMessage() ──────────
function makeStubAnthropic() {
  const calls = []
  return {
    messages: {
      stream(config) {
        calls.push(config)
        return {
          async finalMessage() {
            const userText = config.messages?.[0]?.content || ''
            const blockMatch = userText.match(/component of a workplace simulation\.\s*Read what they did and score it against the criteria below[\s\S]*?Criteria for this block:\s*([\s\S]+?)\n\nBlock content/)
            // Each scorer's prompt embeds its blockName near the start.
            const blockNameMatch = userText.match(/the (.+?) component of a workplace simulation/)
            const blockName = blockNameMatch ? blockNameMatch[1] : 'unknown'
            // Cross-block synthesis call has a different shape, easy to detect.
            if (userText.includes('synthesise the cross-block performance') || userText.includes('Synthesise the cross-block performance')) {
              return { content: [{ type: 'text', text: 'Indicators show consistent strength on the structured blocks (inbox, decision queue) with a softer pattern on the dynamic crisis simulation. Evidence suggests the candidate is well calibrated for routine pressure and adequately calibrated for compounding pressure, with the reflective layer the development edge.' }] }
            }
            // Per-block stub: pick a score by block name so the test is deterministic.
            const scoreMap = {
              'Inbox': 78, 'Task prioritisation': 72, 'Calendar planning': 70,
              'Decision queue': 81, 'Conversation simulation': 76,
              'Stakeholder conflict': 68, 'Reading and summarising': 75,
              'Document writing': 80, 'Spreadsheet and data': 74,
              'Crisis simulation': 70,
            }
            const score = scoreMap[blockName] || 70
            const resp = {
              score,
              strengths: [`Stub strength one for ${blockName}`, `Stub strength two for ${blockName}`],
              watch_outs: score < 75 ? [`Stub watch-out for ${blockName}`] : [],
              narrative: `Stub narrative for ${blockName}: indicators show baseline competence with a calibration gap in two areas.`,
              signals: [
                { type: 'judgement_quality', evidence: `Stub evidence A for ${blockName}.`, weight: 'high' },
                { type: 'tone_calibration', evidence: `Stub evidence B for ${blockName}.`, weight: 'medium' },
                { type: 'composure', evidence: `Stub evidence C for ${blockName}.`, weight: 'low' },
              ],
            }
            return { content: [{ type: 'text', text: JSON.stringify(resp) }] }
          },
        }
      },
    },
    __calls: calls,
  }
}

const anthropic = makeStubAnthropic()

// Synthetic assessment + workspace_data shaped like what the live pipeline
// would persist for a Marketing Manager who completed the modular shell.
const assessment = {
  role_title: 'Marketing Manager',
  role_profile: {
    function: 'marketing',
    seniority_band: 'manager',
    ic_or_manager: 'manager',
    interaction_internal_external: 'mixed',
    sector_context: 'B2B SaaS',
    company_size: 'mid_market',
  },
  use_modular_workspace: true,
  shell_family: 'office',
  workspace_scenario: {
    title: 'Monday morning, Q3 launch under pressure',
    spine: 'You are the Marketing Manager preparing for a Q3 launch when a typo lands on TV in two hours.',
    trigger: 'Bright Agency calls about a typo on the Channel 4 master.',
    selected_blocks: [
      { block_id: 'spreadsheet-data', order: 1, content_ref: 'spreadsheet-data' },
      { block_id: 'decision-queue', order: 2, content_ref: 'decision-queue' },
      { block_id: 'document-writing', order: 3, content_ref: 'document-writing' },
      { block_id: 'stakeholder-conflict', order: 4, content_ref: 'stakeholder-conflict' },
      { block_id: 'crisis-simulation', order: 5, content_ref: 'crisis-simulation' },
    ],
    block_content: {
      'spreadsheet-data':     { summary: 'Q3 channel performance review' },
      'decision-queue':       { summary: 'Five queued marketing calls' },
      'document-writing':     { summary: 'Board update on Q3 launch' },
      'stakeholder-conflict': { summary: 'Sales vs Brand on the campaign mix' },
      'crisis-simulation':    { summary: 'Campaign typo airing in 2 hours' },
    },
    scenario_arc: {},
  },
}

const workspace_data = {
  schema: 'modular_v1',
  scenario_id: 'test-marketing-manager',
  shell_family: 'office',
  block_data: {
    'spreadsheet-data':     { block_id: 'spreadsheet-data', highlighted_cells: [], summary_text: 'stub' },
    'decision-queue':       { block_id: 'decision-queue', decisions: [] },
    'document-writing':     { block_id: 'document-writing', document_text: 'stub', word_count: 380 },
    'stakeholder-conflict': { block_id: 'stakeholder-conflict', stakeholder_responses: [] },
    'crisis-simulation':    { block_id: 'crisis-simulation', stage_responses: [] },
  },
}

// ─── Predicate test ────────────────────────────────────────────────────────
console.log('shouldUseModularWorkspaceScoring (modular):', shouldUseModularWorkspaceScoring(assessment, workspace_data))
console.log('shouldUseModularWorkspaceScoring (legacy):', shouldUseModularWorkspaceScoring({ use_modular_workspace: false }, { schema: 'legacy_v1' }))

// ─── End-to-end orchestrator test ──────────────────────────────────────────
const result = await scoreModularWorkspace({
  anthropic,
  assessment,
  workspace_data,
  account_type: 'employer',
  employment_type: 'permanent',
})

console.log('---')
console.log('workspace_score:', result.workspace_score)
console.log('workspace_signals:', result.workspace_signals)
console.log('workspace_watch_out:', result.workspace_watch_out)
console.log('workspace_narrative:')
console.log('  ', result.workspace_narrative)
console.log('workspace_block_scores count:', result.workspace_block_scores?.length)
console.log('block ids in order:', result.workspace_block_scores?.map(b => `${b.block_id}=${b.score}`).join(', '))
console.log('total anthropic calls:', anthropic.__calls.length, '(expected 6: 5 per-block + 1 synthesis)')

// ─── Sample inbox-block output (Marketing Manager replies) ──────────────
// Run a single inbox scorer directly so the user can see one block_score.
import { scoreInbox } from '../lib/workspace-blocks/office/scoring/inbox-scoring.js'
const inboxAnthropic = makeStubAnthropic()
const inboxResult = await scoreInbox({
  anthropic: inboxAnthropic,
  role_title: 'Marketing Manager',
  role_profile: assessment.role_profile,
  account_type: 'employer',
  employment_type: 'permanent',
  scenario_context: { spine: assessment.workspace_scenario.spine },
  block_content: { summary: 'Six emails, mix of senior, peer, external, junior.' },
  candidate_inputs: { email_replies: { 'email-1': { text: 'Will look into it.' } }, replied_count: 4, total_emails: 6 },
})
console.log('---')
console.log('Sample Inbox block_score (Marketing Manager candidate):')
console.log(JSON.stringify(inboxResult, null, 2))

// ─── Sample crisis-simulation output (MD candidate) ────────────────────────
import { scoreCrisisSimulation } from '../lib/workspace-blocks/office/scoring/crisis-simulation-scoring.js'
const crisisAnthropic = makeStubAnthropic()
const crisisResult = await scoreCrisisSimulation({
  anthropic: crisisAnthropic,
  role_title: 'Managing Director',
  role_profile: { function: 'senior_leadership', seniority_band: 'c_suite', ic_or_manager: 'manager', sector_context: 'mid-market services' },
  account_type: 'employer',
  employment_type: 'permanent',
  scenario_context: { spine: 'You are the MD when the largest customer terminates.' },
  block_content: {
    summary: 'Largest customer terminated by phone',
    initial_alert: 'Patrick, it is Helen Carter at NorthCo. We are terminating the master services agreement.',
    caller_or_sender: { name: 'Helen Carter', role: 'Procurement Director, NorthCo', relationship: 'external' },
    stage_1: { new_information: 'CFO is in the doorway. NorthCo is 22 percent of FY revenue.', prompt: 'What do you say to the CFO and who do you call first?' },
    stage_2: { new_information: 'Sales lead wants to fly to Manchester. Two competitors have called.', prompt: 'CFO is asking what to tell the chair.' },
    stage_3: { new_information: 'Chair on hold. FT journalist calling comms.', prompt: 'Three lines for the chair, on the record.' },
  },
  candidate_inputs: {
    block_id: 'crisis-simulation',
    stage_responses: [
      { stage_number: 1, candidate_response: 'Hold the floor; CFO with me; call legal and the comms director; do not speak to press.', time_per_stage: 70 },
      { stage_number: 2, candidate_response: 'Brief the chair: cause-known, exposure-quantified, mitigation-running. Do not authorise outreach.', time_per_stage: 82 },
      { stage_number: 3, candidate_response: 'Three lines: facts, mitigation, accountability. Comms says no comment to FT until 15:00.', time_per_stage: 94 },
    ],
    final_reflection: 'I would have escalated to the chair sooner and avoided letting sales improvise an in-person reversal under emotion.',
  },
})
console.log('---')
console.log('Sample Crisis simulation block_score (MD candidate):')
console.log(JSON.stringify(crisisResult, null, 2))

console.log('---')
console.log('OK')
