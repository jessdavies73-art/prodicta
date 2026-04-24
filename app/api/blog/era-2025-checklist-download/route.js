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

const CHECKLIST = [
  {
    section: 'Section 1: Your Hiring Process',
    items: [
      { n: 1, title: 'Document every hiring decision with objective evidence.', text: 'Every hire from January 2027 onwards needs a defensible paper trail. Gut-feel hiring does not survive a tribunal. Your documentation should show what you assessed, how you scored it, and why you chose this candidate over others. Keep records for at least six years.' },
      { n: 2, title: 'Remove bias from assessment.', text: 'Day-one rights include full protection under the Equality Act 2010. Any scoring that penalises spelling, grammar, or cultural expression is a legal risk. Use structured, evidence-based assessment that scores behaviour and judgement, not presentation style.' },
      { n: 3, title: 'Use structured interviews, not free-form conversations.', text: 'Free-form interviews are the number one source of unconscious bias and are impossible to defend when challenged. Use the same questions, scored against the same criteria, with written notes retained for six years minimum.' },
      { n: 4, title: 'Test candidates against the actual job, not a proxy.', text: 'Generic personality tests and standardised psychometric assessments are increasingly challenged as not fit for purpose. Real-work scenarios drawn from the actual job description are harder to contest.' },
      { n: 5, title: 'Document why each unsuccessful candidate was rejected.', text: 'Show what they scored, what the hired candidate scored, and why the decision was objectively fair. "They did not feel like a fit" is not a defensible reason.' },
      { n: 6, title: 'Give every rejected candidate the option of development feedback.', text: 'Candidates who receive constructive feedback are significantly less likely to pursue legal action. It also builds your employer brand.' },
    ],
  },
  {
    section: 'Section 2: Your Probation Process',
    items: [
      { n: 7, title: 'Replace informal probation with a documented 90-day plan.', text: 'Dismissing during probation without a documented, structured review process is unfair dismissal. Every new hire needs a written 90-day plan with clear objectives, regular check-ins, and documented feedback.' },
      { n: 8, title: 'Use SMART objectives from day one.', text: 'Specific, Measurable, Achievable, Relevant, Time-bound. Every objective must be specific enough that both employer and employee know exactly what success looks like.' },
      { n: 9, title: 'Run structured check-ins at weeks 1, 4, 8, and 12.', text: 'Document each check-in: what was discussed, what was agreed, what support was offered. Undocumented concerns cannot be used to defend a dismissal.' },
      { n: 10, title: 'Use the SBI feedback framework for any performance concerns.', text: 'Situation, Behaviour, Impact. Vague feedback is not defensible. Specific, evidence-based feedback is.' },
      { n: 11, title: 'If a probation fails, generate a full evidence pack.', text: 'Original assessment, all check-in records, all feedback given, all support offered, and the final decision reasoning. This is your defence against an unfair dismissal claim.' },
    ],
  },
  {
    section: 'Section 3: Day-One Rights',
    items: [
      { n: 12, title: 'Update your contracts and offer letters to reflect day-one rights.', text: 'Paternity leave, parental leave, flexible working requests, unfair dismissal protection. Your legal team should review and update every template.' },
      { n: 13, title: 'Train your line managers on day-one rights.', text: 'The biggest risk is managers making informal decisions that breach the new rules. Every line manager needs a written briefing on what day-one rights actually mean in practice.' },
      { n: 14, title: 'Review your paternity and parental leave policies.', text: 'Both apply from day one under ERA 2025. If your policies currently require a qualifying period, they need updating.' },
      { n: 15, title: 'Document your flexible working request process.', text: 'Requests can now be made from day one. Document who decides, how the decision is reasoned, and how it is communicated. Refusing without business justification is a legal risk.' },
    ],
  },
  {
    section: 'Section 4: SSP and Absence Management',
    items: [
      { n: 16, title: 'Understand the new SSP rules for 6 April 2026.', text: 'From April 2026 SSP applies from day one, no waiting period, no lower earnings threshold. Calculation is the lower of the standard weekly rate or 80% of average weekly earnings.' },
      { n: 17, title: 'Track linked absence periods correctly.', text: 'Absences within 56 days now link and count towards the 28-week maximum. Miscalculation is a compliance risk.' },
      { n: 18, title: 'Keep SSP records for three years minimum.', text: 'HMRC requires the absence record, the SSP calculation record, and any SSP1 forms. You need a documented, searchable system.' },
    ],
  },
  {
    section: 'Section 5: Fair Work Agency and Enforcement',
    items: [
      { n: 19, title: 'Prepare a Fair Work Agency compliance pack for every new hire.', text: 'Include the assessment, the scoring, the interview notes, the offer letter, and the onboarding documentation.' },
      { n: 20, title: 'Treat every hire as if it might be challenged.', text: 'Under ERA 2025 every hire is a potential legal case. The employers who act as if every decision might be challenged are the ones who will not have to defend one.' },
    ],
  },
]

