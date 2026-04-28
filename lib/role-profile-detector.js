// Role profile detector. Runs once at assessment creation, alongside the
// existing job_breakdown and detected_dimensions calls. Produces the JSONB
// stored on assessments.role_profile and a shell_family string stored on
// assessments.shell_family.
//
// Output schema must match the columns added by
// supabase/migrations/add_role_profile_and_modular_flag.sql.
//
// The function classification list is exhaustive for IN-scope roles. If the
// AI cannot place the role in any of those buckets, it returns
// shell_family = 'out_of_scope' and the assess flow falls back to the
// legacy WorkspacePage. This protects roles like warehouse, driver,
// bartender, manual labour, basic cleaning, hairdresser, foreman, aviation
// crew, agriculture, military from getting an unsuitable Office Workspace.

// Functions that map to the Office shell (Phase 1 implementation).
const OFFICE_FUNCTIONS = [
  'marketing', 'finance', 'hr', 'recruitment', 'legal', 'sales',
  'software_dev', 'it_infrastructure', 'customer_service', 'operations',
  'project_management', 'procurement', 'admin_pa', 'public_sector',
  'senior_leadership', 'aerospace', 'multilingual', 'fmcg_wholesale',
]
// Functions that map to Phase 2 / 3 shells. Phase 1 still detects them so
// the assessment row is correctly classified, but workspace_scenario is
// not generated and the legacy Workspace renders.
const HEALTHCARE_FUNCTIONS = ['healthcare_clinical', 'healthcare_care', 'social_work']
const EDUCATION_FUNCTIONS = ['education_teaching', 'education_support']
// Per the brief, field_ops covers: hospitality, retail, security, sports/
// leisure, real estate (property), creative leads, pharma reps. These roles
// spend most of their day on the floor, on a route, on a site, or in front
// of a customer rather than at a desk.
const FIELD_OPS_FUNCTIONS = [
  'hospitality_management', 'retail_management', 'sports_leisure', 'creative',
  'security_management', 'property', 'pharmaceutical',
]

const ALL_FUNCTIONS = [
  ...OFFICE_FUNCTIONS,
  ...HEALTHCARE_FUNCTIONS,
  ...EDUCATION_FUNCTIONS,
  ...FIELD_OPS_FUNCTIONS,
]

export function shellFamilyForFunction(fn) {
  if (OFFICE_FUNCTIONS.includes(fn)) return 'office'
  if (HEALTHCARE_FUNCTIONS.includes(fn)) return 'healthcare'
  if (EDUCATION_FUNCTIONS.includes(fn)) return 'education'
  if (FIELD_OPS_FUNCTIONS.includes(fn)) return 'field_ops'
  return 'out_of_scope'
}

