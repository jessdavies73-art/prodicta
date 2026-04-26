// Conversation simulation block scorer.
//
// Reads the candidate's transcript (full multi-turn dialogue), their
// candidate_turns count, and the optional reflection. The counterparty
// object names who they were talking to, the relationship, and the
// stance/ask the counterpart opened with.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'conversation-simulation'
const BLOCK_NAME = 'Conversation simulation'

const CRITERIA = `Score the candidate against these five criteria. Read the transcript line by line; cite specific candidate turns when forming signals.

1. TONE CALIBRATION TO COUNTERPART. Did the candidate's tone match the counterparty's role, relationship and personality? An external client gets a different register than an internal junior. A direct, time-poor counterpart needs short, structured replies; a warm counterpart needs warmth back. Mismatched tone (over-familiar with senior, brusque with external, scripted with peer) is a calibration failure.

2. ACTIVE LISTENING. Did each candidate turn respond to what the counterpart actually said in the previous turn, or did they push a pre-written agenda regardless of the counterpart's question? The clearest signal of listening is when the counterpart raises a specific concern and the candidate addresses that concern explicitly before continuing.

3. PUSH-BACK VS CONCESSION JUDGEMENT. Did they hold the line where they should have, and concede where holding the line was unproductive? Holding firm on a substantive risk (a clause that exposes the firm, a discount that breaks margin) is good; conceding on a peripheral preference to keep the relationship is good. Conceding the substantive points and holding firm on peripheral ones is the inverse of judgement.

4. PROFESSIONALISM UNDER PRESSURE. If the counterpart escalated, applied pressure, or got difficult, did the candidate stay measured? Sliding into defensiveness, sarcasm, or capitulation under pressure is a watch-out. Holding professional registers while still being honest is a strength.

5. SELF-AWARENESS IN REFLECTION. The reflection field captures what they would do differently. Strong reflections name a specific moment ("I should have asked X before agreeing to Y"), not a generic ("I could have been clearer"). Weak or absent reflection is a flag, especially for management or director-level roles.`

export async function scoreConversationSimulation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CONVERSATION_SIMULATION_BLOCK_ID = BLOCK_ID
