import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('id, name, status, user_id, assessments(role_title, users(company_name))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check the owning user has feedback enabled (default ON)
    const { data: owner } = await adminClient
      .from('users')
      .select('candidate_feedback_enabled')
      .eq('id', candidate.user_id)
      .maybeSingle()
    const enabled = owner?.candidate_feedback_enabled !== false
    if (!enabled) {
      return NextResponse.json({ error: 'feedback_disabled' }, { status: 403 })
    }

    if (candidate.status !== 'completed') {
      return NextResponse.json({ error: 'not_ready' }, { status: 425 })
    }

    const { data: result } = await adminClient
      .from('results')
      .select('strengths, scores')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (!result) {
      return NextResponse.json({ error: 'not_ready' }, { status: 425 })
    }

    // Top 3 strengths (text only, no scores or evidence shown)
    const strengthsRaw = Array.isArray(result.strengths) ? result.strengths : []
    const strengths = strengthsRaw
      .map(s => (typeof s === 'string' ? s : s?.text))
      .filter(Boolean)
      .slice(0, 3)

    // Build 2 development suggestions from the two lowest skill scores, phrased positively
    const SUGGESTIONS = {
      communication: 'To strengthen your communication, try structuring written replies with one clear point per paragraph and reading messages aloud before sending.',
      'problem solving': 'To strengthen your problem solving, try writing down the problem in one sentence before jumping to solutions, then list two or three options before choosing.',
      prioritisation: 'To strengthen your prioritisation, try using a simple priority matrix at the start of each day, sorting tasks by urgency and importance before you begin.',
      leadership: 'To strengthen your leadership, try setting one clear expectation each week with whoever you work alongside, and following up on it briefly.',
      negotiation: 'To strengthen your negotiation, try preparing two or three options before any difficult conversation, so you have flexibility.',
      'client management': 'To strengthen your client management, try sending a short proactive update to your contact each week, even when there is nothing urgent.',
      judgment: 'To strengthen your judgment, try pausing for a minute before responding to a difficult message, and asking yourself what the most useful next step is.',
      analysis: 'To strengthen your analysis, try summarising any data you look at in one sentence before drawing conclusions.',
      'people management': 'To strengthen your people management, try having one short check-in each week with each person you work alongside, focused on what is going well.',
      'stakeholder management': 'To strengthen your stakeholder management, try mapping out who needs to know what after each major decision, and sending a one-line update.',
      'conflict resolution': 'To strengthen your conflict resolution, try acknowledging the other persons point of view in writing before you offer your own response.',
    }
    const scoresObj = result.scores && typeof result.scores === 'object' ? result.scores : {}
    const scoreEntries = Object.entries(scoresObj)
      .filter(([k, v]) => typeof v === 'number' && !k.startsWith('pf_'))
      .sort((a, b) => a[1] - b[1])
    const developmentSuggestions = []
    for (const [skill] of scoreEntries) {
      const key = String(skill).toLowerCase()
      const tip = SUGGESTIONS[key]
      if (tip && !developmentSuggestions.includes(tip)) developmentSuggestions.push(tip)
      if (developmentSuggestions.length === 2) break
    }
    if (developmentSuggestions.length < 2) {
      developmentSuggestions.push('To keep developing, try writing down one thing you learnt at the end of each week and how you would apply it next time.')
    }

    return NextResponse.json({
      candidate_name: candidate.name,
      role_title: candidate.assessments?.role_title || 'this role',
      company_name: candidate.assessments?.users?.company_name || 'the hiring team',
      strengths,
      development: developmentSuggestions.slice(0, 2),
    })
  } catch (err) {
    console.error('Feedback route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
