import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase-server'

// Supabase migration required for integrity fields:
// ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;

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

  // Get responses (including time_taken_seconds)
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

  // ── Timing helpers ──────────────────────────────────────────────────────────

  function fmtSecs(s) {
    if (!s) return 'not recorded'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }
  function timeFlag(s) {
    if (!s) return ' [timing not recorded]'
    if (s < 90)   return ' [⚠ RUSHED — under 90 seconds]'
    if (s < 180)  return ' [FAST — under 3 minutes]'
    if (s > 1200) return ' [EXTENDED — over 20 minutes]'
    return ' [Normal]'
  }

  // ── Build scenario blocks with timing ───────────────────────────────────────

  const scenarioSections = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `SCENARIO ${i + 1}: ${sc.title}
Time spent: ${fmtSecs(secs)}${timeFlag(secs)}
Context: ${sc.context}
Task: ${sc.task}
Candidate's response:
${resp ? resp.response_text : '[No response provided]'}`
  }).join('\n\n---\n\n')

  // ── Timing summary line for context ─────────────────────────────────────────

  const timingSummary = scenarios.map((sc, i) => {
    const resp = responses.find(r => r.scenario_index === i)
    const secs = resp?.time_taken_seconds ?? null
    return `Scenario ${i + 1}: ${fmtSecs(secs)}${timeFlag(secs)}`
  }).join(' | ')

  const skillWeights = assessment.skill_weights || {
    Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25
  }
  const skillNames = Object.keys(skillWeights)

  // ── Determine role emphasis from JD ─────────────────────────────────────────

  const jdLower = (assessment.job_description || '').toLowerCase()
  const isClientFacing = /client|customer|stakeholder|relationship|account|partner/.test(jdLower)
  const isDataHeavy = /data|analys|report|metric|kpi|insight|excel|sql|dashboard/.test(jdLower)
  const isLeadershipRole = /manag|lead|director|head of|team lead|supervise/.test(jdLower)

  const roleEmphasis = [
    isClientFacing  && 'This is a client-facing role — weight communication and relationship management more heavily in your qualitative assessment.',
    isDataHeavy     && 'This role requires strong analytical skills — weight problem solving and precision of thought more heavily.',
    isLeadershipRole && 'This is a leadership role — weight prioritisation and people management signals more heavily.',
  ].filter(Boolean).join(' ') || 'Apply balanced weighting across all skills as indicated by the skill weights.'

  // ── Prompt ──────────────────────────────────────────────────────────────────

  const prompt = `You are a senior talent assessment specialist producing a paid professional report. A candidate has completed 4 work simulation scenarios for the role of ${assessment.role_title}. Your assessment will be read by a hiring manager or HR director making a real employment decision. Write accordingly.

This is not a performance review. Do not be kind for kindness's sake. Be precise, commercially grounded, and honest.

---

ROLE: ${assessment.role_title}

JOB DESCRIPTION:
${assessment.job_description}

ROLE EMPHASIS NOTE: ${roleEmphasis}

TIMING OVERVIEW: ${timingSummary}

---

CANDIDATE RESPONSES:

${scenarioSections}

---

ASSESSMENT FRAMEWORK — complete all 4 steps before scoring.

STEP 1 — TIMING ASSESSMENT
For each scenario, assess whether the time spent was appropriate:
- Under 90 seconds: Rushed. A genuine, considered response to a complex workplace scenario cannot be written in under 90 seconds. This is a significant integrity signal.
- 90–180 seconds: Fast. Possible, but check whether the response demonstrates real engagement with the specific scenario details.
- 3–12 minutes: Normal range. No timing concern.
- Over 20 minutes: Extended. May indicate deeper thought, distraction, or difficulty. Not inherently negative.
Label each scenario: Rushed / Fast / Normal / Extended. Note any rushed scenarios in your time_analysis output.

STEP 2 — CONSISTENCY ANALYSIS
Read all 4 responses as a set and assess:
- Is the candidate's decision-making style (consultative vs. directive, methodical vs. instinctive) consistent across all 4 scenarios?
- Do they contradict themselves? For example: advocate full stakeholder transparency in Scenario 1, then bypass all stakeholders in Scenario 3 with no explanation.
- Does their writing style, sophistication level, or vocabulary shift dramatically between responses in a way that suggests different people or different conditions?
- Rate consistency: High (coherent approach throughout), Medium (minor inconsistencies, likely natural variation), Low (direct contradictions or inexplicable shifts).

STEP 3 — RED FLAG DETECTION
Actively scan for these patterns across all 4 responses:
1. Generic content: Response contains no specific reference to the scenario's named people, deadlines, data, or context. Could have been written without reading the scenario.
2. AI-generated text patterns: Unnaturally formal register; phrases like "It is important to...", "One should ensure...", "Firstly / Secondly / Finally" scaffolding; perfect grammar with zero personality; excessive hedging; no contractions; no personal voice; lists instead of naturalistic prose.
3. Scenario blindness: Candidate misidentifies or ignores key details explicitly provided — wrong deadline, wrong stakeholder name, ignores the crisis element, wrong product type.
4. Contradictions: Logical or factual contradiction between any two scenarios.
5. Template patterns: Identical structural patterns or copy-pasted phrases across multiple responses.
If any red flag is found, state: which scenario, what the flag type is, and one specific example from the text.

STEP 4 — RESPONSE QUALITY RATING
Based on all of the above, assign one rating:
- "Genuine": No timing concerns, consistent approach, scenario-specific references throughout, clear personal voice. High confidence these are the candidate's own authentic responses.
- "Likely Genuine": One minor concern — a fast response, slightly formulaic structure in one scenario — but overall authentic. No material integrity concern.
- "Possibly AI-Assisted": Multiple signals of inauthenticity — polished to an unnatural degree, weak scenario specificity, timing inconsistencies, or AI text patterns. Cannot confirm authenticity.
- "Suspicious": Strong evidence of inauthenticity — rushed timings combined with polished output, generic content that ignores scenario specifics, clear AI text signatures, or direct contradictions. Treat results with significant caution and probe in interview.

---

SCORING FRAMEWORK

Before scoring, ask yourself:
- What does a top performer in this specific role do differently from an average one?
- Which responses show genuine domain competence vs. safe, generic answers?
- Where did the candidate show real commercial judgment vs. describing what they would "consider" or "look into"?
- What patterns appear across multiple responses — recurring strengths or recurring gaps?
- Apply the role emphasis noted above when calibrating scores.

SCORE EACH SKILL 0–100:
- 90–100: Exceptional. Reserve for responses that show real mastery.
- 75–89: Strong. Solid and reliable. Minor gaps but nothing that would cause problems.
- 60–74: Moderate. Directionally correct but missing precision, specificity, or commercial edge.
- 45–59: Developing. The instincts are present but execution is not at the level this role requires.
- Below 45: Concern. Material gaps that pose a genuine risk to probation success.

Most candidates score 55–80. Do not inflate. Reserve 85+ for genuinely exceptional responses.
Overall score = weighted average using these weights: ${JSON.stringify(skillWeights)}

If response_quality is "Suspicious" or "Possibly AI-Assisted", reduce the overall_score by 5–10 points to reflect the integrity risk and note this in your risk_reason.

---

SCORE NARRATIVES — rules:
- Must be 2–3 sentences per skill
- Must quote at least one specific phrase the candidate actually wrote, in quotation marks
- Explain precisely why that phrase indicates strength or weakness for THIS specific role
- Compare to what a strong performer would have done differently

STRENGTHS — 2 to 4 items:
- Each must name a specific demonstrated capability, not a personality trait
- The evidence field must quote or directly reference something the candidate actually wrote
- Only include strengths that would make a material difference in this specific role

WATCH-OUTS — 1 to 4 items (only where genuine evidence exists):
- Only include where the candidate's response provides clear evidence of a gap
- Severity: "High" (likely to cause probation failure), "Medium" (manageable with support), "Low" (worth monitoring)
- The action must be a specific, practical step the employer can take in weeks 1–4

AI SUMMARY — exactly 4 paragraphs, minimum 80 words each:
Paragraph 1: What kind of professional is this? What are their standout qualities? Quote specific evidence. Set the context.
Paragraph 2: The one or two scenarios that best reveal who this candidate is and what they predict about behaviour in this role over the first 90 days.
Paragraph 3: The honest concerns. Where did they fall short? If response_quality is Suspicious or Possibly AI-Assisted, address this directly.
Paragraph 4: Clear hiring recommendation using exactly one of: "Strong hire", "Hire with structured onboarding", "Proceed with caution — specific risks identified", or "Not recommended at this stage".
UK English. Professional but direct. No HR jargon. No bullet points.

ONBOARDING PLAN — 5 to 7 items, week-specific, tied to this candidate's specific gaps.
INTERVIEW QUESTIONS — exactly 4, probing specific gaps found, with follow-up probes.
PERCENTILE — Top 5% / Top 10% / Top 20% / Top 30% / Top 45% / Top 60% / Bottom 40%
RISK LEVEL — Very Low / Low / Medium / High (based on score and watch-outs)
RISK REASON — one specific sentence referencing what was observed.

---

Return ONLY a JSON object. No preamble, no markdown.

{
  "overall_score": 78,
  "scores": {
    ${skillNames.map(s => `"${s}": 75`).join(',\n    ')}
  },
  "score_narratives": {
    ${skillNames.map(s => `"${s}": "2–3 sentences with a direct quote from the candidate's response."`).join(',\n    ')}
  },
  "strengths": [
    { "text": "Specific capability demonstrated", "evidence": "Verbatim quote or direct reference from what the candidate wrote" }
  ],
  "watchouts": [
    { "text": "Specific gap or concern", "evidence": "Verbatim quote or reference from the response", "severity": "Medium", "action": "Specific practical step in weeks 1–4" }
  ],
  "ai_summary": "Four paragraphs. UK English. No bullet points. Minimum 80 words per paragraph.",
  "risk_level": "Low",
  "risk_reason": "One specific sentence referencing what was observed.",
  "onboarding_plan": [
    "Week 1: Specific action tied to a gap identified in this assessment",
    "Weeks 1–4: Specific structured support tied to this candidate's needs",
    "Week 4: First formal probation review — specific things to assess based on gaps found",
    "Week 8: Mid-probation review — specific milestones indicating whether risk areas are improving",
    "Ongoing: Longer-term development actions tied to this candidate"
  ],
  "interview_questions": [
    "Specific question probing gap 1. [Follow-up: specific probe that tests authenticity.]",
    "Specific question probing gap 2. [Follow-up: specific probe.]",
    "Specific question probing gap 3. [Follow-up: specific probe.]",
    "Specific question probing gap 4. [Follow-up: specific probe.]"
  ],
  "percentile": "Top 30%",
  "response_quality": "Genuine",
  "quality_notes": "One to two sentences explaining the quality rating with specific evidence from the responses.",
  "time_analysis": "Scenario 1 (Xm Ys): Normal. Scenario 2 (Ys): Rushed — response is brief and generic. Scenario 3 (Xm Ys): Normal. Scenario 4 (Xm Ys): Extended.",
  "red_flags": [],
  "consistency_rating": "High",
  "consistency_notes": "One sentence explaining the consistency rating and any notable patterns."
}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20251001',
    max_tokens: 7000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].text.trim()
  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  const result = JSON.parse(jsonStr)

  // ── Insert core result ───────────────────────────────────────────────────────

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

  // ── Store integrity data (requires migration: ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB) ──

  try {
    await adminClient.from('results').update({
      integrity: {
        response_quality:  result.response_quality  || null,
        quality_notes:     result.quality_notes     || null,
        time_analysis:     result.time_analysis     || null,
        red_flags:         result.red_flags         || [],
        consistency_rating: result.consistency_rating || null,
        consistency_notes:  result.consistency_notes  || null,
      }
    }).eq('candidate_id', candidateId)
  } catch {
    // integrity column not yet added — run: ALTER TABLE results ADD COLUMN IF NOT EXISTS integrity JSONB;
  }

  return { success: true, overall_score: result.overall_score }
}
