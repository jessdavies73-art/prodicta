import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import QRCode from 'qrcode'
import { EMAIL_FROM } from '@/lib/email-sender'

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

    const admin = createServiceClient()

    const { data: candidate } = await admin
      .from('candidates')
      .select('id, name, email, user_id, completed_at, assessment_id, assessments(role_title, role_level)')
      .eq('id', params.candidateId)
      .single()
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: result } = await admin
      .from('results')
      .select('overall_score, risk_level, hiring_confidence, strengths, watchouts, reality_timeline, onboarding_plan, interview_questions')
      .eq('candidate_id', params.candidateId)
      .maybeSingle()
    if (!result) return NextResponse.json({ error: 'No results' }, { status: 404 })

    const { data: profile } = await admin.from('users').select('company_name').eq('id', user.id).single()

    // Setup
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const gold = rgb(0.91, 0.72, 0.29)
    const grey = rgb(0.42, 0.46, 0.52)
    const black = rgb(0.1, 0.13, 0.18)
    const white = rgb(1, 1, 1)
    const lightBg = rgb(0.97, 0.98, 0.99)

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)

    const score = result.overall_score ?? 0
    const scoreLabel = score >= 85 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 65 ? 'Good' : score >= 50 ? 'Developing' : 'Concern'
    const roleLevel = candidate.assessments?.role_level || 'MID_LEVEL'
    const roleLevelLabel = roleLevel === 'OPERATIONAL' ? 'Operational Role' : roleLevel === 'LEADERSHIP' ? 'Leadership Role' : 'Mid-Level Role'
    const assessmentDate = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const companyName = profile?.company_name || ''

    // ── PAGE 1 ──
    let page = pdf.addPage([595, 842])
    let y = 842

    // Header band
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRO', { x: 40, y: 800, size: 28, font: helvB, color: navy })
    page.drawText('PRO', { x: 40, y: 800, size: 28, font: helvB, color: white })
    // Overwrite with branded colors
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRODICTA', { x: 40, y: 800, size: 28, font: helvB, color: teal })
    page.drawText('Manager Brief', { x: 40, y: 778, size: 13, font: helv, color: white })
    if (companyName) page.drawText(safe(companyName), { x: 40, y: 762, size: 10, font: helv, color: rgb(0.65, 0.75, 0.75) })

    y = 730
    // Candidate info
    page.drawText(safe(candidate.name || 'Candidate'), { x: 40, y, size: 20, font: helvB, color: black })
    y -= 18
    page.drawText(safe(`${candidate.assessments?.role_title || 'Role'} | ${assessmentDate} | ${roleLevelLabel}`), { x: 40, y, size: 10.5, font: helv, color: grey })
    y -= 24

    // Score block
    page.drawRectangle({ x: 40, y: y - 60, width: 515, height: 62, color: lightBg, borderColor: rgb(0.88, 0.9, 0.94), borderWidth: 1 })
    page.drawText(String(score), { x: 60, y: y - 42, size: 36, font: helvB, color: teal })
    page.drawText(`/ 100  ${scoreLabel}`, { x: 108, y: y - 36, size: 14, font: helvB, color: black })
    const hc = result.hiring_confidence?.score
    if (hc != null) {
      page.drawText(`Hiring Confidence: ${hc}%`, { x: 340, y: y - 36, size: 11, font: helvB, color: teal })
    }
    page.drawText(safe(`Risk: ${result.risk_level || 'N/A'}`), { x: 340, y: y - 52, size: 10, font: helv, color: grey })
    y -= 80

    // Separator
    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 20

    // Strengths
    page.drawText('TOP STRENGTHS', { x: 40, y, size: 10, font: helvB, color: teal })
    y -= 16
    const strengths = (Array.isArray(result.strengths) ? result.strengths : []).slice(0, 3)
    for (const s of strengths) {
      const text = typeof s === 'string' ? s : (s?.text || s?.strength || s?.title || '')
      const evidence = typeof s === 'object' ? (s?.evidence || s?.detail || '') : ''
      if (!text) continue
      const titleLines = wrap(text, helvB, 11, 490)
      titleLines.forEach(l => { page.drawText(l, { x: 50, y, size: 11, font: helvB, color: black }); y -= 14 })
      if (evidence) {
        const evLines = wrap(`"${evidence}"`, helv, 9.5, 480)
        evLines.forEach(l => { page.drawText(l, { x: 50, y, size: 9.5, font: helv, color: grey }); y -= 12 })
      }
      y -= 6
    }
    y -= 8

    // Watch-outs
    page.drawText('TOP WATCH-OUTS', { x: 40, y, size: 10, font: helvB, color: rgb(0.86, 0.15, 0.15) })
    y -= 16
    const watchouts = (Array.isArray(result.watchouts) ? result.watchouts : []).slice(0, 3)
    for (const w of watchouts) {
      const text = w?.watchout || w?.title || w?.text || ''
      const consequence = w?.if_ignored || ''
      if (!text) continue
      const titleLines = wrap(text, helvB, 11, 490)
      titleLines.forEach(l => { page.drawText(l, { x: 50, y, size: 11, font: helvB, color: black }); y -= 14 })
      if (consequence) {
        const cLines = wrap(`If unmanaged: ${consequence}`, helv, 9.5, 480)
        cLines.forEach(l => { page.drawText(l, { x: 50, y, size: 9.5, font: helv, color: grey }); y -= 12 })
      }
      y -= 6
    }

    // ── PAGE 2 ──
    page = pdf.addPage([595, 842])
    y = 810

    // Header
    page.drawText('PRODICTA', { x: 40, y, size: 16, font: helvB, color: teal })
    page.drawText(safe(`Manager Brief: ${candidate.name}`), { x: 160, y: y + 2, size: 10, font: helv, color: grey })
    y -= 28
    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 20

    // 90-Day Reality Timeline
    page.drawText('90-DAY REALITY TIMELINE', { x: 40, y, size: 10, font: helvB, color: teal })
    y -= 16
    const timeline = result.reality_timeline || {}
    for (const [phase, label] of [['week1', 'Week 1'], ['month1', 'Month 1'], ['month3', 'Month 3']]) {
      const text = timeline[phase]
      if (!text) continue
      page.drawText(label, { x: 50, y, size: 10, font: helvB, color: black })
      y -= 14
      const lines = wrap(text, helv, 9.5, 480)
      lines.forEach(l => { page.drawText(l, { x: 50, y, size: 9.5, font: helv, color: grey }); y -= 12 })
      y -= 6
    }
    y -= 8

    // Onboarding summary
    if (y > 300) {
      page.drawText('ONBOARDING PRIORITIES', { x: 40, y, size: 10, font: helvB, color: teal })
      y -= 16
      const plan = (Array.isArray(result.onboarding_plan) ? result.onboarding_plan : []).slice(0, 5)
      for (const item of plan) {
        const title = item?.title || item?.objective || ''
        if (!title) continue
        const bulletLines = wrap(`Week ${item.week || '?'}: ${title}`, helv, 10, 490)
        bulletLines.forEach(l => { page.drawText(l, { x: 50, y, size: 10, font: helv, color: black }); y -= 13 })
        y -= 3
      }
      y -= 8
    }

    // Suggested interview question
    const questions = Array.isArray(result.interview_questions) ? result.interview_questions : []
    if (questions.length > 0 && y > 200) {
      page.drawText('SUGGESTED INTERVIEW QUESTION', { x: 40, y, size: 10, font: helvB, color: teal })
      y -= 16
      const q = typeof questions[0] === 'string' ? questions[0] : (questions[0]?.question || questions[0]?.text || '')
      if (q) {
        const qLines = wrap(q, helv, 10, 490)
        qLines.forEach(l => { page.drawText(l, { x: 50, y, size: 10, font: helv, color: black }); y -= 13 })
      }
      y -= 16
    }

    // QR Code
    const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'}/assessment/${params.id}/candidate/${params.candidateId}`
    try {
      const qrDataUrl = await QRCode.toDataURL(reportUrl, { width: 100, margin: 1, color: { dark: '#0f2137', light: '#ffffff' } })
      const qrBase64 = qrDataUrl.split(',')[1]
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0))
      const qrImage = await pdf.embedPng(qrBytes)
      page.drawImage(qrImage, { x: 40, y: 60, width: 80, height: 80 })
      page.drawText('Scan for full interactive report', { x: 130, y: 110, size: 10, font: helvB, color: navy })
      page.drawText(safe(reportUrl), { x: 130, y: 96, size: 8, font: helv, color: grey })
    } catch {
      page.drawText('Full report:', { x: 40, y: 90, size: 9, font: helvB, color: navy })
      page.drawText(safe(reportUrl), { x: 40, y: 78, size: 8, font: helv, color: grey })
    }

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    page.drawText('Generated by PRODICTA', { x: 40, y: 13, size: 9, font: helv, color: rgb(0.65, 0.75, 0.75) })
    page.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    // Also add footer to page 1
    const p1 = pdf.getPages()[0]
    p1.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    p1.drawText('Generated by PRODICTA', { x: 40, y: 13, size: 9, font: helv, color: rgb(0.65, 0.75, 0.75) })
    p1.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Manager-Brief-${safe(candidate.name || 'Candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Manager brief PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Send PDF via email to a hiring manager
export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const admin = createServiceClient()
    const { data: candidate } = await admin
      .from('candidates')
      .select('name, assessments(role_title)')
      .eq('id', params.candidateId)
      .single()

    // Generate PDF by calling our own GET handler internally
    const pdfUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'}/api/assessment/${params.id}/candidate/${params.candidateId}/manager-brief-pdf`
    const pdfRes = await fetch(pdfUrl, { headers: { cookie: request.headers.get('cookie') || '' } })
    if (!pdfRes.ok) return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
    const pdfBuffer = await pdfRes.arrayBuffer()

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
 subject: `Candidate Brief: ${candidate?.name || 'Candidate'}, ${candidate?.assessments?.role_title || 'Role'}`,
      html: `<div style="font-family:'Outfit',system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px 0">
        <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
          <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
        </div>
        <div style="background:#fff;border:1px solid #e4e9f0;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
          <h2 style="color:#0f172a;margin:0 0 12px;font-size:18px">Manager Brief: ${candidate?.name || 'Candidate'}</h2>
          <p style="color:#5e6b7f;margin:0 0 16px;font-size:14px;line-height:1.6">
            Please find the attached 2-page candidate brief for <strong>${candidate?.name}</strong> applying for <strong>${candidate?.assessments?.role_title || 'the role'}</strong>.
          </p>
          <p style="color:#94a1b3;font-size:12px;margin:0">Generated by PRODICTA | prodicta.co.uk</p>
        </div>
      </div>`,
      attachments: [{
        filename: `PRODICTA-Manager-Brief-${(candidate?.name || 'Candidate').replace(/\s+/g, '-')}.pdf`,
        content: Buffer.from(pdfBuffer),
      }],
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Manager brief email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
