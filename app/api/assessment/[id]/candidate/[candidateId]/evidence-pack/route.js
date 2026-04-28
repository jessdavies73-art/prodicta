import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import crypto from 'crypto'

// ────────────────────────────────────────────────────────────────────────────
// Helpers

// Human-friendly labels for the audit-trail row that lists which
// Workspace blocks were evaluated. Server-safe data only (no JSX
// imports). Office and healthcare shells share the same dict because
// block_ids are unique across shells.
const WORKSPACE_BLOCK_LABEL = {
  // Office shell
  'inbox':                       'Inbox',
  'task-prioritisation':         'Task prioritisation',
  'calendar-planning':           'Calendar planning',
  'decision-queue':              'Decision queue',
  'conversation-simulation':     'Conversation simulation',
  'stakeholder-conflict':        'Stakeholder conflict',
  'reading-summarising':         'Reading and summarising',
  'document-writing':            'Document writing',
  'spreadsheet-data':            'Spreadsheet and data',
  'crisis-simulation':           'Crisis simulation',
  // Healthcare/Care shell
  'patient-handover':            'Patient handover',
  'buzzer-alert-queue':          'Buzzer / alert queue',
  'medication-round':            'Medication round',
  'clinical-decision-queue':     'Clinical decisions',
  'doctor-instruction-handling': 'Doctor instructions',
  'family-visitor-interaction':  'Family / visitor interaction',
  'care-plan-review':            'Care plan review',
  'safeguarding-incident':       'Safeguarding incident',
  'clinical-crisis-simulation':  'Clinical crisis',
  'patient-family-conversation': 'Patient / family conversation',
  // Education shell. 'conversation-simulation' and 'crisis-simulation'
  // are shared with the office shell; existing labels above suffice.
  'class-roster':                'Class Roster',
  'lesson-plan':                 'Lesson Plan',
  'parent-communication':        'Parent Communication',
  'behaviour-incident':          'Behaviour Incident',
  'safeguarding-referral':       'Safeguarding Referral',
  'head-teacher-message':        'Head Teacher Message',
  'cohort-coordination':         'Cohort Coordination',
  // Strategy-Fit components (Evidence Pack PDF section header).
  'strategic-thinking':          'Strategic Thinking Evaluation',
}

function safe(text) {
  if (text == null) return ''
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

function fmtDate(d) {
  if (!d) return 'Not recorded'
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return 'Not recorded'
  }
}

function outcomeLabel(outcome) {
  const m = {
    failed_probation: 'Failed probation',
    dismissed: 'Dismissed during probation',
    left_early: 'Left employment during probation',
  }
  return m[outcome] || outcome || 'Ended during probation'
}

// ────────────────────────────────────────────────────────────────────────────
// Route

