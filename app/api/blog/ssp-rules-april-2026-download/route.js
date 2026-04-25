import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase-server'
import { EMAIL_FROM } from '@/lib/email-sender'

export const maxDuration = 60

// ─────────────────────────────────────────────────────────────
// PDF helpers, aligned with the rest of the PRODICTA PDFs.
// ─────────────────────────────────────────────────────────────

function safe(text) {
  if (text == null) return ''
  return String(text)
    .replace(/[—–]/g, ', ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[…]/g, '...')
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

const CHANGES = [
  {
    n: 1,
    title: 'The three-day waiting period is abolished',
    body: 'SSP is payable from day one of sickness. Every day, including weekends and non-working days within the period, is a paid SSP day.',
    impact: [
      'A worker off sick for two days now gets two days of SSP (previously zero).',
      'A worker off sick for a week gets seven days of SSP (previously four).',
      'Bottom-line cost of short-term sickness rises significantly.',
    ],
  },
  {
    n: 2,
    title: 'The Lower Earnings Limit threshold is abolished',
    body: 'The £125 per week LEL threshold is removed. Every employed worker, regardless of earnings, is eligible for SSP from day one.',
    impact: [
      'Part-time and casual workers who previously got nothing now get SSP.',
      'Recruitment agencies must include SSP in low-paid temp cost models.',
      'Zero-hours and ad-hoc contracts need updated payroll systems.',
    ],
  },
  {
    n: 3,
    title: 'The 80% AWE calculation',
    body: 'SSP becomes the lower of the standard weekly SSP rate or 80% of the worker\'s average weekly earnings. The calculation must be done individually for every absence.',
    impact: [
      'Lower-paid workers get a lower SSP than the standard rate.',
      'Higher-paid workers are still capped at the standard weekly rate.',
      'Generic flat-rate payroll calculations no longer work.',
    ],
  },
]

const WORKED_EXAMPLES = [
  { awe: '£100 per week', calc: 'lower of standard rate or £80', result: '£80 per week (80% of AWE)' },
  { awe: '£200 per week', calc: 'lower of standard rate or £160', result: '£120 per week (capped at standard rate of £120)' },
  { awe: '£500 per week', calc: 'lower of standard rate or £400', result: '£120 per week (capped at standard rate of £120)' },
]

const LINKED_EXAMPLES = [
  {
    title: 'Example 1: Periods link',
    rows: [
      'Sickness period A: 5 days off, 6 to 10 May',
      'Return to work for 30 days',
      'Sickness period B: 7 days off, 9 to 15 June',
      'Gap is 30 days, less than 56. The two periods LINK.',
      'SSP entitlement on period B continues from where period A left off and counts toward the same 28-week maximum.',
    ],
  },
  {
    title: 'Example 2: Periods do not link',
    rows: [
      'Sickness period A: 5 days off, 6 to 10 May',
      'Return to work for 70 days',
      'Sickness period B: 7 days off, 17 to 23 July',
      'Gap is 70 days, more than 56. The two periods do NOT link.',
      'Period B starts a fresh 28-week SSP entitlement.',
    ],
  },
]

const DOC_REQUIREMENTS = [
  'Worker name and National Insurance number',
  'First day of sickness',
  'Last day of sickness',
  'Number of qualifying days in the period',
  'Whether the period links to a previous period of incapacity',
  'The SSP calculation (standard rate vs 80% AWE)',
  'The amount paid',
  'The running total against the 28-week maximum',
]

const EMPLOYER_CHECKLIST = [
  'Confirm payroll software supports the new SSP rules.',
  'Update sick pay policies and employee handbooks.',
  'Train line managers on day-one eligibility.',
  'Update hiring cost models to reflect higher SSP exposure.',
  'Review absence reporting processes.',
]

const AGENCY_CHECKLIST = [
  'Update margin calculations to include day-one SSP.',
  'Renegotiate client rates if margins are tight.',
  'Confirm payroll bureau or software is ready.',
  'Implement linked period tracking.',
  'Update assignment confirmation templates.',
  'Communicate the changes to clients.',
]

const SHARED_CHECKLIST = [
  'Build a documented SSP record-keeping system.',
  'Plan for higher short-term sickness costs.',
  'Make sure someone in the business owns SSP compliance and understands the new rules.',
]

async function buildPdf() {
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const helvI = await pdf.embedFont(StandardFonts.HelveticaOblique)

  const navy = rgb(0.06, 0.13, 0.22)
  const teal = rgb(0, 0.75, 0.65)
  const grey = rgb(0.42, 0.46, 0.52)
  const black = rgb(0.1, 0.13, 0.18)
  const white = rgb(1, 1, 1)
  const line = rgb(0.86, 0.89, 0.93)

  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN = 48
  const CONTENT_W = PAGE_W - MARGIN * 2

  let page = pdf.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  function drawRunningHeader(p) {
    p.drawRectangle({ x: 0, y: PAGE_H - 48, width: PAGE_W, height: 48, color: navy })
    p.drawText('PRODICTA', { x: MARGIN, y: PAGE_H - 30, size: 13, font: helvB, color: teal })
    p.drawText('SSP Rules April 2026 Guide', { x: MARGIN + 90, y: PAGE_H - 30, size: 10, font: helv, color: white })
  }

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H])
    drawRunningHeader(page)
    y = PAGE_H - 78
  }

  function ensure(space) {
    if (y - space < 70) newPage()
  }

  function drawSectionBand(label) {
    ensure(40)
    page.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_W, height: 26, color: navy })
    page.drawText(safe(label), { x: MARGIN + 14, y: y - 14, size: 11, font: helvB, color: white })
    y -= 38
  }

  function drawH3(text) {
    ensure(24)
    page.drawText(safe(text), { x: MARGIN, y, size: 13, font: helvB, color: navy })
    y -= 18
  }

  function drawParagraph(text, opts = {}) {
    const size = opts.size || 10
    const color = opts.color || black
    const font = opts.bold ? helvB : (opts.italic ? helvI : helv)
    const lh = opts.lh || (size + 3.5)
    const lines = wrap(text, font, size, opts.width || CONTENT_W)
    for (const ln of lines) {
      ensure(lh)
      page.drawText(ln, { x: opts.x ?? MARGIN, y, size, font, color })
      y -= lh
    }
    if (opts.gap !== false) y -= 4
  }

  function drawBullet(text, opts = {}) {
    const size = opts.size || 10
    const color = opts.color || grey
    const lh = size + 3.5
    const indent = opts.indent ?? 16
    ensure(lh)
    // teal dot
    page.drawCircle({ x: MARGIN + 4, y: y + size / 3, size: 2, color: teal })
    const lines = wrap(text, helv, size, CONTENT_W - indent)
    for (let i = 0; i < lines.length; i++) {
      ensure(lh)
      page.drawText(lines[i], { x: MARGIN + indent, y, size, font: helv, color })
      y -= lh
    }
    y -= 2
  }

  function drawNumberedChange({ n, title, body, impact }) {
    ensure(60)
    // Teal number block
    page.drawRectangle({ x: MARGIN, y: y - 22, width: 32, height: 26, color: teal })
    const nStr = String(n)
    const nW = helvB.widthOfTextAtSize(nStr, 14)
    page.drawText(nStr, { x: MARGIN + (32 - nW) / 2, y: y - 14, size: 14, font: helvB, color: navy })

    // Title
    const titleLines = wrap(title, helvB, 12, CONTENT_W - 42)
    let ty = y - 12
    for (const ln of titleLines) {
      page.drawText(ln, { x: MARGIN + 42, y: ty, size: 12, font: helvB, color: navy })
      ty -= 15
    }
    y = Math.min(y - 30, ty - 4)

    drawParagraph(body, { size: 10, color: black })
    for (const it of impact) drawBullet(it)
    y -= 6
  }

  function drawTableRow(left, right, opts = {}) {
    const size = 10
    const lh = size + 4
    const leftW = 200
    ensure(lh + 4)
    page.drawText(safe(left), { x: MARGIN, y, size, font: helvB, color: navy })
    const rightLines = wrap(right, helv, size, CONTENT_W - leftW)
    let ry = y
    for (const ln of rightLines) {
      page.drawText(ln, { x: MARGIN + leftW, y: ry, size, font: helv, color: black })
      ry -= lh
    }
    y = Math.min(y - lh, ry)
    if (opts.rule !== false) {
      page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.4, color: line })
      y -= 6
    }
  }

  function drawRule() {
    ensure(8)
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.6, color: line })
    y -= 10
  }

  // ── Cover ────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PAGE_H - 130, width: PAGE_W, height: 130, color: navy })
  page.drawText('PRODICTA', { x: MARGIN, y: PAGE_H - 62, size: 30, font: helvB, color: teal })
  page.drawText('Evidence-based hiring intelligence', { x: MARGIN, y: PAGE_H - 84, size: 11, font: helv, color: rgb(0.7, 0.78, 0.82) })

  y = PAGE_H - 200

  page.drawText('New SSP Rules', { x: MARGIN, y, size: 28, font: helvB, color: navy })
  y -= 32
  page.drawText('April 2026', { x: MARGIN, y, size: 28, font: helvB, color: navy })
  y -= 26
  page.drawText('A complete guide for employers and recruitment agencies', { x: MARGIN, y, size: 13, font: helv, color: grey })
  y -= 30

  page.drawRectangle({ x: MARGIN, y, width: 60, height: 3, color: teal })
  y -= 28

  drawParagraph('From 6 April 2026 the three-day waiting period is gone, the lower earnings threshold is gone, and the SSP calculation changes. This guide covers the three big changes, worked examples, linked period rules, documentation requirements, and an action checklist for employers and agencies. This is a working reference, not legal advice.', { size: 11, color: black, lh: 16 })
  y -= 8

  // ── The three big changes ────────────────────────────────
  drawSectionBand('The Three Big Changes from 6 April 2026')
  for (const c of CHANGES) drawNumberedChange(c)

  // ── Worked examples ──────────────────────────────────────
  newPage()
  drawSectionBand('Worked Examples: 80% AWE Calculation')
  drawParagraph("SSP is the lower of the standard weekly rate or 80% of the worker's average weekly earnings (AWE). The standard rate used in these examples is £120 per week for illustration only. Use the published rate for your pay date.", { size: 10, color: grey })
  y -= 4
  drawTableRow('AVERAGE WEEKLY EARNINGS', 'CALCULATION AND SSP PAYABLE', { rule: true })
  for (const ex of WORKED_EXAMPLES) {
    drawTableRow(ex.awe, `${ex.calc} = ${ex.result}`)
  }
  y -= 4
  drawParagraph('The calculation must be done individually for every absence, every worker. Do not rely on a single flat rate.', { size: 10, color: black, italic: true })

  // ── Linked period examples ───────────────────────────────
  drawSectionBand('Linked Periods: 56-Day Rule')
  drawParagraph('Two periods of sickness link if each is itself a Period of Incapacity for Work (4 or more consecutive days) AND the gap between them is 56 days or fewer. Linked periods count as one period for the 28-week maximum.', { size: 10, color: black })
  y -= 4
  for (const ex of LINKED_EXAMPLES) {
    drawH3(ex.title)
    for (const r of ex.rows) drawBullet(r)
    y -= 6
  }

  // ── Documentation requirements ───────────────────────────
  drawSectionBand('What Good Documentation Looks Like')
  drawParagraph('Every absence record should capture the following. Paper records or basic spreadsheets are not enough.', { size: 10, color: black })
  y -= 2
  for (const r of DOC_REQUIREMENTS) drawBullet(r)
  y -= 6
  drawParagraph('You need a system that calculates linked periods automatically, applies the correct rate, and keeps an audit trail.', { size: 10, color: black, italic: true })

  // ── Action checklists ────────────────────────────────────
  newPage()
  drawSectionBand('Action Checklist: For Direct Employers')
  for (const r of EMPLOYER_CHECKLIST) drawBullet(r)
  y -= 8

  drawSectionBand('Action Checklist: For Recruitment Agencies')
  for (const r of AGENCY_CHECKLIST) drawBullet(r)
  y -= 8

  drawSectionBand('Action Checklist: For Both')
  for (const r of SHARED_CHECKLIST) drawBullet(r)
  y -= 8

  // ── Footer on last page ──────────────────────────────────
  y = Math.max(y, 120)
  drawRule()
  drawParagraph('Generated by PRODICTA. See how the platform tracks SSP from day one, calculates linked periods automatically, and produces complete absence records for HMRC and Fair Work Agency audits at prodicta.co.uk.', { size: 9, color: grey, italic: true })

  const bytes = await pdf.save()
  return bytes
}

