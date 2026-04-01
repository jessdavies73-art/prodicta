import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { role_title, job_description, skill_weights, save_as_template, template_name } = await request.json()

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `You are a specialist assessment designer for UK businesses. Your job is to create four work simulation scenarios that are indistinguishable from real situations this specific candidate would face in their first 90 days.

These are NOT hypothetical exercises or personality tests. They are realistic work simulations grounded entirely in the job description provided. Every scenario must feel like it was pulled from a real working day at a real UK company hiring for this exact role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}

---

STEP 1 — EXTRACT ROLE INTELLIGENCE (do this before writing scenarios)

Read the job description carefully and extract:
- The specific responsibilities this person will own in weeks 1–12
- The key stakeholders they will work with (internal and external)
- The tools, systems, or processes likely used in this role
- The commercial pressures, targets, or KPIs they will be measured against
- The likely team size, seniority level, and reporting structure
- The most common high-pressure situations someone in this role would encounter
- Any specific industry, sector, or regulatory context that shapes the role

Use these facts to make every scenario feel specific and grounded. Do not write generic scenarios that could apply to any role.

---

STEP 2 — WRITE 4 SCENARIOS

Each scenario must:
- Use realistic UK company names, UK colleague names (mix of genders and cultural backgrounds), and monetary figures appropriate for the industry and role seniority
- Include specific numbers: budgets, percentages, deadlines, team sizes, deal values, headcounts — all plausible for this exact role
- Be written in present tense as if it is already happening — never use "imagine", "suppose", or "pretend"
- Include an ongoing situation the candidate has walked into — with history, politics, and competing pressures already in play
- Have genuine ambiguity — no single obvious "right answer"
- Have a context section of at least 150 words with named characters and specific details
- Have a task that demands a real work product (an actual email, a specific ranked plan, a concrete decision with rationale) — not a reflection or opinion

---

SCENARIO 1 — Written Communication Under Pressure (Type: "Email Response", Time: 12 minutes)
The candidate must write an actual email to a real stakeholder situation specific to this role. Include the full email or message thread they are responding to, with realistic names and specifics. The situation must involve competing interests, some emotional or political charge, and a consequence if handled badly. The email thread must be at least 80 words of realistic dialogue.

SCENARIO 2 — Triage and Prioritisation (Type: "Prioritisation", Time: 10 minutes)
The candidate arrives on a Monday morning to find 6 competing urgent demands, each from a named stakeholder with a legitimate reason for urgency. At least one item must carry a legal, compliance, or reputational risk specific to this industry. At least one item must feel urgent but be genuinely deferrable. The candidate must rank all 6, delegate where appropriate, and explain their reasoning — not just list the order.

SCENARIO 3 — Judgment Call in a Difficult Situation (Type: "Judgment Call", Time: 12 minutes)
The candidate faces a situation with no clean resolution specific to this role and industry. It must involve a named colleague, client, or stakeholder behaving in a way that creates a real dilemma. Include interpersonal or political complexity — a broken process, an ethical grey area, or a decision that requires acting without full information or authority. They must state what they would do, how they would handle the person involved, and what they would not do.

SCENARIO 4 — Commercial or Strategic Diagnosis (Type: "Strategic Thinking", Time: 14 minutes)
The candidate is shown specific data that reveals something is going wrong — declining performance, a deal at risk, a process failing, a team issue. The data must be precise enough to require genuine analysis (percentages, timelines, named accounts or team members). They must identify the most likely root cause from the evidence, propose 2–3 specific interventions with reasoning, and explain how they would measure success within 30 days.

---

OUTPUT FORMAT

Return ONLY a JSON array with exactly 4 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Email Response",
    "title": "Concise title describing the situation (not the task)",
    "context": "The full situation in present tense. Must be at least 150 words. Include named characters, specific numbers, and the full email thread or message the candidate must respond to. Must feel like a real Monday morning at a real UK company.",
    "task": "Exactly what the candidate must produce. One specific deliverable. Tell them the format, the recipient, and any constraints. Do not hint at the right approach.",
    "timeMinutes": 12,
    "skills": ["Communication", "Negotiation"]
  }
]

Skills must be chosen only from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Write in UK English throughout. No Americanisms. No generic scenarios.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const scenarios = JSON.parse(jsonStr)

    // Detect role type
    const jdLower = job_description.toLowerCase()
    let detected_role_type = 'general'
    if (['sales', 'revenue', 'pipeline', 'account manager', 'business development'].some(w => jdLower.includes(w))) detected_role_type = 'sales'
    else if (['marketing', 'campaign', 'brand', 'content', 'digital'].some(w => jdLower.includes(w))) detected_role_type = 'marketing'
    else if (['engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack', 'devops'].some(w => jdLower.includes(w))) detected_role_type = 'engineering'

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
