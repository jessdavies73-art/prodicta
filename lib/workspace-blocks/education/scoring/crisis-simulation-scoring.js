// Crisis simulation block scorer (education shell).
//
// Reads the candidate's three stage_responses, informed_parties (with
// timing), recording_actions, recording_notes, safeguarding_considerations,
// safeguarding_notes and post_crisis_followup captured by
// crisis-simulation.jsx. The block_content.stages[] carries the
// escalating arc; block_content.framework_reminders is the scoring
// reference for KCSIE / DSL / LADO / critical-incident-plan anchors;
// block_content.post_crisis_anchors is the scoring reference for
// follow-up.
//
// SENSITIVE BLOCK. Mirrors safeguarding-referral. Scoring narrative
// focuses on professional judgement and pathway. Never repeats graphic
// detail. Anonymises pupil references. Uses sensitive education
// compliance language: "patterns suggest", "professional judgement
// appeared", "the response reads as appropriate to scope".
//
// Education-shell variant. Distinct from the office-shell
// crisis-simulation scorer; dispatch keys by shell_family.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'crisis-simulation'
const BLOCK_NAME = 'Crisis simulation'

const CRITERIA = `Score the candidate against these six criteria. block_content.stages is the three-stage escalating arc; each stage carries a decision_prompt the candidate had to answer. block_content.framework_reminders names KCSIE / DSL / LADO / critical-incident-plan anchors. block_content.post_crisis_anchors is the scoring reference for the follow-up section.

CRITICAL: this block is sensitive. Your scoring narrative must focus on professional judgement and pathway, never repeating graphic detail and never speculating about cause or perpetrator. Anonymise pupil references in the narrative. Use education compliance language: "patterns suggest", "professional judgement appeared", "the response reads as appropriate to scope under pressure".

1. STAGE-1 IMMEDIATE DECISION QUALITY. The candidate's stage-1 response should name what they do in the next 60 seconds: where they go, who they call first, what they secure. Patterns suggest the strongest responses pair an action with a named person AND a timing. Indicators of a "Hesitation under pressure" pattern: only escalation language, no immediate action; or planning the call without securing the pupil first.

2. STAGE-2 ADAPTATION TO SHIFT. Stage 2 names how the situation has shifted (a parent calling, a senior figure arriving, a second pupil affected). The response should adapt: keep the pupil at the centre safe, take the new information, hand the new vector to the appropriate adult. Below standard: ignoring the shift, repeating the stage-1 plan, or losing the original priority. Patterns suggest the strongest responses cite the framework_reminders relevant at this stage.

3. STAGE-3 FINAL ESCALATION HANDLING. Stage 3 typically introduces an external pressure (regulator inquiry, media question, multi-agency contact). The response should hold the safeguarding line, defer to DSL / Head where authority sits there, and name what is being recorded vs what is being communicated externally. Indicators of "Skipped DSL involvement on disclosure" or "Externalises blame" patterns: making a determination outside scope; or naming a specific staff or pupil to the external party without authority.

4. WHO-TO-INFORM AND WHEN. informed_parties with per-party timing must include the DSL at "immediately" timing for safeguarding-adjacent triggers; the Headteacher for school-wide or media triggers; emergency services for safety-of-life triggers; LADO when staff_conduct_question is in play. Missing the DSL on a safeguarding trigger is a "Missed safeguarding referral to DSL" pattern. Strong responses pick the right tier rather than blanket-copying every option.

5. RECORDING REQUIREMENTS COMPLETENESS. recording_actions should pick the systems genuinely required: CPOMS / MyConcern for safeguarding, critical incident form for safety-of-life, witness statements from staff for incidents that may face external scrutiny, communications log when media or regulator contact is open. recording_notes should describe what would actually be written: time, who, what, action taken, anonymised reference. Speculation in the recording note is a serious miss.

6. POST-CRISIS FOLLOW-UP. The post_crisis_followup text should name the 24-hour follow-up: pupil debrief plan for witnesses, staff wellbeing check-in, log entry, parent communication where appropriate, external comms log update. Strong responses cite the post_crisis_anchors in spirit. Indicators of weak follow-up: only naming the operational entry, missing the wellbeing dimension, no plan for pupils who witnessed.

Calibration: hold the right altitude for the role profile. Class Teacher scope sits inside the lesson and immediate aftermath; Pastoral Lead scope takes the escalation and decides; SLT / Head scope handles school-wide or external dimensions. The narrative reads professional judgement, not certainty about outcomes.`

export async function scoreEducationCrisisSimulation({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const EDUCATION_CRISIS_SIMULATION_BLOCK_ID = BLOCK_ID
