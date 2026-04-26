// Task prioritisation block scorer.
//
// Reads the candidate's task_order (the priority sequence they ranked),
// task_actions (per-task action: do, delegate, defer), task_reasoning
// (free-text justification) against the original task list and the
// candidate's role profile.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'task-prioritisation'
const BLOCK_NAME = 'Task prioritisation'

const CRITERIA = `Score the candidate against these four criteria.

1. ORDER MATCHES URGENCY + IMPORTANCE. Compare the candidate's task_order against the task list in block_content. The first three positions should be the tasks with the tightest deadline AND the most senior or external asker. A task with deadline today from the CMO ranks above a no-deadline task from a peer. Internal-only deferrable work belongs near the bottom.

2. DELEGATE DECISIONS SENSIBLE. Look at task_actions. Did they keep everything for themselves, or did they delegate the items a real practitioner in this role would actually delegate? Junior-source tasks and operational handoffs are typical delegate candidates. Strategic or senior-asker tasks should not be delegated. Over-delegating senior-asker work is a flag; never delegating anything is also a flag (suggests a lack of authority or trust in the team).

3. DECLINE/DEFER JUDGEMENT. Did they recognise what could realistically wait or be declined? "no_deadline" tasks and tasks from peers that can wait until next week should be deferred or declined. Treating every task as today's work is a workload blindness signal.

4. REASONING QUALITY. Where the candidate provided notes (task_reasoning), does the reasoning show explicit trade-offs, or is it generic ("important", "urgent") without articulating why? Strong reasoning names the constraint, the asker, and the consequence of doing it later.`

export async function scoreTaskPrioritisation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
  return runScorer({
    anthropic,
    block_id: BLOCK_ID,
    blockName: BLOCK_NAME,
    role_profile,
    role_title,
    account_type,
    employment_type,
    scenario_context,
    block_content,
    candidate_inputs,
    criteria: CRITERIA,
  })
}

export const TASK_PRIORITISATION_BLOCK_ID = BLOCK_ID
