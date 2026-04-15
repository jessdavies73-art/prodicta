// ── Pre-built role templates for one-click assessment setup ──────────────

function t(id, title, level, mode, responsibilities, pressure, success, prefill) {
  return {
    id,
    role_title: title,
    role_level: level,
    recommended_mode: mode,
    key_responsibilities: responsibilities,
    pressure_points: pressure,
    success_looks_like: success,
    context_prefill: prefill,
  }
}

// ── PERMANENT HIRE TEMPLATES (5) ────────────────────────────────────────

export const PERMANENT_TEMPLATES = [
  t('p-cs-advisor', 'Customer Service Advisor', 'OPERATIONAL', 'speed-fit',
    ['Handle customer enquiries by phone, email, and chat', 'Resolve complaints professionally and efficiently', 'Process orders, returns, and account changes', 'Meet daily call and satisfaction targets'],
    'High call volume, difficult customers, repetitive tasks, performance targets',
    'Handling 50+ interactions per day with consistently positive customer feedback and low escalation rate by month 3 of probation',
    { q0: 'Handle high volumes of customer enquiries across multiple channels while maintaining satisfaction scores', q1: 'High call volume, demanding customers, time pressure between calls, repetitive queries', q2: 'Patient, calm under pressure, strong communicator, able to follow process while showing empathy', q3: 'Previous employees struggled with call volume, lost patience with difficult customers, or failed to follow escalation procedures' }),

  t('p-sales-exec', 'Sales Executive', 'MID_LEVEL', 'speed-fit',
    ['Generate new business through outbound prospecting', 'Manage a pipeline of qualified leads through to close', 'Meet monthly and quarterly revenue targets', 'Build and maintain client relationships', 'Report on activity and forecast accurately'],
    'Target pressure, rejection, pipeline management, competitive market, end-of-quarter urgency',
    'Consistently hitting 80%+ of target by month 3 of probation, building a healthy pipeline, and managing their own time effectively',
    { q0: 'Generate revenue and build pipeline through outbound activity and relationship management', q1: 'Target pressure, handling rejection, managing competing priorities, end-of-quarter urgency', q2: 'Resilient, commercially driven, self-motivated, strong communicator, organised with pipeline management', q3: 'Previous employees gave up after rejection, could not self-manage activity levels, or overpromised to clients' }),

  t('p-finance-mgr', 'Finance Manager', 'MID_LEVEL', 'depth-fit',
    ['Oversee financial reporting and management accounts', 'Manage budgets, forecasting, and cash flow', 'Lead the finance team and manage audits', 'Ensure regulatory compliance and controls', 'Provide financial insight to support decision-making'],
    'Month-end deadlines, audit pressure, regulatory compliance, cross-functional stakeholder demands',
    'Month-end process running smoothly with accurate reporting and insight delivered to the leadership team by month 3 of probation',
    { q0: 'Deliver accurate financial reporting and insight to support business decisions', q1: 'Month-end deadlines, audit pressure, regulatory requirements, stakeholder queries', q2: 'Detail-oriented, analytical, strong communicator, commercially aware, able to lead a team', q3: 'Previous employees were technically strong but could not communicate insight to non-finance stakeholders' }),

  t('p-ops-mgr', 'Operations Manager', 'MID_LEVEL', 'depth-fit',
    ['Oversee day-to-day operations and team performance', 'Drive process improvement and operational efficiency', 'Manage budgets, resources, and capacity planning', 'Ensure health and safety and regulatory compliance', 'Report on operational KPIs and deliver against targets'],
    'Competing priorities, people management challenges, budget pressure, compliance requirements',
    'Operations running efficiently with measurable improvements and team performing well by month 3 of probation',
    { q0: 'Deliver operational excellence through process improvement and strong team management', q1: 'Competing priorities, people challenges, budget pressure, compliance requirements', q2: 'Organised, decisive, strong people manager, data-driven, commercially aware', q3: 'Previous employees could not balance operational detail with strategic improvement' }),

  t('p-md', 'Managing Director', 'LEADERSHIP', 'strategy-fit',
    ['Set the strategic direction and lead the executive team', 'Deliver financial performance and growth targets', 'Build culture and drive organisational development', 'Manage board and stakeholder relationships', 'Lead major change and transformation initiatives'],
    'Board accountability, strategic complexity, organisational change, external market pressures',
    'Strategic plan in place with executive team aligned and key metrics moving in the right direction by month 3 of probation',
    { q0: 'Lead the organisation to deliver its strategic vision and financial objectives', q1: 'Board accountability, strategic complexity, change management, external pressures', q2: 'Visionary, commercially astute, strong communicator, builds trust, decisive under pressure', q3: 'Previous hires were either too hands-on in the detail or too removed from the operational reality' }),
]

