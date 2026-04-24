import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

export async function GET(request) {
  // ── Auth: bearer token must match CRON_SECRET ──────────────────────────────
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const adminClient = createServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

  // ── Date range: first to last day of previous month ─────────────────────────
  const now = new Date()
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const monthLabel = firstOfLastMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // ── Fetch all users with an email address ───────────────────────────────────
  const { data: users, error: usersError } = await adminClient
    .from('users')
    .select('id, email, company_name')
    .not('email', 'is', null)

  if (usersError) {
    console.error('monthly-insights: users query failed', usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const sent = []
  const skipped = []
  const errors = []

  for (const user of users) {
    if (!user.email) { skipped.push(user.id); continue }

    try {
      // ── Fetch candidates created last month for this user ──────────────────
      const { data: candidates } = await adminClient
        .from('candidates')
        .select('id, name, status, completed_at, assessment_id, assessments(role_title)')
        .eq('user_id', user.id)
        .gte('created_at', firstOfLastMonth.toISOString())
        .lte('created_at', lastOfLastMonth.toISOString())

      const total = candidates?.length ?? 0

      // Skip users with no activity last month
      if (total === 0) { skipped.push(user.email); continue }

      const candidateIds = candidates.map(c => c.id)

      // ── Fetch results for those candidates ─────────────────────────────────
      const { data: results } = await adminClient
        .from('results')
        .select('candidate_id, overall_score, risk_level')
        .in('candidate_id', candidateIds)

      const resultMap = {}
      for (const r of results || []) resultMap[r.candidate_id] = r

      // ── Compute stats ──────────────────────────────────────────────────────
      const completed  = candidates.filter(c => c.status === 'completed').length
      const pending    = total - completed
      const scores     = Object.values(resultMap).map(r => r.overall_score).filter(s => s != null)
      const avgScore   = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
      const recommended = scores.filter(s => s >= 70).length
      const highRisk   = Object.values(resultMap).filter(r => r.risk_level === 'High').length

      // Top candidate = highest scoring completed candidate
      let topCandidate = null
      let topScore = -1
      for (const c of candidates) {
        const r = resultMap[c.id]
        if (r?.overall_score != null && r.overall_score > topScore) {
          topScore = r.overall_score
          topCandidate = { name: c.name, role: c.assessments?.role_title || null, score: r.overall_score }
        }
      }

      const companyName = user.company_name || 'there'

      // ── Build HTML email ───────────────────────────────────────────────────
      const html = buildEmail({
        companyName,
        monthLabel,
        total,
        completed,
        pending,
        avgScore,
        recommended,
        highRisk,
        topCandidate,
        appUrl,
      })

      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Your PRODICTA Monthly Summary: ${monthLabel}`,
        html,
      })

      sent.push(user.email)
    } catch (err) {
      console.error(`monthly-insights: failed for ${user.email}`, err)
      errors.push({ email: user.email, error: err.message })
    }
  }

  return NextResponse.json({ sent: sent.length, skipped: skipped.length, errors })
}

// ── Email template ─────────────────────────────────────────────────────────────

function buildEmail({ companyName, monthLabel, total, completed, pending, avgScore, recommended, highRisk, topCandidate, appUrl }) {
  const scoreColor = avgScore == null ? '#94a1b3'
    : avgScore >= 75 ? '#16a34a'
    : avgScore >= 50 ? '#d97706'
    : '#dc2626'

  const scoreLabel = avgScore == null ? 'No data'
    : avgScore >= 85 ? 'Excellent'
    : avgScore >= 75 ? 'Strong'
    : avgScore >= 60 ? 'Moderate'
    : avgScore >= 45 ? 'Developing'
    : 'Concern'

  const statCard = (label, value, subtext, accent) => `
    <td style="width:50%;padding:8px;">
      <div style="background:#fff;border:1px solid #e4e9f0;border-radius:12px;padding:18px 20px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${label}</div>
        <div style="font-size:32px;font-weight:800;color:${accent || '#0f2137'};line-height:1;margin-bottom:4px;">${value}</div>
        ${subtext ? `<div style="font-size:12px;color:#94a1b3;">${subtext}</div>` : ''}
      </div>
    </td>`

  const topCandidateBlock = topCandidate ? `
    <div style="background:#e0f2f0;border:1px solid #00BFA555;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#009688;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Top candidate this month</div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:#0f2137;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:#00BFA5;font-size:18px;font-weight:800;">${(topCandidate.name || '?')[0].toUpperCase()}</span>
        </div>
        <div>
          <div style="font-size:15px;font-weight:800;color:#0f2137;">${topCandidate.name}</div>
          ${topCandidate.role ? `<div style="font-size:13px;color:#5e6b7f;">${topCandidate.role}</div>` : ''}
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="font-size:28px;font-weight:800;color:${scoreColor};line-height:1;">${topCandidate.score}</div>
          <div style="font-size:11px;color:#94a1b3;">/ 100</div>
        </div>
      </div>
    </div>` : ''

  const highRiskBlock = highRisk > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
      <span style="font-size:13.5px;color:#dc2626;font-weight:700;">&#9888; ${highRisk} candidate${highRisk > 1 ? 's' : ''} flagged as High Risk.</span>
      <span style="font-size:13px;color:#5e6b7f;"> Review their reports before making a hiring decision.</span>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your PRODICTA Monthly Summary</title>
</head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:system-ui,sans-serif;">
  <div style="max-width:620px;margin:40px auto 60px;">

    <!-- Header -->
    <div style="background:#0f2137;border-radius:16px 16px 0 0;padding:28px 36px 24px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:900;letter-spacing:0.04em;">PRODICTA</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">AI-Powered Work Simulation Assessment</div>
    </div>

    <!-- Title band -->
    <div style="background:#0d3349;padding:20px 36px 22px;border-bottom:3px solid #00BFA5;">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">Your Monthly Hiring Summary</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px;">${monthLabel}</div>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 36px;border:1px solid #e4e9f0;border-top:none;">

      <p style="font-size:15px;color:#0f172a;margin:0 0 24px;">
        Hi <strong>${companyName}</strong>, here is a summary of your hiring activity on Prodicta last month.
      </p>

      <!-- Stats grid: row 1 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
        <tr>
          ${statCard('Total Candidates', total, 'sent for assessment', '#0f2137')}
          ${statCard('Completed', completed, `${pending} still pending`, '#0f2137')}
        </tr>
      </table>

      <!-- Stats grid: row 2 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          ${statCard('Average Score', avgScore != null ? `${avgScore}<span style="font-size:16px;font-weight:600;color:#94a1b3;">/100</span>` : '-', avgScore != null ? scoreLabel : 'No completed assessments', scoreColor)}
          ${statCard('Recommended to Hire', recommended, 'scored 70 or above', '#16a34a')}
        </tr>
      </table>

      <!-- Top candidate -->
      ${topCandidateBlock}

      <!-- High risk warning -->
      ${highRiskBlock}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${appUrl}/assessment/new"
           style="display:inline-block;background:#00BFA5;color:#0f2137;font-weight:800;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">
          Create your next assessment &rarr;
        </a>
      </div>

      <p style="font-size:12px;color:#94a1b3;text-align:center;margin:20px 0 0;">
        You're receiving this because you have an active Prodicta account.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f7f9fb;border:1px solid #e4e9f0;border-top:none;border-radius:0 0 16px 16px;padding:16px 36px;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">
        <strong style="color:#00BFA5;">PRODICTA</strong>
        &nbsp;&middot;&nbsp;
        <a href="${appUrl}" style="color:#94a1b3;text-decoration:none;">prodicta.co.uk</a>
        &nbsp;&middot;&nbsp;
        <a href="${appUrl}/dashboard" style="color:#94a1b3;text-decoration:none;">Go to dashboard</a>
      </p>
    </div>

  </div>
</body>
</html>`
}
