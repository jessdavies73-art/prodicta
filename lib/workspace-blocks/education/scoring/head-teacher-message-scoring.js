// Headteacher message block scorer.
//
// Reads the candidate's draft_text, draft_word_count, copy_in,
// copy_in_rationale, compliance_flags, compliance_notes and
// strategic_implications captured by head-teacher-message.jsx. The
// block_content.scope value drives whether the candidate was responding
// to the head ("respond_to_request") or drafting a school-wide message
// ("draft_school_wide_message"); block_content.strategic_anchors is the
// ground-truth reference for the strategic factors a strong response
// would weigh.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'head-teacher-message'
const BLOCK_NAME = 'Headteacher message'

const CRITERIA = `Score the candidate against these five criteria. The block_content.scope value tells you whether the draft is a response or an outgoing message; block_content.strategic_anchors names the strategic factors a strong response would hold. block_content.head_message.audience tells you who the draft is written for. Use education compliance language; never make definitive claims about leadership competence or governance outcomes.

Scope-aware: scope can be "respond_to_request" (TA / Class Teacher / SENCO / HoD / Pastoral Lead) where the head sent the message and the candidate replies, or "draft_school_wide_message" (SLT / Headteacher) where the candidate drafts the outgoing message themselves.

1. TONE CALIBRATION TO AUDIENCE. The draft_text should match the audience: a head-facing response is concise, factual and accountability-aware; a parent-body message holds reassurance and the named action; a governor or MAT message frames the decision and the rationale; a regulator-facing message stays scrupulously accurate without overcommitting. Patterns suggest the strongest drafts open with the substantive answer, then carry the rationale, then close with the next contact or commitment.

2. STRATEGIC AWARENESS. The strategic_implications text should name the strategic factors the candidate weighed: tone implications, governance positioning, what is being committed to, what is being held back, follow-on consequences. Strong responses cite the strategic_anchors in spirit (parent-body trust, MAT-wide standards, regulator-facing accuracy, safeguarding line). Indicators of weak strategic awareness: only operational detail, no positioning logic, no consequence chain.

3. COMPLIANCE LINE HANDLING. compliance_flags multi-select should pick the considerations genuinely in play: safeguarding-line containment, data-protection / pupil-records sensitivity, governance accountability, regulator-facing accuracy, employment / HR sensitivity, parent-body optics. compliance_notes should name how the draft handles the line. CRITICAL: when issue_type is "pastoral_or_safeguarding_followup", the draft must not inadvertently disclose the safeguarding line in a wider audience message; this is a high-weight signal that maps to the "Skipped DSL involvement on disclosure" pattern when missed.

4. COPY-IN JUDGEMENT. copy_in selections should match the audience and the strategic anchors. For "respond_to_request" scope, the right copy-in tends to be the named-deputy or the SENCO/DSL where the issue touches them; blanket-copying the entire SLT is over-reach for an operational reply. For "draft_school_wide_message" scope, the right copy-in is governance and trust leadership; missing the chair of governors on a governance-inquiry message is a calibration miss. copy_in_rationale should name why each copy-in is present.

5. CONTENT COMPLETENESS RELATIVE TO REQUEST. For "respond_to_request" scope, the draft should address every concrete element of the head's request (the data, the timing, the named action, the named risk). For "draft_school_wide_message" scope, the draft should hit the brief\'s named situation, the named ask, and the named constraint. Generic communication that holds tone but ducks the substantive ask is below standard. Indicators of a "Hesitation under pressure" pattern: ducking the substantive call when the head has set a deadline.

Calibration to scope and seniority: the draft should hold the right altitude. A Class Teacher response should not over-reach into headship-style positioning; a Headteacher draft should not get stuck in operational granularity.`

export async function scoreHeadTeacherMessage({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const HEAD_TEACHER_MESSAGE_BLOCK_ID = BLOCK_ID
