// Education shell block catalogue. Plain data (no React, no client
// directives) so server code (scenario-generator, /api/assessment/generate)
// can import metadata without pulling the JSX components into the
// server bundle. Each block .jsx file in this folder re-exports its
// own entry from this file as `metadata`. The dynamic loader lives in
// ./index.js (client-only).
//
// Phase 2 Education v1.0: all 9 blocks are real interactive components.
// The `is_real` flag stays in the catalogue as a forward-compatible
// indicator (admin harness reads it; future shells can mix real and
// stub blocks during development without orchestrator changes).
//
// scoring_signals are placeholders today and will be sharpened when
// each real block scorer ships in Phase 2.6.

export const BLOCK_CATALOGUE = {
  'class-roster': {
    id: 'class-roster',
    name: 'Class Roster',
    shell_family: 'education',
    category: 'coordination',
    work_types: ['coordination', 'analysis'],
    default_duration_seconds: 240,
    scoring_signals: ['pupil_priority_judgement', 'sen_eal_awareness', 'pattern_recognition'],
    is_real: true,
  },
  'lesson-plan': {
    id: 'lesson-plan',
    name: 'Lesson Plan',
    shell_family: 'education',
    category: 'creation',
    work_types: ['creation', 'analysis'],
    default_duration_seconds: 300,
    scoring_signals: ['learning_objective_clarity', 'differentiation_quality', 'afl_use'],
    is_real: true,
  },
  'parent-communication': {
    id: 'parent-communication',
    name: 'Parent / Carer Communication',
    shell_family: 'education',
    category: 'communication',
    work_types: ['communication', 'coordination'],
    default_duration_seconds: 240,
    scoring_signals: ['tone_calibration', 'response_completeness', 'safeguarding_awareness'],
    is_real: true,
  },
  'behaviour-incident': {
    id: 'behaviour-incident',
    name: 'Behaviour Incident',
    shell_family: 'education',
    category: 'decision',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['incident_judgement', 'policy_alignment', 'documentation_quality'],
    is_real: true,
  },
  'safeguarding-referral': {
    id: 'safeguarding-referral',
    name: 'Safeguarding Referral',
    shell_family: 'education',
    category: 'decision',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['threshold_judgement', 'dsl_escalation', 'documentation_completeness'],
    is_real: true,
  },
  'head-teacher-message': {
    id: 'head-teacher-message',
    name: 'Headteacher Message',
    shell_family: 'education',
    category: 'communication',
    work_types: ['communication', 'decisions'],
    default_duration_seconds: 180,
    scoring_signals: ['clarification_quality', 'execution_accuracy', 'professional_disagreement'],
    is_real: true,
  },
  'cohort-coordination': {
    id: 'cohort-coordination',
    name: 'Cohort Coordination',
    shell_family: 'education',
    category: 'coordination',
    work_types: ['coordination', 'decisions'],
    default_duration_seconds: 300,
    scoring_signals: ['priority_logic', 'staff_delegation', 'parent_communication_planning'],
    is_real: true,
  },
  'conversation-simulation': {
    id: 'conversation-simulation',
    name: 'Conversation Simulation',
    shell_family: 'education',
    category: 'dynamic',
    work_types: ['communication'],
    default_duration_seconds: 300,
    scoring_signals: ['active_listening', 'restorative_practice', 'difficult_conversation_handling'],
    is_real: true,
  },
  'crisis-simulation': {
    id: 'crisis-simulation',
    name: 'Crisis Simulation',
    shell_family: 'education',
    category: 'dynamic',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['composure', 'rapid_decisions', 'safeguarding_under_pressure'],
    is_real: true,
  },
}

// Stage order for narrative flow. Same five-stage model as office and
// healthcare shells so the orchestrator can present blocks in a
// coherent arc:
//   1 = setup        (the cohort, the inbox, the day's starting state)
//   2 = context      (the plan, the data, what the candidate prepares from)
//   3 = output       (what the candidate produces or hands off)
//   4 = pressure     (a decision under constraint)
//   5 = resolution   (the live conversation or escalating crisis)
export const BLOCK_STAGE_ORDER = {
  'class-roster':           1,
  'parent-communication':   1,
  'lesson-plan':            2,
  'head-teacher-message':   3,
  'cohort-coordination':    4,
  'behaviour-incident':     4,
  'safeguarding-referral':  4,
  'conversation-simulation': 5,
  'crisis-simulation':      5,
}
