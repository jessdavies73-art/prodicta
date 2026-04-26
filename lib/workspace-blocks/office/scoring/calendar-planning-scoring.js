// Calendar planning block scorer.
//
// Reads the candidate's gap_plans (what work they pushed into each gap),
// declined_meetings (which meetings they cut and why), and reasoning
// against the fixed_meetings + todos they were shown.

import { runScorer } from './_shared.js'

const BLOCK_ID = 'calendar-planning'
const BLOCK_NAME = 'Calendar planning'

const CRITERIA = `Score the candidate against these four criteria.

1. HIGH-VALUE WORK IN THE GAPS. Did they fill calendar gaps with the highest-value todos for this role today, or did they pad with low-value busywork (clearing inbox, admin)? A 60-minute uninterrupted block should go to the work that needs concentration, not the work that fits any 60-minute slot. Look at the todos they could have chosen and assess whether they picked the right ones for the spine.

2. WORKLOAD REALISM. Did they try to cram too much into the available time? Sum the estimated_minutes of work they planned and compare to the available gap minutes. Over-planning by more than 25 percent is a workload blindness signal. Under-planning (large unused gaps with no rationale) is a missed opportunity.

3. DECLINE/SHORTEN JUDGEMENT. For declined_meetings, was the meeting one that this role could realistically push (can_decline true)? Declining a meeting they cannot push is a political risk; not declining a meeting they could push is a time-management miss. The reason given should name what they would do with the time.

4. PER-TASK TIME REALISM. Did the time they allocated per todo match the work? A 600-word board update in 30 minutes is unrealistic; a one-line memo in 60 minutes is over-padding. Use the estimated_minutes from block_content as a sanity reference.`

export async function scoreCalendarPlanning({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CALENDAR_PLANNING_BLOCK_ID = BLOCK_ID
