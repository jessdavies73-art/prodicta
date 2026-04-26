// Stakeholder conflict block scorer.
//
// Reads the candidate's per-stakeholder responses, final_decision,
// public_message, and private_strategy against the central_decision and
// the stakeholder list (each with name, role, wants, why, power).

import { runScorer } from './_shared.js'

const BLOCK_ID = 'stakeholder-conflict'
const BLOCK_NAME = 'Stakeholder conflict'

const CRITERIA = `Score the candidate against these four criteria. Cite specific stakeholders by name when forming signals.

1. STAKEHOLDER ACKNOWLEDGEMENT. For each stakeholder, did the candidate's response acknowledge their stated want and why before pivoting to their own line? A response that ignores the stakeholder's stated reason and restates the candidate's preferred outcome is dismissive. Strong responses name the stakeholder's concern in the candidate's own words first.

2. DEFENSIBILITY OF THE FINAL DECISION. Is the final_decision a defensible call, or is it a compromise designed to avoid conflict? A compromise that pleases nobody and addresses no underlying constraint is weaker than a clear call that explicitly accepts who is unhappy and why that is the right trade-off for the role.

3. PUBLIC VS PRIVATE DISCRETION. Compare public_message and private_strategy. The public_message should be even-handed, defensible, and not name the stakeholders being conceded against. The private_strategy can name people, name the order of conversations, and name what they will concede privately. A candidate who collapses the two together (says everything publicly, holds nothing back privately) is a discretion failure. A candidate whose private_strategy is identical to the public_message is missing the layer entirely.

4. POWER WEIGHTING. Look at the power field on each stakeholder (low, medium, high). Did the candidate's responses, final decision, and private_strategy give appropriate weight to the high-power stakeholders' concerns, or did they treat all stakeholders equally? Equal-weighting in a real-world conflict is a political-judgement signal.`

export async function scoreStakeholderConflict({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const STAKEHOLDER_CONFLICT_BLOCK_ID = BLOCK_ID