export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, name, email, user_id, invited_at, completed_at, assessment_id, assessments(role_title, role_level, job_description, context_answers, employment_type, scenario_version, assessment_mode, scenarios, shell_family)')
      .eq('id', params.candidateId)
      .single()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [{ data: result }, { data: outcome }, { data: copilot }, { data: profile }] = await Promise.all([
      admin.from('results').select('overall_score, risk_level, hiring_confidence, strengths, watchouts, pressure_fit_score, integrity, reality_timeline, role_level, scoring_rubric_version, model_version, response_quality, generic_detection, scoring_confidence, scores, executive_summary, created_at').eq('candidate_id', params.candidateId).maybeSingle(),
      admin.from('candidate_outcomes').select('*').eq('candidate_id', params.candidateId).eq('user_id', user.id).maybeSingle(),
      admin.from('probation_copilot').select('*').eq('candidate_id', params.candidateId).eq('user_id', user.id).maybeSingle(),
      admin.from('users').select('company_name, account_type').eq('id', user.id).maybeSingle(),
    ])

    if (!result) return NextResponse.json({ error: 'No results' }, { status: 404 })
    if (!outcome) return NextResponse.json({ error: 'No outcome recorded' }, { status: 400 })

    const allowedOutcomes = ['failed_probation', 'dismissed', 'left_early']
    if (!allowedOutcomes.includes(outcome.outcome)) {
      return NextResponse.json({ error: 'Evidence pack only available where employment ended during probation' }, { status: 400 })
    }

    // Optional redline alerts
    let redlineAlerts = []
    try {
      const { data } = await admin
        .from('redline_alerts')
        .select('*')
        .eq('candidate_id', params.candidateId)
        .order('created_at', { ascending: true })
      redlineAlerts = data || []
    } catch { redlineAlerts = [] }

    // ── Setup PDF ──
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
    const sectionBg = rgb(0.95, 0.96, 0.98)

    const PAGE_W = 595
    const PAGE_H = 842
    const MARGIN = 48
    const CONTENT_W = PAGE_W - MARGIN * 2

    const referenceNumber = crypto.randomUUID()
    const generatedAt = new Date()
    const generatedAtLabel = generatedAt.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const candidateName = safe(candidate.name || 'Candidate')
    const roleTitle = safe(candidate.assessments?.role_title || 'Role')
    const roleLevelRaw = result.role_level || candidate.assessments?.role_level || 'MID_LEVEL'
    const roleLevelLabel = roleLevelRaw === 'OPERATIONAL' ? 'Operational Role'
      : roleLevelRaw === 'LEADERSHIP' ? 'Leadership Role'
      : 'Mid-Level Role'
    const assessmentDate = fmtDate(candidate.completed_at)
    const exitDate = fmtDate(outcome.outcome_date || outcome.exit_date || outcome.updated_at || outcome.created_at)
    const placementDate = fmtDate(outcome.placement_date)

    // Page state
    const pages = []

    // ── EXECUTIVE / DEVELOPMENT SUMMARY PAGE (Strategy-Fit only) ──
    // For Strategy-Fit assessments where the synthesis succeeded, the
    // first page is a dedicated parchment-tinted Executive Summary
    // (senior-tier) or Development Summary (junior-mid) panel. The
    // existing evidence pack layout follows on subsequent pages. Legacy
    // assessments without a generated executive_summary skip this page
    // entirely and the pack opens at the standard front page.
    if (result.executive_summary && Array.isArray(result.executive_summary.sections) && result.executive_summary.sections.length) {
      const esPage = pdf.addPage([PAGE_W, PAGE_H])
      pages.push(esPage)
      esPage.drawRectangle({ x: 0, y: PAGE_H - 48, width: PAGE_W, height: 48, color: navy })
      esPage.drawText('PRODICTA', { x: MARGIN, y: PAGE_H - 30, size: 13, font: helvB, color: teal })
      esPage.drawText('Probation Evidence Pack', { x: MARGIN + 90, y: PAGE_H - 30, size: 10, font: helv, color: white })

      let ey = PAGE_H - 70
      esPage.drawText(safe(candidate.name || 'Candidate'), { x: MARGIN, y: ey, size: 18, font: helvB, color: black })
      ey -= 16
      esPage.drawText(safe(`${candidate.assessments?.role_title || 'Role'} | ${assessmentDate} | ${roleLevelLabel}`), { x: MARGIN, y: ey, size: 10, font: helv, color: grey })
      ey -= 22

      const parchment = rgb(0.98, 0.937, 0.851)
      const parchmentBorder = rgb(0.902, 0.84, 0.678)
      const headlineLabel = result.executive_summary.headline_label || 'Executive Summary'
      const sections = result.executive_summary.sections.slice(0, 4)
      const rec = result.executive_summary.recommendation || null

      const panelHeight = Math.min(680, 30 + sections.length * 96 + (rec ? 60 : 0))
      const panelTop = ey
      const panelBottom = panelTop - panelHeight
      esPage.drawRectangle({ x: MARGIN, y: panelBottom, width: CONTENT_W, height: panelHeight, color: parchment, borderColor: parchmentBorder, borderWidth: 1 })

      let py = panelTop - 22
      esPage.drawText(safe(headlineLabel), { x: MARGIN + 16, y: py, size: 13, font: helvB, color: navy })
      py -= 22

      for (const sec of sections) {
        const label = safe(sec?.section_label || '')
        const body = safe(sec?.content_paragraph || '')
        if (!label && !body) continue
        if (label) {
          esPage.drawText(label, { x: MARGIN + 16, y: py, size: 10.5, font: helvB, color: teal })
          py -= 14
        }
        if (body) {
          const lines = wrap(body, helv, 10, CONTENT_W - 32)
          for (const ln of lines.slice(0, 6)) {
            esPage.drawText(ln, { x: MARGIN + 16, y: py, size: 10, font: helv, color: black })
            py -= 12
          }
        }
        py -= 6
      }

      if (rec && rec.summary) {
        py -= 4
        esPage.drawRectangle({ x: MARGIN + 16, y: py - 30, width: CONTENT_W - 32, height: 30, color: rgb(1, 1, 1), borderColor: parchmentBorder, borderWidth: 0.5 })
        const recLabel = headlineLabel === 'Development Summary' ? 'Growth Recommendation' : 'Recommendation'
        esPage.drawText(`${recLabel}:`, { x: MARGIN + 24, y: py - 12, size: 10.5, font: helvB, color: navy })
        const recLines = wrap(safe(rec.summary), helv, 10, CONTENT_W - 200)
        recLines.slice(0, 2).forEach((ln, i) => {
          esPage.drawText(ln, { x: MARGIN + 144, y: py - 12 - (i * 12), size: 10, font: helv, color: black })
        })
      }
    }

    let page = pdf.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    let y = PAGE_H - MARGIN

    function addPage() {
      page = pdf.addPage([PAGE_W, PAGE_H])
      pages.push(page)
      y = PAGE_H - MARGIN
      drawRunningHeader(page)
      y = PAGE_H - 78
    }

    function ensure(spaceNeeded) {
      if (y - spaceNeeded < 70) addPage()
    }

    function drawRunningHeader(p) {
      p.drawRectangle({ x: 0, y: PAGE_H - 48, width: PAGE_W, height: 48, color: navy })
      p.drawText('PRODICTA', { x: MARGIN, y: PAGE_H - 30, size: 13, font: helvB, color: teal })
      p.drawText('Probation Evidence Pack', { x: MARGIN + 90, y: PAGE_H - 30, size: 10, font: helv, color: white })
      p.drawText(`Ref: ${referenceNumber.slice(0, 8).toUpperCase()}`, { x: PAGE_W - MARGIN - 110, y: PAGE_H - 30, size: 9, font: helv, color: greyL })
    }

    function drawSectionHeading(label) {
      ensure(46)
      page.drawRectangle({ x: MARGIN, y: y - 22, width: CONTENT_W, height: 26, color: navy })
      page.drawText(safe(label), { x: MARGIN + 14, y: y - 14, size: 11, font: helvB, color: white })
      y -= 38
    }

    function drawSubLabel(label) {
      ensure(20)
      page.drawText(safe(label).toUpperCase(), { x: MARGIN, y, size: 8.5, font: helvB, color: teal })
      y -= 12
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

    function drawKV(k, v) {
      const labelW = 150
      ensure(16)
      page.drawText(safe(k), { x: MARGIN, y, size: 9, font: helvB, color: grey })
      const lines = wrap(v == null || v === '' ? 'Not recorded' : String(v), helv, 10, CONTENT_W - labelW)
      lines.forEach((ln, i) => {
        if (i > 0) { ensure(13); }
        page.drawText(ln, { x: MARGIN + labelW, y, size: 10, font: helv, color: black })
        y -= 13
      })
      y -= 2
    }

    function drawRule() {
      ensure(8)
      page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: 0.6, color: line })
      y -= 10
    }

    function drawBullet(text) {
      const indent = 14
      ensure(14)
      page.drawText('•', { x: MARGIN + 2, y, size: 10, font: helvB, color: navy })
      const lines = wrap(text, helv, 10, CONTENT_W - indent)
      lines.forEach((ln, i) => {
        if (i > 0) { ensure(13); }
        page.drawText(ln, { x: MARGIN + indent, y, size: 10, font: helv, color: black })
        y -= 13
      })
      y -= 3
    }

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 1, COVER PAGE
    // ──────────────────────────────────────────────────────────────────────

    // Header band
    page.drawRectangle({ x: 0, y: PAGE_H - 110, width: PAGE_W, height: 110, color: navy })
    page.drawText('PRODICTA', { x: MARGIN, y: PAGE_H - 60, size: 30, font: helvB, color: teal })
    page.drawText('Evidence-based hiring intelligence', { x: MARGIN, y: PAGE_H - 82, size: 11, font: helv, color: rgb(0.7, 0.78, 0.82) })

    y = PAGE_H - 170

    page.drawText('Probation Evidence Pack', { x: MARGIN, y, size: 26, font: helvB, color: navy })
    y -= 28
    page.drawText('Employment Rights Act 2025 Compliance Documentation', { x: MARGIN, y, size: 12, font: helv, color: grey })
    y -= 40

    // Confidential strip
    page.drawRectangle({ x: MARGIN, y: y - 24, width: CONTENT_W, height: 28, color: sectionBg, borderColor: line, borderWidth: 0.8 })
 page.drawText('CONFIDENTIAL, FAIR DISMISSAL AUDIT TRAIL', { x: MARGIN + 14, y: y - 14, size: 10, font: helvB, color: navy })
    y -= 50

    // Reference details box
    const detailsY = y
    const boxH = 200
    page.drawRectangle({ x: MARGIN, y: detailsY - boxH, width: CONTENT_W, height: boxH, color: white, borderColor: line, borderWidth: 1 })

    let dy = detailsY - 22
    const drawDetail = (label, value) => {
      page.drawText(safe(label).toUpperCase(), { x: MARGIN + 18, y: dy, size: 8.5, font: helvB, color: grey })
      page.drawText(safe(value), { x: MARGIN + 180, y: dy, size: 11, font: helvB, color: black })
      dy -= 22
    }

    drawDetail('Candidate', candidateName)
    drawDetail('Role', roleTitle)
    drawDetail('Role level', roleLevelLabel)
    drawDetail('Date of assessment', assessmentDate)
    drawDetail('Date of placement', placementDate)
    drawDetail('Date of dismissal / exit', exitDate)
    drawDetail('Outcome', outcomeLabel(outcome.outcome))
    drawDetail('Pack generated', generatedAtLabel)

    y = detailsY - boxH - 22

    // Reference number
    page.drawText('REFERENCE NUMBER', { x: MARGIN, y, size: 8.5, font: helvB, color: grey })
    y -= 14
    page.drawText(referenceNumber, { x: MARGIN, y, size: 11, font: helvB, color: navy })
    y -= 24

    if (profile?.company_name) {
      page.drawText('PREPARED FOR', { x: MARGIN, y, size: 8.5, font: helvB, color: grey })
      y -= 14
      page.drawText(safe(profile.company_name), { x: MARGIN, y, size: 11, font: helvB, color: black })
      y -= 24
    }

    // Cover footer note
    const coverFooterY = 110
    page.drawRectangle({ x: MARGIN, y: coverFooterY, width: CONTENT_W, height: 60, color: sectionBg, borderColor: line, borderWidth: 0.8 })
    const coverNote = 'This document combines the original PRODICTA assessment with all probation co-pilot data, redline alert history and the ERA 2025 Compliance Certificate to provide an objective, evidence-based record of the hiring and probation management process.'
    const coverLines = wrap(coverNote, helv, 9.5, CONTENT_W - 28)
    let cny = coverFooterY + 46
    coverLines.forEach(ln => { page.drawText(ln, { x: MARGIN + 14, y: cny, size: 9.5, font: helv, color: black }); cny -= 12 })

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 2, ASSESSMENT SUMMARY
    // ──────────────────────────────────────────────────────────────────────
    addPage()
 drawSectionHeading('Section 2, Assessment Summary')

    drawSubLabel('Score at time of hire')
    const score = result.overall_score ?? 0
    const scoreLabel = score >= 85 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 65 ? 'Good' : score >= 50 ? 'Developing' : 'Concern'
    drawKV('Overall score', `${score} / 100  (${scoreLabel})`)
    const hc = result.hiring_confidence?.score
    drawKV('Hiring confidence', hc != null ? `${hc}%` : 'Not recorded')
    drawKV('Risk level at hire', result.risk_level || 'Not recorded')
    drawKV('Role level', roleLevelLabel)
    drawKV('Pressure-Fit score', result.pressure_fit_score != null ? `${result.pressure_fit_score} / 100` : 'Not recorded')
    drawKV('Response Integrity', result.integrity?.response_quality || 'Not recorded')
    y -= 4

    drawRule()

    drawSubLabel('Top strengths identified at assessment')
    const strengths = (Array.isArray(result.strengths) ? result.strengths : []).slice(0, 3)
    if (strengths.length === 0) {
      drawParagraph('No strengths recorded at assessment.', { color: grey, italic: true })
    } else {
      strengths.forEach((s, i) => {
        const text = typeof s === 'object' ? (s.strength || s.title || s.text || '') : s
        if (text) drawBullet(`${i + 1}. ${text}`)
      })
    }
    y -= 4

    drawSubLabel('Watch-outs identified at assessment')
    drawParagraph('The following risks were identified before hire, were known to the hiring team, and were managed under structured probation co-pilot oversight.', { italic: true, color: grey, size: 9 })
    const watchouts = Array.isArray(result.watchouts) ? result.watchouts : []
    if (watchouts.length === 0) {
      drawParagraph('No watch-outs recorded at assessment.', { color: grey, italic: true })
    } else {
      watchouts.forEach((w, i) => {
        const text = typeof w === 'object' ? (w.watchout || w.title || w.text || '') : w
        const ifIgnored = typeof w === 'object' ? (w.if_ignored || '') : ''
        if (text) {
          drawBullet(`${i + 1}. ${text}`)
          if (ifIgnored) {
            ensure(13)
            const lines = wrap(`If unmanaged: ${ifIgnored}`, helvI, 9, CONTENT_W - 28)
            lines.forEach(ln => { ensure(12); page.drawText(ln, { x: MARGIN + 28, y, size: 9, font: helvI, color: grey }); y -= 12 })
            y -= 3
          }
        }
      })
    }
    y -= 4

    drawRule()
    drawSubLabel('ERA 2025 Compliance Certificate')
    drawParagraph(`Certificate reference: PRODICTA-COMPLIANCE-${(candidate.id || '').slice(0, 8).toUpperCase()}`, { size: 10 })
    drawParagraph('A separate Equality Act 2010 and Employment Rights Act 2025 compliance certificate was issued at the point of assessment confirming the assessment was scenario-based, anonymised at the point of scoring, and free from protected-characteristic input.', { size: 9.5, color: grey })

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 3, PROBATION MANAGEMENT EVIDENCE
    // ──────────────────────────────────────────────────────────────────────
    addPage()
 drawSectionHeading('Section 3, Probation Management Evidence')

    drawSubLabel('Co-pilot oversight summary')
    const overall = copilot?.overall_status || 'Not recorded'
    drawKV('Overall co-pilot status at exit', overall)
    drawKV('Last co-pilot update', copilot?.last_updated ? fmtDate(copilot.last_updated) : 'No co-pilot record')
    drawKV('Probation length agreed', outcome.probation_months ? `${outcome.probation_months} months` : 'Not recorded')
    y -= 4

    drawRule()
    drawSubLabel('90-Day coaching plan')
    const planFollowed = !!(copilot && (Object.keys(copilot.watchout_statuses || {}).length > 0 || Object.values(copilot.manager_notes || {}).some(n => n && String(n).trim())))
    drawParagraph(planFollowed
      ? 'The PRODICTA 90-Day Coaching Plan was actively followed. Manager check-in data was recorded against the original predictions and watch-outs throughout the probation period.'
      : 'No structured co-pilot check-in data was recorded against the 90-Day Coaching Plan during the probation period.',
      { size: 10 })
    y -= 4

    drawRule()
    drawSubLabel('Probation review check-ins')
    const phases = [
      ['week1', 'Week 1'],
      ['month1', 'Month 1'],
      ['month3', 'Month 3'],
    ]
    const watchoutStatuses = copilot?.watchout_statuses || {}
    const predResponses = copilot?.prediction_responses || {}
    const managerNotes = copilot?.manager_notes || {}

    let anyEntries = false
    for (const [key, label] of phases) {
      const note = managerNotes[key]
      const pred = predResponses[key]
      if (!note && !pred) continue
      anyEntries = true
      ensure(20)
      page.drawText(`${label}`, { x: MARGIN, y, size: 11, font: helvB, color: navy })
      y -= 14
      if (pred) drawKV('Prediction confirmed', pred.replace(/_/g, ' '))
      if (note) {
        drawParagraph(`Manager note: ${note}`, { size: 10 })
      }
      y -= 4
    }
    if (!anyEntries) {
      drawParagraph('No phase-by-phase check-in entries were recorded.', { color: grey, italic: true })
    }
    y -= 2

    drawRule()
    drawSubLabel('Watch-out tracking')
    const watchoutKeys = Object.keys(watchoutStatuses)
    if (watchoutKeys.length === 0) {
      drawParagraph('No watch-out status updates were recorded during probation.', { color: grey, italic: true })
    } else {
      watchoutKeys.forEach(k => {
        const idx = parseInt(k, 10)
        const wo = watchouts[idx]
        const text = wo ? (typeof wo === 'object' ? (wo.watchout || wo.title || wo.text || '') : wo) : `Watch-out #${idx + 1}`
        const status = watchoutStatuses[k]
        const statusLabel = status === 'red' ? 'Materialised' : status === 'amber' ? 'Early signs' : status === 'green' ? 'No issues observed' : status
 drawBullet(`${text}, ${statusLabel}`)
      })
    }
    y -= 4

    drawRule()
    drawSubLabel('Redline alerts triggered')
    if (!redlineAlerts || redlineAlerts.length === 0) {
      drawParagraph('No formal redline alert records were stored. Live deviation analysis was performed against co-pilot check-in data throughout the probation period.', { color: grey, italic: true, size: 9.5 })
    } else {
      redlineAlerts.forEach((a, i) => {
        ensure(20)
 page.drawText(`Alert ${i + 1}, ${fmtDate(a.created_at)}`, { x: MARGIN, y, size: 10.5, font: helvB, color: navy })
        y -= 14
        if (a.deviating_dimension) drawKV('Dimension', a.deviating_dimension)
        if (a.reason) drawParagraph(`Detected: ${a.reason}`, { size: 9.5 })
        if (a.intervention_plan) drawParagraph('Intervention plan generated and provided to the manager.', { size: 9.5, color: grey, italic: true })
        if (a.actioned != null) drawKV('Intervention actioned', a.actioned ? 'Yes' : 'Not recorded')
        y -= 2
      })
    }

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 4, PERFORMANCE DEVIATION ANALYSIS
    // ──────────────────────────────────────────────────────────────────────
    addPage()
 drawSectionHeading('Section 4, Performance Deviation Analysis')

    drawParagraph('This section sets PRODICTA\'s assessment-time predictions side by side with the manager-recorded reality during probation. Where the recorded reality matches the watch-outs identified at assessment, the dismissal is supported by an objective evidentiary trail.', { size: 10 })
    y -= 4

    drawRule()
    drawSubLabel('Predicted vs observed')

    const realityTimeline = result.reality_timeline || {}
    const phaseLabels2 = { week1: 'Week 1', month1: 'Month 1', month3: 'Month 3' }
    let anyComparison = false
    for (const [key, lbl] of Object.entries(phaseLabels2)) {
      const predicted = realityTimeline[key]
      const observed = managerNotes[key]
      const respondedTo = predResponses[key]
      if (!predicted && !observed) continue
      anyComparison = true
      ensure(20)
      page.drawText(lbl, { x: MARGIN, y, size: 11, font: helvB, color: navy })
      y -= 14
      if (predicted) {
        drawParagraph(`PRODICTA predicted: ${predicted}`, { size: 9.5, color: grey })
      }
      if (observed) {
        drawParagraph(`Manager observed: ${observed}`, { size: 9.5 })
      }
      if (respondedTo) {
        drawParagraph(`Confirmed by manager as: ${respondedTo.replace(/_/g, ' ')}`, { size: 9.5, italic: true, color: teal })
      }
      y -= 4
    }
    if (!anyComparison) {
      drawParagraph('No paired prediction / observation entries were recorded.', { color: grey, italic: true })
    }

    drawRule()
    drawSubLabel('Dimensions where performance deviated')
    const materialised = watchoutKeys.filter(k => watchoutStatuses[k] === 'red')
    const concerns = watchoutKeys.filter(k => watchoutStatuses[k] === 'amber')
    if (materialised.length === 0 && concerns.length === 0) {
      drawParagraph('No specific dimensions were flagged as deviating from prediction.', { color: grey, italic: true })
    } else {
      if (materialised.length > 0) {
        drawParagraph('Materialised concerns (red):', { bold: true, size: 10 })
        materialised.forEach(k => {
          const wo = watchouts[parseInt(k, 10)]
          const text = wo ? (typeof wo === 'object' ? (wo.watchout || wo.title || wo.text || '') : wo) : `Watch-out #${parseInt(k, 10) + 1}`
          drawBullet(text)
        })
      }
      if (concerns.length > 0) {
        drawParagraph('Early-signs concerns (amber):', { bold: true, size: 10 })
        concerns.forEach(k => {
          const wo = watchouts[parseInt(k, 10)]
          const text = wo ? (typeof wo === 'object' ? (wo.watchout || wo.title || wo.text || '') : wo) : `Watch-out #${parseInt(k, 10) + 1}`
          drawBullet(text)
        })
      }
    }

    drawRule()
    drawSubLabel('Timeline of performance concerns')
    drawKV('Hire confirmed', placementDate)
    drawKV('Probation length', outcome.probation_months ? `${outcome.probation_months} months` : 'Not recorded')
    drawKV('Last co-pilot update', copilot?.last_updated ? fmtDate(copilot.last_updated) : 'Not recorded')
    drawKV('Outcome recorded', exitDate)
    drawKV('Final outcome', outcomeLabel(outcome.outcome))

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 5, COMPLIANCE STATEMENT
    // ──────────────────────────────────────────────────────────────────────
    addPage()
 drawSectionHeading('Section 5, Compliance Statement')

    drawParagraph('PRODICTA confirms the following in respect of the assessment that informed the hiring decision recorded in this evidence pack:', { size: 10.5 })
    y -= 4

    // Shell-keyed sector compliance addenda. The first six statements
    // are the legal core (Equality Act 2010, ERA 2025) and apply to
    // every shell. Healthcare and education shells add 1 to 2 sector-
    // specific regulatory references so the pack acknowledges the
    // framework the employer actually operates under (CQC for care,
    // KCSIE / Teachers' Standards / safer recruitment for schools).
    // Office shell and legacy assessments without shell_family fall
    // through to the legal-core list only.
    const baseStatements = [
      'The assessment was objective, scenario-based, and built around realistic work situations relevant to the role applied for.',
      'Candidates were assessed against the same scenarios and the same scoring rubric, with responses anonymised at the point of scoring.',
      'Scoring was evidence-based, drawn directly from the candidate\'s recorded responses to scenario tasks, and not based on subjective impressions or inference.',
      'No protected characteristics under the Equality Act 2010 (age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, sexual orientation) were collected, considered, or used as inputs to scoring.',
      'The assessment process complies with the principles of the Equality Act 2010 and is structured to support the fairness obligations introduced by the Employment Rights Act 2025 in relation to dismissals during the statutory probation period.',
      'The probation co-pilot oversight tooling captured manager observations against the original predictions and watch-outs, providing a contemporaneous evidentiary record of performance during the probation period.',
    ]
    const shellFamily = candidate.assessments?.shell_family || null
    const COMPLIANCE_SECTOR_ADDENDA = {
      healthcare: [
        'For roles in regulated health and social care, this assessment supports compliance with the CQC Key Lines of Enquiry around safeguarding, dignity and respect, and person-centred care, and is consistent with safer-recruitment requirements for regulated activity under the Care Act 2014 and the Health and Social Care Act 2008. Indicators show the assessment scored candidates against role-appropriate clinical and care judgement, escalation discipline, and documentation standards. Where the role is regulated by the NMC, GMC, HCPC, GPhC or GDC, this assessment supports but does not replace the registrant checks required by the relevant body.',
      ],
      education: [
        'For roles in education settings, this assessment supports compliance with Keeping Children Safe in Education (KCSIE) Part 1 obligations around safer recruitment, the Teachers\' Standards (DfE), and the safeguarding requirements that apply to school staff. Patterns suggest the assessment scored candidates against role-appropriate professional judgement, behaviour management, parent communication and safeguarding pathway. This assessment supports but does not replace the safer-recruitment checks (DBS, prohibition checks, right-to-work, pre-employment health declaration, and the section 128 direction check where applicable) required of every school employer.',
      ],
    }
    const sectorAddenda = COMPLIANCE_SECTOR_ADDENDA[shellFamily] || []
    const statements = [...baseStatements, ...sectorAddenda]
    statements.forEach((s, i) => drawBullet(`${i + 1}. ${s}`))

    y -= 6
    drawRule()

    drawSubLabel('Signed off')
    drawKV('Platform', 'PRODICTA')
    drawKV('Reference', referenceNumber)
    drawKV('Generated', generatedAtLabel)
    drawParagraph('This statement is generated automatically by the PRODICTA platform on the basis of platform records and configuration. The platform is a closed scoring system: it does not accept protected-characteristic inputs and does not vary its scoring based on candidate identity.', { size: 9.5, color: grey, italic: true })

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 5b, HIRING / ASSIGNMENT DECISION AUDIT TRAIL
    // Captures the provenance of the report so the hiring decision is
    // defensible at probation, tribunal, or Fair Work Agency review.
    // Header phrasing varies by employment_type.
    // ──────────────────────────────────────────────────────────────────────
    addPage()
    const isEmployerTemp = (candidate.assessments?.employment_type || '').toLowerCase() === 'temporary'
    const auditHeader = isEmployerTemp ? 'Section 5b, Assignment Decision Audit Trail' : 'Section 5b, Hiring Decision Audit Trail'
    const auditIntro = isEmployerTemp
      ? 'Evidence the employer assessed the worker against the assignment requirements before bringing them on assignment.'
      : 'Evidence the employer followed a fair, documented hiring process. Useful for ERA 2025, Fair Work Agency, or tribunal defence.'
    drawSectionHeading(auditHeader)
    drawParagraph(auditIntro, { size: 10.5 })
    drawSubLabel('Candidate evidence collected for hiring decision and probation defence')

    const ctxAnswers = candidate.assessments?.context_answers
    const ctxSummary = ctxAnswers && typeof ctxAnswers === 'object'
      ? Object.entries(ctxAnswers).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => `${k}: ${String(v).slice(0, 220)}`).join(' | ')
      : ''
    const scenarioCount = Array.isArray(candidate.assessments?.scenarios) ? candidate.assessments.scenarios.length : 0
    const scoreEntries = result.scores && typeof result.scores === 'object'
      ? Object.entries(result.scores).filter(([k]) => !/^pf_|^_/.test(k)).map(([k, v]) => `${k}: ${v}`).join(', ')
      : ''
    const integrityFlags = (result.generic_detection?.flags || []).join(', ') || (result.response_quality || 'No integrity flags')

    drawKV('Job description on file', (candidate.assessments?.job_description || '').slice(0, 600) || 'Not recorded')
    drawKV('Role context answers', ctxSummary || 'No context answers captured')
    drawKV('Scenario template version', candidate.assessments?.scenario_version || 'Not recorded (legacy assessment)')
    drawKV('Scoring rubric version', result.scoring_rubric_version || 'Not recorded (legacy result)')
    drawKV('Model version', result.model_version || 'Not recorded (legacy result)')
    drawKV('Assessment mode and scenarios', `${(candidate.assessments?.assessment_mode || 'standard')}, ${scenarioCount} scenarios delivered`)
    drawKV('Score breakdown (per dimension)', scoreEntries || 'No per-dimension scores recorded')
    drawKV('Integrity result', integrityFlags)
    drawKV('Scoring confidence', result.scoring_confidence?.level || 'standard')
    drawKV('Candidate invited at', candidate.invited_at ? new Date(candidate.invited_at).toLocaleString('en-GB') : 'Not recorded')
    drawKV('Candidate completed at', candidate.completed_at ? new Date(candidate.completed_at).toLocaleString('en-GB') : 'Not recorded')
    drawKV('Report generated at', result.created_at ? new Date(result.created_at).toLocaleString('en-GB') : 'Not recorded')

    // Modular Workspace audit-trail extension. Three additional rows render
    // only when the assessment used the modular Workspace, identified by
    // the presence of workspace_block_scores. Legacy evidence packs stop
    // at the 12 rows above; modular packs show 12 + 3 = 15 rows.
    //
    // Section sub-label varies by employment_type to match the rest of
    // the evidence pack framing (hiring decision vs cover assignment).
    const blockScores = Array.isArray(result.workspace_block_scores) ? result.workspace_block_scores : null
    if (blockScores && blockScores.length > 0) {
      const modularLabel = isEmployerTemp
        ? 'Cover assignment Day 1 simulation results'
        : 'Hiring decision Day 1 simulation results'
      drawSubLabel(modularLabel)
      const blockNames = blockScores.map(b => {
        const id = (b?.block_id || '').toString()
        const label = WORKSPACE_BLOCK_LABEL[id] || id
        const score = Number.isFinite(b?.score) ? ` (${b.score})` : ''
        return id ? `${label}${score}` : null
      }).filter(Boolean).join(', ')
      drawKV('Day 1 simulation evaluated as part of hiring decision', blockNames || 'No blocks recorded')
      drawKV('Workspace scoring rubric version applied', result.workspace_rubric_version || 'Not recorded (legacy workspace)')
      drawKV('Workspace block library version', result.workspace_block_library_version || 'Not recorded (legacy workspace)')
    }

    // ──────────────────────────────────────────────────────────────────────
 // SECTION 6, RECOMMENDATION FOR LEGAL USE
    // ──────────────────────────────────────────────────────────────────────
    addPage()
 drawSectionHeading('Section 6, Recommendation for Legal Use')

    drawParagraph('This document provides an objective, evidence-based record of the hiring and probation management process. It demonstrates that the decision to end employment was based on documented performance concerns identified through objective assessment, not on any protected characteristic.', { size: 10.5 })
    y -= 4
    drawParagraph('This pack is provided for informational purposes. Employers should seek independent legal advice for specific employment law matters.', { size: 10.5, italic: true })
    y -= 8

    drawRule()
    drawSubLabel('Suggested use')
    drawBullet('Retain this pack alongside contemporaneous HR records relating to the probation period.')
    drawBullet('Provide a copy to your employment law adviser when reviewing the probation outcome.')
    drawBullet('Reference the unique pack number in any subsequent HR or legal correspondence to enable verification.')

    y -= 8
    drawRule()
    drawSubLabel('Pack verification')
    drawKV('Reference number', referenceNumber)
    drawKV('Generated at', generatedAtLabel)
    drawKV('Candidate', candidateName)
    drawKV('Role', roleTitle)
    drawKV('Outcome', outcomeLabel(outcome.outcome))

    // ──────────────────────────────────────────────────────────────────────
    // Footer on every page
    // ──────────────────────────────────────────────────────────────────────
    const totalPages = pages.length
    pages.forEach((p, i) => {
      // Taller footer to carry the standard compliance disclaimer above the
      // page-meta line. Wording matches lib/constants PD_PDF_FOOTER.
      p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 56, color: navy })
      p.drawText('PRODICTA reports describe assessment behaviour and surface risk indicators.', { x: MARGIN, y: 40, size: 7.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      p.drawText('They are not legal advice. Seek employment law advice where appropriate.', { x: MARGIN, y: 30, size: 7.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      p.drawText('PRODICTA reports should be one input to your hiring decision, not the sole basis.', { x: MARGIN, y: 20, size: 7.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      p.drawText('PRODICTA  |  Probation Evidence Pack  |  Confidential', { x: MARGIN, y: 7, size: 8, font: helv, color: rgb(0.78, 0.85, 0.86) })
      p.drawText(`${generatedAtLabel}  |  Page ${i + 1} of ${totalPages}`, { x: PAGE_W - MARGIN - 200, y: 7, size: 8, font: helv, color: rgb(0.78, 0.85, 0.86) })
    })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Evidence-Pack-${candidateName.replace(/[^a-z0-9]+/gi, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Evidence pack PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
