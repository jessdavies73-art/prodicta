// Shared scaffolding for the Depth-Fit components (Day One Planning
// calendar and Inbox Overload). These run at assessment-create time
// and produce shell+seniority-aware *candidate-facing* content. The
// Monday Morning Reality narrative still scores inline in
// score-candidate.js and reads the candidate's behaviour against this
// content, so it adapts naturally without its own generator.
//
// Three seniority signals exist in the codebase and we read all three
// to make the routing robust:
//   role_profile.seniority_band  six-tier (junior | mid | manager |
//                                senior_manager | director | c_suite)
//                                produced by lib/role-profile-detector.js
//   assessments.role_level       three-tier (OPERATIONAL | LEADERSHIP |
//                                null) set at assessment creation
//   canonical level              numeric 1-4 from the canonical role
//                                mapping match in scenario-generator
//
// Depth-Fit uses a four-tier output (junior | mid | manager | senior)
// because the candidate-facing content shifts substantially between
// manager and senior in healthcare and education. Office content
// folds manager into senior to match the spec the platform shipped
// with.

export function deriveDepthFitSeniority({ role_profile, canonical_level, role_level } = {}) {
  if (Number.isFinite(canonical_level)) {
    if (canonical_level >= 4) return 'senior'
    if (canonical_level === 3) return 'manager'
    if (canonical_level === 2) return 'mid'
    return 'junior'
  }
  const band = role_profile?.seniority_band
  if (band === 'director' || band === 'c_suite' || band === 'senior_manager') return 'senior'
  if (band === 'manager') return 'manager'
  if (band === 'mid') return 'mid'
  if (band === 'junior') return 'junior'
  if (role_level === 'LEADERSHIP') return 'senior'
  if (role_level === 'OPERATIONAL') return 'junior'
  return 'mid'
}

// Per-shell, per-seniority calendar guidance. Each entry is a single
// natural-language line the generator drops into the prompt so the AI
// produces realistic events for the right context. The Office L3
// (manager) tier reuses the senior content because the platform's
// office shell shipped without a separate manager-tier Day One
// Planning treatment.
export const DAY_ONE_GUIDANCE = {
  office: {
    junior: 'Use practical first-day events: team briefing, floor walk, induction meeting, shadow colleague, complete induction form, lunch with team. Tasks: read safety notices, set up workstation, complete induction modules, meet HR.',
    mid: 'Use mid-level first-day events: team standup, manager 1-to-1, project planning, vendor call, prep for kickoff meeting. Tasks: review project tracker, respond to internal email backlog, prepare for stakeholder intro, set up tooling access.',
    manager: 'Use management first-day events: leadership team meeting, strategic review, stakeholder calls, board prep, executive briefing. Tasks: review department metrics, draft 90-day priorities, prepare direct report intros, schedule key stakeholder meetings.',
    senior: 'Use leadership first-day events: leadership team meeting, strategic review, stakeholder calls, board prep, executive briefing. Tasks: review board papers, prepare stakeholder map, draft 90-day priorities, schedule direct report introductions.',
  },
  healthcare: {
    junior: 'Use direct-care first-day events: handover from night shift, observations round, breakfast support for residents, family visit slot, shadow shift senior, mandatory training catchup. Tasks: review care plans, complete moving and handling refresher, sign off mandatory training modules, meet residents on allocated bay. Use placeholder language for clinical detail (the prescribed analgesia, the regular medication round). No real drug names.',
    mid: 'Use clinical-delivery first-day events: handover, ward round, medication round, MDT meeting, doctor review, family meeting. Tasks: review patient notes, complete clinical documentation, prepare for MDT, follow up on outstanding referrals. Use placeholder language for clinical detail (the prescribed regimen, the ward round). No real drug names.',
    manager: 'Use clinical management first-day events: governance review, staff allocation, family complaint follow-up, MDT chair, CQC notification review, escalation huddle. Tasks: review incident log, prepare governance pack, follow up on safeguarding referrals, draft duty roster adjustments. Use placeholder language for clinical detail. No real drug names. Reference CQC, NMC, GMC by name only when the role makes them relevant.',
    senior: 'Use senior healthcare leadership first-day events: board prep, regulatory review, multi-site handover, governance meeting, executive briefing, complaint escalation. Tasks: review serious incident log, prepare CQC engagement, draft board paper, prepare regulator response, schedule executive team intros. Reference CQC, ICB, regulator engagement only when the role makes them relevant.',
  },
  education: {
    junior: 'Use direct-delivery first-day events: meet new class, classroom prep, behaviour briefing with teacher, lunch duty, lesson observation, register. Tasks: read class profile, prepare resources, complete safeguarding induction, review behaviour policy. Anonymise pupils (Pupil A, Pupil B). Never name a real school.',
    mid: 'Use teaching first-day events: lesson preparation, parent meeting, marking deadline, behaviour incident follow-up, planning meeting, school assembly. Tasks: review pupil data, prepare lesson resources, mark assessments, follow up on safeguarding flag, complete weekly planning. Anonymise pupils. Never name a real school.',
    manager: 'Use middle-leadership first-day events: EHCP review, departmental meeting, safeguarding catchup, line management 1-to-1, SLT briefing, behaviour panel. Tasks: review department data, prepare for safeguarding panel, follow up on EHCP cases, draft termly priorities, prepare line management 1-to-1 notes. Reference Ofsted, EHCP, Pupil Premium only when the role makes them relevant. Anonymise pupils. Never name a real school.',
    senior: 'Use senior school leadership first-day events: SLT meeting, governor call, OFSTED prep, staff briefing, parent body meeting, MAT-wide call. Tasks: review school improvement plan, prepare governor pack, draft Ofsted self-evaluation, prepare staff briefing, schedule parent body engagement. Reference Ofsted, MAT, governor body, ICB only when the role makes them relevant. Anonymise pupils. Never name a real school.',
  },
}

