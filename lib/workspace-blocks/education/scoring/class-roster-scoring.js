// Class roster block scorer.
//
// Reads the candidate's priority_pupils (3 ranked picks with reasons),
// first_week_priorities, safeguarding_flags, safeguarding_notes and
// differentiation_strategy captured by class-roster.jsx. The
// block_content.pupils[] array carries each pupil's flags, attendance
// pattern, attainment band and priority_signal — the priority_signal
// values ("immediate" / "monitor" / "routine") are the ground-truth
// reference for whether the candidate's three picks land on the pupils
// who genuinely need attention.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'class-roster'
const BLOCK_NAME = 'Class roster'

const CRITERIA = `Score the candidate against these five criteria. The block_content.pupils[] array names the priority_signal for each pupil ("immediate" / "monitor" / "routine"); the pupils with priority_signal "immediate" are the ground-truth picks for the three-pupil priority list. Patterns suggest the strongest performance is the one that matches priorities to the named indicators in flags, attendance_pattern and behaviour_note.

1. PRIORITY PICK ACCURACY. The candidate's priority_pupils array should land on or close to the pupils carrying priority_signal "immediate" in block_content.pupils. Picking only "routine" pupils is a calibration miss; picking pupils with strong indicators (EHCP plus attendance below 90 percent, recent behaviour incident, partial disclosure, sibling known to social care) is correct. The reason text should cite the actual indicator (the flag, the attendance figure, the behaviour note) rather than generic phrasing.

2. FIRST-WEEK PRIORITIES SUBSTANCE. The first_week_priorities text should name specific actions tied to specific pupils or sub-groups: a meeting with a parent, a check-in with the SENCO, a behaviour plan review, a differentiation plan for a named SEN pupil. Vague generic statements ("get to know the class", "be approachable") are below standard.

3. SAFEGUARDING FLAG RECOGNITION. CRITICAL. The candidate should recognise safeguarding-adjacent indicators surfaced in the roster (declining attendance pattern, recent behaviour change paired with home circumstances, sibling known to social care, partial disclosure note in behaviour_note). Picking "no_safeguarding_flag" when indicators are clearly present is a "Missed safeguarding referral to DSL" pattern; failure to flag pattern of decline is a "Pupil progress concern unaddressed" pattern.

4. DIFFERENTIATION STRATEGY QUALITY. The differentiation_strategy should name a specific strategy tied to a specific pupil or sub-group from the roster (scaffolded sentence stems for a named SEN pupil, dual-coding for an EAL pupil, extension question for a high attainer). Generic strategies untethered from the roster are below standard. Indicators of a "Lesson preparation gap" pattern: no named pupil, no named adjustment, no measurable outcome.

5. CALIBRATION TO ROLE SCOPE. TA-level rosters are smaller (4 to 6 pupils); the candidate should not over-reach into headship-style judgements. Headteacher-level rosters are cohort-wide; the candidate should not get stuck in single-pupil framing. Patterns suggest a strong response holds the right altitude for the role profile.`

export async function scoreClassRoster({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const CLASS_ROSTER_BLOCK_ID = BLOCK_ID
