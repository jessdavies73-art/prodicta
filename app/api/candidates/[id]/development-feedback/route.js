import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()

    const { data: profile } = await adminClient
      .from('users')
      .select('company_name, account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'employer') {
      return NextResponse.json({ error: 'Employer accounts only' }, { status: 403 })
    }

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, email, user_id, assessments(role_title)')
      .eq('id', params.id)
      .single()

    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!candidate.email) {
      return NextResponse.json({ error: 'Candidate has no email address on file' }, { status: 400 })
    }

    // Check outcome is a rejection type
    const { data: outcome } = await adminClient
      .from('candidate_outcomes')
      .select('outcome, sent_development_feedback')
      .eq('candidate_id', candidate.id)
      .eq('user_id', user.id)
      .maybeSingle()

    const rejectionOutcomes = ['rejected', 'failed_probation', 'dismissed', 'left_early']
    if (!outcome || !rejectionOutcomes.includes(outcome.outcome)) {
      return NextResponse.json({ error: 'Development feedback is only available for candidates with a rejection or exit outcome' }, { status: 400 })
    }

    const { data: result } = await adminClient
      .from('results')
      .select('strengths, scores')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (!result) {
      return NextResponse.json({ error: 'No results available' }, { status: 404 })
    }

    // Prepare strengths
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

    // Lowest skills
    const scoresObj = result.scores && typeof result.scores === 'object' ? result.scores : {}
    const scoreEntries = Object.entries(scoresObj)
      .filter(([k, v]) => typeof v === 'number' && !k.startsWith('pf_'))
      .sort((a, b) => a[1] - b[1])
    const lowestSkills = scoreEntries.slice(0, 3).map(([skill]) => skill)

    // Generate development plan via Claude
    let development_plan = []
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const strengthsText = strengths.map(s => `${s.text}: ${s.detail || s.evidence || ''}`).join('\n')
      const prompt = `You are a career development coach providing feedback to a candidate who was not selected for a "${candidate.assessments?.role_title || 'professional'}" role. Be encouraging and constructive.

Their three development areas (lowest-scored skills): ${lowestSkills.join(', ')}
Their strengths: ${strengthsText}

Generate:
1. For each of the 3 development areas: a positively-framed title, specific actionable advice, and 2-3 concrete actions the candidate can take independently.

UK English. No emoji. No em dashes.

JSON format:
{
  "development_areas": [
    {"area": "string", "advice": "string", "actions": ["string", "string"]}
  ]
}`

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        development_plan = (parsed.development_areas || []).slice(0, 3)
      }
    } catch (aiErr) {
      console.error('Development feedback Claude error:', aiErr)
      development_plan = lowestSkills.map(skill => ({
        area: `Building your ${skill.toLowerCase()} skills`,
        advice: `To strengthen your ${skill.toLowerCase()}, try setting aside dedicated time each week to practise this skill.`,
        actions: [`Find a mentor or peer who excels at ${skill.toLowerCase()} and ask for specific feedback.`],
      }))
    }

    // Benchmarks
    let benchmarks = []
    const roleTitle = candidate.assessments?.role_title
    if (roleTitle) {
      try {
        const { data: roleResults } = await adminClient
          .from('results')
          .select('scores, candidate_id, candidates!inner(assessments!inner(role_title))')
          .ilike('candidates.assessments.role_title', roleTitle)

        if (roleResults && roleResults.length >= 10) {
          const topSkills = scoreEntries.slice(-3).reverse().map(([skill]) => skill)
          for (const skill of topSkills) {
            const candidateScore = scoresObj[skill]
            if (typeof candidateScore !== 'number') continue
            const allScores = roleResults.map(r => r.scores?.[skill]).filter(s => typeof s === 'number').sort((a, b) => a - b)
            if (allScores.length < 10) continue
            const belowCount = allScores.filter(s => s < candidateScore).length
            const percentile = Math.round((belowCount / allScores.length) * 100)
            benchmarks.push({ skill, percentile })
          }
        }
      } catch {}
    }

    // Build email HTML
    const companyName = profile?.company_name || 'the hiring team'
    const candidateName = candidate.name || 'Candidate'
    const pdfUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'}/api/candidates/${candidate.id}/development-feedback-pdf?token=${encodeURIComponent(candidate.id)}`

    const strengthsHtml = strengths.map(s => `
      <div style="margin-bottom:14px;padding:12px 16px;background:#e6f7f4;border-radius:8px;border-left:4px solid #00BFA5;">
        <div style="font-size:14px;font-weight:700;color:#0f2137;">${s.text}</div>
        ${s.detail ? `<div style="font-size:13px;color:#4a5568;margin-top:4px;line-height:1.6;">${s.detail}</div>` : ''}
        ${s.evidence ? `<div style="font-size:12px;color:#94a1b3;margin-top:4px;font-style:italic;">Evidence: ${s.evidence}</div>` : ''}
      </div>
    `).join('')

    const devHtml = development_plan.map(d => `
      <div style="margin-bottom:18px;padding:16px 18px;background:#f7f9fb;border-radius:8px;border:1px solid #e4e9f0;">
        <div style="font-size:14px;font-weight:700;color:#0f2137;margin-bottom:6px;">${d.area}</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.65;margin-bottom:10px;">${d.advice}</div>
        ${d.actions ? `<ul style="margin:0;padding-left:18px;">${d.actions.map(a => `<li style="font-size:12.5px;color:#1a202c;line-height:1.6;margin-bottom:4px;">${a}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')

    const benchmarkHtml = benchmarks.length > 0 ? `
      <div style="margin-top:24px;">
        <h2 style="font-size:16px;font-weight:700;color:#0f2137;border-bottom:2px solid #00BFA5;padding-bottom:6px;margin-bottom:12px;">Your Benchmark</h2>
        ${benchmarks.map(b => `<div style="display:inline-block;margin-right:8px;margin-bottom:8px;padding:6px 14px;background:#e6f7f4;border:1px solid #00BFA555;border-radius:20px;font-size:12px;font-weight:700;color:#00897B;">${b.skill}: Top ${100 - b.percentile}%</div>`).join('')}
      </div>
    ` : ''

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0f2137;border-radius:12px 12px 0 0;padding:24px 32px;">
      <div style="font-size:20px;font-weight:800;color:#00BFA5;letter-spacing:-0.5px;">PRODICTA</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:2px;">Development Feedback</div>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e4e9f0;border-top:none;">
      <h1 style="font-size:20px;font-weight:800;color:#0f2137;margin:0 0 8px;">Your Development Feedback</h1>
      <p style="font-size:14px;color:#4a5568;line-height:1.65;margin:0 0 24px;">
        Dear ${candidateName}, thank you for taking the time to complete the assessment for the ${candidate.assessments?.role_title || 'role'} position. We wanted to share some feedback to support your continued professional development.
      </p>

      <h2 style="font-size:16px;font-weight:700;color:#0f2137;border-bottom:2px solid #00BFA5;padding-bottom:6px;margin-bottom:12px;">What You Did Well</h2>
      ${strengthsHtml}

      <h2 style="font-size:16px;font-weight:700;color:#0f2137;border-bottom:2px solid #00897B;padding-bottom:6px;margin:24px 0 12px;">Your Development Plan</h2>
      ${devHtml}

      ${benchmarkHtml}

      <div style="margin-top:28px;text-align:center;">
        <a href="${pdfUrl}" style="display:inline-block;background:#0f2137;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;">Download Your Development Plan (PDF)</a>
      </div>

      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e4e9f0;">
        <p style="font-size:11px;color:#94a1b3;line-height:1.6;margin:0 0 8px;">
          Provided by ${companyName} in partnership with PRODICTA.
        </p>
        <p style="font-size:11px;color:#94a1b3;line-height:1.6;margin:0;">
          This feedback is for your personal development only. It does not include scores, risk assessments, or hiring recommendations.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

    // Send email
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Prodicta <hello@prodicta.co.uk>',
      to: [candidate.email],
      subject: `Your development feedback from ${companyName}`,
      html: emailHtml,
    })

    // Mark as sent
    // NOTE: requires ALTER TABLE candidate_outcomes ADD COLUMN IF NOT EXISTS sent_development_feedback BOOLEAN DEFAULT FALSE;
    await adminClient
      .from('candidate_outcomes')
      .update({ sent_development_feedback: true })
      .eq('candidate_id', candidate.id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, message: `Development feedback sent to ${candidate.email}` })
  } catch (err) {
    console.error('Development feedback error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
