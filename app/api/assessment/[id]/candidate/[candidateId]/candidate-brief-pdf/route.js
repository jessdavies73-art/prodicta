// Client-facing PRODICTA assessment report.
//
// This is the agency-side counterpart to manager-brief-pdf. The Manager
// Brief is for an internal line manager who is going to onboard the
// hire (Day-One Rights, Family Leave, Probation Tracker references are
// all valid there). This brief goes to the agency's client, who is
// considering the candidate but has not hired them yet, so all of
// that employer-internal compliance language is removed.
//
// Content focus: assessment evidence, scores, narratives, recommendation,
// watch-outs, interview questions. Tone is professional and evidence-led.
// Compliance phrasing inside scoring narratives ("indicators show",
// "patterns suggest") flows through unchanged because that copy is
// already shaped by the shell-aware scoring upstream.
//
// Sources: candidates, results, users.company_name. No new schema.
// Sections that depend on optional fields (Counter-Offer Resilience,
// Placement Survival, Pressure-Fit dimensions, Strategic Thinking)
// are rendered only when their data is present, otherwise skipped.

import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

function safe(text) {
  if (!text) return ''
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

function verdictLabel(score) {
  if (score == null) return 'Awaiting score'
  if (score >= 80) return 'Strong hire'
  if (score >= 70) return 'Hire with plan'
  if (score >= 55) return 'Proceed with caution'
  return 'Not recommended'
}

function scoreBand(score) {
  if (score == null) return '—'
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 65) return 'Good'
  if (score >= 50) return 'Developing'
  return 'Concern'
}

function rgbForScore(score) {
  if (score == null) return rgb(0.42, 0.46, 0.52)
  if (score >= 80) return rgb(0.06, 0.73, 0.51)
  if (score >= 70) return rgb(0, 0.75, 0.65)
  if (score >= 55) return rgb(0.96, 0.62, 0.04)
  return rgb(0.94, 0.27, 0.27)
}

// Human labels for Pressure-Fit dimension keys. Falls back to the key
// itself if a new dimension shows up that we have not labelled.
const PF_LABELS = {
  pf_decision_making: 'Decision Making Under Pressure',
  pf_communication: 'Communication Under Pressure',
  pf_stakeholder_management: 'Stakeholder Management',
  pf_adaptability: 'Adaptability',
  pf_commercial_thinking: 'Commercial Thinking',
  pf_judgement: 'Judgement Under Pressure',
  pf_resilience: 'Resilience',
  pf_clinical_judgement: 'Clinical Judgement',
  pf_pupil_outcomes: 'Pupil Outcomes Focus',
  pf_safeguarding: 'Safeguarding Awareness',
}

