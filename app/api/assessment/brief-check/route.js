import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 120

export async function POST(req) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { role_title, job_description } = await req.json()
  if (!role_title || !job_description || job_description.length < 50) {
    return NextResponse.json({ error: 'Role title and job description (50+ chars) required' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are a UK recruitment quality analyst. Analyse this job description and flag any issues that could lead to a poor hire or a mismatched assessment.

Role title: ${role_title}
Job description:
${job_description}

Check for these specific issues:

1. ROLE TITLE VS RESPONSIBILITIES MISMATCH: Does the title suggest a level (junior, senior, manager, director) that conflicts with the actual responsibilities described? For example, a "Junior" title with budget management responsibilities, or a "Manager" title with no people management duties.

2. SENIORITY VS SALARY EXPECTATIONS: Do the responsibilities require significant experience (5+ years, leadership, strategic decisions) while the role title or framing implies entry level or early career?

3. SKILLS LISTED VS WHAT ACTUALLY PREDICTS SUCCESS: Does the JD focus heavily on technical or hard skills when the role structure clearly requires stakeholder management, leadership, pressure handling, or relationship building as the main challenge?

4. TEAM STRUCTURE VS WORKING STYLE MISMATCH: Does the JD ask for an "independent worker" when the role involves heavy collaboration, or ask for a "team player" when the role is clearly solo and autonomous?

5. VAGUE OR GENERIC REQUIREMENTS: Is the JD full of generic phrases like "strong communicator", "team player", "results-driven" without specifics about what success actually looks like in this role?

For each issue found, return a JSON object with a "flag" (short title) and "detail" (2-3 sentences explaining the issue and suggesting what to change). Be direct and practical. UK English. No emoji. Never use em dashes. Use commas or full stops instead.

Return strict JSON:
{
  "flags": [
    { "flag": "Short issue title", "detail": "Explanation and suggestion." }
  ]
}

If no issues are found, return: { "flags": [] }

Only flag genuine issues. Do not flag things that are fine. Be helpful, not nitpicky.`

  try {
    const message = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    }).finalMessage()

    const raw = message.content[0]?.text?.trim() || ''
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}')
    const parsed = JSON.parse(first !== -1 ? jsonStr.slice(first, last + 1) : jsonStr)
    const flags = Array.isArray(parsed?.flags) ? parsed.flags : []

    return NextResponse.json({ flags })
  } catch (e) {
    console.error('Brief check error:', e?.message)
    return NextResponse.json({ flags: [], error: 'Analysis unavailable' })
  }
}
