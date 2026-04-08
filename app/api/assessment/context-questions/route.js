import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Fallback questions if Claude is unavailable or returns nothing valid
const AGENCY_FALLBACK = [
  { id: 'q0', text: 'What actually matters most to your client in this role?', type: 'multi-select',
    options: ['Speed/urgency', 'Revenue generation', 'Stakeholder management', 'Process/organisation', 'Leadership/ownership'] },
  { id: 'q1', text: 'What typically causes candidates to fail with this client?', type: 'multi-select-other',
    options: ['Poor communication', 'Missed deadlines', "Can't handle pressure", 'Cultural mismatch', 'Lack of ownership'] },
  { id: 'q2', text: 'What type of environment is this?', type: 'single-select',
    options: ['Fast-paced/reactive', 'Structured/process-driven', 'Chaotic/ambiguous', 'Sales-driven/target-heavy'] },
  { id: 'q3', text: 'What would make this placement fail in 3 months?', type: 'text' },
]

const EMPLOYER_FALLBACK = [
  { id: 'q0', text: 'What does success look like in the first 90 days?', type: 'text' },
  { id: 'q1', text: 'What are the biggest challenges in this role?', type: 'multi-select',
    options: ['Managing stakeholders', 'High workload/pressure', 'Ambiguity', 'Conflict/difficult conversations', 'Tight deadlines'] },
  { id: 'q2', text: 'What type of person thrives here?', type: 'multi-select',
    options: ['Highly organised', 'Proactive/self-starter', 'Strong communicator', 'Commercial thinker', 'Detail-oriented'] },
  { id: 'q3', text: 'What has gone wrong with past hires?', type: 'multi-select',
    options: ["Didn't adapt quickly", 'Poor communication', "Couldn't prioritise", 'Culture misfit', 'Burned out'] },
]

const ALLOWED_TYPES = new Set(['text', 'multi-select', 'multi-select-other', 'single-select'])

function sanitiseQuestions(arr) {
  if (!Array.isArray(arr)) return null
  const cleaned = []
  for (let i = 0; i < arr.length && cleaned.length < 5; i++) {
    const q = arr[i]
    if (!q || typeof q.text !== 'string' || !q.text.trim()) continue
    const type = ALLOWED_TYPES.has(q.type) ? q.type : 'text'
    const item = { id: `q${cleaned.length}`, text: q.text.trim().replace(/[\u2014\u2013]/g, ', '), type }
    if (type === 'multi-select' || type === 'multi-select-other' || type === 'single-select') {
      const opts = Array.isArray(q.options)
        ? q.options.map(o => String(o || '').trim().replace(/[\u2014\u2013]/g, ', ')).filter(Boolean).slice(0, 6)
        : []
      if (opts.length < 2) continue
      item.options = opts
    }
    cleaned.push(item)
  }
  return cleaned.length >= 3 ? cleaned : null
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { role_title, job_description } = body
    if (!role_title || !job_description || job_description.trim().length < 50) {
      return NextResponse.json({ error: 'Missing or short fields' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const accountType =
      body.account_type
      || user.user_metadata?.account_type
      || user.app_metadata?.account_type
      || 'employer'

    const fallback = accountType === 'agency' ? AGENCY_FALLBACK : EMPLOYER_FALLBACK

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ questions: fallback, source: 'fallback' })
    }

    const client = new Anthropic({ apiKey })

    const lens = accountType === 'agency'
      ? 'You are helping a recruitment agency capture context they will need to place the right candidate with their client. Focus on questions about the client environment, the placement context, and what would make or break the placement. Avoid generic questions about generic hiring.'
      : 'You are helping a direct employer capture context about their team, the day-to-day reality of the role, and what good performance looks like. Focus on questions about the team, the working environment, and how performance will be judged.'

    const prompt = `${lens}

ROLE TITLE: ${role_title}

JOB DESCRIPTION:
${String(job_description).slice(0, 3500)}

Generate between 3 and 5 short, role-specific follow-up questions a hiring professional could answer in roughly 30 seconds. The questions must be specific to the actual role described above, not generic. Examples of the right level of specificity:
- An Office Manager JD: "How many people will this person manage?", "Is this a standalone role or part of a team?", "What systems do they need to use daily?"
- A Sales Executive JD: "Is this new business or account management?", "What does the pipeline look like, warm leads or cold outreach?", "What is the realistic ramp-up period?"
- A Care Worker JD: "What care setting is this, residential or domiciliary?", "Will they work alone or in a team?", "What are the main safeguarding concerns?"

Rules:
- Each question must be answerable in under 10 seconds.
- Prefer multi-select questions with 3 to 5 short concrete options. Use a single text question only when the answer cannot be enumerated.
- Options must be short, mutually meaningful, and specific to this role. No generic adjectives.
- Write in UK English. Never use em dash or en dash characters. Use commas or full stops.
- Do not repeat the JD back. Each question must elicit new information not already in the JD.
- Maximum 5 questions.

Return ONLY a JSON object with this exact shape, no preamble, no markdown:

{
  "questions": [
    { "text": "Short question?", "type": "multi-select", "options": ["Option A", "Option B", "Option C"] },
    { "text": "Short question?", "type": "single-select", "options": ["Option A", "Option B"] },
    { "text": "Short open question?", "type": "text" }
  ]
}

Allowed type values: "multi-select", "single-select", "text". Nothing else.`

    let questions = null
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = message.content[0]?.text?.trim() || ''
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
      const first = jsonStr.indexOf('{'), last = jsonStr.lastIndexOf('}')
      const parsed = JSON.parse(first !== -1 ? jsonStr.slice(first, last + 1) : jsonStr)
      questions = sanitiseQuestions(parsed?.questions)
    } catch (e) {
      console.error('Context questions Claude error:', e?.message)
    }

    if (!questions) {
      return NextResponse.json({ questions: fallback, source: 'fallback' })
    }
    return NextResponse.json({ questions, source: 'generated' })
  } catch (err) {
    console.error('Context questions error:', err)
    return NextResponse.json({ error: 'Failed to load context questions.' }, { status: 500 })
  }
}
