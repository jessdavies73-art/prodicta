import { Resend } from 'resend'
import { EMAIL_FROM } from './email-sender.js'

// Score → verdict band using the canonical 80/55 thresholds (commit 3775e7e).
// Same bands the dashboard, candidate report, and Drafted-Roles pipeline read,
// so the email subject and on-screen verdict always agree.
function verdictFor(score) {
  if (score == null) return null
  if (score >= 80) return { label: 'Strong Hire', subjectTag: 'Strong Hire', color: '#00BFA5', bg: '#D8F4EC', border: '#00BFA555' }
  if (score >= 55) return { label: 'Review', subjectTag: 'Review', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' }
  return { label: 'High Risk', subjectTag: 'High Risk', color: '#B91C1C', bg: '#FEE2E2', border: '#FECACA' }
}

function pickTopStrength(strengths) {
  if (!Array.isArray(strengths) || strengths.length === 0) return null
  const first = strengths[0]
  if (typeof first === 'string') return first.trim() || null
  if (first && typeof first === 'object') {
    return first.strength || first.title || first.text || null
  }
  return null
}

function pickTopWatchout(watchouts) {
  if (!Array.isArray(watchouts) || watchouts.length === 0) return null
  // Prefer the highest-severity entry; fall back to the first row.
  const sevRank = { High: 3, Medium: 2, Low: 1 }
  const sorted = [...watchouts].sort((a, b) => {
    const ra = typeof a === 'object' ? (sevRank[a?.severity] || 0) : 0
    const rb = typeof b === 'object' ? (sevRank[b?.severity] || 0) : 0
    return rb - ra
  })
  const top = sorted[0]
  if (typeof top === 'string') return top.trim() || null
  if (top && typeof top === 'object') {
    return top.text || top.title || top.watchout || null
  }
  return null
}

// Sent on every scoring_finished event when the red-flag alert does NOT fire.
// Red-flag candidates already get the more detailed red-flag email; the
// caller is responsible for the if/else gating so the recruiter never
// receives two emails for the same candidate.
export async function sendScoringCompleteAlert({ candidate, assessment, result, userEmail }) {
  if (!process.env.RESEND_API_KEY || !userEmail) return

  const score = result?.overall_score
  const verdict = verdictFor(score)
  if (!verdict) return // safety: no score → don't notify

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'
  const reportUrl = `${appUrl}/assessment/${candidate.assessment_id}/candidate/${candidate.id}`
  const candidateName = candidate?.name || 'A candidate'
  const roleTitle = assessment?.role_title || 'this role'

  const topStrength = pickTopStrength(result?.strengths)
  const topWatchout = pickTopWatchout(result?.watchouts)

  const subject = `[${verdict.subjectTag}] ${candidateName} completed ${roleTitle}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;">

    <!-- Header -->
    <div style="background:#0f2137;padding:28px 36px;border-radius:16px 16px 0 0;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.3px;line-height:1;">
        <span style="color:#ffffff;">PRO</span><span style="color:#00BFA5;">DICTA</span>
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:4px;letter-spacing:0.07em;text-transform:uppercase;">Assessment complete</div>
    </div>

    <!-- Body card -->
    <div style="background:#ffffff;padding:32px 36px;border:1px solid #e4e9f0;border-top:none;">

      <p style="font-size:15px;color:#0f172a;margin:0 0 6px;font-weight:700;">${candidateName}</p>
      <p style="font-size:14.5px;color:#5e6b7f;line-height:1.65;margin:0 0 24px;">
        Has completed the <strong style="color:#0f172a;">${roleTitle}</strong> assessment. Their report is ready.
      </p>

      <!-- Score row -->
      <div style="background:#f8fafc;border:1px solid #e4e9f0;border-left:4px solid ${verdict.color};border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;gap:22px;">
        <div style="text-align:center;min-width:64px;">
          <div style="font-size:38px;font-weight:800;color:${verdict.color};line-height:1;font-family:monospace;">${score}</div>
          <div style="font-size:10.5px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-top:4px;">Out of 100</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Verdict</div>
          <div style="display:inline-block;padding:5px 12px;border-radius:50px;font-size:13px;font-weight:800;color:${verdict.color};background:${verdict.bg};border:1px solid ${verdict.border};">${verdict.label}</div>
        </div>
      </div>

      ${topStrength ? `
      <!-- Top strength -->
      <div style="margin-bottom:16px;">
        <div style="font-size:10.5px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Top strength</div>
        <div style="font-size:13.5px;color:#0f172a;line-height:1.55;">${topStrength}</div>
      </div>` : ''}

      ${topWatchout ? `
      <!-- Top watch-out -->
      <div style="margin-bottom:24px;">
        <div style="font-size:10.5px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Top watch-out</div>
        <div style="font-size:13.5px;color:#0f172a;line-height:1.55;">${topWatchout}</div>
      </div>` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin-top:8px;">
        <a href="${reportUrl}" style="display:inline-block;background:#00BFA5;color:#0f2137;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">View full report</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f7f9fb;padding:16px 36px;border-radius:0 0 16px 16px;border:1px solid #e4e9f0;border-top:none;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">
        This notification was sent by <strong style="color:#0f2137;">PRODICTA</strong> when a candidate completed an assessment you sent.
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: EMAIL_FROM,
    to:   [userEmail],
    subject,
    html,
  })
}
