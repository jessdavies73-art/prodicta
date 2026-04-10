import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { role_title, job_description, skill_weights, save_as_template, template_name, context_answers, assessment_mode } = await request.json()
    // Normalise mode: 'quick' (2 scenarios), 'standard' (3 scenarios), 'advanced' (4 scenarios). Legacy 'rapid' -> quick.
    const rawMode = (assessment_mode || 'standard').toLowerCase()
    const mode = rawMode === 'rapid' ? 'quick' : (['quick', 'standard', 'advanced'].includes(rawMode) ? rawMode : 'standard')
    const isQuick    = mode === 'quick'
    const isStandard = mode === 'standard'
    const isAdvanced = mode === 'advanced'

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // ── Unsuitable role detection ───────────────────────────────────────────────
    // Block roles that are primarily physical, repetitive, or short-term temporary
    // before we burn any tokens. Friendly message returned to the UI.
    const unsuitableText = `${role_title} ${job_description}`.toLowerCase()
    const UNSUITABLE_PATTERNS = [
      /\bwarehouse operative\b/,
      /\bpicker\b/,
      /\bpacker\b/,
      /\bpicker\s*\/?\s*packer\b/,
      /\bdelivery driver\b/,
      /\blorry driver\b/,
      /\bhgv driver\b/,
      /\bhgv\b/,
      /\bcleaner\b/,
      /\blabourer\b/,
      /\btemporary\b/,
      /\bseasonal\b/,
      /\bagency temp\b/,
    ]
    if (UNSUITABLE_PATTERNS.some(p => p.test(unsuitableText))) {
      return NextResponse.json({
        error: 'unsuitable_role',
        message: 'This role type may not be suitable for scenario-based assessment. PRODICTA works best for roles involving decision-making, communication, and problem-solving. Roles that are primarily physical, repetitive, or short-term temporary may not benefit from this type of assessment.',
      }, { status: 422 })
    }

    // ── Sector detection (drives sector-specific scenario guidance) ─────────────
    const sectorText = `${role_title} ${job_description}`.toLowerCase()
    const sectorHas = (...words) => words.some(w => sectorText.includes(w))
    let sector = 'general'
    if (sectorHas('nurse', 'midwife', 'paramedic', 'healthcare assistant', 'hca ', 'physiotherap', 'occupational therap', 'radiograph', 'pharmacist', 'ward manager', 'clinical lead', 'mental health support', 'nhs', 'a&e', 'a & e', 'emergency department')) sector = 'healthcare'
    else if (sectorHas('care worker', 'senior carer', 'support worker', 'domiciliary', 'registered manager', 'care assistant', 'residential care', 'supported living', 'safeguarding adults')) sector = 'social_care'
    else if (sectorHas('teaching assistant', 'hlta', 'sen support', 'school administrator', 'pastoral lead', 'cover supervisor', 'teacher', 'classroom', 'pupil', 'safeguarding children', 'sendco', 'send ')) sector = 'education'
    else if (sectorHas('council officer', 'benefits advisor', 'planning officer', 'social worker', 'housing officer', 'civil servant', 'local authority', 'central government', 'public sector')) sector = 'public_sector'
    else if (sectorHas('electrician', 'plumber', 'gas engineer', 'maintenance technician', 'site manager', 'facilities manager', 'tradesperson', 'on site', 'engineer technician')) sector = 'trades'
    else if (sectorHas('restaurant manager', 'hotel receptionist', 'bar manager', 'retail manager', 'store supervisor', 'duty manager', 'hospitality', 'front of house', 'hotel ', 'shop floor', 'merchand', 'concession')) sector = 'hospitality_retail'
    else if (sectorHas('paralegal', 'legal secretary', 'conveyanc', 'solicitor', 'legal assistant', 'compliance officer', 'barrister', 'law firm')) sector = 'legal'
    else if (sectorHas('software developer', 'software engineer', 'devops', 'qa tester', 'technical lead', 'product manager', 'it support', 'systems administrator', 'sysadmin', 'data analyst', 'ux designer', 'scrum master', 'cto', 'backend', 'frontend', 'fullstack', 'full stack', 'sre', 'data engineer', 'data scientist')) sector = 'technology'
    else if (sectorHas('accounts assistant', 'management accountant', 'financial controller', 'credit controller', 'payroll manager', 'finance director', 'bookkeeper', 'tax advisor', 'auditor', 'fp&a', 'accountant', 'reconciliation', 'month end', 'month-end')) sector = 'finance'
    else if (sectorHas('marketing manager', 'content writer', 'social media manager', 'graphic designer', 'brand manager', 'digital marketing', 'pr manager', 'communications officer', 'campaign manager', 'copywriter', 'creative director')) sector = 'marketing'
    else if (sectorHas('sales executive', 'business development manager', 'account manager', 'sales director', 'inside sales', 'key account manager', 'telesales', 'bdr', 'sdr', 'pipeline', 'sales pipeline', 'new business sales')) sector = 'sales'
    else if (sectorHas('hr advisor', 'hr manager', 'people partner', 'talent acquisition', 'hr director', 'recruitment coordinator', 'learning and development', 'l&d manager', 'people operations')) sector = 'hr'
    else if (sectorHas('operations manager', 'logistics coordinator', 'supply chain', 'production manager', 'quality manager', 'warehouse manager', 'fleet manager', 'operations director')) sector = 'operations'
    else if (sectorHas('charity', 'non-profit', 'nonprofit', 'fundraiser', 'volunteer coordinator', 'impact manager', 'trustee', 'third sector')) sector = 'charity'
    else if (sectorHas('quantity surveyor', 'estate agent', 'property manager', 'building surveyor', 'contracts manager', 'site manager', 'project manager construction', 'rics', 'planning consent')) sector = 'property_construction'
    else if (sectorHas('receptionist', 'office administrator', 'office admin', 'admin assistant', 'administrative assistant', 'data entry', 'personal assistant', ' pa ', 'executive assistant', 'secretary', 'office manager', 'front of house admin', 'front desk')) sector = 'admin_reception'

    const SECTOR_GUIDANCE = {
      healthcare: `SECTOR: HEALTHCARE / NHS.
Build scenarios from: patient safety decisions, safeguarding concerns, working under staffing pressure, handling difficult patients or families, escalation to senior clinicians, handover accuracy, infection control decisions, and prioritising competing patient needs. Use realistic ward, clinic or community settings, named colleagues (consultant, nurse in charge, ward manager, HCA), and recognisable NHS pressures (bed pressures, short staffing, missed breaks).
DO NOT generate scenarios that require specific clinical knowledge such as drug dosages, dosing calculations, ECG interpretation, or differential diagnosis. Focus on decision making, communication, prioritisation and safeguarding. Never include sales pipelines, board presentations, P&L, KPIs or commercial targets.`,

      social_care: `SECTOR: SOCIAL CARE.
Build scenarios from: safeguarding vulnerable adults, lone working decisions, medication administration as a process (never clinical dosing), family communication, dignity and respect, reporting concerns, capacity assessments, and boundary setting with service users. Use realistic care settings (residential, supported living, domiciliary visits), named service users with brief context, and recognisable pressures (lone working, missed visits, family disagreements).
Never include sales, pipelines, board presentations, KPIs, marketing or commercial strategy.`,

      education: `SECTOR: EDUCATION.
Build scenarios from: safeguarding children, managing disruptive behaviour, communicating with parents, supporting SEN pupils, working alongside teaching staff, reporting concerns, and adapting to unexpected changes in the school day. Use realistic primary or secondary school settings, named pupils and parents, and recognisable pressures (cover at short notice, parent complaints, behaviour incidents).
Never include sales, pipelines, board presentations, commercial KPIs or P&L.`,

      public_sector: `SECTOR: PUBLIC SECTOR / LOCAL GOVERNMENT.
Build scenarios from: following policy and procedure, handling complaints from members of the public, data protection decisions, working across departments, prioritising statutory deadlines, and politically sensitive communications. Use realistic council, government department or housing settings, named residents or applicants, and recognisable pressures (statutory deadlines, FOI requests, ward councillor enquiries).
Never include sales targets, commercial pipelines or private sector P&L language.`,

      trades: `SECTOR: TRADES AND TECHNICAL.
Build scenarios from: health and safety decisions, client communication, prioritising multiple jobs across the day, dealing with unexpected problems on site, working independently, quality versus speed decisions, and reporting faults or concerns. Use realistic site or customer settings, named clients, and recognisable pressures (parts not arriving, customer not happy, second job overrunning).
Never include strategy decks, sales pipelines, board reporting or marketing campaigns.`,

      hospitality_retail: `SECTOR: HOSPITALITY AND RETAIL.
Build scenarios from: customer complaints, team management during busy periods, handling difficult customers, stock or cash discrepancies, health and safety, covering for absent staff, and upselling or service standards. Use realistic shop, restaurant, bar or hotel settings, named team members and customers, and recognisable pressures (a no-show shift, a complaint that escalates, a busy service hour).
Never include corporate strategy, board reporting or B2B sales pipelines.`,

      technology: `SECTOR: TECHNOLOGY.
Build scenarios from: debugging under pressure, stakeholder communication about technical issues, prioritising bug fixes versus feature work, code review disagreements, incident response, estimating delivery timelines, explaining technical concepts to non-technical stakeholders, and handling scope creep. Use realistic team and product settings, named colleagues (PM, tech lead, designer, support), and recognisable pressures (production incident, sprint slipping, blocked PR, vague brief).
Avoid clinical, classroom or shop-floor framing.`,

      finance: `SECTOR: FINANCE AND ACCOUNTING.
Build scenarios from: month-end pressure, audit preparation, variance analysis, stakeholder queries about numbers, reconciliation discrepancies, regulatory compliance, fraud or irregularity detection, and balancing accuracy with deadlines. Use realistic finance team settings, named colleagues (FC, FD, auditor, budget holder), and recognisable pressures (close week, missing supporting docs, pushed-back deadline).
Avoid clinical, classroom or trades framing.`,

      marketing: `SECTOR: MARKETING AND CREATIVE.
Build scenarios from: campaign deadline pressure, stakeholder feedback on creative work, budget constraints, balancing multiple projects, data-driven decisions versus creative instinct, client or internal brief changes, and measuring ROI. Use realistic agency or in-house marketing settings, named stakeholders (brand lead, designer, sales, agency partner), and recognisable pressures (last-minute brief change, copy not approved, paid budget cut).
Avoid clinical, classroom or trades framing.`,

      sales: `SECTOR: SALES AND BUSINESS DEVELOPMENT.
Build scenarios from: pipeline management, handling rejection, client relationship management, negotiation pressure, hitting targets under pressure, upselling, dealing with competitor threats, and managing client expectations. Use realistic sales settings, named prospects and accounts, and recognisable pressures (deal at risk, quarter end, undercut by competitor).
Avoid clinical, classroom or care-setting framing.`,

      hr: `SECTOR: HR AND PEOPLE.
Build scenarios from: employee grievances, disciplinary processes, redundancy conversations, recruitment decisions, policy interpretation, supporting managers with difficult conversations, TUPE transfers, and absence management. Use realistic HR settings, named employees and managers, and recognisable pressures (formal process timing, sensitive disclosures, line manager wanting a shortcut).
Score policy adherence and confidentiality higher than commercial framing.`,

      operations: `SECTOR: OPERATIONS AND LOGISTICS.
Build scenarios from: supply chain disruptions, scheduling conflicts, quality control decisions, health and safety incidents, managing shift patterns, dealing with suppliers, and cost reduction pressure. Use realistic operations settings, named colleagues and suppliers, and recognisable pressures (late delivery, broken kit, staff shortage on a shift).
Avoid clinical, classroom or pure office framing.`,

      charity: `SECTOR: CHARITY AND NON-PROFIT.
Build scenarios from: funding pressure, volunteer management, safeguarding, stakeholder reporting, balancing mission with financial reality, trustee communication, and beneficiary complaints. Use realistic third-sector settings, named volunteers, beneficiaries, trustees, and funders, and recognisable pressures (grant deadline, beneficiary in crisis, volunteer no-show).
Treat safeguarding as a high-priority dimension. Avoid hard commercial framing that ignores mission.`,

      property_construction: `SECTOR: PROPERTY AND CONSTRUCTION.
Build scenarios from: project delays, health and safety on site, client expectations, budget overruns, subcontractor management, planning disputes, and defect resolution. Use realistic site or property settings, named clients and subcontractors, and recognisable pressures (programme slipping, defect found at handover, planning objection).
Health and safety must be treated as non-negotiable.`,

      admin_reception: `SECTOR: ADMINISTRATION AND RECEPTION.
Build scenarios from: managing a busy front desk with multiple demands at once, handling a difficult visitor or caller, prioritising incoming requests, diary management conflicts, dealing with confidential information, supporting multiple managers with competing deadlines, and handling a complaint when the right person is unavailable. Use realistic office or reception settings, named visitors, callers and managers, and recognisable pressures (phone ringing while a visitor is at the desk, two managers wanting the same slot, a courier interrupting).
These are often entry-level roles. Keep scenarios straightforward and practical, not strategic. Test multitasking, communication, common sense and reliability. Do NOT expect leadership, commercial thinking, P&L awareness or board-level framing. A receptionist scenario should feel like a busy Monday morning, not a board meeting.`,

      legal: `SECTOR: LEGAL.
Build scenarios from: client confidentiality, managing case deadlines, dealing with difficult clients, prioritising competing matters, billing accuracy, working with counsel, and compliance decisions. Use realistic firm settings, named clients and matters, and recognisable pressures (limitation deadlines, missing client documents, fee earner under pressure).
Avoid clinical, classroom, or shop-floor framing.`,
    }

    const sectorGuidanceBlock = SECTOR_GUIDANCE[sector]
      ? `\n\nSECTOR-SPECIFIC GUIDANCE (you MUST follow this):\n${SECTOR_GUIDANCE[sector]}\n\nEvery scenario must feel like a real day in this specific job. A nurse must never get a scenario about managing a sales pipeline. A care worker must never get a scenario about board presentations. Read the JD and write scenarios that the actual person doing this job would recognise as their normal week.\n`
      : ''

    // ── Seniority detection (drives scenario complexity) ────────────────────────
    // -- ALTER TABLE assessments ADD COLUMN role_level TEXT DEFAULT 'MID_LEVEL';
    const seniorityText = `${role_title} ${job_description}`.toLowerCase()
    let seniorityTier = 'mid'
    if (/\b(junior|jr\.?|graduate|trainee|entry.?level|apprentice|assistant|intern|care worker|receptionist|driver|operative|coordinator|support worker|cleaner|porter|carer)\b/.test(seniorityText)) seniorityTier = 'junior'
    else if (/\b(director|head of|vp|vice president|chief|cxo|ceo|cto|cfo|coo|managing director|md\b|partner|principal)\b/.test(seniorityText)) seniorityTier = 'senior'
    else if (/\b(senior|sr\.?|lead|staff engineer|head)\b/.test(seniorityText)) seniorityTier = 'senior'

    // Map to role_level for Pressure Gauge tiers
    const roleLevel = seniorityTier === 'junior' ? 'OPERATIONAL' : seniorityTier === 'senior' ? 'LEADERSHIP' : 'MID_LEVEL'

    const SENIORITY_GUIDANCE = {
      junior: `SENIORITY: OPERATIONAL / ENTRY LEVEL.
ASSESSMENT STYLE: Rapid-Fire Prioritisation. Create short, punchy, real-world situations. "The delivery is late, a customer is shouting, and the floor is wet. What do you do first?" Keep scenarios practical and task-based. Test immediate reliability, safety awareness, basic communication, and following process under pressure. Expect short answers (50-100 words). Speed of response matters more than depth. Do NOT expect strategic thinking, leadership, commercial awareness, or budget decisions. A care worker gets a patient safety scenario, not a ward management crisis. A receptionist gets a busy front desk scenario, not a stakeholder management challenge. Avoid scenarios requiring managing people, owning budgets, or organisation-wide decisions. Frame scenarios conversationally as if coming from a supervisor.`,

      mid: `SENIORITY: MID LEVEL.
ASSESSMENT STYLE: Resource Constraint Scenarios. Give them a task then add a constraint mid-scenario. "You need to deliver the project by Friday, but the budget was just cut by 20% and your best team member called in sick." Build scenarios that involve managing competing priorities, handling difficult conversations, and making independent decisions. Test resourcefulness, problem-solving, prioritisation, and resilience. Expect 150-250 word responses with structured thinking. A mid-level nurse gets a staffing crisis requiring escalation decisions. A mid-level accountant gets a month-end pressure scenario with stakeholder pushback. Avoid framing as either pure task execution or pure strategic vision.`,

      senior: `SENIORITY: LEADERSHIP.
ASSESSMENT STYLE: Stakeholder Conflict Navigation. Present two conflicting but equally valid opinions from senior stakeholders. "The CFO wants to cut the marketing budget by 40%. The CMO says this will destroy the brand. You are the MD. What do you do?" Build scenarios involving strategy, trade-offs, political intelligence, and high-stakes decisions. Test strategic thinking, stakeholder management, decision-making under ambiguity, and ability to lead through conflicting priorities. Expect detailed 250-400 word responses with nuanced reasoning. Frame scenarios in a boardroom context with named stakeholders holding opposing positions. A finance director gets a board presentation with conflicting data. A senior developer gets an architecture decision with trade-offs. Do NOT reduce these scenarios to simple task execution.`,
    }

    const seniorityGuidanceBlock = `\n\nSENIORITY GUIDANCE (you MUST follow this in addition to the sector guidance):\n${SENIORITY_GUIDANCE[seniorityTier]}\nThis applies regardless of sector. Combine the sector framing with this seniority calibration. A junior in any sector should never get a leadership scenario. A senior in any sector should never get a pure task-execution scenario.\n`

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const standard3Prompt = `You are a specialist assessment designer for UK businesses. Your job is to create THREE work simulation scenarios for this role. These are for a 25-minute Depth-Fit Assessment, the right balance of depth and candidate experience for most roles.

These are NOT hypothetical exercises. Each scenario must be built from actual tasks listed in the job description. The candidate should feel like they are already in the role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, failure modes, and success criteria directly into every scenario.
` : ''}---