const RETENTION_PERIODS = [
  { label: 'Hiring assessment evidence and scoring', period: '6 years minimum' },
  { label: 'Interview notes and structured scoring sheets', period: '6 years minimum' },
  { label: 'Probation check-in records and SBI feedback', period: '6 years minimum' },
  { label: 'SSP records (absence, calculation, SSP1)', period: '3 years minimum (HMRC)' },
  { label: 'Contracts and offer letters', period: 'Duration of employment plus 6 years' },
  { label: 'Flexible working request decisions', period: '3 years minimum' },
  { label: 'Fair Work Agency compliance packs', period: '6 years minimum' },
]

const GLOSSARY = [
  { term: 'Day-One Rights', def: 'Statutory protections (including unfair dismissal, paternity, parental, flexible working) that apply from the first day of employment under ERA 2025, with effect from 1 January 2027.' },
  { term: 'Fair Work Agency', def: 'A new government enforcement body empowered under ERA 2025 to investigate employers, issue fines, and enforce compliance with workplace standards.' },
  { term: 'Qualifying Period', def: 'The previous two-year minimum service requirement before unfair dismissal claims could be brought. Abolished from 1 January 2027.' },
  { term: 'SBI Framework', def: 'A feedback structure: Situation, Behaviour, Impact. Produces specific, evidence-based feedback that is defensible in a performance dispute.' },
  { term: 'SMART Objective', def: 'Specific, Measurable, Achievable, Relevant, Time-bound. The standard for defensible probation objectives.' },
  { term: 'SSP Linked Period', def: 'Under the 2026 rules, separate absences within 56 days are treated as a single period for SSP calculation and count towards the 28-week maximum.' },
  { term: 'Evidence Pack', def: 'A bundled document combining assessment, check-in records, feedback, and decision reasoning. Used to defend probation dismissals.' },
  { term: 'Compliance Certificate', def: 'A document recording the scoring methodology, assessment date, and fairness standards applied to a hiring decision. Part of a fair-hire audit trail.' },
]

