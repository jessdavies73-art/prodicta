// Care plan review block scorer.
//
// Reads the candidate's three concerns spotted, recommended_changes,
// documentation_update, mdt_question and time_reading_seconds signals
// captured by care-plan-review.jsx. The block_content.planted_issues
// array carries the deliberate gaps seeded in the document; this is
// the ground truth for spotting score.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'care-plan-review'
const BLOCK_NAME = 'Care plan review'

const CRITERIA = `Score the candidate against these five criteria. The block_content.planted_issues array names 1-2 deliberate gaps with type (one of risk_not_documented, instruction_missing, family_wish_not_reflected, review_overdue, governance_gap, contraindication_not_flagged) and a hint describing the indicator.

1. CONCERN SPOTTING VS PLANTED ISSUES. The candidate's three summary_concerns array should reference the planted issues. A candidate who names both planted issues plus a sensible third is the strong floor. A candidate who names neither planted issue is a serious miss. A candidate who names one planted issue plus two false positives is acceptable but watch-out worthy. Compare each concern against planted_issues hints: a paraphrase that captures the indicator counts as a hit.

2. RECOMMENDED CHANGES SPECIFICITY. The recommended_changes textarea should name the section of the care plan being changed, the specific change to make, and ideally a timeframe. "Update the fall risk section to include the standardised assessment tool entry by next Friday's MDT" is strong; "review the care plan" is empty; "add more detail" is vague. Look for actionable, specific, named-section changes.

3. DOCUMENTATION ENTRY PROFESSIONAL STANDARD. The documentation_update text should read as a real care plan record entry: dated, signed off, factual, anonymised, free of speculation. References to specific sections ("Updated section 4.2 — fall risk assessment, scored using STRATIFY 9-point tool") are stronger than free prose. Look for evidence of professional record-keeping rather than personal note-taking.

4. MDT QUESTION QUALITY. The mdt_question text should probe a real gap in the plan: a missing input from a named role (physiotherapy, GP, social work), a clarification on a flagged risk, a request for a family meeting before the next review. "Is the care plan up to date?" is empty; "What is the GP's view on whether the resident's mobility decline warrants a falls clinic referral?" is strong. The question should target a gap, not a confirmation.

5. READING TIME APPROPRIATENESS. time_reading_seconds tracks how long the candidate spent in the block. A 400-800 word document warrants 2-4 minutes of reading at minimum. Under 60 seconds suggests the candidate did not properly read the document. Over 8 minutes suggests stuck on a single section. Look for proportionate engagement; this is informational, not a hard gate.`

export async function scoreCarePlanReview({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CARE_PLAN_REVIEW_BLOCK_ID = BLOCK_ID