STEP 1 - EXTRACT ROLE INTELLIGENCE

Read the job description and identify the specific tasks, tools, KPIs, stakeholders, seniority level, sector, and day-to-day pressures. Build the scenarios from this, not from generic templates for the job title.

---

SCENARIO 1 - "Can they do the job?" (Type: "Core Task", Time: 9 minutes)

Take a core responsibility from the JD and give the candidate that actual work to do. Include realistic email content, data, or briefing material at least 80 words long. The output must reveal whether they can execute the fundamental work of this role competently.

---

SCENARIO 2 - "Will they last under pressure?" (Type: "Pressure Test", Time: 8 minutes)

Take another real task from the JD but add pressure: a competing deadline, a difficult stakeholder, a system that has gone down, or an unexpected problem mid-task. The candidate must complete real work while managing the pressure. Feeds the four Pressure-Fit sub-scores.

---

SCENARIO 3 - "Will they fit?" (Type: "Judgment Call", Time: 8 minutes)

A scenario involving a colleague, manager, or competing team priorities, built around a real task from the JD. The candidate must navigate the relationship while still producing a concrete decision, response, or plan.

---

OUTPUT FORMAT

Return ONLY a JSON array with exactly 3 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation",
    "context": "The full situation in present tense. At least 130 words. Named characters, specific numbers. Must feel like a real working day.",
    "task": "Exactly what the candidate must produce. One specific deliverable.",
    "timeMinutes": 9,
    "skills": ["Communication", "Problem solving"]
  }
]

