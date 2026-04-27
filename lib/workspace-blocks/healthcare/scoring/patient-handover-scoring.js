// Patient handover block scorer.
//
// Reads the candidate's patient_priority_order, patient_actions, optional
// patient_notes, and time_per_patient signals captured by
// lib/workspace-blocks/healthcare/patient-handover.jsx. Scores against
// the role-appropriate clinical handover criteria.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'patient-handover'
const BLOCK_NAME = 'Patient handover'

const CRITERIA = `Score the candidate against these five criteria. Each criterion contributes to the overall score; weight them roughly equally unless one is dramatically out of line with the others.

1. CLINICAL PRIORITY ORDER. Did the candidate place deteriorating patients ahead of stable ones in the priority order, and family-anxious patients ahead of low-priority ones? Read patient_priority_order against the acuity values in block_content.patients. The deteriorating patients should sit in positions 1-2 of the priority order; stable patients should sit at the bottom. A handover that orders by bed number rather than by clinical signal is a calibration miss.

2. ACTION CHOICE WITHIN SCOPE. Did the candidate's chosen actions per patient match their seniority and scope? An HCA or care worker should "Escalate to senior" on clinical concerns rather than "Review now" alone. A Registered Nurse can manage clinical observations within scope. A ward manager should delegate appropriately rather than picking up everything personally. The action menu was: Review now, Check in next round, Escalate to senior, Update care plan.

3. CLINICAL REASONING IN NOTES. Where the candidate added a note, did it show clinical reasoning rather than just restating the action? "Review now" with no note on a deteriorating patient is thinner than "Review now: NEWS2 5 trending up since 04:00, want to compare obs against last shift". Notes are optional, so absence is not a failure on its own; presence and quality count when given.

4. SPEED AND DEPTH BALANCE. Read time_per_patient timestamps. A handover where every patient took under 20 seconds suggests the candidate did not properly read the observations and family notes. A handover where one patient took 4 minutes and the rest got 10 seconds suggests they got stuck on one bed and ran out of attention for the others. Look for proportionate engagement.

5. FAMILY CONTACT ACKNOWLEDGED. When block_content.patients includes family_notes flagging an anxious relative or a family meeting, did the candidate's priority order or action choice reflect that? Stable patient with a 14:00 family meeting should not sit at position 8 of 8. Evidence of acknowledging the human side of the handover.`

export async function scorePatientHandover({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const PATIENT_HANDOVER_BLOCK_ID = BLOCK_ID
