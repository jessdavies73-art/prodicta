// Lesson plan block scorer.
//
// Reads the candidate's learning_intention, success_criteria,
// differentiation (low_middle_high / sen / eal_high_attainers),
// assessment_for_learning, resources_and_risks, plus optional
// unit_sequence (HoD scope) or review_strengths / review_development_areas
// (SLT review scope) captured by lesson-plan.jsx. The
// block_content.lesson_brief.scope value drives which fields are
// expected; planted_considerations is the ground-truth reference for
// whether the candidate spotted the relevant pedagogical levers.

import { runEducationScorer } from './_shared.js'

const BLOCK_ID = 'lesson-plan'
const BLOCK_NAME = 'Lesson plan'

const CRITERIA = `Score the candidate against the criteria below. The block_content.lesson_brief.scope value tells you which scope applies and which fields are expected. The block_content.planted_considerations array names the pedagogical levers a competent practitioner would weigh; this is the scoring reference. Use education compliance language; never make definitive claims about teaching competence or pupil outcomes.

Scope-aware: scope can be "support_one_pupil" (TA), "single_lesson" (Class Teacher), "unit_sequence" (HoD), "review_colleague_plan" (SLT review).

1. LEARNING INTENTION CLARITY. The learning_intention should be pupil-facing, specific to the topic, and grammatically clean ("By the end of the lesson, pupils will identify..."). Vague intentions ("learn about fractions") or teacher-facing intentions ("cover the chapter") are below standard. For "review_colleague_plan" scope, this criterion does not apply directly; substitute the candidate's read on the colleague plan's intention quality.

2. SUCCESS CRITERIA SUBSTANCE. The success_criteria should be observable pupil-facing statements (I can ... / I can explain ... / I can demonstrate). Two or three SC tied to the LI is strong; one SC restating the LI is below standard. AfL planning hinges on SC quality.

3. DIFFERENTIATION BREADTH. CRITICAL for non-review scopes. The differentiation block should name a specific strategy for low/middle/high attainers AND for a SEN pupil AND for an EAL pupil. Each strategy should be specific (scaffolded sentence stems, mini-whiteboard pre-teach, peer support, dual-coding) and tied to a named pupil from the roster where possible. Indicators of a "Lesson preparation gap" pattern: missing SEN strategy, generic differentiation language untethered from named pupils, no scaffold for low attainers, no extension for high attainers. Patterns suggest the strongest plans cite the planted_considerations from the brief.

4. ASSESSMENT FOR LEARNING APPROACH. The assessment_for_learning text should name the AfL move (cold-call sample, mini-whiteboards, hinge question, exit ticket) AND the checkpoint timing AND the evidence the candidate would look for. Naming an AfL technique without timing or evidence is half a strategy; missing AfL entirely is below standard.

5. RESOURCES AND RISKS PROPORTIONATE. The resources_and_risks should name the specific materials needed and one named risk plus mitigation. Generic resource lists ("worksheets", "smartboard") are below standard; specific resources tied to differentiation ("scaffolded sentence-stem cards for SEN group at table 3") are strong. Naming a behaviour management risk paired with a mitigation is appropriate.

For "unit_sequence" scope (HoD): the unit_sequence text should outline 6 to 8 lessons each with a named focus that builds towards a clearly-stated end point. Indicators of strong sequencing: retrieval practice reference, progression from simpler to more complex, summative point. A list of topics without progression logic is below standard.

For "review_colleague_plan" scope (SLT): review_strengths must cite specific elements of the colleague plan and explain why they work for this class. review_development_areas must name a specific gap and a suggested move; vague feedback ("could be more engaging") is below standard. Patterns suggest the strongest reviews hold professional standards while staying constructive.`

export async function scoreLessonPlan({ anthropic, role_profile, role_title, account_type, employment_type, scenario_context, block_content, candidate_inputs }) {
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

export const LESSON_PLAN_BLOCK_ID = BLOCK_ID
