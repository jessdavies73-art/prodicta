// Crisis simulation block scorer.
//
// Reads the candidate's stage_responses (per-stage candidate_response and
// time_per_stage), final_reflection, full_transcript, and decision_pattern
// against the original crisis (initial_alert, caller_or_sender, three
// stage objects with new_information and prompt).

import { runScorer } from './_shared.js'

const BLOCK_ID = 'crisis-simulation'
const BLOCK_NAME = 'Crisis simulation'

const CRITERIA = `Score the candidate against these five criteria. The crisis is a high-pressure dynamic block; cite specific stage responses by stage number when forming evidence.

1. STAGE 1 RESPONSE. Did they show composure, decision speed, and the right first move? In the opening 60 seconds of a crisis the strong responses name who they call or escalate to first, give a holding line for the immediate ask, and avoid premature commitments. Panic, freeze, or scripted-sounding boilerplate is a watch-out.

2. STAGE 2 ADAPTATION. New information arrives in stage 2 (a constraint shifts, a senior figure steps in, a deadline closes). Did the candidate adapt, or did they push the same plan as stage 1 regardless? Strong responses explicitly reference what just changed and update the plan accordingly. Weak responses ignore the new information.

3. STAGE 3 COMPOSURE UNDER COMPOUND PRESSURE. By stage 3 the pressure is at its peak (chair on the line, journalist asking, board waiting). Did the candidate stay structured and decisive, or did the response disintegrate into hedging, blame, or capitulation? Look for a final response that states facts, mitigation, and accountability cleanly.

4. FINAL REFLECTION. final_reflection should name a specific moment they would handle differently, with a reason. Strong reflections show self-awareness about a real choice ("I committed to a refund before checking with finance"). Generic reflections ("I would communicate more") read as missing the lesson.

5. CADENCE. time_per_stage is captured per stage. Very fast responses (under 30 seconds, especially on stages 2 and 3) read as panic or surface processing. Very slow responses (over 180 seconds per stage) read as paralysis. The sweet spot for a crisis stage is 60 to 120 seconds. Use cadence as a contextual signal alongside content quality, not as the dominant factor.`

export async function scoreCrisisSimulation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CRISIS_SIMULATION_BLOCK_ID = BLOCK_ID
