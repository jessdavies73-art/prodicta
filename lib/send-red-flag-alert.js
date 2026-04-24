import { Resend } from 'resend'
import { EMAIL_FROM } from './email-sender.js'

const sc   = s => s >= 85 ? '#10b981' : s >= 70 ? '#00BFA5' : s >= 50 ? '#f59e0b' : '#ef4444'
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'
const dL   = s => s >= 80 ? 'Strong hire' : s >= 70 ? 'Hire with plan' : s >= 55 ? 'Proceed with caution' : 'Not recommended'

export async function sendRedFlagAlert({ candidate, assessment, result, userEmail, threshold }) {
  if (!process.env.RESEND_API_KEY || !userEmail) return

  const score     = result.overall_score
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'
  const reportUrl = `${appUrl}/assessment/${candidate.assessment_id}/candidate/${candidate.id}`
  const roleTitle = assessment.role_title || 'the role'
  const riskLevel = result.risk_level || 'Unknown'
  const riskColor = riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f59e0b' : '#00BFA5'

  // Build reasons list
  const reasons = []
  if (score < threshold) {
    reasons.push(`Overall score ${score}/100 is below your alert threshold of ${threshold}`)
  }
  const highWatchouts = (result.watchouts || []).filter(w =>
    typeof w === 'object' ? w.severity === 'High' : false
  )
  highWatchouts.forEach(w => {
    const title = typeof w === 'object' ? (w.text || w.title || 'Unnamed concern') : String(w)
    reasons.push(`High severity watch-out: ${title}`)
  })
  const integrityCheck = result.response_quality ||
    (result.integrity && typeof result.integrity === 'object' ? result.integrity.response_quality : null)
  if (integrityCheck && ['Possibly AI-Assisted', 'Suspicious'].includes(integrityCheck)) {
    reasons.push(`Integrity concern detected: ${integrityCheck}`)
  }

  if (reasons.length === 0) return

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
      <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:4px;letter-spacing:0.07em;text-transform:uppercase;">Candidate Alert</div>
    </div>

    <!-- Alert banner -->
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 36px;border:1px solid #fecaca;border-top:none;border-left:4px solid #ef4444;">
      <div style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Flag raised</div>
      <div style="font-size:15px;font-weight:800;color:#0f2137;">${candidate.name} has been flagged on the ${roleTitle} assessment.</div>
    </div>

    <!-- Body card -->
    <div style="background:#ffffff;padding:32px 36px;border:1px solid #e4e9f0;border-top:none;">

      <!-- Score row -->
      <div style="background:#f8fafc;border:1px solid #e4e9f0;border-left:4px solid ${sc(score)};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:28px;display:flex;align-items:center;gap:20px;">
        <div style="text-align:center;min-width:56px;">
          <div style="font-size:34px;font-weight:800;color:${sc(score)};line-height:1;font-family:monospace;">${score}</div>
          <div style="font-size:11px;font-weight:700;color:${sc(score)};text-transform:uppercase;letter-spacing:0.04em;">${slbl(score)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;">Risk level</div>
          <div style="font-size:15px;font-weight:800;color:${riskColor};">${riskLevel}</div>
          <div style="font-size:12.5px;color:#5e6b7f;margin-top:2px;">${dL(score)}</div>
        </div>
      </div>

      <!-- Reasons -->
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #ef4444;padding-bottom:8px;margin-bottom:14px;">Why this candidate was flagged</div>
        ${reasons.map(r => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;margin-top:6px;flex-shrink:0;"></div>
          <span style="font-size:13.5px;color:#0f172a;line-height:1.55;">${r}</span>
        </div>`).join('')}
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:#0f2137;color:#ffffff;padding:14px 32px;border-radius:10px;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">View full report</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f7f9fb;padding:16px 36px;border-radius:0 0 16px 16px;border:1px solid #e4e9f0;border-top:none;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">
        This alert was sent by <strong style="color:#0f2137;">PRODICTA</strong> because this candidate met your flagging criteria.
        You can update your alert threshold in <strong>Settings > Alerts</strong>.
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: EMAIL_FROM,
    to:   [userEmail],
    subject: `PRODICTA Alert: ${candidate.name} has been flagged`,
    html,
  })
}
