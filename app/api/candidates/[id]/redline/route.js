import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { EMAIL_FROM } from '@/lib/email-sender'

export const maxDuration = 120

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const body = await request.json()

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, name, email, user_id, assessments(role_title, id)')
      .eq('id', params.id)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: results } = await admin
      .from('results')
      .select('overall_score, pressure_fit_score, execution_reliability, risk_level, watchouts, predictions, scores')
      .eq('candidate_id', params.id)
      .maybeSingle()

    const { data: copilot } = await admin
      .from('probation_copilot')
      .select('watchout_statuses, prediction_responses, manager_notes, overall_status')
      .eq('candidate_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    /* ─── Action: analyse deviation ─── */
    if (body.action === 'analyse') {
      if (!results || !copilot) {
        return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'Insufficient data for analysis.' })
      }

      const hasCheckinData = copilot.manager_notes && Object.values(copilot.manager_notes).some(n => n && n.trim())
      const hasWatchoutStatuses = copilot.watchout_statuses && Object.keys(copilot.watchout_statuses).length > 0

      if (!hasCheckinData && !hasWatchoutStatuses) {
        return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'No check-in data recorded yet.' })
      }

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Analyse whether this candidate's probation performance is deviating from their assessment predictions.

ASSESSMENT SCORES:
- Overall score: ${results.overall_score}/100
- Execution reliability: ${results.execution_reliability ?? 'N/A'}
- Pressure fit: ${results.pressure_fit_score ?? 'N/A'}
- Risk level: ${results.risk_level}
- Watch-outs: ${(results.watchouts || []).map(w => w.watchout || w.title || w.text).join('; ')}
- Predictions: pass_probation ${results.predictions?.pass_probation ?? 'N/A'}%, churn_risk ${results.predictions?.churn_risk ?? 'N/A'}%

CHECK-IN DATA:
- Watch-out statuses: ${JSON.stringify(copilot.watchout_statuses)}
  (red = materialised, amber = early signs, green = no issue)
- Prediction responses: ${JSON.stringify(copilot.prediction_responses)}
  (yes = confirmed, partially = emerging, no = not happening, not_yet = too early)
- Manager notes: ${JSON.stringify(copilot.manager_notes)}
- Overall status from check-ins: ${copilot.overall_status}

Return JSON only. UK English. No emoji. No em dashes.
{
  "deviation_status": "REDLINE" | "WATCH" | "ON_TRACK",
  "reason": "2-3 sentence explanation of why this status was chosen",
  "deviating_dimension": "string (which specific area is deviating, e.g. 'Execution Reliability', 'Conflict Handling')" or null,
  "assessment_prediction": "string (what the assessment predicted)" or null,
  "actual_signal": "string (what the check-ins are showing)" or null,
  "urgency": "immediate" | "this_week" | "monitor"
}`
        }],
      }).finalMessage()

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'Analysis unavailable.' })
      const analysis = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

      // Send email alert if REDLINE and not already alerted
      if (analysis.deviation_status === 'REDLINE') {
        const { data: existingCopilot } = await admin
          .from('probation_copilot')
          .select('redline_alerted')
          .eq('candidate_id', params.id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existingCopilot?.redline_alerted) {
          try {
            await getResend().emails.send({
              from: EMAIL_FROM,
              to: user.email,
              subject: `Redline Alert: ${candidate.name} - Immediate Action Required`,
              html: `
                <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto">
                  <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
                    <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
                    <span style="color:rgba(255,255,255,0.5);font-size:14px;margin-left:8px">Redline Alert</span>
                  </div>
                  <div style="background:#fef2f2;border:1px solid #fecaca;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                    <h2 style="color:#dc2626;margin:0 0 12px;font-size:18px">${candidate.name} requires immediate attention</h2>
                    <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6">
                      <strong>Role:</strong> ${candidate.assessments?.role_title || 'N/A'}
                    </p>
                    <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6">
                      <strong>Assessment predicted:</strong> ${analysis.assessment_prediction || 'See report'}
                    </p>
                    <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6">
                      <strong>Check-ins showing:</strong> ${analysis.actual_signal || 'Performance deviation detected'}
                    </p>
                    <p style="color:#5e6b7f;margin:16px 0 0;font-size:13px;line-height:1.5">${analysis.reason}</p>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'}/assessment/${candidate.assessments?.id}/candidate/${candidate.id}/copilot"
                       style="display:inline-block;margin-top:20px;padding:12px 24px;background:#00BFA5;color:#0f2137;font-weight:700;text-decoration:none;border-radius:8px;font-size:14px">
                      Open Co-pilot and Generate Intervention Plan
                    </a>
                  </div>
                </div>
              `,
            })
          } catch (emailErr) {
            console.error('Redline email error:', emailErr)
          }

          await admin
            .from('probation_copilot')
            .update({ redline_alerted: true, redline_alerted_at: new Date().toISOString() })
            .eq('candidate_id', params.id)
            .eq('user_id', user.id)
        }
      }

      return NextResponse.json(analysis)
    }

    /* ─── Action: generate intervention plan ─── */
    if (body.action === 'intervene') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Generate a 2-week intervention plan for a probation candidate who is deviating from assessment predictions.

CANDIDATE: ${candidate.name}
ROLE: ${candidate.assessments?.role_title}
ASSESSMENT SCORES: Overall ${results?.overall_score}/100, Execution Reliability ${results?.execution_reliability ?? 'N/A'}, Pressure Fit ${results?.pressure_fit_score ?? 'N/A'}
RISK LEVEL: ${results?.risk_level}
WATCH-OUTS: ${(results?.watchouts || []).map(w => `${w.watchout || w.title || w.text} (${w.severity})`).join('; ')}
DEVIATION REASON: ${body.deviation_reason || 'Performance deviating from predictions'}
MANAGER NOTES: ${JSON.stringify(copilot?.manager_notes || {})}
WATCHOUT STATUSES: ${JSON.stringify(copilot?.watchout_statuses || {})}

Return JSON only. UK English. No emoji. No em dashes.
{
  "diagnosis": "2-3 sentences on what is going wrong and why, based on assessment predictions",
  "week1_actions": ["string", "string", "string"],
  "week2_actions": ["string", "string", "string"],
  "monitoring": "2-3 sentences on what to monitor and specific triggers for escalation",
  "recommendation": "extend_probation" | "managed_exit" | "intensive_support",
  "recommendation_reason": "1-2 sentences explaining the recommendation"
}`
        }],
      }).finalMessage()

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: 'Failed to generate intervention plan' }, { status: 500 })
      const plan = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', '))

      return NextResponse.json({ plan })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Redline API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