const PROMPT_RULES = `Classify the role and produce a structured profile. Return JSON only. UK English. No emoji. No em dashes.

Schema:
{
  "work_types": [string],            // any of: decisions, communication, analysis, creation, coordination
  "primary_work_types": [string],    // 2 or 3 of the above, the dominant work modes for THIS role day-to-day
  "seniority_band": string,          // junior | mid | manager | senior_manager | director | c_suite
  "function": string,                // one value from the function list below, or "out_of_scope"
  "sector_context": string,          // free text describing the actual industry/sector this role works in
  "company_size": string,            // startup | scaleup | mid_market | corporate
  "employment_type": string,         // permanent | temporary
  "interaction_internal_external": string, // internal | external | mixed
  "ic_or_manager": string,           // ic | manager
  "stakeholder_complexity": string   // single | multiple | many_competing
}

Work type definitions:
- decisions: evaluating options, making calls, approving or rejecting
- communication: internal and external, written and verbal
- analysis: numbers, data, variance, patterns, summaries
- creation: documents, content, designs, presentations
- coordination: tasks, scheduling, process, follow-up

Function list (use exact lowercase string with underscores). Pick the single best fit:
${ALL_FUNCTIONS.map(f => '  - ' + f).join('\n')}

If the role is clearly NOT one of these (e.g. warehouse operative, HGV driver, bartender, manual labour, basic cleaning, hairdresser, nail technician, charity fundraiser, foreman, aviation crew, agriculture, military), return function = "out_of_scope".

Healthcare classification cues. Choose one of healthcare_clinical / healthcare_care / social_work whenever the role title or job description references any of these signals, regardless of whether the role sits inside or outside the NHS:
- Clinical regulators or registers: NMC, GMC, GPhC, GDC, RCVS, HCPC, Social Work England.
- Provider settings: ward, hospital, clinic, GP surgery, primary care, residential care home, nursing home, domiciliary care, supported living, hospice, mental health unit, dental practice, veterinary practice.
- Inspectorates and frameworks: CQC, Ofsted (children's social care), safeguarding (child or adult), Care Inspectorate (Scotland), HIW (Wales).
- Role titles: registered nurse, nurse practitioner, nursing associate, matron, healthcare assistant, HCA, care worker, support worker, senior care worker, care coordinator, care manager, registered manager, ward manager, doctor (junior, registrar, consultant), GP (salaried, partner, locum), pharmacist, dentist, dental nurse, physiotherapist, occupational therapist, speech and language therapist, dietitian, radiographer, paramedic, midwife, mental health nurse, clinical psychologist, psychiatrist, therapist, counsellor, social worker (children, adult, mental health), team manager (social work), veterinary surgeon, veterinary nurse, practice manager, clinical lead, director of nursing, medical director.

Pick healthcare_clinical for regulated clinical roles (nurse, doctor, pharmacist, dentist, allied health, mental health clinician, vet). Pick healthcare_care for non-clinical care delivery and care management (HCA, care worker, care coordinator, registered care home manager, domiciliary care manager). Pick social_work for any qualified or registered social worker, social work team manager, or service manager in social care.

Education classification cues. Choose one of education_teaching / education_support whenever the role title or job description references any of these signals, regardless of whether the role sits in a state-funded school, an independent school, an academy or MAT, an FE college, a sixth form, a nursery, or a tuition setting:
- Settings: school, primary school, secondary school, academy, free school, multi-academy trust, MAT, sixth form, college, FE, further education, higher education, nursery, pre-school, EYFS, early years, alternative provision, AP, virtual school, special school, PRU, pupil referral unit.
- Role titles: teacher (class teacher, subject teacher, supply teacher), TA, teaching assistant, HLTA, higher level teaching assistant, cover supervisor, NQT, ECT, lead practitioner, senior teacher, SENCO, SEN teacher, SEN teaching assistant, inclusion lead, behaviour support lead, pastoral lead, form tutor, year lead, head of year, designated safeguarding lead, DSL, head of department, head of faculty, curriculum lead, subject coordinator, deputy headteacher, assistant headteacher, headteacher, head teacher, executive headteacher, principal, college principal, CEO of MAT, nursery practitioner, nursery manager, reception teacher, early years lead, FE lecturer, course leader, programme manager, private tutor, EAL specialist.
- Regulators and frameworks: Ofsted, ISI, DfE, ESFA, EFA, Local Authority (when in a school context), virtual school, National Curriculum, EYFS framework, GCSE, A-Level, AS-Level, BTEC, T-Level, EHCP, education health and care plan, Pupil Premium, SEND, special educational needs.

Pick education_teaching for any role that delivers, plans, or leads classroom or curriculum work (teacher, HLTA, lecturer, head of department, headteacher, deputy headteacher, curriculum lead, lead practitioner). Pick education_support for non-teaching education roles that sit alongside the curriculum (TA, SEN TA, cover supervisor, pastoral lead, SENCO, DSL, behaviour support, inclusion lead, nursery practitioner). For school business managers and school office staff, pick the office function unless the description makes clear the role is teaching-adjacent.

IT classification cues. Distinguish it_infrastructure (running the systems the business uses) from software_dev (building product software):
- Pick it_infrastructure for: IT Manager, Infrastructure Manager, Systems Manager, IT Operations Manager, IT Director, Head of IT, Head of Infrastructure, Helpdesk Manager, Service Desk Manager, Network Manager, Network Engineer, Systems Administrator, Cloud Operations Manager, DevOps Manager (when running internal IT), CIO, Chief Information Officer. The work is about ticket queues, vendor management, security patching, identity / M365 / AD, asset refresh, change management, cost control, audit and compliance, on-call rotations against incidents in the systems the business depends on.
- Pick software_dev for: Software Engineer / Senior Engineer, Tech Lead, Engineering Manager, Head of Engineering, VP Engineering, Director of Engineering, CTO (in a product-led tech company). The work is about building product software: sprint planning, code review, deploy pipelines, on-call against product incidents, MTTR, deploy frequency.
- For Head of IT in a non-tech company (e.g. retail, professional services, manufacturing): pick it_infrastructure.
- For Head of Engineering in a tech product company: pick software_dev.

Recruitment classification cues. For senior agency leadership roles (Recruitment Director, Recruitment MD, Managing Director of a recruitment agency, agency owner / founder, Practice Director / Head of Desk in an agency): pick function = recruitment, NOT senior_leadership. The agency-specific colour (placement fees, biller pipeline, client retention, lateral consultant churn, rebate windows) is what matters at scoring time. Only pick senior_leadership for cross-functional generalist MD / CEO roles where the role title is genuinely sector-agnostic and the JD does not anchor it to recruitment.

Legal classification cues. For Partner roles (Partner, Equity Partner, Salaried Partner, Senior Partner, Managing Partner, Name Partner) at law firms or barristers' chambers: pick function = legal with seniority_band = director (or c_suite for managing / senior partners running the firm). Partner work is partnership economics (origination, write-offs, lateral hires, supervision of fee earners) sitting on top of fee-earning, not generic director work.

Rules:
- primary_work_types must be a strict subset of work_types.
- For ic vs manager: a role with direct reports is "manager", otherwise "ic".
- For temporary employment: anything described as contract, temp, interim, locum, fixed-term.
- For sector_context: state the actual industry plainly (e.g. "B2B SaaS scaleup", "NHS trust", "high street retail group", "London law firm", "manufacturing", "private residential care group", "rural mixed veterinary practice"). Do not just echo the function.`

