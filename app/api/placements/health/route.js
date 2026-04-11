import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

// ────────────────────────────────────────────────────────────────────────────
// Health score calculation
// ────────────────────────────────────────────────────────────────────────────

const ACTIVE_OUTCOMES = new Set([null, undefined, '', 'still_in_probation', 'still_employed', 'placed', 'passing'])

function classifyHealth({ copilot, score, outcome }) {
  // Returns { health_status, health_score, health_reason }
  const overall = copilot?.overall_status || null
  const watchoutStatuses = copilot?.watchout_statuses || {}
  const predResponses = copilot?.prediction_responses || {}
  const managerNotes = copilot?.manager_notes || {}

  const materialised = Object.values(watchoutStatuses).filter(v => v === 'red').length
  const earlySigns = Object.values(watchoutStatuses).filter(v => v === 'amber').length
  const noConfirmed = Object.values(predResponses).filter(v => v === 'no').length
  const partials = Object.values(predResponses).filter(v => v === 'partially').length

  // Concern signals from manager notes (lightweight keyword scan)
  const concernKeywords = /\b(concern|missed|late|slipping|behind|complaint|escalat|underperform|gap|warning|absence|absent|disengag)/i
  const noteSignals = Object.values(managerNotes).filter(n => n && concernKeywords.test(String(n))).length

  // Critical
  if (overall === 'Critical' || materialised >= 2 || (materialised >= 1 && noConfirmed >= 1)) {
    const health_score = Math.max(0, 35 - materialised * 5 - noConfirmed * 3)
    return {
      health_status: 'RED',
      health_score,
      health_reason: materialised >= 2
        ? `${materialised} predicted watch-outs have materialised during probation.`
        : 'Redline alert triggered: significant deviation from assessment prediction.',
    }
  }

  // At risk
  if (overall === 'At Risk' || materialised === 1 || earlySigns >= 2 || partials >= 2 || noteSignals >= 1) {
    let reason = 'Early risk signals detected during probation check-ins.'
    if (materialised === 1) reason = 'One predicted watch-out has materialised. Intervention recommended.'
    else if (earlySigns >= 2) reason = `${earlySigns} watch-outs showing early signs of materialising.`
    else if (partials >= 2) reason = 'Multiple PRODICTA predictions only partially confirmed by manager.'
    else if (noteSignals >= 1) reason = 'Manager notes contain concern signals.'
    const health_score = Math.max(40, Math.min(69, 65 - earlySigns * 4 - partials * 3))
    return { health_status: 'AMBER', health_score, health_reason: reason }
  }

  // Healthy — base on assessment score where co-pilot data is sparse
  const baseScore = score != null ? Math.max(70, Math.min(100, score)) : 85
  const reason = copilot
    ? 'Co-pilot check-ins on track. Performing as predicted.'
    : 'No probation concerns recorded. Within rebate period.'
  return { health_status: 'GREEN', health_score: baseScore, health_reason: reason }
}

