// Cohort coordination block scorer.
//
// Reads the candidate's priority_order (drag-style ordering of the
// demands), demand_actions (one of handle_now / delegate / defer /
// escalate per demand), coordination_plan, briefing_plan (parties with
// timing) and escalation_pathway captured by cohort-coordination.jsx.
// The block_content.demands[] array carries each demand's
// priority_signal ("critical" / "high" / "medium" / "low") which is
// the ground-truth reference for the priority_order. block_content.
// escalation_anchors is the scoring reference for escalation handling.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'cohort-coordination'
const BLOCK_NAME = 'Cohort coordination'

const CRITERIA = `Score the candidate against these five criteria. The block_content.demands[] array names each demand's priority_signal (critical / high / medium / low); block_content.escalation_anchors names the scoring reference for what should escalate vs handle. Patterns suggest the strongest performance is the one that matches the priority_order to the priority_signal values and pairs each demand with the right action.

1. PRIORITY ORDERING. The priority_order should put critical demands first, high demands second, then medium, then low. Critical demands include safeguarding-adjacent, exam-day, regulator-facing items; high demands include named-parent meetings, time-bound external commitments. A priority_order that places medium demands ahead of critical ones is a calibration miss; one that lumps critical alongside low is a "Pupil progress concern unaddressed" pattern when the critical demand is pupil-facing.

2. DEMAND ACTION CHIPS APPROPRIATENESS. CRITICAL. demand_actions should match each demand's priority_signal AND the candidate's role scope. Critical demands typically warrant "handle_now" or "escalate" depending on whether the candidate is the named decision-maker; "defer" on a critical demand indicates a "Hesitation under pressure" pattern. "delegate" should name the named-deputy / role-correct delegate (Year leader, SENCO, on-call SLT). Patterns suggest the strongest responses use "escalate" only when escalation_anchors point that way (critical demand without a named decision-maker; safeguarding-adjacent demand; legal-weight communication).

3. COORDINATION PLAN COHERENCE. The coordination_plan text should read as an actual plan: by 09:30 X happens, by 11:00 Y happens, before the window closes Z happens. Specific timestamps tied to demands and named owners is strong; vague "I would handle the urgent ones first" is below standard. The plan should match the priority_order.

4. BRIEFING LIST COMPLETENESS WITH TIMING. briefing_plan should pick the right people and the right timing. Strong responses brief on-call SLT before the window starts, brief class teachers / form tutors at start of day, brief parents at end of day. Missing the named adult from a critical demand is a "Did not log behaviour incident" or "Skipped DSL involvement on disclosure" pattern when the demand carries that signal. Patterns suggest the strongest briefing plans cite the why for each named brief.

5. ESCALATION PATHWAY CLARITY. The escalation_pathway text should name the trigger (a specific demand becoming uncontainable, a safeguarding signal surfacing, a regulator-facing question landing), the named escalation target (Headteacher, MAT operations, Chair of Governors), and what the candidate would hand them. Vague pathways ("I would escalate if needed") are below standard. Indicators of weak escalation reasoning: no named trigger, no named recipient, no handover content.

Calibration to scope: small_group scope keeps the candidate inside the lesson; whole_school scope expects multi-site / multi-stakeholder coordination. The response should hold the right altitude.`

export async function scoreCohortCoordination({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const COHORT_COORDINATION_BLOCK_ID = BLOCK_ID