The three scenario types must be: "Core Task", "Pressure Test", "Judgment Call"

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms. Pull everything from the JD.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`

    const prompt = isQuick ? `You are a specialist assessment designer for UK businesses. Your job is to create TWO rapid work simulation scenarios for this role. These are for a 15-minute rapid assessment - they must be tightly focused on the highest-priority skills from the job description.

These are NOT hypothetical exercises. Each scenario must be built from actual tasks listed in the job description. The candidate should feel like they are already in the role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, failure modes, and success criteria directly into every scenario.
` : ''}---

STEP 1 - IDENTIFY THE TWO HIGHEST-PRIORITY SKILLS FROM THE JD

Read the job description. Identify the two most critical skills that will determine whether this hire succeeds or fails in the first 90 days. Build one scenario around each.

---

SCENARIO 1 - Core capability test (Type: "Core Task", Time: 7 minutes)

The single most important task this person will do. Test whether they can execute it. Pull a specific task directly from the JD. Give them real content to work with. The output must reveal whether they can actually do the job.

---

SCENARIO 2 - Pressure and judgment (Type: "Pressure Test", Time: 8 minutes)

A realistic pressure situation drawn from the JD. A competing deadline, a difficult stakeholder, or an unexpected problem mid-task. They must do real work under pressure. The output must reveal how they handle the stress of the role.

---

OUTPUT FORMAT

Return ONLY a JSON array with exactly 2 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation",
    "context": "The full situation in present tense. At least 100 words. Named characters, specific numbers. Must feel like a real working day.",
    "task": "Exactly what the candidate must produce. One specific deliverable.",
    "timeMinutes": 7,
    "skills": ["Communication", "Problem solving"]
  }
]

The two scenario types must be: "Core Task", "Pressure Test"

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.` : isStandard ? standard3Prompt : `You are a specialist assessment designer for UK businesses. Your job is to create four work simulation scenarios that test whether this specific hire will succeed, last, and fit.

These are NOT hypothetical exercises or personality tests. Each scenario must be built from actual tasks, responsibilities, and requirements listed in the job description. The candidate should feel like they are already in the role on a Tuesday morning, doing real work.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}
${context_answers && Object.values(context_answers).some(v => v?.trim()) ? `
ADDITIONAL CONTEXT PROVIDED BY THE HIRING MANAGER:
${Object.entries(context_answers).map(([, v]) => v?.trim()).filter(Boolean).map(v => `- ${v}`).join('\n')}

