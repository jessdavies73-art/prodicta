import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request) {
  try {
    const { job_description } = await request.json()

    if (!job_description || job_description.trim().length < 50) {
      return NextResponse.json({ error: 'Job description too short' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `You are a hiring risk analyst for UK employers. Read this job description and identify the top 3 hiring risks built into THIS ROLE.

The question you are answering is: "What about this role makes it hard to hire the right person?" You are NOT predicting what might go wrong with any individual candidate. You are describing the structural risks the role itself creates for the hiring process, the kind of risks that interviews and CVs typically fail to test for (for example: pressure tolerance under realistic workload, decision quality with incomplete information, cultural fit with a specific environment, retention risk given the day-to-day reality of the work).

Also extract the role title from the job description. If unclear, return "this role".

JOB DESCRIPTION:
${job_description.slice(0, 3000)}

Return ONLY a JSON object with no preamble, no explanation, no markdown:

{
  "role_title": "Short role title from the JD",
  "risks": [
    {
      "title": "Short risk title (5 to 8 words) describing a property of the role",
      "severity": "High",
      "explanation": "One to two sentences explaining why this aspect of the role is hard for a standard hiring process to test for, and what the hiring process needs to assess in order to de-risk it."
    }
  ]
}

There must be exactly 3 risks. Severity must be one of: High, Medium, Low. Write in UK English. Be specific to this role, not generic. Frame every risk as a property of the role and the hiring process, never as a prediction about a candidate.

FORMATTING RULE: Never use em dash (—) or en dash (–) characters anywhere in the output. Use commas, full stops, or rewrite the sentence instead.`
      }]
    })

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(jsonStr)

    const risks = Array.isArray(parsed) ? parsed : parsed.risks
    const role_title = (parsed && parsed.role_title) || 'this role'

    return NextResponse.json({ risks, role_title })
  } catch (err) {
    console.error('Risk report error:', err)
    return NextResponse.json({ error: 'Failed to analyse risks' }, { status: 500 })
  }
}
