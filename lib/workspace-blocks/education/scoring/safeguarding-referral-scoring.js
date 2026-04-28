// Safeguarding referral block scorer.
//
// Reads the candidate's indicators_noticed, indicator_notes,
// threshold_decision, immediate_action, recording_systems,
// recording_notes, informed_parties (with timing) and conflicts_of_duty
// + conflicts_notes captured by safeguarding-referral.jsx. The
// block_content.threshold_factors array is the ground-truth reference
// for the threshold call; block_content.indicators_present is shown to
// the candidate.
//
// SENSITIVE BLOCK. Scoring narrative focuses on professional judgement
// and pathway. Never repeats graphic detail; never speculates about
// cause or perpetrator; treats the threshold call with appropriate
// gravity. Anonymises pupil references in narrative.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'safeguarding-referral'
const BLOCK_NAME = 'Safeguarding referral'

const CRITERIA = `Score the candidate against these six criteria. The block_content.threshold_factors array names the specific factors a competent practitioner would weigh when judging the threshold call; this is the scoring reference and the candidate has not seen it. block_content.indicators_present was shown to the candidate.

CRITICAL: this block is sensitive. Your scoring narrative must focus on professional judgement and pathway, never repeating graphic detail and never speculating about cause or perpetrator. Anonymise pupil references. Use education compliance language: "patterns suggest", "professional judgement appeared", "the response reads as appropriate to scope".

1. INDICATOR RECOGNITION. The candidate's indicators_noticed multi-select should overlap with block_content.indicators_present. Strong responses name the specific phrase or pattern in indicator_notes; vague restatement is below standard. Picking only one indicator when several are surfaced suggests under-reading; picking every indicator when the scenario points to a specific cluster suggests pattern-blindness.

2. THRESHOLD CALL APPROPRIATENESS. threshold_decision is one of "yes" / "need_more_information" / "no". The right call depends on threshold_factors. When factors include "Disclosure made directly by the pupil", "Pattern over time rather than a single event", "Risk of immediate harm if no action today" — "yes" is the strong call. When factors are inconclusive ("First-time observation", "No witness to the original event", "Capacity assessment not on file"), "need_more_information" can be correct provided the candidate names what they would gather. "No" is correct only when factors weigh clearly against threshold. Reflexive "yes" to every scenario is not strength; reflexive "no" indicates a "Skipped DSL involvement on disclosure" pattern.

3. IMMEDIATE ACTION CORRECTNESS. The immediate_action text should name proportionate first-hour steps: securing the pupil's safety, contacting the DSL (or DSL deputy) before any parent communication, preserving the disclosure as recorded, separation of parties where relevant. Disproportionate action (calling police on a low-threshold welfare concern; ignoring a serious disclosure with "we will discuss in next week\'s meeting") is a calibration miss in either direction. Indicators of the "Skipped DSL involvement on disclosure" or "Missed safeguarding referral to DSL" pattern apply where evidence supports them.

4. RECORDING SYSTEM CHOICE. recording_systems should match what is in use: CPOMS / MyConcern / school MIS safeguarding module / paper safeguarding log per block_content.recording_systems_in_use. recording_notes should describe what would actually be written: time, words used, observed indicators, action taken, anonymised reference. Speculation about cause or perpetrator in the recording note is a serious professional standard miss.

5. WHO-TO-INFORM AND WHEN. informed_parties with per-party timing must include the DSL (or Deputy DSL when scope sits at DSL level) at the "immediately" timing. Strong responses pick the right tier of escalation: pastoral lead and/or SENCO before DSL is below standard for a clear-threshold scenario; jumping to MASH / Children\'s Social Care before DSL involvement is a process miss. Patterns suggest the strongest responses cite KCSIE Part 1 obligations and the DSL pathway.

6. CONFLICTS OF DUTY HANDLING. conflicts_of_duty multi-select and conflicts_notes should name the specific tension (confidentiality vs duty to share, pupil consent and capacity, parent relationship risk, staff member named) and how the candidate would handle it. Strong responses defer the consent / capacity / disclosure call to the DSL while naming what they would record. Picking "No conflict" when staff_member_named or pupil_consent is genuinely in play indicates under-reading.`

export async function scoreSafeguardingReferral({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const SAFEGUARDING_REFERRAL_BLOCK_ID = BLOCK_ID
