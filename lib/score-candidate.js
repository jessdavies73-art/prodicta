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

  const prompt = `You are a senior talent assessment specialist. A candidate has completed 4 work simulation scenarios for the role of ${assessment.role_title}. Your job is to produce a precise, commercially grounded assessment of whether this candidate will succeed in their probation period.

You are not writing a performance review. You are not being kind. You are producing a professional assessment that an employer will pay for and rely on to make a hiring decision. Be accurate, be specific, and be honest.

---

ROLE: ${assessment.role_title}

JOB DESCRIPTION:
${assessment.job_description}

---

CANDIDATE RESPONSES:

${scenarioSections}

---

ASSESSMENT FRAMEWORK

Before scoring, consider:
- What does a top performer in this specific role actually do differently from an average performer?
- Which responses show genuine domain competence vs. generic, safe-sounding answers?
- Where did the candidate show real commercial judgment vs. just describing what they would "consider"?
- What patterns appear across multiple scenarios — both positive and concerning?
- What would the first three months actually look like with this person in the role?

SCORING RULES:
- Score each skill 0–100 based on the quality of work product demonstrated, not effort or intent
- 90–100: Exceptional. Rare. The response would have been impressive from a seasoned hire.
- 75–89: Strong. Solid, reliable performance. Minor gaps but nothing that would cause problems.
- 60–74: Moderate. Directionally correct but missing precision, specificity, or commercial edge.
- 45–59: Developing. The instincts are there but the execution is not at the level this role requires.
- Below 45: Concern. Material gaps that pose a real risk to probation success.
- Be calibrated. Most candidates should score in the 55–80 range. Reserve 85+ for genuinely exceptional responses. Don't inflate.
- Overall score = weighted average of skill scores using these weights: ${JSON.stringify(skillWeights)}

NARRATIVE RULES — these are critical:
- Every score_narrative must quote at least one specific phrase the candidate actually wrote, in quotation marks
- Explain precisely why that phrase indicates strength or weakness for THIS role
- Compare the response to what a strong performer in this specific role would have done differently
- Do not praise generic things like "structured approach" or "awareness" without evidence
- If the candidate wrote very little or gave a vague response, say so plainly

STRENGTHS — 2 to 4 items:
- Each strength must name a specific capability demonstrated, not a personality trait
- The evidence must quote or directly reference something the candidate actually wrote
- Strengths should be things that would make a material difference in this specific role

WATCHOUTS — 1 to 4 items (only real concerns, not invented risks):
- Only include watchouts where there is genuine evidence of a gap
- Severity: High = likely to cause probation failure without intervention; Medium = manageable with support; Low = worth monitoring
- The action must be a specific, practical intervention — not "provide coaching" or "monitor closely"
- If the candidate performed strongly across the board, it is acceptable to have only 1 low-severity watchout

AI SUMMARY — 4 paragraphs:
Paragraph 1: Overall performance and standout qualities. What kind of professional is this? Quote specific evidence.
Paragraph 2: The one or two scenarios that best reveal who this candidate is — what they showed, and what it predicts about their behaviour in the role.
Paragraph 3: The honest concerns. Where did they fall short? What gaps could affect their probation? Be direct.
Paragraph 4: Clear hiring recommendation. One of: "Strong hire", "Hire with structured onboarding", "Proceed with caution — specific risks below", or "Not recommended at this stage". Explain what the probation period will likely look like.
Write in UK English. Professional but direct. No HR jargon.

ONBOARDING PLAN — 5 to 7 items:
- Must be directly based on the gaps and patterns identified in the scoring
- Week-by-week, specific actions tied to what this candidate actually needs
- Reference UK employment practices where relevant (probation review timing, CIPD frameworks, ERA)
- Do not include generic onboarding tasks (laptop setup, team introductions) — focus on performance risk mitigation

INTERVIEW QUESTIONS — exactly 4 questions:
- Each question must probe a specific gap or uncertainty identified in this assessment
- Use the STAR format framing but make the question specific to what you found (not generic behavioural questions)
- Include a follow-up probe for each question that would reveal whether the candidate's answer is genuine
- Format: "Main question. [Follow-up: follow-up probe.]"

PERCENTILE:
Estimate where this candidate sits relative to others assessed for this type of role.
- 95+ overall: "Top 5%"
- 88–94: "Top 10%"
- 82–87: "Top 20%"
- 75–81: "Top 30%"
- 65–74: "Top 45%"
- 55–64: "Top 60%"
- Below 55: "Bottom 40%"

RISK LEVEL:
- "Very Low": 85+ overall, no material watchouts
- "Low": 75–84, watchouts are minor and manageable
- "Medium": 60–74, or any High severity watchout
- "High": below 60, or multiple High severity watchouts

---

Return ONLY a JSON object with this exact structure. No preamble, no explanation, no markdown.

{
  "overall_score": 78,
  "scores": {
    ${skillNames.map(s => `"${s}": 75`).join(',\n    ')}
  },
  "score_narratives": {
    ${skillNames.map(s => `"${s}": "Two to three sentences. Quote specific phrases from the candidate's response. Explain what the score reflects and what a stronger response would have looked like."`).join(',\n    ')}
  },
  "strengths": [
    { "text": "Name of the specific capability demonstrated", "evidence": "Direct reference to or quote from what the candidate wrote that demonstrates this" }
  ],
  "watchouts": [
    { "text": "Specific gap or concern", "evidence": "Direct reference to or quote from the response that reveals this gap", "severity": "Medium", "action": "Specific practical intervention the employer should take in weeks 1–4" }
  ],
  "ai_summary": "Four paragraphs as described above. UK English. No bullet points.",
  "risk_level": "Low",
  "risk_reason": "One sentence explaining the primary driver of this risk rating.",
  "onboarding_plan": [
    "Week 1: [Specific action tied to a gap identified in this assessment]",
    "Weeks 1–4: [Specific action]",
    "Week 4: First formal probation review — specific things to assess based on the gaps identified",
    "Week 8: Mid-probation review — specific milestones that indicate whether the risk areas are improving",
    "Ongoing: [Any longer-term development actions]"
  ],
  "interview_questions": [
    "Specific behavioural question probing gap 1. [Follow-up: specific follow-up probe.]",
    "Specific behavioural question probing gap 2. [Follow-up: specific follow-up probe.]",
    "Specific behavioural question probing gap 3. [Follow-up: specific follow-up probe.]",
    "Specific behavioural question probing gap 4. [Follow-up: specific follow-up probe.]"
  ],
  "percentile": "Top 30%"
}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
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
