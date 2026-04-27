// Clinical crisis simulation block scorer.
//
// Reads the candidate's stage_responses (one per stage with response
// text and time_per_stage), final_reflection, full_transcript, and
// derived decision_pattern (cadence: fast / measured / deliberate)
// captured by clinical-crisis-simulation.jsx. Scores the under-pressure
// performance against role-appropriate criteria.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'clinical-crisis-simulation'
const BLOCK_NAME = 'Clinical crisis simulation'

const CRITERIA = `Score the candidate against these five criteria. The block_content carries the initial_alert, caller_or_sender, and three stages with new_information and prompt. The candidate_inputs.stage_responses array maps one-to-one to the stages; decision_pattern names the cadence.

1. STAGE 1 COMPOSURE AND DECISION SPEED. Stage 1 is the immediate response. Strong responses pick a clear first action (who they call, what they secure, what they do not commit to yet) within the first 30-90 seconds. Read stage_responses[0].time_per_stage. Under 10 seconds suggests panic or pattern-match; over 4 minutes suggests paralysis. Strong content names the first contact specifically ("call the on-call SHO via switchboard") rather than generally ("get help").

2. STAGE 2 ADAPTATION TO NEW INFORMATION. Stage 2 introduces a new constraint or escalation. Strong responses adapt the plan rather than restate stage 1. Read stage_responses[1] against block_content.stage_2.new_information: did the candidate change tack to address the new information, or did they continue executing the original plan? Adaptation is the signal of considered judgement under pressure.

3. STAGE 3 COMPOUNDING PRESSURE WITHOUT LOSING FOCUS. Stage 3 closes with a regulator, board member, journalist, second incident, or deadline. Strong responses hold the original priority while addressing the new pressure rather than abandoning the patient or resident to manage the regulator. A candidate who reorients entirely to manage the CQC inspector while leaving the deteriorating patient unaddressed is showing pressure miscalibration.

4. CADENCE AND DECISION PATTERN. decision_pattern.cadence ("fast" / "measured" / "deliberate") gives a rough read on the candidate's tempo across the three stages. "Fast" with strong content is a confident operator; "fast" with thin content suggests panic. "Deliberate" with strong content is a thorough operator; "deliberate" with thin content suggests paralysis. "Measured" is the default healthy band. Read the cadence alongside the response content; cadence alone is informational.

5. SCOPE DISCIPLINE UNDER PRESSURE. CRITICAL. Under pressure, candidates often overreach. An HCA or care worker writing clinical instructions in their stage responses (specific drug doses, clinical interventions) is overstepping; the right move is to escalate. A Registered Nurse holding to nursing scope while escalating clinical decisions to the medical team is in scope. A Care Home Manager handling the family and the inspector while delegating clinical decisions to the GP is in scope. Look for evidence that the candidate stayed within their professional scope even when the pressure pushed them to act.

6. FINAL REFLECTION SELF-AWARENESS. The final_reflection text should name a specific moment in the three stages, a specific reframe they would try, and the cost of the pressure-driven choice. Strong reflections are observable ("I committed to a discharge time in stage 1 before I had the obs from stage 2; I would have held the time-frame open"). Weak reflections are generic ("I would stay calmer").`

export async function scoreClinicalCrisisSimulation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
  return runHealthcareScorer({
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

export const CLINICAL_CRISIS_SIMULATION_BLOCK_ID = BLOCK_ID
