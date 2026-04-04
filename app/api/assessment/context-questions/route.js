import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { role_title, job_description } = await request.json()
    if (!role_title || !job_description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `You are helping build a work simulation assessment for a ${role_title} role.

Read this job description and identify 3 to 5 specific pieces of missing context that would meaningfully improve the quality of scenario-based assessment questions. Focus only on operational details that cannot be inferred from the JD.

JOB DESCRIPTION:
${job_description}

Generate 3 to 5 short, direct questions. Each question must ask about one specific operational detail. Examples of the kind of question to ask: "How many direct reports will this person manage?", "Is this role primarily client-facing or internal?", "What does a difficult week look like in this role?", "What tools or systems will they use daily?".

Do not ask about things already stated in the JD. Do not ask about salary, benefits, or company culture. Focus on day-to-day operational reality.

Return ONLY a JSON array of strings, no other text:
["Question 1?", "Question 2?", "Question 3?"]`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const questions = JSON.parse(raw)

    if (!Array.isArray(questions)) throw new Error('Unexpected response format')

    return NextResponse.json({ questions: questions.slice(0, 5) })
  } catch (err) {
    console.error('Context questions error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
