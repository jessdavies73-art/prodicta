// Doctor / senior instruction handling block scorer.
//
// Reads the candidate's clarifications_raised, safety_concerns,
// documentation_entry, action_plan and time_in_block signals captured
// by doctor-instruction-handling.jsx. The block_content carries the
// inbound instruction plus a ground-truth ambiguity_or_concern_planted
// object used here to score recognition.

import { runHealthcareScorer } from './_shared.js'

const BLOCK_ID = 'doctor-instruction-handling'
const BLOCK_NAME = 'Doctor instruction handling'

const CRITERIA = `Score the candidate against these five criteria. The block_content carries an ambiguity_or_concern_planted object with a type ("ambiguous_dose_or_timing", "missing_clinical_detail", "scope_concern", "safety_signal", or "no_concern") and a hint describing the indicator. Use this ground truth to score whether the candidate spotted the planted issue.

1. AMBIGUITY OR SAFETY-CONCERN RECOGNITION. CRITICAL. If ambiguity_or_concern_planted.type is anything other than "no_concern", the candidate's clarifications_raised or safety_concerns text should reference the planted indicator. For type "no_concern", the candidate raising no concerns is correct; raising spurious concerns is over-cautious but not a serious miss. For type "safety_signal" or "scope_concern", missing the planted issue is a high-weight signal of poor instruction reading.

2. CLARIFICATION QUALITY. The clarifications_raised text should be specific and actionable: "confirm the review interval the registrar expects after the first dose" is stronger than "ask for more detail". Generic clarifications without naming the missing information score low. Empty clarifications when the planted type is "ambiguous_dose_or_timing" or "missing_clinical_detail" is a recognition miss.

3. DOCUMENTATION ENTRY PROFESSIONAL STANDARD. The documentation_entry should read as a real record entry: dated, names the sender, summarises the instruction, captures any clarification taken, and notes the receiver's name. SBAR-style (Situation, Background, Assessment, Recommendation) is the gold standard for clinical handover. A documentation entry that reads as a personal note rather than a record entry is a professional-standard miss.

4. ACTION PLAN STRUCTURE. The action_plan should be structured: numbered steps or short paragraph that names specific people, specific timing, and specific actions. "Do what the registrar said" is empty; "1. Document the verbal order. 2. Call back the registrar before she goes off shift to confirm the review interval. 3. Hand off to the on-call SHO if I cannot reach her." is structured. Look for time-bounded, named-person commitments.

5. SCOPE AWARENESS. The candidate's response should stay within their scope. An HCA writing "I will give the medication as instructed" on a clinical instruction is outside scope; the right move is to clarify with their senior nurse. A Registered Nurse questioning a Registrar's instruction respectfully (rather than refusing) is in scope. A junior doctor querying a Consultant's electronic order is in scope. Look for evidence of knowing what they can and cannot act on alone.`

export async function scoreDoctorInstructionHandling({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const DOCTOR_INSTRUCTION_HANDLING_BLOCK_ID = BLOCK_ID
