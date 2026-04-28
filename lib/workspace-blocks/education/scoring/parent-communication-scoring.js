// Parent / carer communication block scorer.
//
// Reads the candidate's draft_response, response_word_count,
// safeguarding_flags, safeguarding_notes, copy_in (multi-select) and
// follow_up_actions captured by parent-communication.jsx. The
// block_content.parent_message holds the parent's message; the
// scoring-only block_content.safeguarding_signals and expected_copy_in
// arrays are the ground truth for whether the candidate spotted the
// safeguarding-adjacent indicators in the parent message and looped in
// the right colleagues.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'parent-communication'
const BLOCK_NAME = 'Parent / carer communication'

const CRITERIA = `Score the candidate against these five criteria. The block_content.safeguarding_signals array names any safeguarding-adjacent indicators present in the parent message; block_content.expected_copy_in names the colleagues a strong response should loop in. These are the ground-truth references; the candidate has not seen them.

1. TONE CALIBRATION TO THE MESSAGE. The draft_response should match the parent's tone (anxious, angry, disappointed, urgent, formal_complaint) appropriately. Strong responses acknowledge before reassuring, hold professional voice, and never mirror the parent's escalation. Patterns suggest the strongest responses open with acknowledgement before pivoting to facts.

2. CONTENT COMPLETENESS. The response should address every concrete point in the parent's message. A response that ducks the substantive question ("we will look into it" without naming what or by when) is below standard. A response that names the action, the named person, the timing, and the next contact is strong.

3. SAFEGUARDING FLAG RECOGNITION. CRITICAL. If block_content.safeguarding_signals is non-empty, the candidate should have ticked at least one safeguarding_flags option that matches and named the specific phrase or pattern in safeguarding_notes. Picking "no_safeguarding_flag" when the signals array names a clear indicator is a "Missed safeguarding referral to DSL" pattern. If safeguarding_signals is empty, the candidate's restraint in NOT over-flagging is correct calibration.

4. COPY-IN CORRECTNESS. The copy_in selections should overlap with block_content.expected_copy_in. Missing the SENCO when the message references EHCP / SEN; missing the DSL when a safeguarding signal is in play; missing the head when a formal-complaint tone is signalled — these are calibration misses. Patterns suggest the strongest responses pick a tight, role-correct copy-in list rather than blanket-copying everyone.

5. FOLLOW-UP ACTION SUBSTANCE. The follow_up_actions text should name specific named actions (a meeting with a named person, a CPOMS entry, a check-in with the pupil tomorrow, a referral with named timing). Vague follow-ups ("monitor and review") are below standard. Indicators of a "Parent confrontation escalated" pattern: reactive rather than proactive follow-up, no named owner, no timing.

Calibration to scope: TA-level draft is reviewed by the teacher first; Class Teacher draft goes directly; SENCO draft sits in the EHCP context; DSL/Head draft carries the safeguarding line. The response should hold the right altitude for the candidate's role profile.`

export async function scoreParentCommunication({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const PARENT_COMMUNICATION_BLOCK_ID = BLOCK_ID