export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, name, user_id, completed_at, assessments(role_title, role_level)')
      .eq('id', params.candidateId)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: result } = await admin
      .from('results')
      .select('overall_score, risk_level, hiring_confidence, strengths, watchouts, interview_questions, scores, executive_summary, candidate_type, pressure_fit_score, response_quality, scoring_confidence')
      .eq('candidate_id', params.candidateId)
      .maybeSingle()
    if (!result) return NextResponse.json({ error: 'No results' }, { status: 404 })

    const { data: profile } = await admin
      .from('users')
      .select('company_name')
      .eq('id', user.id)
      .single()

    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const tealLight = rgb(0.88, 0.96, 0.94)
    const grey = rgb(0.42, 0.46, 0.52)
    const greyMuted = rgb(0.65, 0.69, 0.74)
    const black = rgb(0.1, 0.13, 0.18)
    const white = rgb(1, 1, 1)
    const cardBorder = rgb(0.88, 0.9, 0.94)
    const lightBg = rgb(0.97, 0.98, 0.99)
    const amberBg = rgb(0.998, 0.949, 0.886)
    const amberBorder = rgb(0.964, 0.831, 0.561)
    const redText = rgb(0.86, 0.15, 0.15)

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)

    const W = 595, H = 842
    const ML = 48, MR = 48
    const TEXT_W = W - ML - MR
    const FOOTER_RESERVE = 60

    let page = pdf.addPage([W, H])
    let y = H - 60

    function newPage() {
      page = pdf.addPage([W, H])
      y = H - 60
    }
    function ensure(space) {
      if (y - space < FOOTER_RESERVE + 10) newPage()
    }
    function drawWrapped(text, { size = 11, font = helv, color = black, x = ML, indent = 0, maxLines = 0 } = {}) {
      const lines = wrap(text, font, size, TEXT_W - indent)
      const slice = maxLines > 0 ? lines.slice(0, maxLines) : lines
      for (const line of slice) {
        ensure(size + 4)
        page.drawText(line, { x: x + indent, y, size, font, color })
        y -= size + 4
      }
    }
    function heading(text, size = 14, color = navy) {
      ensure(size + 14)
      y -= 6
      page.drawText(safe(text), { x: ML, y, size, font: helvB, color })
      y -= size + 8
    }
    function tag(text, color = teal) {
      ensure(14)
      page.drawText(safe(text).toUpperCase(), { x: ML, y, size: 9, font: helvB, color })
      y -= 13
    }
    function rule() {
      ensure(8)
      page.drawRectangle({ x: ML, y, width: TEXT_W, height: 0.6, color: cardBorder })
      y -= 10
    }

    const companyName = profile?.company_name || ''
    const roleTitle = candidate.assessments?.role_title || 'Role'
    const roleLevel = candidate.assessments?.role_level || 'MID_LEVEL'
    const roleLevelLabel = roleLevel === 'OPERATIONAL' ? 'Operational Role' : roleLevel === 'LEADERSHIP' ? 'Leadership Role' : 'Mid-Level Role'
    const assessmentDate = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const score = result.overall_score
    const verdict = verdictLabel(score)
    const band = scoreBand(score)
    const verdictColour = rgbForScore(score)

    // ── PAGE 1: HEADER + EXECUTIVE SUMMARY ──
    page.drawRectangle({ x: 0, y: H - 130, width: W, height: 130, color: navy })
    page.drawText('PRODICTA', { x: ML, y: H - 60, size: 28, font: helvB, color: teal })
    page.drawText('Candidate Report', { x: ML, y: H - 92, size: 16, font: helvB, color: white })
    if (companyName) {
      page.drawText(safe(`Prepared by ${companyName}`), { x: ML, y: H - 112, size: 11, font: helv, color: rgb(0.78, 0.86, 0.84) })
    } else {
      page.drawText('Prepared for client review', { x: ML, y: H - 112, size: 11, font: helv, color: rgb(0.78, 0.86, 0.84) })
    }

    y = H - 160
    page.drawText(safe(candidate.name || 'Candidate'), { x: ML, y, size: 24, font: helvB, color: black })
    y -= 22
    page.drawText(safe(`${roleTitle} | ${assessmentDate} | ${roleLevelLabel}`), { x: ML, y, size: 12, font: helv, color: grey })
    y -= 26

    // Headline score block
    if (score != null) {
      const blockH = 80
      page.drawRectangle({ x: ML, y: y - blockH, width: TEXT_W, height: blockH, color: lightBg, borderColor: cardBorder, borderWidth: 1 })
      page.drawText(String(score), { x: ML + 24, y: y - 56, size: 42, font: helvB, color: verdictColour })
      page.drawText('/100', { x: ML + 100, y: y - 50, size: 12, font: helv, color: grey })
      page.drawText(safe(band), { x: ML + 100, y: y - 64, size: 11, font: helvB, color: verdictColour })
      page.drawText('HIRING RECOMMENDATION', { x: ML + 200, y: y - 24, size: 9, font: helvB, color: grey })
      page.drawText(safe(verdict), { x: ML + 200, y: y - 42, size: 16, font: helvB, color: verdictColour })
      const hc = result.hiring_confidence?.score
      if (hc != null) {
        page.drawText(safe(`Confidence: ${hc}%`), { x: ML + 200, y: y - 60, size: 10.5, font: helv, color: grey })
      }
      y -= blockH + 18
    }

    // 1-line verdict / candidate type
    const candTypeRaw = result.candidate_type || ''
    const candTypeShort = candTypeRaw ? safe(candTypeRaw).split('|')[0].trim() : ''
    if (candTypeShort) {
      tag('Candidate type')
      drawWrapped(candTypeShort, { size: 12, font: helvB })
      y -= 6
    }

    // Executive summary sections (if generated by Strategy-Fit synthesis)
    const execSections = Array.isArray(result.executive_summary?.sections)
      ? result.executive_summary.sections.filter(s => s && (s.section_label || s.content_paragraph))
      : []
    if (execSections.length > 0) {
      ensure(40)
      heading('Executive Summary', 13)
      execSections.slice(0, 3).forEach(sec => {
        if (sec.section_label) {
          tag(safe(sec.section_label))
        }
        if (sec.content_paragraph) {
          drawWrapped(safe(sec.content_paragraph), { size: 10.5, maxLines: 6 })
          y -= 4
        }
      })
    }

    // ── PRESSURE-FIT DIMENSIONS ──
    const pfEntries = result.scores && typeof result.scores === 'object'
      ? Object.entries(result.scores).filter(([k, v]) => /^pf_/.test(k) && Number.isFinite(v))
      : []
    if (pfEntries.length > 0) {
      ensure(60)
      rule()
      heading('Pressure-Fit Profile', 13)
      drawWrapped('How the candidate performed across the dimensions PRODICTA measures under realistic role pressure.', { size: 10, color: grey, maxLines: 3 })
      y -= 6
      pfEntries.slice(0, 6).forEach(([key, val]) => {
        ensure(28)
        const label = PF_LABELS[key] || key.replace(/^pf_/, '').replace(/_/g, ' ')
        const v = Math.max(0, Math.min(100, Math.round(val)))
        const barColour = rgbForScore(v)
        page.drawText(safe(label), { x: ML, y, size: 10.5, font: helvB, color: black })
        page.drawText(String(v), { x: W - MR - 28, y, size: 10.5, font: helvB, color: barColour })
        y -= 12
        page.drawRectangle({ x: ML, y, width: TEXT_W, height: 5, color: rgb(0.92, 0.94, 0.97) })
        page.drawRectangle({ x: ML, y, width: TEXT_W * (v / 100), height: 5, color: barColour })
        y -= 14
      })
      y -= 6
    }

    // Counter-Offer Resilience and Placement Survival, when available.
    // These are optional fields produced by the scoring pipeline; skip
    // gracefully when absent so legacy candidates still render.
    const cor = result.scores?.counter_offer_resilience ?? result.counter_offer_resilience_score ?? null
    const psv = result.scores?.placement_survival ?? result.placement_survival_score ?? null
    if (cor != null || psv != null) {
      ensure(70)
      heading('Placement Indicators', 13)
      const halfW = (TEXT_W - 12) / 2
      if (psv != null) {
        page.drawRectangle({ x: ML, y: y - 56, width: halfW, height: 56, color: lightBg, borderColor: cardBorder, borderWidth: 1 })
        page.drawText('PLACEMENT SURVIVAL', { x: ML + 12, y: y - 14, size: 8.5, font: helvB, color: teal })
        page.drawText(`${Math.round(psv)}%`, { x: ML + 12, y: y - 38, size: 22, font: helvB, color: rgbForScore(psv) })
        page.drawText('Likelihood of staying past the rebate window', { x: ML + 12, y: y - 50, size: 8.5, font: helv, color: grey })
      }
      if (cor != null) {
        const x2 = ML + halfW + 12
        page.drawRectangle({ x: x2, y: y - 56, width: halfW, height: 56, color: lightBg, borderColor: cardBorder, borderWidth: 1 })
        page.drawText('COUNTER-OFFER RESILIENCE', { x: x2 + 12, y: y - 14, size: 8.5, font: helvB, color: teal })
        page.drawText(`${Math.round(cor)}%`, { x: x2 + 12, y: y - 38, size: 22, font: helvB, color: rgbForScore(cor) })
        page.drawText('Likelihood of accepting the offer', { x: x2 + 12, y: y - 50, size: 8.5, font: helv, color: grey })
      }
      y -= 74
    }

    // ── PAGE 2 SECTION: STRENGTHS ──
    const strengths = (Array.isArray(result.strengths) ? result.strengths : []).slice(0, 5)
    if (strengths.length > 0) {
      ensure(40)
      heading('Top Strengths', 13)
      strengths.forEach((s, i) => {
        ensure(40)
        const title = typeof s === 'string' ? s : (s?.title || s?.strength || s?.text || '')
        const evidence = typeof s === 'object' ? (s?.evidence || s?.summary || s?.detail || '') : ''
        if (!title) return
        page.drawText(`${i + 1}.`, { x: ML, y, size: 11, font: helvB, color: teal })
        const titleLines = wrap(safe(title), helvB, 11, TEXT_W - 24)
        titleLines.forEach((ln, li) => {
          if (li > 0) ensure(15)
          page.drawText(ln, { x: ML + 18, y, size: 11, font: helvB, color: black })
          y -= 14
        })
        if (evidence) {
          drawWrapped(safe(evidence), { size: 10, color: grey, indent: 18, maxLines: 4 })
        }
        y -= 6
      })
    }

    // ── WATCH-OUTS ──
    const watchouts = (Array.isArray(result.watchouts) ? result.watchouts : []).slice(0, 5)
    if (watchouts.length > 0) {
      ensure(40)
      rule()
      heading('Watch-outs', 13, redText)
      drawWrapped('Areas to probe at interview before making an offer. Severity reflects risk if left unmanaged.', { size: 10, color: grey, maxLines: 2 })
      y -= 6
      watchouts.forEach((w, i) => {
        ensure(54)
        const title = w?.watchout || w?.title || w?.text || (typeof w === 'string' ? w : '')
        const sev = w?.severity || 'Medium'
        const consequence = w?.if_ignored || w?.consequence || ''
        const evidence = w?.evidence || w?.summary || ''
        if (!title) return
        const sevColour = sev === 'High' ? redText : sev === 'Medium' ? rgb(0.85, 0.46, 0.02) : rgb(0.42, 0.46, 0.52)
        const sevBg = sev === 'High' ? rgb(0.996, 0.91, 0.91) : sev === 'Medium' ? amberBg : rgb(0.94, 0.96, 0.98)
        const sevBd = sev === 'High' ? rgb(0.992, 0.78, 0.78) : sev === 'Medium' ? amberBorder : cardBorder

        // Severity pill
        const sevText = safe(sev).toUpperCase()
        const sevWidth = helvB.widthOfTextAtSize(sevText, 8) + 14
        page.drawRectangle({ x: ML, y: y - 4, width: sevWidth, height: 16, color: sevBg, borderColor: sevBd, borderWidth: 0.6 })
        page.drawText(sevText, { x: ML + 7, y: y, size: 8, font: helvB, color: sevColour })

        const titleLines = wrap(safe(title), helvB, 11, TEXT_W - sevWidth - 12)
        titleLines.forEach((ln, li) => {
          if (li > 0) ensure(14)
          page.drawText(ln, { x: ML + sevWidth + 8, y: y + (li === 0 ? 0 : -14 * li), size: 11, font: helvB, color: black })
        })
        y -= Math.max(20, titleLines.length * 14 + 8)

        if (evidence) {
          drawWrapped(safe(evidence), { size: 10, color: grey, indent: 0, maxLines: 3 })
        }
        if (consequence) {
          drawWrapped(`If unmanaged: ${safe(consequence)}`, { size: 10, color: grey, indent: 0, maxLines: 2 })
        }
        y -= 8
      })
    }

    // ── INTERVIEW QUESTIONS ──
    const questions = (Array.isArray(result.interview_questions) ? result.interview_questions : []).slice(0, 10)
    if (questions.length > 0) {
      ensure(60)
      rule()
      heading('Suggested Interview Questions', 13)
      drawWrapped('Tailored to this candidate. Use these in your interview to verify the assessment evidence and probe the watch-outs.', { size: 10, color: grey, maxLines: 3 })
      y -= 8
      questions.forEach((q, i) => {
        ensure(34)
        const raw = typeof q === 'object' ? (q?.question || q?.text || '') : (q || '')
        if (!raw) return
        const probeMatch = raw.match(/\(Follow-up probe:\s*([\s\S]*?)\)\s*$/) || raw.match(/\[Follow-up:\s*([\s\S]*?)\]\s*$/)
        const probe = probeMatch ? probeMatch[1].trim() : ''
        const mainQ = probeMatch ? raw.slice(0, probeMatch.index).trim() : raw.trim()
        page.drawText(`Q${i + 1}.`, { x: ML, y, size: 10.5, font: helvB, color: teal })
        const qLines = wrap(safe(mainQ), helv, 10.5, TEXT_W - 26)
        qLines.forEach((ln, li) => {
          if (li > 0) ensure(13)
          page.drawText(ln, { x: ML + 22, y, size: 10.5, font: helv, color: black })
          y -= 13
        })
        if (probe) {
          drawWrapped(`Probe: ${safe(probe)}`, { size: 9.5, color: grey, indent: 22, maxLines: 2 })
        }
        y -= 6
      })
    }

    // ── FOOTER ──
    pdf.getPages().forEach((pg, idx) => {
      pg.drawRectangle({ x: 0, y: 0, width: W, height: 50, color: navy })
      pg.drawText('PRODICTA reports describe assessment behaviour and surface risk indicators.', { x: ML, y: 32, size: 7.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      pg.drawText('They should be one input to your hiring decision, not the sole basis.', { x: ML, y: 22, size: 7.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      pg.drawText(safe(companyName ? `Prepared by ${companyName}` : 'Prepared for client review'), { x: ML, y: 7, size: 8, font: helvB, color: rgb(0.78, 0.86, 0.84) })
      pg.drawText('PRODICTA', { x: W - MR - 88, y: 7, size: 9, font: helvB, color: teal })
      pg.drawText(`${idx + 1}`, { x: W - MR - 8, y: 32, size: 8, font: helv, color: rgb(0.78, 0.86, 0.84) })
    })

    const bytes = await pdf.save()
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return new NextResponse(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Candidate-Report-${safe(candidate.name || 'Candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Candidate brief PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
