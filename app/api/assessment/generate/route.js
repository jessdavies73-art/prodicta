import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { role_title, job_description, skill_weights } = await request.json()

    // Auth check
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Call Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `You are a specialist assessment designer for UK businesses. Your job is to create work simulation scenarios that feel indistinguishable from real situations the candidate would face in their first 90 days.

These are NOT personality tests or hypothetical exercises. They are realistic work simulations. Every detail — the names, the numbers, the politics, the stakes — must feel like it came from inside the actual company hiring for this role.

---

ROLE: ${role_title}

JOB DESCRIPTION:
${job_description}

---

STEP 1 — EXTRACT ROLE INTELLIGENCE

Before writing scenarios, extract from the job description:
- What does success look like in the first 90 days?
- Who are the key stakeholders this person will work with?
- What are the most common high-pressure situations in this type of role?
- What tools, systems, or processes are likely in use?
- What commercial pressures or KPIs will this person be measured on?
- What is the likely team size and seniority level?

Use these extracted facts to make scenarios feel specific and grounded.

---

STEP 2 — WRITE 4 SCENARIOS

Write exactly 4 scenarios using the structure below. Each must feel like it was pulled from a real Monday morning in the first 90 days of this specific job.

SCENARIO RULES (apply to all 4):
- Use realistic UK business names, colleague names, and monetary figures appropriate to the industry
- Build in genuine ambiguity — there must be no single obvious "right answer"
- Include competing pressures, incomplete information, or difficult relationships
- The context must describe an ongoing situation the candidate has walked into, not a clean hypothetical
- Never use phrases like "imagine you are" or "suppose that" — write as if it is already happening
- Every number (budget, deadline, team size, deal value) must be specific and plausible for this role
- The task must demand an actual work product (a real email, a reasoned plan, a specific decision) — not a reflection or opinion
- Do NOT explain what the "right" approach is or hint at the desired answer

SCENARIO 1 — Written Communication Under Pressure
The candidate must write an actual email, message, or written response to a real stakeholder situation. The situation should involve competing interests, some emotional charge, and a time constraint. The context must include the message or thread they are responding to.
Type: "Email Response"
Time: 10–14 minutes

SCENARIO 2 — Triage and Prioritisation
The candidate arrives to find 5–7 competing demands on their time, each with legitimate urgency from different stakeholders. At least one item should be a potential legal, compliance, or reputational risk. At least one item should feel urgent but actually be deferrable. The candidate must rank, delegate, and explain their reasoning — not just list the order.
Type: "Prioritisation"
Time: 8–12 minutes

SCENARIO 3 — Judgment Call in a Difficult Situation
The candidate faces a situation with no clean resolution — a difficult person, a broken process, an ethical grey area, or a decision that requires them to act without full information or authority. The situation should involve some interpersonal or political complexity. They must decide what to do and how to handle it.
Type: "Judgment Call"
Time: 10–14 minutes

SCENARIO 4 — Commercial or Strategic Diagnosis
The candidate is given real data showing something is going wrong (churn rising, performance dropping, a deal at risk, a project off-track). They must diagnose the root cause from the available evidence, propose specific interventions with reasoning, and outline how they would measure whether it is working. The data must be specific enough to require analysis, not just intuition.
Type: "Strategic Thinking"
Time: 12–16 minutes

---

OUTPUT FORMAT

Return ONLY a JSON array with exactly 4 objects. No preamble, no explanation, no markdown.

[
  {
    "type": "Email Response",
    "title": "Concise title describing the situation (not the task)",
    "context": "The full situation. Written in present tense as if it is happening now. Include all relevant background: who the stakeholders are, what has already happened, what the pressure is, and any relevant history or politics. Include the actual message or thread the candidate needs to respond to. Minimum 200 words. Must feel like a real situation at a real company.",
    "task": "Exactly what the candidate must produce. One specific deliverable. No ambiguity about the format — tell them precisely what to write, decide, or plan. Do not hint at the right approach.",
    "timeMinutes": 12,
    "skills": ["Communication", "Negotiation"]
  }
]

Skills must be chosen from: Communication, Problem solving, Prioritisation, Leadership, Negotiation, Client management, Judgment, Strategy, Analysis, Crisis management, People management, Technical communication, Stakeholder management, Conflict resolution

Use UK English throughout. No Americanisms.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = message.content[0].text.trim()
    // Strip markdown code blocks if present
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
        status: 'active'
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
