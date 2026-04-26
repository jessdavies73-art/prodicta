// Office shell block catalogue. Plain data (no React, no client directives)
// so server code (scenario-generator, /api/assessment/generate) can import
// metadata without pulling the JSX components into the server bundle. Each
// block .jsx file in this folder re-exports its own entry from this file
// as `metadata`. The dynamic loader lives in ./index.js (client-only).
//
// scoring_signals lists the candidate-output signals each block surfaces;
// Phase 2 scoring will key off these to weight Workspace contributions to
// the relevant skill dimensions.

export const BLOCK_CATALOGUE = {
  'inbox': {
    id: 'inbox',
    name: 'Inbox',
    shell_family: 'office',
    category: 'coordination',
    work_types: ['communication', 'coordination'],
    default_duration_seconds: 240,
    scoring_signals: ['email_quality', 'tone', 'response_completeness', 'priority_judgment'],
  },
  'slack-teams': {
    id: 'slack-teams',
    name: 'Slack and Teams',
    shell_family: 'office',
    category: 'coordination',
    work_types: ['communication', 'coordination'],
    default_duration_seconds: 180,
    scoring_signals: ['async_clarity', 'tone_register', 'response_speed'],
  },
  'conversation-simulation': {
    id: 'conversation-simulation',
    name: 'Conversation Simulation',
    shell_family: 'office',
    category: 'communication',
    work_types: ['communication'],
    default_duration_seconds: 300,
    scoring_signals: ['active_listening', 'rapport', 'difficult_conversation_handling'],
  },
  'spreadsheet-data': {
    id: 'spreadsheet-data',
    name: 'Spreadsheet and Data',
    shell_family: 'office',
    category: 'analysis',
    work_types: ['analysis'],
    default_duration_seconds: 240,
    scoring_signals: ['variance_spotting', 'numeracy', 'pattern_recognition'],
  },
  'reading-summarising': {
    id: 'reading-summarising',
    name: 'Reading and Summarising',
    shell_family: 'office',
    category: 'analysis',
    work_types: ['analysis', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['comprehension', 'summary_brevity', 'key_signal_extraction'],
  },
  'document-writing': {
    id: 'document-writing',
    name: 'Document Writing',
    shell_family: 'office',
    category: 'creation',
    work_types: ['creation', 'communication'],
    default_duration_seconds: 300,
    scoring_signals: ['structure', 'clarity', 'audience_match', 'argument_quality'],
  },
  'presentation-output': {
    id: 'presentation-output',
    name: 'Presentation Output',
    shell_family: 'office',
    category: 'creation',
    work_types: ['creation'],
    default_duration_seconds: 300,
    scoring_signals: ['narrative_arc', 'evidence_use', 'recommendation_clarity'],
  },
  'decision-queue': {
    id: 'decision-queue',
    name: 'Decision Queue',
    shell_family: 'office',
    category: 'decision',
    work_types: ['decisions'],
    default_duration_seconds: 240,
    scoring_signals: ['decision_speed', 'reasoning_quality', 'escalation_judgment'],
  },
  'approvals': {
    id: 'approvals',
    name: 'Approvals',
    shell_family: 'office',
    category: 'decision',
    work_types: ['decisions'],
    default_duration_seconds: 180,
    scoring_signals: ['risk_judgment', 'escalation_judgment', 'attention_to_detail'],
  },
  'trade-offs': {
    id: 'trade-offs',
    name: 'Trade-offs',
    shell_family: 'office',
    category: 'decision',
    work_types: ['decisions', 'analysis'],
    default_duration_seconds: 240,
    scoring_signals: ['priority_logic', 'tradeoff_articulation', 'reasoning_under_constraint'],
  },
  'calendar-planning': {
    id: 'calendar-planning',
    name: 'Calendar Planning',
    shell_family: 'office',
    category: 'coordination',
    work_types: ['coordination'],
    default_duration_seconds: 180,
    scoring_signals: ['time_blocking', 'priority_judgment', 'realism'],
  },
  'task-prioritisation': {
    id: 'task-prioritisation',
    name: 'Task Prioritisation',
    shell_family: 'office',
    category: 'coordination',
    work_types: ['coordination', 'decisions'],
    default_duration_seconds: 180,
    scoring_signals: ['priority_judgment', 'urgency_vs_importance', 'workload_estimation'],
  },
  'crisis-simulation': {
    id: 'crisis-simulation',
    name: 'Crisis Simulation',
    shell_family: 'office',
    category: 'dynamic',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 240,
    scoring_signals: ['composure', 'rapid_decisions', 'communication_under_pressure'],
  },
  'stakeholder-conflict': {
    id: 'stakeholder-conflict',
    name: 'Stakeholder Conflict',
    shell_family: 'office',
    category: 'dynamic',
    work_types: ['decisions', 'communication'],
    default_duration_seconds: 300,
    scoring_signals: ['conflict_handling', 'political_judgment', 'tone_under_pressure'],
  },
}

// Stage order for narrative flow: setup blocks render first, then context,
// then candidate output, then pressure, then resolution. Used by the
// assembler to order selected blocks and by the orchestrator to surface
// scenario-arc context to the candidate.
//   1 = setup        (first thing they see)
//   2 = context      (what they learn from research/data)
//   3 = output       (what they produce)
//   4 = pressure     (a decision under constraint)
//   5 = resolution   (the high-stakes dynamic event)
export const BLOCK_STAGE_ORDER = {
  'inbox': 1,
  'slack-teams': 1,
  'task-prioritisation': 1,
  'reading-summarising': 2,
  'spreadsheet-data': 2,
  'calendar-planning': 2,
  'conversation-simulation': 3,
  'document-writing': 3,
  'presentation-output': 3,
  'decision-queue': 4,
  'approvals': 4,
  'trade-offs': 4,
  'crisis-simulation': 5,
  'stakeholder-conflict': 5,
}
