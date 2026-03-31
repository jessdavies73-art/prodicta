import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

export async function scoreCandidate(candidateId) {
  const adminClient = createServiceClient()

  // Get candidate with assessment
  const { data: candidate, error: candError } = await adminClient
    .from('candidates')
    .select('*, assessments(role_title, job_description, scenarios, skill_weights)')
    .eq('id', candidateId)
    .single()

  if (candError || !candidate) throw new Error('Candidate not found')

  // Guard against double-scoring
  const { data: existingResult } = await adminClient
    .from('results')
    .select('id')
    .eq('candidate_id', candidateId)
    .maybeSingle()

  if (existingResult) return { alreadyScored: true }

  // Get responses
  const { data: responses, error: respError } = await adminClient
    .from('responses')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('scenario_index', { ascending: true })

  if (respError || !responses || responses.length === 0) {
    throw new Error('No responses found for candidate')
  }

  const assessment = candidate.assessments
  const scenarios = assessment.scenarios || []

  const scenarioSections = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    return `Scenario ${i + 1}: ${sc.title}
Context: ${sc.context}
Task: ${sc.task}
Candidate Response: ${resp ? resp.response_text : '[No response provided]'}`
  }).join('\n\n')

  const skillWeights = assessment.skill_weights || {
    Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25
  }
  const skillNames = Object.keys(skillWeights)

  const prompt = `You are a senior talent assessment specialist producing a paid professional report. A candidate has completed 4 work simulation scenarios for the role of ${assessment.role_title}. Your assessment will be read by a hiring manager or HR director making a real employment decision. Write accordingly.

This is not a performance review. Do not be kind for kindness's sake. Be precise, commercially grounded, and honest.

---

ROLE: ${assessment.role_title}

JOB DESCRIPTION:
${assessment.job_description}

---

CANDIDATE RESPONSES:

${scenarioSections}

---

SCORING FRAMEWORK

Before scoring, ask yourself:
- What does a top performer in this specific role do differently from an average one?
- Which responses show genuine domain competence vs. safe, generic answers that any candidate might give?
- Where did the candidate show real commercial or professional judgment vs. describing what they would "consider" or "look into"?
- What patterns appear across multiple responses — recurring strengths or recurring gaps?
- What would the first 90 days actually look like with this person in the role?

SCORE EACH SKILL 0–100:
- 90–100: Exceptional. Would have impressed a seasoned hire. Reserve for responses that show real mastery.
- 75–89: Strong. Solid, reliable. Minor gaps but nothing that would cause problems.
- 60–74: Moderate. Directionally correct but missing precision, specificity, or commercial edge.
- 45–59: Developing. The instincts are present but the execution is not at the level this role requires.
- Below 45: Concern. Material gaps that pose a genuine risk to probation success.

Most candidates score 55–80. Do not inflate. Reserve 85+ for genuinely exceptional responses.

Overall score = weighted average using these weights: ${JSON.stringify(skillWeights)}

---

SCORE NARRATIVES — rules:
- Must be 2–3 sentences per skill
- Must quote at least one specific phrase the candidate actually wrote, in quotation marks
- Explain precisely why that phrase indicates strength or weakness for THIS specific role
- Compare to what a strong performer in this role would have done differently
- If the candidate wrote vaguely or briefly, say so plainly

STRENGTHS — 2 to 4 items:
- Each must name a specific demonstrated capability, not a personality trait
- The evidence field must quote or directly reference something the candidate actually wrote — verbatim where possible
- Only include strengths that would make a material difference in this specific role

WATCH-OUTS — 1 to 4 items (only where genuine evidence exists):
- Only include watch-outs where the candidate's response provides clear evidence of a gap
- Severity must be one of: "High" (likely to cause probation failure without intervention), "Medium" (manageable with structured support), "Low" (worth monitoring)
- The action must be a specific, practical step the employer can take in weeks 1–4 — not "provide coaching" or "monitor closely"
- If the candidate performed strongly, 1 low-severity watch-out is acceptable

AI SUMMARY — exactly 4 paragraphs, minimum 80 words each:
Paragraph 1: What kind of professional is this? What are their standout qualities? Quote specific evidence from their responses. Set the context for the assessment.
Paragraph 2: The one or two scenarios that best reveal who this candidate is — what they showed and what it predicts about their behaviour in this specific role over the first 90 days.
Paragraph 3: The honest concerns. Where did they fall short? What gaps could affect their probation? Be direct and specific. Reference what they wrote (or failed to write).
Paragraph 4: Clear hiring recommendation. Use exactly one of: "Strong hire", "Hire with structured onboarding", "Proceed with caution — specific risks identified", or "Not recommended at this stage". Explain what the probation period will likely look like with this person.
Write in UK English. Professional but direct. No HR jargon. No bullet points within the summary.

ONBOARDING PLAN — 5 to 7 items:
- Every item must be directly tied to a gap or pattern identified in this candidate's responses
- Must be week-specific (Week 1, Weeks 1–4, Week 4, Week 8, Ongoing)
- Reference UK employment practices where relevant: CIPD frameworks, Employment Rights Act 2025 probationary period provisions, statutory review timings
- Week 4 item must specify what to assess at the first formal probation review based on this candidate's specific gaps
- Week 8 item must specify what mid-probation milestones would indicate the risk areas are improving
- Do not include generic tasks (laptop setup, team introductions)

INTERVIEW QUESTIONS — exactly 4 questions:
- Each must probe a specific gap or uncertainty identified in this assessment — not generic behavioural questions
- Use STAR framing but make the question specific to what was found
- Each question must include a follow-up probe that would reveal whether the candidate's answer is genuine
- Format: "Main question. [Follow-up: specific follow-up probe.]"

PERCENTILE:
- Overall 95+: "Top 5%"
- 88–94: "Top 10%"
- 82–87: "Top 20%"
- 75–81: "Top 30%"
- 65–74: "Top 45%"
- 55–64: "Top 60%"
- Below 55: "Bottom 40%"

RISK LEVEL:
- "Very Low": 85+, no material watch-outs
- "Low": 75–84, watch-outs are minor and manageable
- "Medium": 60–74, or any High severity watch-out present
- "High": below 60, or multiple High severity watch-outs

RISK REASON: One specific sentence explaining the primary driver of this risk rating, referencing what was observed in the responses — not a generic statement.

---

Return ONLY a JSON object with this exact structure. No preamble, no markdown.

{
  "overall_score": 78,
  "scores": {
    ${skillNames.map(s => `"${s}": 75`).join(',\n    ')}
  },
  "score_narratives": {
    ${skillNames.map(s => `"${s}": "2–3 sentences. Quote a specific phrase from the candidate's response in quotation marks. Explain what the score reflects and what a stronger response would have looked like for this role."`).join(',\n    ')}
  },
  "strengths": [
    { "text": "Name of the specific capability demonstrated", "evidence": "Verbatim quote or direct reference from what the candidate wrote that demonstrates this strength" }
  ],
  "watchouts": [
    { "text": "Specific gap or concern", "evidence": "Verbatim quote or direct reference from the response that reveals this gap", "severity": "Medium", "action": "Specific practical step the employer should take in weeks 1–4 to address this" }
  ],
  "ai_summary": "Four paragraphs as described. UK English. No bullet points. Minimum 80 words per paragraph.",
  "risk_level": "Low",
  "risk_reason": "One specific sentence referencing what was observed — not a generic statement.",
  "onboarding_plan": [
    "Week 1: [Specific action tied to a gap identified in this assessment]",
    "Weeks 1–4: [Specific structured support tied to this candidate's needs]",
    "Week 4: First formal probation review — specific things to assess based on the gaps found",
    "Week 8: Mid-probation review — specific milestones that indicate whether risk areas are improving",
    "Ongoing: [Any longer-term development actions tied to this candidate]"
  ],
  "interview_questions": [
    "Specific behavioural question probing gap 1. [Follow-up: specific follow-up probe that tests authenticity.]",
    "Specific behavioural question probing gap 2. [Follow-up: specific follow-up probe.]",
    "Specific behavioural question probing gap 3. [Follow-up: specific follow-up probe.]",
    "Specific behavioural question probing gap 4. [Follow-up: specific follow-up probe.]"
  ],
  "percentile": "Top 30%"
}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20251001',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].text.trim()
  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  const result = JSON.parse(jsonStr)

  const { error: insertError } = await adminClient.from('results').insert({
    candidate_id: candidateId,
    overall_score: result.overall_score,
    scores: result.scores,
    score_narratives: result.score_narratives,
    strengths: result.strengths,
    watchouts: result.watchouts,
    ai_summary: result.ai_summary,
    risk_level: result.risk_level,
    risk_reason: result.risk_reason,
    onboarding_plan: result.onboarding_plan,
    interview_questions: result.interview_questions,
    percentile: result.percentile,
  })

  if (insertError) throw insertError

  return { success: true, overall_score: result.overall_score }
}
