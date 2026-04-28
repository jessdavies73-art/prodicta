// Behaviour incident block scorer.
//
// Reads the candidate's immediate_intervention, deescalation_approach,
// recording_actions, recording_notes, informed_parties (with timing per
// party), safeguarding_considerations and safeguarding_notes captured
// by behaviour-incident.jsx. The block_content.policy_anchors array is
// the ground-truth reference for the policy steps a strong response
// would touch.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'behaviour-incident'
const BLOCK_NAME = 'Behaviour incident'

const CRITERIA = `Score the candidate against these five criteria. The block_content.policy_anchors array names the school behaviour and safeguarding policy elements a competent practitioner would touch in this scenario. The block_content.time_pressure label and adult_to_be_informed value are the binding constraints. Use education compliance language; the candidate's role is to recognise and respond proportionately, not to deliver a definitive incident verdict.

1. IMMEDIATE INTERVENTION QUALITY. The immediate_intervention should name what the candidate physically does in the next 60 seconds: where they stand, what they say to the pupil at the centre, what they do with the rest of the class. Strong responses keep both the named pupil and the rest of the group in view. Indicators of a "Hesitation under pressure" or "Defaults to escalation" pattern: only escalation, no immediate intervention; or freezing without action.

2. DE-ESCALATION APPROACH. The deescalation_approach should name the tone, the choices offered, the language used, the recovery set up. Strong responses match SEND-aware adjustments where pupils_involved carry SEND context (offer choice, lower verbal demand, scripted prompts). Punitive-first responses on a SEND-flagged pupil indicate a "Did not flag SEN concern" pattern.

3. RECORDING APPROPRIATENESS. recording_actions should include the school behaviour management system as a minimum. CPOMS / safeguarding log inclusion is correct when the scenario carries a safeguarding-adjacent indicator. Picking only "Witness statement" without behaviour-system entry is a "Did not log behaviour incident" pattern. Strong responses match the recording set to the policy_anchors.

4. WHO-TO-INFORM AND WHEN. The informed_parties list with per-party timing must include the adult_to_be_informed from block_content (Year leader, SENCO, DSL, on-call SLT) at the immediate or end-of-lesson timing. Missing the named adult is a calibration miss. Patterns suggest strong responses also loop in the parent or carer at end-of-day timing where the policy anchors point that way. DSL inclusion when the incident touches a safeguarding indicator is required; missing it is a "Skipped DSL involvement on disclosure" pattern.

5. SAFEGUARDING CONSIDERATION RECOGNITION. The safeguarding_considerations multi-select should pick the signals genuinely in play (pupil with SEND, recent disclosure or pastoral concern, home circumstances, pattern over time, other pupils at risk). Picking "No safeguarding link" when the pupils_involved context names a recent bereavement or a SEND flag is a calibration miss. Strong responses tie safeguarding_notes to the specific factor.

Calibration to scope and time pressure: TA-level intervention sits in front of the teacher; Class Teacher acts and reports; Pastoral Lead takes the escalation and decides; SLT / Head holds the school-wide pattern. The response should hold the right altitude.`

export async function scoreBehaviourIncident({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const BEHAVIOUR_INCIDENT_BLOCK_ID = BLOCK_ID
