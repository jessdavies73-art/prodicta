// Medication round block scorer.
//
// Reads the candidate's spotted_rows, row_actions, row_notes,
// summary_text and the auto-computed anomalies_correctly_identified /
// anomalies_false_positives / anomalies_missed signals captured by
// medication-round.jsx. Scores against safety-critical chart-review
// criteria.
//
// Compliance: scoring narratives must never name a real drug or imply a
// specific clinical action. The block's planted_issues describe
// indicators only; the score reflects whether the candidate spotted the
// signal, not whether their proposed remedy was clinically correct.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'medication-round'
const BLOCK_NAME = 'Medication round'

const CRITERIA = `Score the candidate against these five criteria. Weight planted-issue spotting and the prescribing-vs-querying boundary most heavily.

1. PLANTED ISSUE SPOTTING. The candidate's anomalies_correctly_identified array lists which planted rows they flagged; anomalies_missed lists what they walked past. Score the recognition rate. Spotting both planted issues is the strong floor for a Registered Nurse or Pharmacist role; missing both is a serious miss; spotting one of two with a sensible reason is a passable middle. Compare to block_content.planted_issues for the ground truth.

2. FALSE POSITIVE DISCIPLINE. The anomalies_false_positives array lists rows the candidate flagged that were not planted issues. Some over-flagging is fine if the candidate's notes show genuine clinical curiosity. A pattern of flagging every row with any blank cell suggests pattern-matching rather than judgement. Persistent false positives without reasoning are a watch-out.

3. ACTION CHOICE PER FLAGGED ROW. row_actions should match issue_type. For a missed_dose row: "Administer missed dose now" or "Query with prescriber" are both defensible; "Document concern" alone is weak. For a contraindication_concern row: "Query with prescriber" or "Escalate to senior" is the strong play; "Administer missed dose now" on a contraindication row is a serious calibration miss. For a documentation_gap row: "Document concern" or "Query with prescriber" is appropriate.

4. SUMMARY HEADLINE QUALITY. The summary_text textarea asks "What is the headline here, what would you do?". Strong summaries name the headline finding (the missed dose, the contraindication concern), commit to a next action with a specific person ("query with the prescriber before the next round"), and acknowledge documentation. Weak summaries restate the chart contents without forming a judgement.

5. PRESCRIBING-VS-QUERYING BOUNDARY. CRITICAL CALIBRATION CHECK. The candidate's notes and summary should show querying language ("would query with the prescriber", "want clarification before giving"), not prescribing language. A candidate who writes a specific dose, drug name, or instruction ("give 1g paracetamol now", "switch to a different anticoagulant") is overstepping their scope: that is prescribing, not querying. Flag this as a high-weight signal regardless of the role; it is a registration risk for any clinical role and outside scope for any care role. Note: the chart only carries placeholder category labels, so any real drug name in the candidate's notes came from the candidate, not the chart.`

export async function scoreMedicationRound({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const MEDICATION_ROUND_BLOCK_ID = BLOCK_ID
