// Family / visitor interaction block scorer.
//
// Reads the candidate's turn_responses, full_transcript and
// final_reflection captured by family-visitor-interaction.jsx, plus the
// counterpart_persona that drove the live Haiku conversation. Scores
// the conversational performance against role-appropriate criteria.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'family-visitor-interaction'
const BLOCK_NAME = 'Family / visitor interaction'

const CRITERIA = `Score the candidate against these five criteria. The block_content.counterpart_persona names the family member, their relationship_to_patient, primary_concern, secondary_concerns, how_they_push_back and what_makes_them_feel_heard. Use that persona as ground truth for whether the candidate's responses landed.

1. TONE-TO-EMOTIONAL-STATE CALIBRATION. Did the candidate's opening reply match the counterpart's emotional state in the opener? An angry visitor needs de-escalation language; an anxious relative needs validation; a hostile visitor needs boundaries set respectfully. A response that opens with reassurance to an angry person, or with a boundary to an anxious person, is a calibration miss. Read the first one or two candidate turns against the counterpart's stated state.

2. SPECIFIC COMMITMENTS VS GENERIC REASSURANCE. Strong responses make specific commitments: a named person, a specific date, a concrete next step ("I will ask the consultant to call you before 5pm today and I will text you when she is on her way"). Weak responses use generic reassurance ("we are doing everything we can"). The counterpart_persona's what_makes_them_feel_heard line names what would actually land for this person; check whether the candidate's commitments map onto it.

3. LISTENING VISIBLE ACROSS TURNS. Strong performance shows the candidate responding to what the counterpart actually said in the previous turn rather than delivering a scripted message. References to the counterpart's specific words ("you mentioned the call took two hours to come back", "you said no one called you until 7am") are evidence of active listening. A candidate who repeats the same reassurance across turns regardless of pushback is delivering a monologue.

4. PROFESSIONAL ROLE BOUNDARIES. The candidate must stay within scope. An HCA should not share clinical detail or make clinical commitments; the right move is to offer to fetch the nurse. A Registered Nurse should not commit to actions outside their scope (admitting, prescribing, removing a relative's complaint). A Care Home Manager can promise organisational actions but not commit to clinical outcomes. Look for the candidate either holding their scope ("I cannot speak to the medication choice, but I can ask Dr Hutchinson to call you within the hour") or overstepping.

5. FINAL REFLECTION SELF-AWARENESS. The reflection text answers "What would you do differently next time?". Strong reflections name a specific moment that did not land, a specific reframe they would try, and connect it to the counterpart's reaction pattern. Weak reflections are generic ("I would listen more"); strong reflections are observable ("I should have acknowledged the delay in calling her before offering reassurance; she was not ready to hear it until I named the failure").`

export async function scoreFamilyVisitorInteraction({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const FAMILY_VISITOR_INTERACTION_BLOCK_ID = BLOCK_ID