Treat these answers as ground truth. Weave the environment, team size, pace, challenges, failure modes, and success criteria directly into every scenario.
` : ''}
---

STEP 1 - EXTRACT ROLE INTELLIGENCE (do this before writing scenarios)

Read the job description and extract the following. Use every item you identify to shape the scenarios:

- The specific tasks and deliverables this person will be responsible for
- The exact tools, systems, platforms, or software mentioned
- The KPIs, targets, or performance measures they will be judged on
- The internal and external stakeholders they will work with (job titles, team structure)
- The seniority level and who they report to
- The industry, sector, and any regulatory or commercial context
- The pace, environment, and likely day-to-day pressures
- Any specific processes, clients, campaigns, reports, or workflows described

If the JD mentions Salesforce, use Salesforce. If it mentions a £500k target, use that number. If it mentions managing a team of five, give them a team of five. If it mentions cold calling, create a cold calling situation. Pull the actual work from the actual JD.

Two job descriptions with the same role title must produce completely different scenarios. A Sales Executive at a car dealership is not a Sales Executive at a SaaS company. Read the JD, not the job title.

---

STEP 2 - WRITE 4 SCENARIOS, EACH TESTING A DIFFERENT DIMENSION OF SUCCESS

Each scenario must:
- Be built around an actual task or responsibility from the JD, not an abstract situation
- Use realistic UK company names, UK colleague names (mix of genders and cultural backgrounds), and monetary figures appropriate for this role and seniority
- Include specific numbers: deadlines, budgets, team sizes, deal values, targets, percentages
- Be written in present tense as if it is already happening. Never use "imagine", "suppose", or "pretend"
- Drop the candidate into an ongoing situation with history, politics, and competing pressures already in play
- Have genuine ambiguity with no single obvious right answer
- Have a context section of at least 150 words with named characters and specific details
- Have a task that demands a real work product (an actual email, a specific ranked plan, a concrete decision with rationale). Not a reflection or opinion.

---

SCENARIO 1 - "Can they do the job?" (Type: "Core Task", Time: 12 minutes)

Take a core responsibility from the JD and give the candidate that actual work to do. If the JD says they manage accounts, give them an account situation to handle. If it says they write reports, give them the data and ask for the report. If it says they handle customer complaints, give them a complaint. If it says they build pipelines, give them a pipeline problem.

The scenario must test whether the candidate can execute the fundamental work of this role competently. There should be enough information to do the task well, but the quality of their output will reveal their actual capability level.

Include a realistic email thread, document, data set, or briefing they must respond to or work with. The email thread or context material must be at least 80 words of realistic, specific content.

This scenario feeds primarily into: Skills Breakdown scores, the pass probation probability, and the Candidate Type Snapshot.

---

SCENARIO 2 - "Will they last under pressure?" (Type: "Pressure Test", Time: 10 minutes)

Take another real task from the JD but add pressure. The pressure must be specific and realistic for this role: a competing deadline on a second piece of work, a difficult stakeholder pushing back, a system that has gone down, a key resource that is unavailable, or an unexpected problem that has landed mid-task.

The candidate must complete real work while managing the pressure. This is not just a prioritisation exercise. They should be doing something, not just deciding what to do.

This scenario must heavily feed into ALL FOUR Pressure-Fit sub-scores:
- Composure Under Stress: do they stay focused and clear-headed when the task gets harder?
- Resilience: do they adapt and find a route through, or do they freeze or escalate unnecessarily?
- Composure Under Conflict: is there a stakeholder creating friction they must navigate while completing the work?
- Ownership and Accountability: do they take responsibility for the outcome, or do they look for someone else to blame or defer to?

Also feeds into: the underperformance risk probability.

---

SCENARIO 3 - "Will they fit?" (Type: "Judgment Call", Time: 12 minutes)

A scenario involving the team, the manager, or the company culture, built around a real task from the JD. A colleague disagrees with their approach on a piece of work they are jointly responsible for. A manager gives vague instructions on a deliverable with a hard deadline. Two departments want different things from the same output. A more senior person is wrong but confident.

The candidate must navigate the relationship while still completing real work. This is not just a values exercise. They should produce something: a decision, a response, a plan for how they will handle both the task and the person.

This scenario feeds primarily into:
- Composure Under Conflict (Pressure-Fit sub-score)
- Ownership and Accountability (Pressure-Fit sub-score)
- The Candidate Type Snapshot (how they describe their approach reveals their working style)

---

SCENARIO 4 - "Will they stay?" (Type: "Staying Power", Time: 14 minutes)

A scenario where the reality of the role is harder or more mundane than expected, built around actual day-to-day tasks from the JD. The exciting project has been delayed. A process they want to improve is protected by someone senior. They are doing the routine, unglamorous work that the role actually requires most of the time.

Add pressure elements to raise the stakes: a tight deadline on the routine work, a frustrated colleague or client who is not impressed, a manager asking for results on something the candidate clearly finds boring, or limited support for something they must complete alone.

The candidate must show they can stay motivated, take ownership, and produce quality output even when the work is not what they hoped for.

This scenario feeds into:
- ALL FOUR Pressure-Fit sub-scores (this is the fullest test of their pressure response)
- Churn risk probability in the Predicted Outcome Panel (candidates who disengage in this scenario are significantly more likely to leave within 6 months)
- The Reality Timeline (their response tells you how their first 90 days will actually go)
- Underperformance risk probability

---

SCORING GUIDANCE (do not include in output - use to shape what the scenarios reveal)

When writing each scenario, be deliberate about what a strong response looks like versus a weak one. Strong responses will:
- Show genuine competence with the actual work of the role
- Maintain quality and composure when pressure is applied
- Take ownership rather than escalate or defer unnecessarily
- Demonstrate self-awareness about the less glamorous parts of the role

Weak responses will reveal:
- Surface-level capability that does not hold up under scrutiny
- Disengagement or frustration when the work is hard or dull
- Conflict avoidance or inappropriate escalation in relationship scenarios
- A preference for the interesting parts of the job over the essential parts

These contrasts must flow naturally from the scenario design, not from hints in the task wording.

---

OUTPUT FORMAT

Return ONLY a JSON array with exactly 4 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Core Task",
    "title": "Concise title describing the situation (not the task)",
    "context": "The full situation in present tense. Must be at least 150 words. Include named characters, specific numbers, and the full email thread, data, or briefing the candidate must work with. Must feel like a real working day at a real UK company in this specific sector.",
    "task": "Exactly what the candidate must produce. One specific deliverable. Tell them the format, the recipient, and any constraints. Do not hint at the right approach.",
    "timeMinutes": 12,
    "skills": ["Communication", "Negotiation"]
  }
]

The four scenario types must be: "Core Task", "Pressure Test", "Judgment Call", "Staying Power"

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms. No generic scenarios. No abstract situations. Pull everything from the JD.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`

    const finalPrompt = prompt.replace(
      'FORMATTING RULE: Never use em dash',
      `${sectorGuidanceBlock}${seniorityGuidanceBlock}\nFORMATTING RULE: Never use em dash`
    )

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: finalPrompt }]
    })

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const scenarios = JSON.parse(jsonStr)

    // Detect role type
    const jdLower = job_description.toLowerCase()
    const t = `${role_title} ${jdLower}`.toLowerCase()
    const has = (...words) => words.some(w => t.includes(w))
    let detected_role_type = 'general'
    if (sector !== 'general') detected_role_type = sector
    else if (false) {} // keep legacy fallthroughs below intact
    else if (has('legal counsel', 'solicitor', 'paralegal', 'barrister', 'compliance officer')) detected_role_type = 'legal'
    else if (has('nurse', 'carer', 'care worker', 'support worker', 'healthcare', 'clinical', 'midwife', 'safeguarding')) detected_role_type = 'healthcare'
    else if (has('finance director', 'accountant', 'bookkeeper', 'accounts assistant', 'finance manager', 'fp&a', 'controller', 'auditor', 'tax ', 'payroll')) detected_role_type = 'finance'
    else if (has('sales', 'business development', 'account manager', 'account executive', 'pipeline', 'revenue', 'bdr', 'sdr')) detected_role_type = 'sales'
    else if (has('marketing', 'campaign', 'brand', 'content marketing', 'digital marketing', 'seo', 'growth marketing')) detected_role_type = 'marketing'
    else if (has('hr ', ' hr', 'people partner', 'people operations', 'talent acquisition', 'recruiter', 'l&d', 'learning and development')) detected_role_type = 'hr'
    else if (has('engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'devops', 'data scientist', 'data engineer', 'qa ', 'sre')) detected_role_type = 'engineering'
    else if (has('customer service', 'customer support', 'contact centre', 'call centre', 'helpdesk', 'service advisor', 'customer experience')) detected_role_type = 'customer_service'
    else if (has('operations manager', 'operations director', 'logistics', 'supply chain', 'warehouse', 'fulfilment', 'dispatch')) detected_role_type = 'operations'
    else if (has('director', 'head of', 'chief', 'managing director', 'general manager')) detected_role_type = 'management'
    else if (has('office manager', 'office', 'admin', 'administrator', 'receptionist', 'secretary', 'personal assistant', ' pa ', 'executive assistant')) detected_role_type = 'office'

    // Save assessment to Supabase (use service role to bypass RLS for the insert)
    const adminClient = createServiceClient()

    const { data: assessment, error } = await adminClient
      .from('assessments')
      .insert({
        user_id: user.id,
        role_title,
        job_description,
        detected_role_type,
        role_level: roleLevel,
        scenarios,
        skill_weights: skill_weights || { Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 },
        status: 'active',
        assessment_mode: mode,
        ...(context_answers && Object.values(context_answers).some(v => v?.trim()) && {
          context_answers,
        }),
        ...(save_as_template && {
          is_template: true,
          template_name: template_name?.trim() || role_title,
        }),
      })
      .select()
      .single()

    if (error) throw error

    // -- ALTER TABLE assessments ADD COLUMN calendar_events JSONB;
    // Generate calendar events for Day One Planning (async, non-blocking)
    try {
      const calMsg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate realistic first-Monday calendar events for a "${role_title}" role (${roleLevel} level).

Return JSON only. UK English. No emoji. No em dashes.
{
  "fixed_events": [
    {"time": "09:00", "title": "string", "type": "meeting"},
    {"time": "10:30", "title": "string", "type": "meeting"},
    {"time": "15:30", "title": "string", "type": "meeting"}
  ],
  "interruption": {"time": "11:00", "title": "string", "type": "interruption"},
  "deadline": {"time": "14:00", "title": "string", "type": "deadline"},
  "unscheduled_tasks": [
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"},
    {"title": "string", "type": "task"}
  ]
}

${roleLevel === 'OPERATIONAL' ? 'Use simple practical events: team briefing, floor walk, safety check, stock count. Tasks: check equipment, read safety notices, shadow experienced colleague, complete induction form.' : roleLevel === 'LEADERSHIP' ? 'Use board-level events: exec team meeting, board strategy session, investor call. Tasks: review board papers, prepare stakeholder map, draft 90-day priorities, schedule direct report introductions.' : 'Use mid-level events: team standup, client call, 1-to-1 with manager. Tasks: review team briefing docs, respond to client emails, prepare agenda for planning session, update project tracker.'}`
        }],
      })
      const calText = calMsg.content[0]?.text || ''
      const calMatch = calText.match(/\{[\s\S]*\}/)
      if (calMatch) {
        const calEvents = JSON.parse(calMatch[0].replace(/[\u2014\u2013]/g, ', '))
        await adminClient.from('assessments').update({ calendar_events: calEvents }).eq('id', assessment.id)
      }
    } catch (calErr) {
      console.error('Calendar events generation error:', calErr)
    }

    return NextResponse.json({ id: assessment.id, scenarios })
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
