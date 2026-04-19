import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

export async function GET(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('id, name, email, status, user_id, assessments(id, role_title, users(company_name, account_type, company_logo_url))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check the owning user has feedback enabled (default OFF)
    const { data: owner } = await adminClient
      .from('users')
      .select('candidate_feedback_enabled')
      .eq('id', candidate.user_id)
      .maybeSingle()
    const enabled = owner?.candidate_feedback_enabled === true
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

    // Top 3 strengths with detail and evidence
    const strengthsRaw = Array.isArray(result.strengths) ? result.strengths : []
    const strengths = strengthsRaw
      .map(s => {
        if (typeof s === 'string') return { text: s, detail: '', evidence: '' }
        return {
          text: s?.text || s?.strength || s?.title || '',
          detail: s?.detail || s?.explanation || '',
          evidence: s?.evidence || '',
        }
      })
      .filter(s => s.text)
      .slice(0, 3)

    // Find the 2 lowest-scoring skills
    const scoresObj = result.scores && typeof result.scores === 'object' ? result.scores : {}
    const scoreEntries = Object.entries(scoresObj)
      .filter(([k, v]) => typeof v === 'number' && !k.startsWith('pf_'))
      .sort((a, b) => a[1] - b[1])
    const lowestSkills = scoreEntries.slice(0, 2).map(([skill]) => skill)

    // Generate personalised development plan via Claude Haiku
    let development_plan = []
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const strengthsText = strengths.map(s => `${s.text}: ${s.detail || s.evidence || ''}`).join('\n')
      const prompt = `You are a career development coach. A candidate completed a work simulation assessment for a "${candidate.assessments?.role_title || 'professional'}" role.

Their two lowest-scoring skill areas are: ${lowestSkills.join(', ')}.
Their top strengths are:
${strengthsText}

For each of the 2 development areas, generate:
1. A positively-framed title (e.g. "Building your prioritisation skills" not "Weak at prioritisation")
2. Specific, actionable advice (not generic, include real steps like "Try using a priority matrix each morning")
3. 2-3 concrete actions they can take this week

Also, for each of the top 3 strengths, provide a brief sentence of additional detail about why this is valuable, referencing the evidence where available.

IMPORTANT: Use UK English. No emoji. No em dashes (use commas or full stops instead). Frame everything positively and encouragingly.

Respond in JSON format:
{
  "development_areas": [
    {"area": "string", "advice": "string", "actions": ["string", "string"]}
  ],
  "strength_details": ["string", "string", "string"]
}`

      const msg = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }).finalMessage()

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        development_plan = (parsed.development_areas || []).slice(0, 2)
        // Enrich strengths with Claude-generated detail
        if (parsed.strength_details && Array.isArray(parsed.strength_details)) {
          parsed.strength_details.forEach((detail, i) => {
            if (strengths[i] && detail) {
              strengths[i].detail = detail
            }
          })
        }
      }
    } catch (aiErr) {
      console.error('Claude development plan error:', aiErr)
      // Fallback to simple suggestions
      development_plan = lowestSkills.map(skill => ({
        area: `Building your ${skill.toLowerCase()} skills`,
        advice: `To strengthen your ${skill.toLowerCase()}, try setting aside 15 minutes each day to practise this skill deliberately.`,
        actions: [
          `Identify one specific situation this week where you can apply ${skill.toLowerCase()} more intentionally.`,
          `Ask a colleague or mentor for feedback on how you handle ${skill.toLowerCase()} tasks.`,
        ],
      }))
    }

    // Calculate anonymised benchmarks
    let benchmarks = null
    const roleTitle = candidate.assessments?.role_title
    if (roleTitle) {
      try {
        const { data: roleResults, error: bmErr } = await adminClient
          .from('results')
          .select('scores, candidate_id, candidates!inner(assessments!inner(role_title))')
          .ilike('candidates.assessments.role_title', roleTitle)

        if (!bmErr && roleResults && roleResults.length >= 10) {
          benchmarks = []
          // For each of the candidate's top skills, calculate percentile
          const topSkills = scoreEntries.slice(-3).reverse().map(([skill]) => skill)
          for (const skill of topSkills) {
            const candidateScore = scoresObj[skill]
            if (typeof candidateScore !== 'number') continue
            const allScores = roleResults
              .map(r => r.scores?.[skill])
              .filter(s => typeof s === 'number')
              .sort((a, b) => a - b)
            if (allScores.length < 10) continue
            const belowCount = allScores.filter(s => s < candidateScore).length
            const percentile = Math.round((belowCount / allScores.length) * 100)
            benchmarks.push({ skill, percentile })
          }
          if (benchmarks.length === 0) benchmarks = null
        }
      } catch (bmErr) {
        console.error('Benchmark calculation error:', bmErr)
      }
    }

    // Check for retake/growth trajectory data. Only emit when the candidate has
    // at least 2 completed assessments WITH results under the same email, and
    // compute the change as (most recent - previous) so a single-assessment
    // candidate never sees a spurious delta against someone else's baseline.
    let growth_trajectory = null
    if (candidate.email) {
      try {
        const { data: allCandidates } = await adminClient
          .from('candidates')
          .select('id, completed_at, assessments(role_title)')
          .eq('email', candidate.email)
          .eq('status', 'completed')
          .order('completed_at', { ascending: true })

        if (allCandidates && allCandidates.length >= 2) {
          const candidateIds = allCandidates.map(c => c.id)
          const { data: allResults } = await adminClient
            .from('results')
            .select('candidate_id, scores')
            .in('candidate_id', candidateIds)

          const resultMap = {}
          ;(allResults || []).forEach(r => { if (r?.scores) resultMap[r.candidate_id] = r.scores })

          // History is candidates that actually have a scored result, in chronological order.
          const history = allCandidates.filter(c => resultMap[c.id])

          if (history.length >= 2) {
            const previous = history[history.length - 2]
            const latest = history[history.length - 1]

            const skillsInLatest = Object.keys(resultMap[latest.id] || {}).filter(k => !k.startsWith('pf_'))
            const skillsInPrevious = Object.keys(resultMap[previous.id] || {}).filter(k => !k.startsWith('pf_'))
            const commonSkills = skillsInLatest.filter(skill => skillsInPrevious.includes(skill))

            if (commonSkills.length > 0) {
              growth_trajectory = commonSkills.slice(0, 5).map(skill => {
                const prevScore = resultMap[previous.id][skill]
                const latestScore = resultMap[latest.id][skill]
                const change = (typeof prevScore === 'number' && typeof latestScore === 'number')
                  ? latestScore - prevScore
                  : null
                return {
                  skill,
                  change,
                  assessments: history
                    .filter(c => typeof resultMap[c.id]?.[skill] === 'number')
                    .map(c => ({
                      role: c.assessments?.role_title || 'Assessment',
                      date: c.completed_at ? new Date(c.completed_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '',
                      score: resultMap[c.id][skill],
                    })),
                }
              })
            }
          }
        }
      } catch (gtErr) {
        console.error('Growth trajectory error:', gtErr)
      }
    }

    const accountType = candidate.assessments?.users?.account_type || 'employer'
    const agencyLogoUrl = accountType === 'agency' ? (candidate.assessments?.users?.company_logo_url || null) : null

    return NextResponse.json({
      candidate_name: candidate.name,
      role_title: candidate.assessments?.role_title || 'this role',
      company_name: candidate.assessments?.users?.company_name || 'the hiring team',
      strengths,
      development_plan,
      benchmarks,
      growth_trajectory,
      agency_logo_url: agencyLogoUrl,
      account_type: accountType,
    })
  } catch (err) {
    console.error('Feedback route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
