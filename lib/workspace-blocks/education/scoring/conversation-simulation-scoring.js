// Conversation simulation block scorer (education shell).
//
// Reads the candidate's three turn_responses (each with response_text
// and word count), regulation_strategy, deescalation_tactics multi-
// select, deescalation_notes, escalation_considerations multi-select
// and escalation_notes captured by conversation-simulation.jsx. The
// block_content.turns array carries the counterpart's lines and a
// what_this_turn_tests scoring reference per turn (not shown to the
// candidate). block_content.regulation_anchors is the ground-truth
// reference for emotional regulation indicators.
//
// Education-shell variant. Distinct from the office-shell
// conversation-simulation scorer; dispatch keys by shell_family.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'conversation-simulation'
const BLOCK_NAME = 'Conversation simulation'

const CRITERIA = `Score the candidate against these five criteria. block_content.turns is the three-turn arc; each turn carries a what_this_turn_tests reference (acknowledgement before reassurance, holding a boundary without breaking rapport, naming the safeguarding line without disclosing detail). block_content.regulation_anchors is the scoring reference for emotional regulation. Synthesise three sub-reads (one per turn) into one overall BlockScore.

1. TURN-1 ACKNOWLEDGEMENT QUALITY. The candidate's response to turn 1 should acknowledge the counterpart's emotion or position before pivoting to facts or reassurance. Strong: a one-sentence acknowledgement that names what was said back, then the substantive answer. Below standard: launching straight into explanation, defending, or reassurance without acknowledgement. Patterns suggest the strongest responses open with the counterpart's name and a specific phrase from their opener.

2. TURN-2 BOUNDARY HOLDING. Turn 2 typically pushes back on the candidate's likely reassurance or names a specific incident as evidence. The response should hold the boundary professionally: acknowledge again, restate the position with specifics, name a concrete next step (a named person and a timing). Below standard: capitulating to pressure, escalating affect to match the counterpart, or repeating the turn-1 line verbatim. Patterns suggest the strongest responses match the counterpart's pace without absorbing their tone.

3. TURN-3 SAFEGUARDING / ESCALATION LINE HANDLING. Turn 3 typically forces a definitive call (escalation threat, demand for a named outcome, threat to involve external authority). The response should hold the safeguarding line where one is in play, decline to commit to outcomes outside the candidate's authority, and name the right next escalation route inside the school. Indicators of "Skipped DSL involvement on disclosure" or "Parent confrontation escalated" patterns: agreeing to a specific safeguarding outcome to defuse the moment; promising what the headteacher will do without authority; or escalating tone in the candidate's own response.

4. EMOTIONAL REGULATION STRATEGY. The regulation_strategy text should name the candidate's actual moves: pace, breathing, where they felt the pull, how they held. Strong responses show meta-awareness without theatrical detail. Below standard: empty assertions of professionalism, no named technique, no acknowledgement of the difficulty. Patterns suggest the strongest regulation strategies cite a specific moment in the arc.

5. DE-ESCALATION TACTIC SELECTION AND ESCALATION CONSIDERATIONS. The deescalation_tactics multi-select should reflect what the responses actually did (acknowledge_emotion, name_back, pace_slowed, concrete_next_step, boundary_held, safeguarding_line_named, paused_to_listen). Inconsistency between the tactics ticked and the responses written is a calibration signal. The escalation_considerations should pick the post-conversation follow-ups genuinely indicated (safeguarding concern, formal complaint likely, governor / LA route, pupil at risk, staff conduct question); picking "no_escalation_needed" when a safeguarding line surfaced is a "Skipped DSL involvement on disclosure" pattern.

Calibration: scoring narrative should treat the three turns as a whole, surfacing the strongest and the weakest moment. Use education compliance language; never make definitive claims about future behaviour.`

export async function scoreEducationConversationSimulation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
  return runEducationScorer({
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

export const EDUCATION_CONVERSATION_SIMULATION_BLOCK_ID = BLOCK_ID