// ─────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body?.email || '').toString().trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
  }

  // Store the lead. Failure here should not block the email send.
  try {
    const admin = createServiceClient()
    await admin
      .from('blog_leads')
      .insert({ email, source: 'ssp-rules-april-2026' })
  } catch (err) {
    console.error('[ssp-rules-april-2026-download] lead insert failed', err?.message)
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email sending is not configured.' }, { status: 500 })
  }

  try {
    const pdfBytes = await buildPdf()
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your SSP Rules April 2026 Guide from PRODICTA',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f2137;line-height:1.6;font-size:15px;">
        <p style="margin:0 0 14px;">Hi there,</p>
        <p style="margin:0 0 14px;">Thanks for downloading the SSP Rules April 2026 Guide. The PDF is attached.</p>
        <p style="margin:0 0 14px;">If you want to see how PRODICTA handles SSP tracking, linked periods, and absence compliance automatically, try our free hiring risk audit at <a href="https://prodicta.co.uk" style="color:#00897B;font-weight:700;text-decoration:none;">prodicta.co.uk</a>.</p>
        <p style="margin:0 0 4px;">Best regards,</p>
        <p style="margin:0;">The PRODICTA team.</p>
      </div>`,
      attachments: [
        {
          filename: 'PRODICTA-SSP-Rules-April-2026.pdf',
          content: pdfBase64,
        },
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ssp-rules-april-2026-download] send failed', err?.message)
    return NextResponse.json({ error: 'Could not send the PDF. Please try again or contact hello@prodicta.co.uk.' }, { status: 500 })
  }
}
