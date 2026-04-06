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
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a hiring risk analyst for UK employers. Read this job description and identify the top 3 hiring risks this role creates. Focus on risks that interviews and CVs typically miss: pressure tolerance, cultural fit, capability under realistic conditions, retention risk.

JOB DESCRIPTION:
${job_description.slice(0, 3000)}

Return ONLY a JSON array with exactly 3 objects. No preamble, no explanation, no markdown.

[
  {
    "title": "Short risk title (5-8 words)",
    "severity": "High",
    "explanation": "One to two sentences explaining the specific risk and why it is hard to detect before hiring."
  }
]

Severity must be one of: High, Medium, Low.
Write in UK English. Be specific to this role, not generic.`
      }]
    })

    const content = message.content[0].text.trim()
    const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const risks = JSON.parse(jsonStr)

    return NextResponse.json({ risks })
  } catch (err) {
    console.error('Risk report error:', err)
    return NextResponse.json({ error: 'Failed to analyse risks' }, { status: 500 })
  }
}