function buildUserPrompt({ roleTitle, jobDescription, contextAnswers, employmentType, mode }) {
  const ctx = contextAnswers && typeof contextAnswers === 'object'
    ? Object.entries(contextAnswers)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
        .join('\n')
    : ''
  return [
    `Role title: ${roleTitle || 'unspecified'}`,
    employmentType ? `Employment type: ${employmentType}` : '',
    mode ? `Assessment mode: ${mode}` : '',
    jobDescription ? `Job description:\n${jobDescription}` : '',
    ctx ? `Additional context:\n${ctx}` : '',
    PROMPT_RULES,
  ].filter(Boolean).join('\n\n')
}

// Best-effort JSON extractor: the model sometimes returns prose around the
// JSON. Mirror the salvage approach used elsewhere in the codebase
// (calendar_events, inbox_events generation in /api/assessment/generate).
function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// Validate and normalise. Anything that doesn't pass shape checks gets
// nulled rather than crashing — the caller treats role_profile as best
// effort and the assess flow can still run without it.
function normalise(raw) {
  if (!raw || typeof raw !== 'object') return null
  const validFn = typeof raw.function === 'string' && raw.function.length > 0
  const fn = validFn ? raw.function : 'out_of_scope'
  const shell_family = shellFamilyForFunction(fn)

  const allowed = (val, list) => list.includes(val) ? val : null
  const arrayOf = (val, list) => Array.isArray(val) ? val.filter(v => list.includes(v)) : []

  const WORK_TYPES = ['decisions', 'communication', 'analysis', 'creation', 'coordination']
  const work_types = arrayOf(raw.work_types, WORK_TYPES)
  let primary_work_types = arrayOf(raw.primary_work_types, WORK_TYPES)
  // primary must be subset of work_types; if not, intersect.
  primary_work_types = primary_work_types.filter(t => work_types.includes(t))
  // Cap primary at 3.
  if (primary_work_types.length > 3) primary_work_types = primary_work_types.slice(0, 3)

  const profile = {
    work_types,
    primary_work_types,
    seniority_band: allowed(raw.seniority_band, ['junior', 'mid', 'manager', 'senior_manager', 'director', 'c_suite']),
    function: fn,
    sector_context: typeof raw.sector_context === 'string' ? raw.sector_context.trim().slice(0, 240) : null,
    company_size: allowed(raw.company_size, ['startup', 'scaleup', 'mid_market', 'corporate']),
    employment_type: allowed(raw.employment_type, ['permanent', 'temporary']),
    interaction_internal_external: allowed(raw.interaction_internal_external, ['internal', 'external', 'mixed']),
    ic_or_manager: allowed(raw.ic_or_manager, ['ic', 'manager']),
    stakeholder_complexity: allowed(raw.stakeholder_complexity, ['single', 'multiple', 'many_competing']),
  }
  return { profile, shell_family }
}

// Public API. The caller passes a configured Anthropic SDK client (the
// /api/assessment/generate route already creates one) plus the role inputs.
// Returns { profile, shell_family } or null on failure. Callers must treat
// null as best-effort: the assessment row should still be inserted without
// role_profile/shell_family, and the legacy Workspace path will run.
export async function detectRoleProfile(client, {
  roleTitle,
  jobDescription,
  contextAnswers,
  employmentType,
  mode,
} = {}) {
  if (!client) return null
  const prompt = buildUserPrompt({ roleTitle, jobDescription, contextAnswers, employmentType, mode })
  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[role-profile-detector] stream init failed', err)
    return null
  }
  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[role-profile-detector] stream completion failed', err)
    return null
  }
  const text = final?.content?.[0]?.text || ''
  const raw = parseJsonResponse(text)
  if (!raw) {
    console.warn('[role-profile-detector] no JSON in response, raw text:', text.slice(0, 500))
    return null
  }
  return normalise(raw)
}

// Re-exports for callers that need the function lists (e.g. admin test
// harness, assembler tests).
export const ROLE_PROFILE_FUNCTIONS = {
  office: OFFICE_FUNCTIONS,
  healthcare: HEALTHCARE_FUNCTIONS,
  education: EDUCATION_FUNCTIONS,
  field_ops: FIELD_OPS_FUNCTIONS,
}
