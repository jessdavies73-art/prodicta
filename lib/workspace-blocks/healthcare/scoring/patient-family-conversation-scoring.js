// Patient / family conversation block scorer.
//
// Reads the candidate's turn_responses, full_transcript, candidate_turns
// and final_reflection captured by patient-family-conversation.jsx, plus
// the counterpart_persona, conversation_purpose and conversation_setting
// from block_content. This is the heaviest conversational block in the
// healthcare shell: end-of-life conversations, bad news delivery,
// complaint resolution, safeguarding decision conversations.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'patient-family-conversation'
const BLOCK_NAME = 'Patient / family conversation'

const CRITERIA = `Score the candidate against these five criteria. The block_content carries the conversation_purpose (one of explain_prognosis, deliver_bad_news, discuss_treatment_options, set_expectations, respond_to_complaint, address_emotional_reaction, end_of_life_conversation, safeguarding_decision_conversation), the counterpart_persona with emotional_state and what_they_need_to_understand, and the counterpart_type ('patient' or 'family_member'). Use these as ground truth.

1. TONE-MATCHED-TO-PURPOSE. Did the candidate's tone match the gravity of the conversation_purpose? An end_of_life_conversation requires unhurried, warm, named language ("I am sorry to be the one telling you this"); a respond_to_complaint requires acknowledgement before reassurance; a safeguarding_decision_conversation requires firmness without coldness. A response that uses the same register for end-of-life as for complaint resolution is a calibration miss. Read the candidate's first one or two turns against the stated purpose.

2. WHAT-THEY-NEED-TO-UNDERSTAND LANDED. CRITICAL. The persona's what_they_need_to_understand line names the clinical or care communication goal — what the candidate is trying to land. Across the conversation, did the candidate find a way to deliver this clearly? Indirect language and euphemism that protect the candidate from the conversation but leave the counterpart still confused is a serious miss. Blunt delivery that lands the message but ignores the emotional state is also a miss. The strong play is honest language with appropriate framing and pacing.

3. LISTENING ACROSS TURNS. Strong performance shows the candidate's later turns responding to what the counterpart actually said in the previous turn. References to the counterpart's specific words, their stated emotional state, or their specific question are evidence of listening. A candidate who repeats the same message across turns regardless of pushback is delivering a monologue, which is particularly damaging in heavy clinical conversations.

4. SPECIFIC COMMITMENTS WHERE APPROPRIATE. Heavy conversations often need named commitments: who will call back, when the next conversation is, who else will be in the room. Generic reassurance ("the team will be here for you") is weaker than specific commitment ("Dr Hutchinson will call you tomorrow at 11am, and I will sit with you both for that conversation"). The exception is end_of_life_conversation where over-committing to outcomes is inappropriate; specific commitments there should be procedural ("we will let you know as soon as anything changes; you can ring this number any time") rather than outcome-based.

5. FINAL REFLECTION SELF-AWARENESS. The final_reflection answers "What did you say that landed? What would you say differently?". Strong reflections name a specific moment in the transcript, distinguish what worked from what did not, and connect the candidate's choices to the counterpart's emotional state and reaction pattern. Weak reflections are generic ("I would be more empathetic"). Strong reflections are observable and specific to the transcript.`

export async function scorePatientFamilyConversation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const PATIENT_FAMILY_CONVERSATION_BLOCK_ID = BLOCK_ID