function daysBetween(a, b) {
  if (!a || !b) return null
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

// ────────────────────────────────────────────────────────────────────────────
// GET — calculate health for every active placement
// ────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: profile } = await admin
      .from('users')
      .select('email, company_name, account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'agency') {
      return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })
    }

    // Pull active placements with linked candidate + assessment + result
    const { data: outcomes } = await admin
      .from('candidate_outcomes')
      .select('*, candidates(id, name, email, completed_at, assessment_id, assessments(role_title), results(overall_score, risk_level))')
      .eq('user_id', user.id)

    // Pull all co-pilot rows for this user in one go
    const { data: copilotRows } = await admin
      .from('probation_copilot')
      .select('*')
      .eq('user_id', user.id)

    const copilotByCandidate = {}
    for (const row of copilotRows || []) copilotByCandidate[row.candidate_id] = row

    const placements = []
    const transitionsToAmber = []

    for (const o of outcomes || []) {
      const cand = o.candidates
      if (!cand) continue
      // Active = no terminal exit outcome recorded yet
      const oc = (o.outcome || '').toLowerCase()
      const isActive = !oc || oc === 'still_in_probation' || oc === 'still_employed' || oc === 'placed' || oc === 'passing'
      if (!isActive) continue
      // Must have a completed assessment
      if (!cand.completed_at) continue

      const result = Array.isArray(cand.results) ? cand.results[0] : cand.results
      const score = result?.overall_score ?? null

      const copilot = copilotByCandidate[cand.id] || null
      const health = classifyHealth({ copilot, score, outcome: o })

      const placementDate = o.placement_date || o.outcome_date || o.created_at || cand.completed_at
      const days_in_probation = daysBetween(placementDate, new Date())
      let days_until_rebate_ends = null
      if (placementDate && o.rebate_weeks) {
        const end = new Date(placementDate)
        end.setDate(end.getDate() + o.rebate_weeks * 7)
        days_until_rebate_ends = daysBetween(new Date(), end)
      }

      // Detect transition GREEN -> AMBER
      const previous = (o.placement_health_status || 'GREEN').toUpperCase()
      const becameAmber = health.health_status === 'AMBER' && previous === 'GREEN' && !o.placement_amber_alerted
      if (becameAmber) {
        transitionsToAmber.push({ outcome: o, candidate: cand, health })
      }

      // Persist back so the dashboard reads quickly
      try {
        await admin
          .from('candidate_outcomes')
          .update({
            placement_health_status: health.health_status,
            placement_health_score: health.health_score,
            ...(becameAmber ? { placement_amber_alerted: true } : {}),
          })
          .eq('id', o.id)
      } catch {
        // Columns may not exist in some environments — ignore
      }

      placements.push({
        outcome_id: o.id,
        candidate_id: cand.id,
        candidate_name: cand.name,
        role_title: cand.assessments?.role_title || null,
        client_name: o.client_name || null,
        placement_date: placementDate,
        rebate_weeks: o.rebate_weeks ?? null,
        health_status: health.health_status,
        health_score: health.health_score,
        health_reason: health.health_reason,
        days_in_probation,
        days_until_rebate_ends,
      })
    }

    // Send Amber alert emails for new transitions
    if (transitionsToAmber.length > 0 && profile?.email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'
        for (const t of transitionsToAmber) {
          const copilotUrl = `${siteUrl}/assessment/${t.candidate.assessment_id}/candidate/${t.candidate.id}/copilot`
          await resend.emails.send({
            from: 'PRODICTA <alerts@prodicta.co.uk>',
            to: profile.email,
            subject: `Placement Alert: ${t.candidate.name} showing early risk signals`,
            html: `
              <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 0">
                <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
                  <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
                  <div style="color:#fff;font-size:13px;margin-top:4px;opacity:0.7">Placement Health Alert</div>
                </div>
                <div style="background:#fff;border:1px solid #e4e9f0;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                  <div style="display:inline-block;background:#fffbeb;color:#b45309;border:1px solid #fde68a;border-radius:50px;padding:4px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:14px">At Risk</div>
                  <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px;font-weight:800">${t.candidate.name} is showing early risk signals</h2>
                  <table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px;color:#5e6b7f">
                    <tr><td style="padding:6px 0;color:#94a1b3;width:90px">Role</td><td style="color:#0f172a;font-weight:600">${t.candidate.assessments?.role_title || 'Role'}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a1b3">Client</td><td style="color:#0f172a;font-weight:600">${t.outcome.client_name || 'Not recorded'}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a1b3">Risk signal</td><td style="color:#0f172a;font-weight:600">${t.health.health_reason}</td></tr>
                  </table>
                  <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 16px;margin:0 0 20px;font-size:13.5px;color:#0f172a;line-height:1.6">
                    <strong>Acting now could save this placement.</strong> Call your client before this escalates.
                  </div>
                  <a href="${copilotUrl}" style="display:inline-block;background:#0f2137;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Open Co-pilot</a>
                  <p style="color:#94a1b3;font-size:11.5px;margin:24px 0 0;line-height:1.5">You are receiving this because PRODICTA detected a transition from healthy to at risk on a placement you are tracking. Manage alerts in Settings.</p>
                </div>
              </div>
            `,
          })
        }
      } catch (err) {
        console.error('Placement health email error:', err)
      }
    }

    // Aggregate counts
    const counts = { GREEN: 0, AMBER: 0, RED: 0 }
    placements.forEach(p => { counts[p.health_status] = (counts[p.health_status] || 0) + 1 })

    // Rebate periods ending this month
    const now = new Date()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const rebateEndingThisMonth = placements.filter(p => {
      if (!p.placement_date || !p.rebate_weeks) return false
      const end = new Date(p.placement_date)
      end.setDate(end.getDate() + p.rebate_weeks * 7)
      return end >= now && end <= monthEnd
    }).length

    return NextResponse.json({
      placements,
      counts,
      total_active: placements.length,
      rebate_ending_this_month: rebateEndingThisMonth,
    })
  } catch (err) {
    console.error('Placement health error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
