# Education shell (Phase 2, live at v1.0)

Covers teachers, teaching assistants, SEN specialists, pastoral leads, heads of department, headteachers, MAT executive leads, and FE / sixth form leads. The role-profile-detector classifies these roles as `shell_family = 'education'`.

## What ships in v1.0

Nine real interactive blocks plus per-block scorers. Each block emits a typed `onComplete` payload that the corresponding scorer reads under `lib/workspace-blocks/education/scoring/`.

| Block | File | Typed payload (excerpt) |
|---|---|---|
| Class Roster | `class-roster.jsx` | `pupils[]` with flags, attendance, attainment band, priority signal |
| Lesson Plan | `lesson-plan.jsx` | `lesson_brief` (scope-aware) + `shared_materials` |
| Parent / Carer Communication | `parent-communication.jsx` | `parent_message` (full text + tone) + `safeguarding_signals` |
| Behaviour Incident | `behaviour-incident.jsx` | `trigger_event` + `pupils_involved[]` + `time_pressure` |
| Safeguarding Referral | `safeguarding-referral.jsx` | `full_scenario_text` + `indicators_present[]` + `threshold_factors[]` |
| Headteacher Message | `head-teacher-message.jsx` | `head_message` (scope-aware: respond or draft) |
| Cohort Coordination | `cohort-coordination.jsx` | `demands[]` with priority signal + `resource_constraints[]` |
| Conversation Simulation | `conversation-simulation.jsx` | `counterpart_persona` + `turns[3]` |
| Crisis Simulation | `crisis-simulation.jsx` | `stages[3]` with new_information + decision_prompt |

## Auto-generation

New education assessments at Strategy-Fit (`mode === 'advanced'`) or Depth-Fit-immersive (`mode === 'standard'` with `immersive_enabled === true` or workspace add-on) auto-generate a connected scenario via `generateEducationScenario` in `lib/scenario-generator.js`. The orchestrator at `app/assess/[uniqueToken]/page.js` mounts `ModularWorkspace` when `assessment.shell_family === 'education'` and `assessment.education_workspace_enabled === true`.

The auto-fire is gated on `PD_EDUCATION_BLOCK_LIBRARY_VERSION === 'education-block-library-v1.0'` in `lib/constants.js`; reverting that constant disables auto-fire without touching the generate route.

## Compliance language

Education-specific compliance language lives in `scoring/_shared.js` under `EDUCATION_COMPLIANCE_RULES`:

- Never make definitive claims about teaching competence or pupil outcomes.
- The threshold call sits with the DSL; the candidate's role is to recognise and refer.
- Use "patterns suggest", "professional judgement appeared", "the response reads as appropriate to scope".
- Anonymise pupil references in narrative output ("Pupil A", "the Year 4 pupil").

The two sensitive blocks (`safeguarding-referral`, `crisis-simulation`) carry an additional CRITICAL paragraph in their criteria text: focus on professional judgement and pathway, never repeat graphic detail, never speculate about cause or perpetrator.

## Failure patterns

Education-specific failure patterns referenced by watch-outs (defined in `scoring/_shared.js` under `EDUCATION_FAILURE_PATTERNS` and in `lib/score-candidate.js` for the legacy scoring path):

- "Did not log behaviour incident"
- "Missed safeguarding referral to DSL"
- "Parent confrontation escalated"
- "Did not flag SEN concern"
- "Skipped DSL involvement on disclosure"
- "Lesson preparation gap"
- "Pupil progress concern unaddressed"
