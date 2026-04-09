import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

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

export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, user_id, assessments(role_title)')
      .eq('id', params.candidateId)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: result } = await adminClient
      .from('results')
      .select('coaching_plan')
      .eq('candidate_id', candidate.id)
      .maybeSingle()
    if (!result?.coaching_plan) {
      return NextResponse.json({ error: 'No coaching plan yet' }, { status: 404 })
    }
    const cp = result.coaching_plan

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const grey = rgb(0.42, 0.46, 0.52)
    const amber = rgb(0.85, 0.46, 0.02)
    const black = rgb(0.1, 0.13, 0.18)
    const white = rgb(1, 1, 1)

    const W = 595, H = 842
    const MARGIN_L = 48, MARGIN_R = 48
    const TEXT_W = W - MARGIN_L - MARGIN_R

    let page = pdf.addPage([W, H])
    let y = H - 60

    function newPage() {
      page = pdf.addPage([W, H])
      y = H - 60
    }
    function ensure(space) {
      if (y - space < 60) newPage()
    }
    function drawText(text, { size = 11, font = helv, color = black, x = MARGIN_L } = {}) {
      const lines = wrap(text, font, size, TEXT_W)
      for (const line of lines) {
        ensure(size + 4)
        page.drawText(line, { x, y, size, font, color })
        y -= size + 4
      }
    }
    function heading(text, size = 14) {
      ensure(size + 10)
      y -= 6
      page.drawText(safe(text), { x: MARGIN_L, y, size, font: helvB, color: navy })
      y -= size + 6
    }
    function subheading(text) {
      ensure(16)
      page.drawText(safe(text), { x: MARGIN_L, y, size: 10, font: helvB, color: teal })
      y -= 14
    }

    // Cover
    page.drawRectangle({ x: 0, y: H - 120, width: W, height: 120, color: navy })
    page.drawText('PRODICTA', { x: MARGIN_L, y: H - 60, size: 28, font: helvB, color: teal })
    page.drawText('In partnership with Alchemy Training UK', { x: MARGIN_L, y: H - 85, size: 12, font: helv, color: white })
    page.drawText('90-Day Hiring Manager Coaching Plan', { x: MARGIN_L, y: H - 105, size: 14, font: helvB, color: white })
    y = H - 160
    drawText(`Candidate: ${candidate.name || ''}`, { size: 13, font: helvB })
    if (candidate.assessments?.role_title) drawText(`Role: ${candidate.assessments.role_title}`, { size: 12 })
    y -= 8
    drawText('Coaching plan content developed by Liz Harris, Founder, Alchemy Training UK.', { size: 10, color: grey })
    drawText('Contact: liz@alchemytraininguk.com | Book a coaching check-in: tidycal.com/m57e7l3/30-minute-coaching-check-in', { size: 10, color: grey })

    // Key Stakeholders
    if (Array.isArray(cp.key_stakeholders) && cp.key_stakeholders.length) {
      newPage()
      heading('Key Stakeholders', 16)
      drawText('The key relationships this hire will need to manage, and where the pressure points sit based on PRODICTA assessment findings.', { size: 10, color: grey })
      y -= 4
      cp.key_stakeholders.forEach((s, i) => {
        ensure(60)
        drawText(`${i + 1}. ${s.role || ''}`, { size: 11, font: helvB })
        if (s.what_hire_needs_from_them) drawText(`What the hire needs from them: ${s.what_hire_needs_from_them}`, { size: 10 })
        if (s.what_they_need_from_hire) drawText(`What they need from the hire: ${s.what_they_need_from_hire}`, { size: 10 })
        if (s.pressure_point) drawText(`Pressure point: ${s.pressure_point}`, { size: 10 })
        if (s.watch_for) drawText(`Watch for: ${s.watch_for}`, { size: 10 })
        y -= 4
      })
    }

    // Phases
    const phaseKeys = ['phase1', 'phase2', 'phase3']
    for (const pk of phaseKeys) {
      const p = cp[pk]
      if (!p) continue
      newPage()
      heading(p.title || pk, 16)
      drawText(p.days || '', { size: 10, color: grey })
      y -= 4

      if (Array.isArray(p.smart_objectives) && p.smart_objectives.length) {
        subheading('SMART Objectives')
        p.smart_objectives.forEach((o, i) => {
          drawText(`${i + 1}. ${o.objective || ''}`, { size: 11, font: helvB })
          if (o.measure) drawText(`Measure: ${o.measure}`, { size: 10 })
          if (o.deadline) drawText(`Deadline: ${o.deadline}`, { size: 10 })
          if (o.linked_to) drawText(`Linked to: ${o.linked_to}`, { size: 10, color: grey })
          y -= 2
        })
      }
      if (p.weekly_checkin_structure) { subheading('Weekly Check-in Structure'); drawText(p.weekly_checkin_structure) }
      if (Array.isArray(p.watch_out_guides) && p.watch_out_guides.length) {
        subheading('Watch-out Guides')
        p.watch_out_guides.forEach(w => {
          drawText(w.watch_out || '', { size: 11, font: helvB })
          if (w.what_to_look_for) drawText(`Look for: ${w.what_to_look_for}`, { size: 10 })
          if (w.when_likely) drawText(`When likely: ${w.when_likely}`, { size: 10 })
          if (w.what_to_do) drawText(`What to do: ${w.what_to_do}`, { size: 10 })
          y -= 2
        })
      }
      if (p.key_reviews) { subheading('Key Reviews'); drawText(p.key_reviews) }
      if (Array.isArray(p.prediction_checks) && p.prediction_checks.length) {
        subheading('Prediction Checks')
        p.prediction_checks.forEach(pc => drawText(`${pc.prediction}: ${pc.question}`, { size: 10 }))
      }
      if (Array.isArray(p.sbi_feedback_prompts) && p.sbi_feedback_prompts.length) {
        subheading('SBI Feedback Prompts')
        p.sbi_feedback_prompts.forEach(s => drawText(`, ${s}`, { size: 10 }))
      }
      if (Array.isArray(p.warning_signs) && p.warning_signs.length) {
        subheading('Warning Signs')
        p.warning_signs.forEach(s => drawText(`, ${s}`, { size: 10 }))
      }
      if (p.decision_framework) { subheading('Decision Framework'); drawText(p.decision_framework) }
      if (Array.isArray(p.legal_defensibility_checklist) && p.legal_defensibility_checklist.length) {
        subheading('Legal Defensibility Checklist')
        p.legal_defensibility_checklist.forEach(s => drawText(`[ ] ${s}`, { size: 10 }))
      }
      if (p.managers_declaration) { subheading("Manager's Declaration"); drawText(p.managers_declaration) }
      if (p.era_2025_note) { subheading('ERA 2025'); drawText(p.era_2025_note) }
      if (p.recommended_training) {
        subheading('Recommended Training')
        drawText(p.recommended_training.workshop || '', { size: 11, font: helvB })
        if (p.recommended_training.why) drawText(`Why: ${p.recommended_training.why}`, { size: 10 })
        if (p.recommended_training.contents) drawText(`Contents: ${p.recommended_training.contents}`, { size: 10 })
      }
      if (p.alchemy_checkin) {
        subheading('Alchemy Check-in')
        drawText(p.alchemy_checkin)
      }
      y -= 8
      drawText('Contact Liz Harris, Alchemy Training UK: liz@alchemytraininguk.com | Book a check-in: tidycal.com/m57e7l3/30-minute-coaching-check-in', { size: 9, color: grey })
    }

    // Weekly check-in template
    newPage()
    heading('Weekly Check-in Template', 16)
    const sections = ['Progress Update', 'Achievements', 'Development Areas', 'Feedback', 'Actions', 'AOB']
    sections.forEach(s => {
      subheading(s)
      ensure(40)
      page.drawRectangle({ x: MARGIN_L, y: y - 32, width: TEXT_W, height: 32, borderColor: grey, borderWidth: 0.5 })
      y -= 40
    })

    // 25-week tracker
    newPage()
    heading('25-Week Progress Tracker', 16)
    const headers = ['Week', 'Date', 'Progress', 'Achievements', 'Dev Areas', 'Feedback', 'Actions']
    const colWs = [60, 55, 75, 85, 75, 75, 70]
    let cx = MARGIN_L
    headers.forEach((h, i) => {
      page.drawRectangle({ x: cx, y: y - 16, width: colWs[i], height: 16, color: rgb(0.94, 0.97, 1) })
      page.drawText(h, { x: cx + 3, y: y - 12, size: 8, font: helvB, color: navy })
      cx += colWs[i]
    })
    y -= 16
    const keyWeeks = new Set([4, 9, 13, 22, 25])
    for (let w = 1; w <= 25; w++) {
      ensure(18)
      cx = MARGIN_L
      const isKey = keyWeeks.has(w)
      if (isKey) page.drawRectangle({ x: MARGIN_L, y: y - 16, width: colWs.reduce((a, b) => a + b, 0), height: 16, color: rgb(1, 0.97, 0.92) })
      headers.forEach((_, i) => {
        page.drawRectangle({ x: cx, y: y - 16, width: colWs[i], height: 16, borderColor: grey, borderWidth: 0.4 })
        if (i === 0) page.drawText(`W${w}${isKey ? ' KR' : ''}`, { x: cx + 3, y: y - 12, size: 8, font: helvB, color: isKey ? amber : navy })
        cx += colWs[i]
      })
      y -= 16
    }

    // Legal defensibility (aggregate)
    newPage()
    heading('Legal Defensibility Checklist', 16)
    const allLegal = (cp.phase3?.legal_defensibility_checklist) || []
    allLegal.forEach(s => drawText(`[ ] ${s}`, { size: 11 }))

    // Manager's declaration
    if (cp.phase3?.managers_declaration) {
      y -= 10
      heading("Manager's Declaration", 14)
      drawText(cp.phase3.managers_declaration)
    }

    // Sign-off tracker
    y -= 10
    heading('Alchemy Sign-Off Tracker', 14)
    ;[1, 2, 3].forEach(n => {
      ensure(22)
      page.drawText(`Phase ${n}`, { x: MARGIN_L, y, size: 11, font: helvB, color: navy })
      page.drawText('Completed: _______    Date: _______    Signed off by: ________________', { x: MARGIN_L + 60, y, size: 10, font: helv, color: black })
      y -= 18
    })

    // Footer on every page
    const pages = pdf.getPages()
    pages.forEach((pg, idx) => {
      pg.drawText('PRODICTA x Alchemy Training UK | Book a coaching check-in: tidycal.com/m57e7l3/30-minute-coaching-check-in', { x: MARGIN_L, y: 30, size: 8, font: helv, color: grey })
      pg.drawText(`${idx + 1}`, { x: W - MARGIN_R, y: 30, size: 8, font: helv, color: grey })
    })

    const bytes = await pdf.save()
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return new NextResponse(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="coaching-plan-${safe(candidate.name || 'candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Coaching plan PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
