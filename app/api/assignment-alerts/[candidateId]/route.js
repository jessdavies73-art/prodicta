import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

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
      .select('id, name, user_id, assessments(role_title, id, employment_type)')
      .eq('id', params.candidateId)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: results } = await admin
      .from('results')
      .select('overall_score, risk_level, watchouts, strengths, predictions')
      .eq('candidate_id', params.candidateId)
      .maybeSingle()

    const { data: review } = await admin
      .from('assignment_reviews')
      .select('*')
      .eq('candidate_id', params.candidateId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!results || !review) {
      return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'Insufficient data.' })
    }

    /* ─── Action: detect deviation ─── */
    if (body.action === 'detect') {
      const score = results.overall_score || 0
      const predicted = score >= 75 ? 'Strong' : score >= 55 ? 'Review' : 'Caution'
      const ratings = [review.week1_rating, review.week4_rating, review.week8_rating].filter(Boolean)

      if (ratings.length === 0) {
        return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'No reviews completed yet.' })
      }

      let severity = null
      let alertType = null

      // Check for concern raised
      const hasConcern = ratings.includes('Concern Raised')
      // Check for two consecutive below expectations
      const consecutiveBelow = ratings.length >= 2 &&
        ratings[ratings.length - 1] === 'Below Expectations' &&
        ratings[ratings.length - 2] === 'Below Expectations'
      // Check predicted strong but actual below/concern
      const strongDeviation = predicted === 'Strong' && (ratings.includes('Below Expectations') || hasConcern)
      // Check predicted review but concern
      const reviewDeviation = predicted === 'Review' && hasConcern

      if (hasConcern || consecutiveBelow) {
        severity = 'REDLINE'
        alertType = hasConcern ? 'concern_raised' : 'consecutive_below'
      } else if (strongDeviation || reviewDeviation) {
        severity = ratings.includes('Below Expectations') && !consecutiveBelow ? 'WATCH' : 'REDLINE'
        alertType = 'prediction_deviation'
      } else if (ratings.includes('Below Expectations')) {
        severity = 'WATCH'
        alertType = 'single_below'
      }

      if (!severity) {
        return NextResponse.json({ deviation_status: 'ON_TRACK', reason: 'Performance is in line with predictions.' })
      }

      // Generate intervention plan via Claude
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const watchoutsText = (results.watchouts || []).map(w => typeof w === 'object' ? (w.watchout || w.title || '') : w).join('; ')
      const strengthsText = (results.strengths || []).map(s => typeof s === 'object' ? (s.strength || s.title || '') : s).join('; ')

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Generate an intervention plan for a temporary placement that is deviating from predictions.

ASSESSMENT DATA:
- Overall score: ${score}/100
- Predicted performance: ${predicted}
- Risk level: ${results.risk_level}
- Strengths: ${strengthsText || 'N/A'}
- Watch-outs: ${watchoutsText || 'N/A'}

ASSIGNMENT REVIEW DATA:
- Worker: ${candidate.name}
- Role: ${candidate.assessments?.role_title || 'N/A'}
- Client: ${review.client_company || 'N/A'}
- Week 1 rating: ${review.week1_rating || 'Not reviewed'}
- Week 1 notes: ${review.week1_notes || 'None'}
- Week 4 rating: ${review.week4_rating || 'Not reviewed'}
- Week 4 notes: ${review.week4_notes || 'None'}
- Week 8 rating: ${review.week8_rating || 'Not reviewed'}
- Week 8 notes: ${review.week8_notes || 'None'}
- Client feedback: ${review.client_feedback || 'None'}

DEVIATION: ${severity} - ${alertType}

Return JSON only. UK English. No emoji. No em dashes.
{
  "intervention_plan": "A specific 2-week intervention plan for the consultant (3-5 sentences)",
  "client_actions": ["action 1", "action 2", "action 3"],
  "worker_actions": ["action 1", "action 2", "action 3"],
  "assignment_at_risk": true or false,
  "risk_summary": "1 sentence on whether this assignment is likely to end early"
}`
        }],
      })

      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      let plan = { intervention_plan: 'Unable to generate plan.', client_actions: [], worker_actions: [], assignment_at_risk: false, risk_summary: '' }
      if (jsonMatch) {
        try { plan = JSON.parse(jsonMatch[0].replace(/[\u2014\u2013]/g, ', ')) } catch {}
      }

      // Save alert
      const { data: alert } = await admin.from('assignment_alerts').insert({
        user_id: user.id,
        candidate_id: params.candidateId,
        assessment_id: candidate.assessments?.id || null,
        worker_name: candidate.name,
        role_title: candidate.assessments?.role_title || '',
        alert_type: alertType,
        predicted_behaviour: `Assessment predicted ${predicted} performance (score ${score}/100, risk ${results.risk_level})`,
        actual_behaviour: `Reviews show: ${ratings.join(', ')}`,
        deviation_severity: severity,
        intervention_plan: JSON.stringify(plan),
      }).select('*').single()

      // Send email for REDLINE
      if (severity === 'REDLINE' && user.email) {
        try {
          const assessmentId = candidate.assessments?.id || ''
          const trackerUrl = `https://prodicta.co.uk/assessment/${assessmentId}/candidate/${params.candidateId}/assignment-review`
          await getResend().emails.send({
            from: 'PRODICTA Alerts <alerts@prodicta.co.uk>',
            to: user.email,
            subject: `Assignment Alert - ${candidate.name} at ${review.client_company || 'Client'}`,
            html: `
              <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto">
                <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
                  <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
                  <span style="color:rgba(255,255,255,0.5);font-size:14px;margin-left:8px">Assignment Alert</span>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                  <h2 style="color:#B91C1C;margin:0 0 12px;font-size:18px">${candidate.name} requires immediate attention</h2>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6"><strong>Role:</strong> ${candidate.assessments?.role_title || 'N/A'}</p>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6"><strong>Client:</strong> ${review.client_company || 'N/A'}</p>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6"><strong>Assessment predicted:</strong> ${predicted} performance</p>
                  <p style="color:#0f172a;margin:0 0 16px;font-size:14px;line-height:1.6"><strong>Reviews show:</strong> ${ratings.join(', ')}</p>
                  <div style="background:#fff;border:1px solid #e4e9f0;border-radius:8px;padding:16px;margin-bottom:16px">
                    <p style="font-weight:700;color:#0f172a;margin:0 0 8px;font-size:14px">2-Week Intervention Plan</p>
                    <p style="color:#4a5568;margin:0;font-size:13px;line-height:1.6">${plan.intervention_plan}</p>
                  </div>
                  <a href="${trackerUrl}" style="display:inline-block;background:#0f2137;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Assignment Tracker</a>
                </div>
              </div>`,
          })
          // Mark alert as sent
          if (alert?.id) {
            await admin.from('assignment_alerts').update({ alert_sent: true, alert_sent_at: new Date().toISOString() }).eq('id', alert.id)
          }
        } catch (emailErr) {
          console.error('Assignment alert email error:', emailErr)
        }
      }

      return NextResponse.json({
        deviation_status: severity,
        alert_id: alert?.id,
        alert_type: alertType,
        ...plan,
      })
    }

    /* ─── Action: resolve ─── */
    if (body.action === 'resolve' && body.alert_id) {
      await admin.from('assignment_alerts').update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq('id', body.alert_id).eq('user_id', user.id)
      return NextResponse.json({ resolved: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Assignment alerts error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
