// Healthcare shell block catalogue. Plain data (no React, no client
// directives) so server code (scenario-generator, /api/assessment/generate)
// can import metadata without pulling the JSX components into the server
// bundle. Each block .jsx file in this folder re-exports its own entry
// from this file as `metadata`. The dynamic loader lives in ./index.js
// (client-only).
//
// Phase 2 ships 10 stub blocks. Each entry mirrors the office shell
// shape so the orchestrator, scoring fan-out, and Highlight Reel can
// treat the shells uniformly. scoring_signals are placeholders today
// and will be sharpened when each real block scorer ships.

export const BLOCK_CATALOGUE = {
  'patient-handover': {
    id: 'patient-handover',
    name: 'Patient Handover',
    shell_family: 'healthcare',
    category: 'coordination',
    work_types: ['communication', 'coordination', 'analysis'],
    default_duration_seconds: 240,
    scoring_signals: ['acuity_judgment', 'clinical_priority', 'handover_completeness', 'escalation_judgment'],
  },
  'buzzer-alert-queue': {
    id: 'buzzer-alert-queue',
    name: 'Buzzer / Alert Queue',
    shell_family: 'healthcare',
    category: 'coordination',
    work_types: ['decisions', 'coordination'],
    default_duration_seconds: 180,
    scoring_signals: ['priority_judgment', 'clinical_vs_comfort', 'response_speed'],
  },
  'medication-round': {
    id: 'medication-round',
    name: 'Medication Round',
    shell_family: 'healthcare',
    category: 'analysis',
    work_types: ['analysis', 'decisions'],
    default_duration_seconds: 240,
    scoring_signals: ['attention_to_detail', 'interaction_spotting', 'safety_judgment'],
  },
  'clinical-decision-queue': {
    id: 'clinical-decision-queue',
    name: 'Clinical Decision Queue',
    shell_family: 'healthcare',
    category: 'decision',
    work_types: ['decisions'],
    default_duration_seconds: 240,
    scoring_signals: ['clinical_judgment', 'escalation_judgment', 'risk_awareness'],
  },
  'doctor-instruction-handling': {
    id: 'doctor-instruction-handling',
    name: 'Doctor / Senior Instruction Handling',
    shell_family: 'healthcare',
    category: 'communication',
    work_types: ['communication', 'decisions'],
    default_duration_seconds: 180,
    scoring_signals: ['clarification_quality', 'safety_challenge', 'execution_accuracy'],
  },
  'family-visitor-interaction': {
    id: 'family-visitor-interaction',
    name: 'Family / Visitor Interaction',
    shell_family: 'healthcare',
    category: 'communication',
    work_types: ['communication'],
    default_duration_seconds: 300,
    scoring_signals: ['empathy', 'boundary_setting', 'difficult_conversation_handling'],
  },
  'care-plan-review': {
    id: 'care-plan-review',
    name: 'Care Plan Review',
    shell_family: 'healthcare',
    category: 'analysis',
    work_types: ['analysis', 'creation'],
    default_duration_seconds: 240,
    scoring_signals: ['risk_spotting', 'documentation_quality', 'clinical_reasoning'],
  },
  'safeguarding-incident': {
    id: 'safeguarding-incident',
    name: 'Safeguarding Incident',
    shell_family: 'healthcare',
    category: 'decision',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['safeguarding_recognition', 'escalation_judgment', 'documentation_completeness'],
  },
  'clinical-crisis-simulation': {
    id: 'clinical-crisis-simulation',
    name: 'Clinical Crisis Simulation',
    shell_family: 'healthcare',
    category: 'dynamic',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['composure', 'rapid_decisions', 'team_communication_under_pressure'],
  },
  'patient-family-conversation': {
    id: 'patient-family-conversation',
    name: 'Patient / Family Conversation',
    shell_family: 'healthcare',
    category: 'dynamic',
    work_types: ['communication'],
    default_duration_seconds: 300,
    scoring_signals: ['empathy', 'difficult_conversation_handling', 'clarity_under_emotion'],
  },
}

// Stage order for narrative flow. Same five-stage model as the Office
// shell so the orchestrator can present blocks in a coherent arc:
//   1 = setup        (what the candidate inherits at the start of shift)
//   2 = context      (information they gather / review)
//   3 = output       (work they produce or hand off)
//   4 = pressure     (a clinical or care decision under constraint)
//   5 = resolution   (an escalation or live event)
export const BLOCK_STAGE_ORDER = {
  'patient-handover':           1,
  'buzzer-alert-queue':         1,
  'medication-round':           2,
  'care-plan-review':           2,
  'doctor-instruction-handling': 3,
  'family-visitor-interaction':  3,
  'patient-family-conversation': 3,
  'clinical-decision-queue':    4,
  'safeguarding-incident':      4,
  'clinical-crisis-simulation': 5,
}