async function buildPdf() {
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
  const helvI = await pdf.embedFont(StandardFonts.HelveticaOblique)

  const navy = rgb(0.06, 0.13, 0.22)
  const teal = rgb(0, 0.75, 0.65)
  const grey = rgb(0.42, 0.46, 0.52)
  const greyL = rgb(0.7, 0.74, 0.8)
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
    p.drawText('ERA 2025 Compliance Checklist', { x: MARGIN + 90, y: PAGE_H - 30, size: 10, font: helv, color: white })
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

  function drawH2(text) {
    ensure(30)
    page.drawText(safe(text), { x: MARGIN, y, size: 16, font: helvB, color: navy })
    y -= 22
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

  function drawItem({ n, title, text }) {
    ensure(40)
    // Teal number bullet
    page.drawRectangle({ x: MARGIN, y: y - 18, width: 28, height: 22, color: teal })
    const nStr = String(n)
    const nW = helvB.widthOfTextAtSize(nStr, 12)
    page.drawText(nStr, { x: MARGIN + (28 - nW) / 2, y: y - 12, size: 12, font: helvB, color: navy })

    // Title (bold, navy) beside the number
    const titleLines = wrap(title, helvB, 11, CONTENT_W - 38)
    let ty = y - 12
    for (const ln of titleLines) {
      page.drawText(ln, { x: MARGIN + 36, y: ty, size: 11, font: helvB, color: navy })
      ty -= 14
    }
    y = Math.min(y - 26, ty - 2)

    drawParagraph(text, { size: 10, color: grey, gap: true })
    y -= 4
  }

  function drawKV(k, v) {
    const labelW = 260
    ensure(16)
    page.drawText(safe(k), { x: MARGIN, y, size: 10, font: helv, color: black })
    page.drawText(safe(v), { x: MARGIN + labelW, y, size: 10, font: helvB, color: navy })
    y -= 14
  }

  function drawGlossary(term, def) {
    ensure(30)
    page.drawText(safe(term), { x: MARGIN, y, size: 10.5, font: helvB, color: navy })
    y -= 13
    drawParagraph(def, { size: 10, color: grey, gap: false })
    y -= 10
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

  page.drawText('ERA 2025 Employer', { x: MARGIN, y, size: 28, font: helvB, color: navy })
  y -= 32
  page.drawText('Compliance Checklist', { x: MARGIN, y, size: 28, font: helvB, color: navy })
  y -= 26
  page.drawText('The complete guide before the January 2027 deadline', { x: MARGIN, y, size: 13, font: helv, color: grey })
  y -= 30

  page.drawRectangle({ x: MARGIN, y, width: 60, height: 3, color: teal })
  y -= 28

  drawParagraph('A practical 20-point checklist covering hiring, probation, day-one rights, SSP, and Fair Work Agency readiness. Use this as a working document and starting point. This is not legal advice.', { size: 11, color: black, lh: 16 })
  y -= 8

  // ── Checklist sections ────────────────────────────────────
  for (const section of CHECKLIST) {
    drawSectionBand(section.section)
    for (const item of section.items) {
      drawItem(item)
    }
    y -= 4
  }

  // ── Documentation retention periods ───────────────────────
  newPage()
  drawSectionBand('Documentation Retention Periods')
  drawParagraph('The minimum retention periods below apply to UK employers preparing for ERA 2025. Longer periods may be required by sector-specific regulation or by your employment tribunal risk appetite.', { size: 10, color: grey })
  y -= 4
  for (const r of RETENTION_PERIODS) {
    drawKV(r.label, r.period)
  }
  y -= 12
  drawRule()
  y -= 6

  // ── Glossary ──────────────────────────────────────────────
  drawSectionBand('Glossary of Key ERA 2025 Terms')
  for (const g of GLOSSARY) {
    drawGlossary(g.term, g.def)
  }

  // ── Footer on last page ───────────────────────────────────
  y = Math.max(y, 120)
  drawRule()
  drawParagraph('Generated by PRODICTA. See how the platform automates hiring documentation, structured probation, and Fair Work Agency compliance packs at prodicta.co.uk.', { size: 9, color: grey, italic: true })

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
      .insert({ email, source: 'era-2025-checklist' })
  } catch (err) {
    console.error('[era-2025-checklist-download] lead insert failed', err?.message)
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
      subject: 'Your ERA 2025 Compliance Checklist from PRODICTA',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f2137;line-height:1.6;font-size:15px;">
        <p style="margin:0 0 14px;">Hi there,</p>
        <p style="margin:0 0 14px;">Thanks for downloading the ERA 2025 Compliance Checklist. The PDF is attached.</p>
        <p style="margin:0 0 14px;">If you want to see how PRODICTA handles ERA 2025 compliance automatically, try our free hiring risk audit at <a href="https://prodicta.co.uk" style="color:#00897B;font-weight:700;text-decoration:none;">prodicta.co.uk</a>.</p>
        <p style="margin:0 0 4px;">Best regards,</p>
        <p style="margin:0;">The PRODICTA team.</p>
      </div>`,
      attachments: [
        {
          filename: 'PRODICTA-ERA-2025-Compliance-Checklist.pdf',
          content: pdfBase64,
        },
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[era-2025-checklist-download] send failed', err?.message)
    return NextResponse.json({ error: 'Could not send the PDF. Please try again or contact hello@prodicta.co.uk.' }, { status: 500 })
  }
}
