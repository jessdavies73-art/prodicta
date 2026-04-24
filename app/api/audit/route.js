import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { EMAIL_FROM } from '@/lib/email-sender'

export const maxDuration = 120

// Strip em/en dashes from any string in a value
function stripDashes(value) {
  if (typeof value === 'string') return value.replace(/\s*[\u2014\u2013]\s*/g, ', ')
  if (Array.isArray(value)) return value.map(stripDashes)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = stripDashes(value[k])
    return out
  }
  return value
}

async function generateRiskReport(client, jobDescription) {
  const message = await client.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: `You are a hiring risk analyst for UK employers. Read this job description and identify the top 3 hiring risks built into THIS ROLE.

Also extract the role title from the job description. If unclear, return "this role".

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

Return ONLY a JSON object with no preamble, no explanation, no markdown:

{
  "role_title": "Short role title from the JD",
  "risks": [
    {
      "title": "Short risk title (5 to 8 words) describing a property of the role",
      "severity": "High",
      "explanation": "One to two sentences explaining why this aspect of the role is hard for a standard hiring process to test for, and what the hiring process needs to assess in order to de-risk it."
    }
  ]
}

There must be exactly 3 risks. Severity must be one of: High, Medium, Low. Write in UK English. Be specific to this role, not generic.

FORMATTING RULE: Never use em dash or en dash characters. Use commas, full stops, or rewrite the sentence instead.`
    }]
  }).finalMessage()
  const content = message.content[0].text.trim()
  const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  return stripDashes(JSON.parse(jsonStr))
}

