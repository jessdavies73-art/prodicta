import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const AGENCY_QUESTIONS = [
  'What actually matters most to your client in this role?',
  'What typically causes candidates to fail with this client?',
  'What type of environment is this?',
  'What would make this placement fail in 3 months?',
]

const EMPLOYER_QUESTIONS = [
  'What does success look like in the first 90 days?',
  'What are the biggest challenges in this role?',
  'What type of person thrives here?',
  'What has gone wrong with past hires?',
]

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { role_title, job_description } = body
    if (!role_title || !job_description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const accountType =
      body.account_type
      || user.user_metadata?.account_type
      || user.app_metadata?.account_type
      || 'employer'

    const questions = accountType === 'agency' ? AGENCY_QUESTIONS : EMPLOYER_QUESTIONS
    return NextResponse.json({ questions })
  } catch (err) {
    console.error('Context questions error:', err)
    return NextResponse.json({ error: 'Failed to load context questions.' }, { status: 500 })
  }
}
