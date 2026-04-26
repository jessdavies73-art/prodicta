// Inbox block scorer.
//
// Reads the candidate's email_replies, the order in which they opened
// emails (time_per_email timestamps), and the raw inbox content they
// were shown. Scores against the standard PRODICTA inbox criteria:
// prioritisation order, tone calibration to sender hierarchy, decide /
// defer / escalate discipline, speed-vs-depth balance, and completeness.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'inbox'
const BLOCK_NAME = 'Inbox'

const CRITERIA = `Score the candidate against these five criteria. Each criterion contributes to the overall score; weight them roughly equally unless the candidate's performance on one is dramatically out of line with the others.

1. PRIORITISATION ORDER. Did they open and reply to the high-importance emails first, or did they work through inbox order? Use the time_per_email open timestamps to detect the order. The highest-relationship and highest-stake emails (senior, external, escalations) should be opened early.

2. TONE CALIBRATION. Did each reply match the sender's hierarchy and relationship? Senior or external senders should get a more measured and professional tone. Peers can be direct and conversational. Junior senders can be brisker. A reply that uses the same tone for everyone is a calibration failure.

3. DECISION DISCIPLINE. For each email, did they reply, defer, escalate, or ignore? Reply discipline shows judgement: not every email needs a reply right now; some need an escalation; some can be deferred. Replying to everything in equal depth is not strength, it is over-investment.

4. SPEED VS DEPTH. Did they spend appropriate time per email? A two-line reply to a complex multi-stakeholder ask is rushed. A 200-word reply to a simple FYI is over-elaborate. Assess proportion.

5. COMPLETENESS. Did they handle the must-respond emails (typically the senior, external, and escalation emails)? Missing a must-respond is a watch-out even if everything they did handle was strong.`

export async function scoreInbox({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
  return runScorer({
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

export const INBOX_BLOCK_ID = BLOCK_ID