// Sanitise text for WinAnsi (pdf-lib StandardFonts only support WinAnsi)
function safe(text) {
  if (!text) return ''
  return String(text)
    .replace(/[\u2014\u2013]/g, ', ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\xFF]/g, '')
}

function wrap(text, font, size, maxWidth) {
  const words = safe(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

async function buildPdf(companyName, reports, projection) {
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const navy = rgb(0.06, 0.13, 0.22)
  const teal = rgb(0, 0.75, 0.65)
  const grey = rgb(0.42, 0.46, 0.52)
  const black = rgb(0.1, 0.13, 0.18)
  const red = rgb(0.85, 0.18, 0.21)
  const amber = rgb(0.93, 0.55, 0.06)
  const green = rgb(0.13, 0.6, 0.36)

  function severityColor(s) {
    const v = (s || '').toLowerCase()
    if (v === 'high') return red
    if (v === 'medium') return amber
    return green
  }

  // Cover page
  let page = pdf.addPage([595, 842])
  page.drawRectangle({ x: 0, y: 642, width: 595, height: 200, color: navy })
  page.drawText('PRODICTA', { x: 40, y: 760, size: 36, font: helvB, color: teal })
  page.drawText('Hiring Risk Audit', { x: 40, y: 720, size: 22, font: helv, color: rgb(1, 1, 1) })
  page.drawText('Prepared for', { x: 40, y: 580, size: 11, font: helv, color: grey })
  page.drawText(safe(companyName), { x: 40, y: 555, size: 22, font: helvB, color: black })
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  page.drawText(`Date: ${today}`, { x: 40, y: 520, size: 11, font: helv, color: grey })
  const intro = 'This report identifies the structural hiring risks built into the roles you submitted. Each risk describes something about the role itself that a standard CV review or interview process is unlikely to test for. Use these as a starting point for designing a hiring process that genuinely de-risks each role.'
  const introLines = wrap(intro, helv, 11, 515)
  introLines.forEach((l, i) => page.drawText(l, { x: 40, y: 460 - i * 16, size: 11, font: helv, color: black }))

  // Per-role pages
  for (const r of reports) {
    page = pdf.addPage([595, 842])
    let y = 790
    page.drawRectangle({ x: 0, y: 770, width: 595, height: 4, color: teal })
    page.drawText('ROLE', { x: 40, y: 740, size: 9, font: helvB, color: grey })
    page.drawText(safe(r.role_title || 'this role'), { x: 40, y: 715, size: 20, font: helvB, color: navy })
    y = 680
    page.drawText('Top 3 hiring risks', { x: 40, y, size: 12, font: helvB, color: black })
    y -= 24
    for (const risk of (r.risks || [])) {
      if (y < 140) {
        page = pdf.addPage([595, 842])
        y = 790
      }
      const sev = (risk.severity || 'Medium').toUpperCase()
      page.drawText(sev, { x: 40, y, size: 9, font: helvB, color: severityColor(risk.severity) })
      page.drawText(safe(risk.title || ''), { x: 90, y, size: 12, font: helvB, color: navy })
      y -= 18
      const exLines = wrap(risk.explanation || '', helv, 10.5, 515)
      for (const l of exLines) {
        page.drawText(l, { x: 40, y, size: 10.5, font: helv, color: black })
        y -= 14
      }
      y -= 12
    }
  }

  // Projection page (if hires_per_year provided)
  if (projection && projection.hires > 0) {
    page = pdf.addPage([595, 842])
    page.drawRectangle({ x: 0, y: 770, width: 595, height: 4, color: teal })
    page.drawText('PROJECTION', { x: 40, y: 740, size: 9, font: helvB, color: grey })
    page.drawText('Your projected bad-hire cost in 2027', { x: 40, y: 715, size: 18, font: helvB, color: navy })

    let yp = 670
    page.drawRectangle({ x: 40, y: yp - 110, width: 515, height: 130, color: navy })
    page.drawText('UNDER ERA 2025', { x: 56, y: yp - 8, size: 9, font: helvB, color: teal })
    page.drawText(`If you make ${projection.hires} hire${projection.hires === 1 ? '' : 's'} per year, the projected cost`, {
      x: 56, y: yp - 30, size: 11, font: helv, color: rgb(1, 1, 1),
    })
    page.drawText(`of bad hires under ERA 2025:`, {
      x: 56, y: yp - 46, size: 11, font: helv, color: rgb(1, 1, 1),
    })
    page.drawText(`£${projection.projectedCost.toLocaleString('en-GB')}`, {
      x: 56, y: yp - 80, size: 28, font: helvB, color: teal,
    })

    yp -= 150
    page.drawText('PRODICTA could save you up to', { x: 40, y: yp, size: 11, font: helv, color: black })
    page.drawText(`£${projection.saving.toLocaleString('en-GB')}`, { x: 40, y: yp - 28, size: 24, font: helvB, color: navy })
    page.drawText('of that, based on a 47% reduction in bad hire costs across our user base.', {
      x: 40, y: yp - 50, size: 10.5, font: helv, color: grey,
    })

    yp -= 90
    const note = 'Calculation: hires per year x 30% industry average failure rate x £38,400 average cost per bad hire. The PRODICTA saving applies a 47% reduction observed across our customer base in their first year of use.'
    const noteLines = wrap(note, helv, 10, 515)
    noteLines.forEach(l => { page.drawText(l, { x: 40, y: yp, size: 10, font: helv, color: grey }); yp -= 13 })
  }

  // CTA page
  page = pdf.addPage([595, 842])
  page.drawRectangle({ x: 0, y: 642, width: 595, height: 200, color: navy })
  page.drawText('Want this for every candidate?', { x: 40, y: 760, size: 22, font: helvB, color: rgb(1, 1, 1) })
  page.drawText('PRODICTA tests every candidate against your role.', { x: 40, y: 725, size: 12, font: helv, color: rgb(0.85, 0.95, 0.95) })
  const cta = 'PRODICTA gives every candidate a professional AI assessment that shows exactly how they will perform on the job, before you interview them. You see the risks, the gaps, the pressure-fit, and the evidence in their own words. No more gambling on interviews.'
  const ctaLines = wrap(cta, helv, 11, 515)
  ctaLines.forEach((l, i) => page.drawText(l, { x: 40, y: 580 - i * 16, size: 11, font: helv, color: black }))
  page.drawText('Try the demo at prodicta.co.uk/demo', { x: 40, y: 460, size: 13, font: helvB, color: teal })
  page.drawText('Talk to us: hello@prodicta.co.uk', { x: 40, y: 435, size: 12, font: helv, color: black })

  return await pdf.save()
}

export async function POST(request) {
  try {
    const { company_name, email, jds, hires_per_year } = await request.json()
    if (!company_name || !email || !Array.isArray(jds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const validJds = jds.map(j => (j || '').trim()).filter(j => j.length >= 50)
    if (validJds.length === 0) {
      return NextResponse.json({ error: 'Provide at least one job description (50 characters minimum)' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const reports = []
    for (const jd of validJds.slice(0, 3)) {
      try {
        const r = await generateRiskReport(client, jd)
        reports.push(r)
      } catch (e) {
        console.error('Audit risk-report failed:', e?.message)
      }
    }
    if (reports.length === 0) {
      return NextResponse.json({ error: 'Failed to analyse any job descriptions' }, { status: 500 })
    }

    const hiresN = Math.max(0, parseInt(hires_per_year) || 0)
    const projection = hiresN > 0
      ? {
          hires: hiresN,
          projectedCost: Math.round(hiresN * 0.30 * 38400),
          saving: Math.round(hiresN * 0.30 * 38400 * 0.47),
        }
      : null

    const pdfBytes = await buildPdf(company_name, reports, projection)
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const filename = `PRODICTA-Hiring-Risk-Audit-${company_name.replace(/[^a-z0-9]+/gi, '-')}.pdf`

    // Email to the requester
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: 'Your PRODICTA Hiring Risk Audit',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#0f2137;border-radius:12px 12px 0 0;padding:24px 32px;">
    <div style="font-size:22px;font-weight:800;color:#00BFA5;letter-spacing:-0.5px;">PRODICTA</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px;">Hiring Risk Audit</div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px;border:1px solid #e4e9f0;border-top:none;">
    <p style="margin:0 0 14px;font-size:15px;color:#1a202c;line-height:1.6;">Hi,</p>
    <p style="margin:0 0 14px;font-size:14px;color:#2d3748;line-height:1.65;">Your free PRODICTA Hiring Risk Audit is attached. It covers ${reports.length} role${reports.length === 1 ? '' : 's'} and identifies the structural hiring risks built into each one.</p>
    <p style="margin:0 0 14px;font-size:14px;color:#2d3748;line-height:1.65;">If you would like every candidate you interview to come with a professional AI assessment that shows exactly how they will perform on the job, take a look at the demo.</p>
    <p style="margin:18px 0 0;font-size:14px;color:#2d3748;line-height:1.65;"><a href="https://prodicta.co.uk/demo" style="color:#00BFA5;font-weight:700;text-decoration:none;">Try the demo</a> &middot; <a href="mailto:hello@prodicta.co.uk" style="color:#00BFA5;font-weight:700;text-decoration:none;">hello@prodicta.co.uk</a></p>
  </div>
</div></body></html>`,
        attachments: [{ filename, content: pdfBase64 }],
      })
    } catch (e) {
      console.error('Audit recipient email failed:', e?.message)
    }

    // Notify internal
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: ['hello@prodicta.co.uk'],
        subject: `New Hiring Risk Audit request from ${company_name}`,
        html: `<p>Audit requested.</p>
<p><strong>Company:</strong> ${safe(company_name)}<br>
<strong>Email:</strong> ${safe(email)}<br>
<strong>Roles analysed:</strong> ${reports.length}</p>
<p>Roles: ${reports.map(r => safe(r.role_title || 'this role')).join(', ')}</p>`,
        attachments: [{ filename, content: pdfBase64 }],
      })
    } catch (e) {
      console.error('Audit notification email failed:', e?.message)
    }

    return NextResponse.json({ success: true, count: reports.length })
  } catch (err) {
    console.error('Audit error:', err)
    return NextResponse.json({ error: err.message || 'Audit failed' }, { status: 500 })
  }
}
