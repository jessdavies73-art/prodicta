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

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const standard3Prompt = `You are a specialist assessment designer for UK businesses. Your job is to create THREE work simulation scenarios for this role. These are for a 25-minute Standard Assessment, the right balance of depth and candidate experience for most roles.

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

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const scenarios = JSON.parse(jsonStr)

    // Detect role type
    const jdLower = job_description.toLowerCase()
    const t = `${role_title} ${jdLower}`.toLowerCase()
    const has = (...words) => words.some(w => t.includes(w))
    let detected_role_type = 'general'
    if (has('legal counsel', 'solicitor', 'paralegal', 'barrister', 'compliance officer')) detected_role_type = 'legal'
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

    return NextResponse.json({ id: assessment.id, scenarios })
  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
