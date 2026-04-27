// Safeguarding incident block scorer.
//
// Reads the candidate's threshold_decision, immediate_informants,
// immediate_action, documentation_required, external_notification and
// documentation_entry captured by safeguarding-incident.jsx. The
// block_content.threshold_factors array carries the ground truth for
// what a strong candidate would weigh.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'safeguarding-incident'
const BLOCK_NAME = 'Safeguarding incident'

const CRITERIA = `Score the candidate against these five criteria. The block_content.threshold_factors array names the specific factors a competent practitioner would weigh; this is the scoring reference.

1. THRESHOLD DECISION APPROPRIATENESS. The candidate's threshold_decision is one of "yes" / "no" / "need_more_information". The right answer depends on the threshold_factors. When factors include "Pattern of repeated unexplained injuries" or "Disclosure made directly by the person at risk", "yes" is the strong call. When factors are inconclusive ("Reporter has not yet completed body map", "No witness to the original event"), "need_more_information" can be the right call provided the candidate names what they would gather. "No" is the right call only when factors weigh against the threshold. Reflexively answering "yes" to every safeguarding scenario is not strength; over-escalation has its own cost.

2. INFORMANTS LIST CORRECTNESS. immediate_informants should include the role-appropriate first contacts: the Designated Safeguarding Lead is the floor for almost every scenario; the Registered Manager or Nurse in Charge depending on setting; multidisciplinary team members where the scenario points to it. Missing the DSL is a high-weight signal. Listing every possible informant is over-cautious but not as serious as missing the right ones.

3. IMMEDIATE ACTION PROPORTIONATE. The immediate_action text should name proportionate first-hour steps: securing the person, body map and witness statements, separation of parties where appropriate, documentation initiation, capacity assessment where relevant. Disproportionate action (calling the police on a low-threshold welfare concern; ignoring a serious disclosure with "we will discuss at next meeting") is a calibration miss in either direction.

4. EXTERNAL NOTIFICATION CORRECTNESS. external_notification should match the threshold and the person at risk's category. Local Authority Safeguarding Adults vs Children must be picked correctly based on block_content. Police inclusion is appropriate when the scenario points to a possible criminal act. CQC notification is required for specific incident categories (serious injury, abuse, death, deprivation of liberty issues) — over-notifying is preferable to under-notifying for CQC, but unnecessary CQC notification on a low-threshold scenario suggests the candidate has not internalised the notification thresholds. "None at this time" is a defensible call only when the threshold genuinely is not met.

5. DOCUMENTATION ENTRY PROFESSIONAL STANDARD. CRITICAL. The documentation_entry must be: dated, named, factual, anonymised, free of speculation about cause or perpetrator. References to specific named individuals as suspects without evidence is a serious professional standard miss. Documentation that reads as a personal opinion ("I think the night staff have been rough with her") rather than a factual entry ("Bruise observed on right upper arm during morning personal care; no witnessed event documented in night-shift notes") is below standard.`

export async function scoreSafeguardingIncident({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const SAFEGUARDING_INCIDENT_BLOCK_ID = BLOCK_ID