// Per-shell, per-seniority inbox guidance. Same shape as DAY_ONE_GUIDANCE
// so the two generators stay symmetric.
export const INBOX_GUIDANCE = {
  office: {
    junior: 'Use practical workplace messages: supervisor asking about shift cover, colleague needing help, induction question, document signature request.',
    mid: 'Use mid-level workplace messages: client call request, budget query, team member needing guidance, supplier delivery, peer needing support.',
    manager: 'Use management workplace messages: board member request, key client escalation, partner enquiry, legal team query, executive team request, direct report escalation.',
    senior: 'Use senior workplace messages: board member request, key client escalation, partner enquiry, legal team query, executive team request.',
  },
  healthcare: {
    junior: 'Use direct-care workplace messages: senior nurse asking about a resident, family member request, colleague needing help with a hoist transfer, mandatory training reminder, GP visit confirmation. Use placeholder language for clinical detail (the prescribed analgesia, the regular round). No real drug names.',
    mid: 'Use clinical workplace messages: doctor request for a blood test, family asking about discharge, pharmacy query, safeguarding referral form, junior nurse asking a question, CQC notification reminder. Use placeholder language for clinical detail. No real drug names.',
    manager: 'Use clinical-management workplace messages: CQC inspector enquiry, family complaint, staff sickness covering shift, safeguarding referral coming through, governance lead requesting update, ICB engagement enquiry. Reference CQC, NMC, GMC, ICB only when the role makes them relevant. Use placeholder language for clinical detail. No real drug names.',
    senior: 'Use senior healthcare leadership workplace messages: media enquiry on an incident, regulatory inspection request, board member follow-up, ICB partnership query, serious incident review. Reference CQC, ICB, regulator engagement only when the role makes them relevant. No real drug names.',
  },
  education: {
    junior: 'Use direct-delivery workplace messages: teacher asking about Pupil X, parent at the school office, colleague asking for help with marking, school admin query, behaviour log entry needed. Anonymise pupils. Never name a real school.',
    mid: 'Use teaching workplace messages: parent complaint about marking, SENCO asking about a Pupil Y review, head of department asking for data, pupil safeguarding flag, marking deadline reminder. Anonymise pupils. Never name a real school.',
    manager: 'Use middle-leadership workplace messages: parent escalation, governor enquiry, social worker requesting case file, safeguarding referral incoming, SLT requesting termly review, OFSTED preparation reminder. Reference Ofsted, EHCP, Pupil Premium only when the role makes them relevant. Anonymise pupils. Never name a real school.',
    senior: 'Use senior school leadership workplace messages: MAT CEO requesting update, parent body governor query, OFSTED inspector follow-up, media enquiry on a safeguarding incident, regulatory authority query. Reference Ofsted, MAT, governor body, ICB only when the role makes them relevant. Anonymise pupils. Never name a real school.',
  },
}

// Compliance language per shell. Used inside generation prompts so the
// AI doesn't drift into definitive clinical or pedagogical claims that
// would breach the platform's observation-language posture.
export function shellComplianceLine(shell_family) {
  if (shell_family === 'healthcare') {
    return 'Compliance: never make definitive clinical claims. Use placeholder language for clinical detail (the prescribed analgesia, the regular round). No real drug names. No specific clinical advice. Reference CQC, NMC, GMC, HCPC by name only when the role makes them relevant.'
  }
  if (shell_family === 'education') {
    return 'Compliance: anonymise pupils (Pupil A, Pupil B). Never name a real school. No specific curriculum content beyond category-level references. Reference Ofsted, EHCP, Pupil Premium by name only when the role makes them relevant.'
  }
  return 'Compliance: keep workplace context realistic and UK-grounded. No real client names.'
}

// Resolve the four-tier seniority for an assessment plus its shell.
// Office shell only ships three tiers; in that case manager folds into
// senior (the spec we shipped with).
export function resolveSeniorityForShell({ shell_family, role_profile, role_level, canonical_level }) {
  const tier = deriveDepthFitSeniority({ role_profile, canonical_level, role_level })
  if (shell_family === 'office' && tier === 'manager') return 'senior'
  return tier
}

// Library version stamp the generators write into the persisted
// payload so we can diagnose stale content without re-running it.
export const DEPTH_FIT_COMPONENTS_VERSION = 'depth-fit-components-v1.0'

// Shared JSON repair: strip em dashes / en dashes which sometimes slip
// past the prompt. The candidate-facing UI uses commas instead.
export function cleanModelJson(text) {
  if (typeof text !== 'string') return ''
  return text.replace(/[—–]/g, ', ')
}
