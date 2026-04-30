import { Resend } from 'resend'
import { EMAIL_FROM } from './email-sender.js'

// Founder visibility on every successful paying signup. Fires from the
// inline PAYG and inline subscription endpoints (and their SCA confirmation
// counterparts). The PAYG webhook recovery path is intentionally silent
// (see app/api/billing/webhook/route.js) so duplicate emails never arrive
// when the inline path already sent one for the same payment.
//
// Best-effort: callers wrap this in their own try/catch. Notification
// failure must not block signup completion. RESEND_API_KEY missing is
// treated as a no-op rather than an error so local / preview environments
// without Resend configured don't have to mock anything.

const FOUNDER_RECIPIENT = 'jr@aiaura.co.uk'
const NOT_SPECIFIED = 'Not yet specified'

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtAmount(pounds) {
  if (pounds == null || Number.isNaN(Number(pounds))) return '0.00'
  return Number(pounds).toFixed(2)
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

function describeAccountType(account_type) {
  if (account_type === 'agency') return 'agency (recruitment agency)'
  if (account_type === 'employer') return 'employer (direct employer)'
  return account_type || NOT_SPECIFIED
}

function describeEmploymentType(employment_type) {
  if (!employment_type) return NOT_SPECIFIED
  if (employment_type === 'permanent') return 'permanent'
  if (employment_type === 'temporary') return 'temporary'
  if (employment_type === 'both') return 'both (permanent and temporary)'
  return employment_type
}

function shortEmploymentForSubject(employment_type) {
  if (!employment_type) return 'unspecified'
  return employment_type
}

function buildSubject({ plan_type, name, account_type, employment_type, total_amount_gbp }) {
  const tag = (plan_type || '').toLowerCase() === 'payg' ? 'New PAYG Signup' : 'New Subscription'
  const who = name || 'Unknown'
  const acct = `${account_type || 'unspecified'}-${shortEmploymentForSubject(employment_type)}`
  if (tag === 'New PAYG Signup') {
    return `[${tag}] ${who} - £${fmtAmount(total_amount_gbp)} - ${acct}`
  }
  return `[${tag}] ${who} - ${plan_type || 'Subscription'} - ${acct}`
}

function buildPurchasesBlock(purchases) {
  if (!Array.isArray(purchases) || purchases.length === 0) return ''
  const rows = purchases.map(p => {
    const ct = escapeHtml(p?.credit_type || 'unknown')
    const qty = escapeHtml(String(p?.quantity ?? ''))
    return `<tr>
      <td style="padding:6px 0;color:#0f172a;font-size:13.5px;">${ct}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:13.5px;text-align:right;font-family:'IBM Plex Mono',monospace;">${qty}</td>
    </tr>`
  }).join('')
  return `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:6px;">What they bought</div>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`
}

export async function sendSignupNotification(payload) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[signup-notification] RESEND_API_KEY not set, founder alert NOT sent', {
      email: payload?.email, plan_type: payload?.plan_type,
    })
    return
  }

  const {
    email,
    name,
    account_type,
    employment_type,
    plan_type,
    purchases,
    total_amount_gbp,
    monthly_amount_gbp,
    signup_timestamp,
    stripe_customer_id,
  } = payload || {}

  const isPayg = (plan_type || '').toLowerCase() === 'payg'
  const subject = buildSubject({ plan_type, name, account_type, employment_type, total_amount_gbp })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prodicta.co.uk'

  const purchasesBlock = isPayg ? buildPurchasesBlock(purchases) : ''
  const totalRow = isPayg
    ? `<tr><td style="padding:8px 0 0;border-top:1px solid #e4e9f0;color:#0f2137;font-weight:800;font-size:14px;">Total</td><td style="padding:8px 0 0;border-top:1px solid #e4e9f0;color:#0f2137;font-weight:800;font-size:14px;text-align:right;font-family:'IBM Plex Mono',monospace;">£${fmtAmount(total_amount_gbp)}</td></tr>`
    : ''
  const planBlock = isPayg ? '' : `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:10px;">Plan</div>
      <div style="font-size:13.5px;color:#0f172a;line-height:1.7;">
        <div><strong>Plan:</strong> ${escapeHtml(plan_type || NOT_SPECIFIED)}</div>
        ${monthly_amount_gbp != null ? `<div><strong>Monthly amount:</strong> £${fmtAmount(monthly_amount_gbp)}</div>` : ''}
      </div>
    </div>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:600px;margin:40px auto;">

    <div style="background:#0f2137;padding:28px 36px;border-radius:16px 16px 0 0;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.3px;line-height:1;">
        <span style="color:#ffffff;">PRO</span><span style="color:#00BFA5;">DICTA</span>
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:4px;letter-spacing:0.07em;text-transform:uppercase;">New signup</div>
    </div>

    <div style="background:#e6f7f5;border-left:4px solid #00BFA5;padding:16px 36px;border:1px solid #80dfd2;border-top:none;">
      <div style="font-size:11px;font-weight:700;color:#0f6e63;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">${escapeHtml(isPayg ? 'PAYG signup' : 'Subscription signup')}</div>
      <div style="font-size:15px;font-weight:800;color:#0f2137;">${escapeHtml(name || 'Unknown')} just signed up.</div>
    </div>

    <div style="background:#ffffff;padding:32px 36px;border:1px solid #e4e9f0;border-top:none;">

      <div>
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:10px;">Customer details</div>
        <div style="font-size:13.5px;color:#0f172a;line-height:1.7;">
          <div><strong>Name:</strong> ${escapeHtml(name || 'Unknown')}</div>
          <div><strong>Email:</strong> ${escapeHtml(email || NOT_SPECIFIED)}</div>
          <div><strong>Account type:</strong> ${escapeHtml(describeAccountType(account_type))}</div>
          <div><strong>Employment focus:</strong> ${escapeHtml(describeEmploymentType(employment_type))}</div>
        </div>
      </div>

      ${planBlock}
      ${purchasesBlock}
      ${totalRow ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;">${totalRow}</table>` : ''}

      <div style="margin-top:22px;font-size:12.5px;color:#5e6b7f;line-height:1.7;">
        <div><strong>Timestamp:</strong> ${escapeHtml(fmtTimestamp(signup_timestamp))}</div>
        ${stripe_customer_id ? `<div><strong>Stripe customer ID:</strong> ${escapeHtml(stripe_customer_id)}</div>` : ''}
      </div>

      <div style="text-align:center;margin-top:26px;">
        <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:#0f2137;color:#ffffff;padding:12px 28px;border-radius:10px;font-size:13.5px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">View customer in PRODICTA dashboard</a>
      </div>

    </div>

    <div style="background:#f7f9fb;padding:14px 36px;border-radius:0 0 16px 16px;border:1px solid #e4e9f0;border-top:none;">
      <p style="font-size:11.5px;color:#94a1b3;margin:0;text-align:center;">
        Internal founder alert from <strong style="color:#0f2137;">PRODICTA</strong>. One per paying signup.
      </p>
    </div>

  </div>
</body>
</html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: EMAIL_FROM,
    to: [FOUNDER_RECIPIENT],
    subject,
    html,
  })
}
