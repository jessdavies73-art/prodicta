import { Resend } from 'resend'
import { EMAIL_FROM } from './email-sender.js'

// Layer 1 informational notice to the agency or employer who invited the
// candidate. The candidate has declared reasonable adjustments under the
// Equality Act 2010. PRODICTA accommodates these automatically where
// possible; the recipient does not need to approve or decline anything.
//
// The wording deliberately reads "no action is required from you" so the
// recipient understands this is a disclosure, not a workflow item.

const ADJUSTMENT_LABELS = {
  screen_reader: 'Screen reader compatibility needed',
  simplified_ui: 'Simplified visual layout (reduced animations, simpler UI)',
  audio_response: 'Audio or voice response instead of typing',
  frequent_breaks: 'Frequent breaks needed',
  other: 'Other (see notes)',
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtTimestamp(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toUTCString()
  } catch {
    return iso
  }
}

export async function sendAdjustmentNotice({
  recipientEmail,
  candidateName,
  roleTitle,
  adjustmentTypes,
  additionalNotes,
  submittedAt,
  isUpdate,
  candidateReportUrl,
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[adjustment-notice] RESEND_API_KEY not set, notice NOT sent', { recipientEmail })
    return
  }
  if (!recipientEmail) {
    console.warn('[adjustment-notice] no recipientEmail, notice NOT sent', { candidateName })
    return
  }

  const role = roleTitle || 'the role'
  const subjectPrefix = isUpdate ? '[Adjustment Notice Updated]' : '[Adjustment Notice]'
  const subject = `${subjectPrefix} ${candidateName || 'Candidate'} - assessment for ${role}`

  const items = (Array.isArray(adjustmentTypes) ? adjustmentTypes : [])
    .map(t => ADJUSTMENT_LABELS[t] || t)
  const itemsHtml = items.length > 0
    ? items.map(label => `<li style="font-size:13.5px;color:#0f172a;line-height:1.65;margin-bottom:4px;">${escapeHtml(label)}</li>`).join('')
    : `<li style="font-size:13.5px;color:#5e6b7f;line-height:1.65;">No specific adjustment types selected (see notes below).</li>`

  const notesBlock = additionalNotes && additionalNotes.trim().length > 0 ? `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:10px;">Additional notes from candidate</div>
      <p style="font-size:13.5px;color:#0f172a;line-height:1.65;margin:0;white-space:pre-wrap;">${escapeHtml(additionalNotes)}</p>
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;">

    <div style="background:#0f2137;padding:28px 36px;border-radius:16px 16px 0 0;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.3px;line-height:1;">
        <span style="color:#ffffff;">PRO</span><span style="color:#00BFA5;">DICTA</span>
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:4px;letter-spacing:0.07em;text-transform:uppercase;">${escapeHtml(isUpdate ? 'Adjustment notice updated' : 'Adjustment notice')}</div>
    </div>

    <div style="background:#e6f7f5;border-left:4px solid #00BFA5;padding:16px 36px;border:1px solid #80dfd2;border-top:none;">
      <div style="font-size:11px;font-weight:700;color:#0f6e63;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Reasonable adjustment notice</div>
      <div style="font-size:15px;font-weight:800;color:#0f2137;">${escapeHtml(candidateName || 'A candidate')} has declared adjustments for the ${escapeHtml(role)} assessment.</div>
    </div>

    <div style="background:#ffffff;padding:32px 36px;border:1px solid #e4e9f0;border-top:none;">

      <div>
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:10px;">Details</div>
        <div style="font-size:13.5px;color:#0f172a;line-height:1.7;">
          <div><strong>Candidate:</strong> ${escapeHtml(candidateName || 'Unknown')}</div>
          <div><strong>Role:</strong> ${escapeHtml(role)}</div>
          <div><strong>Submitted:</strong> ${escapeHtml(fmtTimestamp(submittedAt))}</div>
        </div>
      </div>

      <div style="margin-top:18px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:10px;">Adjustments requested</div>
        <ul style="margin:0;padding-left:22px;">${itemsHtml}</ul>
      </div>

      ${notesBlock}

      <div style="margin-top:22px;padding:14px 18px;background:#f7f9fb;border-left:3px solid #94a1b3;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.65;">
          <strong style="color:#0f2137;">No action is required from you.</strong> This is an informational notice. PRODICTA will accommodate these adjustments automatically where possible. The candidate has been thanked and can proceed with the assessment. You may wish to follow up directly if the candidate's notes warrant additional support.
        </p>
      </div>

      ${candidateReportUrl ? `
      <div style="text-align:center;margin-top:26px;">
        <a href="${escapeHtml(candidateReportUrl)}" style="display:inline-block;background:#0f2137;color:#ffffff;padding:12px 28px;border-radius:10px;font-size:13.5px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">View candidate in dashboard</a>
      </div>` : ''}

    </div>

    <div style="background:#f7f9fb;padding:14px 36px;border-radius:0 0 16px 16px;border:1px solid #e4e9f0;border-top:none;">
      <p style="font-size:11.5px;color:#94a1b3;margin:0;text-align:center;">
        Sent by <strong style="color:#0f2137;">PRODICTA</strong> on behalf of the candidate. No reply needed.
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: EMAIL_FROM,
    to: [recipientEmail],
    subject,
    html,
  })
}

export { ADJUSTMENT_LABELS }
