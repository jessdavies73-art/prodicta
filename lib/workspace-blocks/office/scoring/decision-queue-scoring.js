// Decision queue block scorer.
//
// Reads the candidate's per-decision { chosen_option, rationale,
// time_to_decide_seconds } against the decisions, options, and
// constraints in block_content.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'decision-queue'
const BLOCK_NAME = 'Decision queue'

const CRITERIA = `Score the candidate against these four criteria.

1. OPTION FIT. For each decision, did they pick a defensible option given the role, the constraint, and the deadline_pressure? There is rarely a single right answer. The score is whether the choice they made is the kind of call a good practitioner in this role would make, or whether it reveals a misread of the constraint or stakeholders. Penalise choices that ignore the named constraint.

2. RATIONALE QUALITY. Read each rationale. Strong rationales name the trade-off explicitly, name what they accept giving up, and name a stakeholder or risk. Weak rationales restate the option ("this is the best one") or use generic language ("seems fair") without engaging with the constraint.

3. CONSTRAINT AWARENESS. The decision objects in block_content state a constraint and an affects line. Did the rationale show the candidate read those? A rationale that treats a hard constraint as flexible, or that ignores who is affected, is a constraint-blindness signal.

4. SPEED PROPORTIONAL TO WEIGHT. Use time_to_decide_seconds. Heavyweight decisions (deadline_pressure: minutes, board-level affects) deserve more deliberation; lightweight decisions (deadline_pressure: this_week) should not consume disproportionate time. Very fast across the board can read as snap judgement; very slow across the board can read as paralysis.`

export async function scoreDecisionQueue({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const DECISION_QUEUE_BLOCK_ID = BLOCK_ID