// ── TEMPORARY PLACEMENT TEMPLATES (5) ───────────────────────────────────

export const TEMPORARY_TEMPLATES = [
  t('t-cs-advisor', 'Temp Customer Service Advisor', 'OPERATIONAL', 'rapid',
    ['Handle customer enquiries by phone, email, or chat', 'Resolve complaints and process requests', 'Follow scripts and procedures', 'Meet daily call and satisfaction targets'],
    'High call volume, unfamiliar products, difficult customers, performance targets',
    'Handling calls independently with good customer feedback within the first week of the assignment',
    { q0: 'Deliver good customer service from day one with minimal product training', q1: 'High volume, unfamiliar products, difficult customers, targets', q2: 'Patient, calm, good communicator, quick learner, resilient', q3: 'Previous temps could not learn the product quickly enough or lost patience with difficult callers' }),

  t('t-warehouse-op', 'Temp Warehouse Operative', 'OPERATIONAL', 'rapid',
    ['Pick, pack, and dispatch orders accurately', 'Follow health and safety procedures', 'Maintain a clean and organised work area', 'Meet daily picking and dispatch targets'],
    'Physical demands, targets, health and safety, peak periods',
    'Picking and packing accurately and safely from the first day of the assignment',
    { q0: 'Pick, pack, and dispatch accurately and safely from day one', q1: 'Physical demands, accuracy targets, health and safety requirements', q2: 'Reliable, physically fit, safety-conscious, accurate, works at pace', q3: 'Previous temps had poor attendance, ignored safety rules, or made too many picking errors' }),

  t('t-admin', 'Temp Administrator', 'OPERATIONAL', 'rapid',
    ['Provide general administrative support', 'Handle data entry, filing, and correspondence', 'Answer phones and direct enquiries', 'Support the team with ad hoc tasks'],
    'Multiple task requests, unfamiliar systems, short notice, minimal handover',
    'Working independently on core admin tasks within the first week of the assignment',
    { q0: 'Provide reliable admin support from day one with minimal handover', q1: 'Unfamiliar systems, multiple task requests, short notice changes', q2: 'Organised, adaptable, quick learner, professional, reliable', q3: 'Previous temps needed too much supervision or could not adapt to new systems quickly' }),

  t('t-care-worker', 'Temp Care Worker', 'OPERATIONAL', 'rapid',
    ['Provide personal care and support to service users', 'Follow care plans and report changes in condition', 'Administer medication following protocols', 'Maintain accurate daily records'],
    'Safeguarding situations, lone working, emotional demands, unfamiliar service users',
    'Providing safe, compassionate care from the first shift of the assignment',
    { q0: 'Deliver safe, person-centred care from the first shift', q1: 'Unfamiliar service users, safeguarding, lone working, emotional demands', q2: 'Compassionate, reliable, calm, good at following procedures, adaptable', q3: 'Previous temps did not read care plans properly or struggled with unfamiliar environments' }),

  t('t-delivery-driver', 'Temp Delivery Driver', 'OPERATIONAL', 'rapid',
    ['Deliver goods to customers on schedule', 'Load and secure vehicle correctly', 'Maintain delivery records and obtain signatures', 'Follow route plans and adapt to changes'],
    'Time pressure, route changes, vehicle issues, customer interactions',
    'Completing delivery rounds on time with accurate records from the first day of the assignment',
    { q0: 'Deliver on time with good customer interactions from day one', q1: 'Time pressure, route changes, vehicle issues, customer interactions', q2: 'Reliable, good time management, professional, calm under pressure', q3: 'Previous temps had poor time management or were unprofessional with customers' }),
]

// Legacy export for backwards compatibility
export const ROLE_TEMPLATES = PERMANENT_TEMPLATES
