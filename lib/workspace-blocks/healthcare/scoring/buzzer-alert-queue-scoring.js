// Buzzer / alert queue block scorer.
//
// Reads the candidate's alert_priority_order, alert_actions and
// alert_reasoning signals captured by buzzer-alert-queue.jsx. Scores
// against role-appropriate triage criteria.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'buzzer-alert-queue'
const BLOCK_NAME = 'Buzzer / alert queue'

const CRITERIA = `Score the candidate against these four criteria. Weight clinical urgency prioritisation and delegation judgement most heavily.

1. CLINICAL URGENCY ORDER. Read alert_priority_order against the urgency_type values in block_content.alerts. clinical_urgent alerts should sit in position 1 (or tied for 1) before any comfort, welfare or administrative alert. Patterns suggest poor triage when a comfort buzzer is placed ahead of a clinical_urgent buzzer; that is a calibration miss for any clinical role and a signal to escalate for any care role.

2. DELEGATION JUDGEMENT WITHIN SCOPE. Did the candidate retain clinically urgent alerts ("Respond now" or "Escalate to senior") and delegate the comfort and welfare items where appropriate? An HCA or care worker should "Escalate to senior" on the clinical_urgent alert rather than respond alone. A Registered Nurse can retain the clinical alerts and "Delegate to colleague" on comfort and toileting. A ward manager should delegate liberally rather than absorb everything personally.

3. ACKNOWLEDGE-AND-QUEUE USED PROPORTIONATELY. The "Acknowledge and queue" action is appropriate for non-urgent welfare and administrative alerts where the buzzer can be silenced and the response folded into the next round. Over-using "Acknowledge and queue" on clinical_urgent alerts is a serious miss. Under-using it (responding now to every welfare check) suggests the candidate has not internalised the queue discipline.

4. REASONING QUALITY WHERE NOTES PROVIDED. The reasoning textarea is optional. Where the candidate filled it in, look for evidence of considered triage rather than restating the action. "Respond now" with reasoning "Bed 4 reporting breathlessness, sat up — clinical priority over the comfort calls" is stronger than "Respond now" with no reasoning, which is stronger than "Respond now" with reasoning "she is the priority". Quality counts when given; absence does not auto-fail.`

export async function scoreBuzzerAlertQueue({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const BUZZER_ALERT_QUEUE_BLOCK_ID = BLOCK_ID
