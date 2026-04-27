// Clinical decision queue block scorer.
//
// Reads the candidate's per-decision chosen_option, clinical_reasoning
// and time_to_decide_seconds signals captured by
// clinical-decision-queue.jsx. Scores against role-appropriate decision
// discipline criteria.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'clinical-decision-queue'
const BLOCK_NAME = 'Clinical decision queue'

const CRITERIA = `Score the candidate against these five criteria. Each decision in candidate_inputs.decisions carries chosen_option, clinical_reasoning and time_to_decide_seconds; the matching block_content.decisions entry carries the title, urgency_indicator, constraint and who_affected.

1. URGENCY-MATCHED COMMITMENT. For decisions where block_content marks urgency_indicator as "immediate", did the candidate actually commit (chose an option that acts now, not one that defers)? Deferring an immediate decision to "next round" or "observe" is a calibration miss. For "next_24_hours" decisions, deferring is fine; committing to action when the constraint allows time is over-eager. Read the chosen_option label against the urgency.

2. JUDGEMENT IN REASONING, NOT PREFERENCE. The clinical_reasoning text should reference the constraint, the people affected, or the clinical signal — evidence of weighing trade-offs. "I would escalate" alone is thinner than "I would escalate now: NEWS2 is trending up, on-call SHO can attend within 15 minutes, the bay does not have margin for a deterioration". Reasoning that reads as personal preference ("I prefer to keep things calm") rather than clinical or operational signal is weak.

3. CONSTRAINT AND AFFECTED-PARTY ACKNOWLEDGEMENT. block_content for each decision names a constraint (binding pressure or risk) and a who_affected line. Strong reasoning references one or both: "given the on-call doctor is covering two wards", "given the daughter is arriving at 11:00 expecting an answer". Reasoning that ignores the named constraint and named affected party is shallow.

4. SPEED VS URGENCY ALIGNMENT. time_to_decide_seconds tracks how long each decision sat open before the candidate committed. Immediate decisions made in 30-90 seconds is a healthy pattern; under 10 seconds suggests pattern-match rather than read; over 4 minutes on an immediate decision suggests paralysis. Within-shift decisions can take 60-180 seconds without concern. Next-24-hours decisions at 30 seconds suggests skipping the read.

5. ESCALATION PATTERN APPROPRIATENESS. Across the set of decisions, does the candidate's mix of "escalate" vs "manage in scope" choices match their seniority? An HCA who manages every decision in-house is overstepping; one who escalates every decision is under-confident. A Registered Nurse should be making the bulk of within-scope calls and escalating the genuinely senior or scope-bound items. A ward manager or matron should be visibly making the senior call rather than passing it on.`

export async function scoreClinicalDecisionQueue({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CLINICAL_DECISION_QUEUE_BLOCK_ID = BLOCK_ID
