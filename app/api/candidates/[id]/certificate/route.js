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

    const url = new URL(request.url)
    const anonymise = url.searchParams.get('anon') === '1'

    const adminClient = createServiceClient()
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, completed_at, user_id, assessments(role_title, assessment_mode), users:user_id(company_name)')
      .eq('id', params.id)
      .single()
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: result } = await adminClient
      .from('results')
      .select('overall_score, risk_level, hiring_confidence')
      .eq('candidate_id', candidate.id)
      .maybeSingle()
    if (!result) {
      return NextResponse.json({ error: 'No results yet' }, { status: 404 })
    }

    const refNumber = `PRODICTA-${candidate.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`
    const candidateLabel = anonymise ? `Candidate ${candidate.id.slice(0, 6).toUpperCase()}` : candidate.name
    const assessmentDate = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const conf = result.hiring_confidence?.score ?? null

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const grey = rgb(0.42, 0.46, 0.52)
    const black = rgb(0.1, 0.13, 0.18)

    const page = pdf.addPage([595, 842])
    // Header band
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRODICTA', { x: 40, y: 800, size: 28, font: helvB, color: teal })
    page.drawText('ERA 2025 Compliance Certificate', { x: 40, y: 770, size: 14, font: helv, color: rgb(1, 1, 1) })

    // Body
    let y = 720
    const label = (k, v, yPos) => {
      page.drawText(safe(k), { x: 40, y: yPos, size: 9, font: helvB, color: grey })
      page.drawText(safe(v), { x: 40, y: yPos - 16, size: 13, font: helvB, color: black })
    }

    label('CERTIFICATE REFERENCE', refNumber, y); y -= 40
    label('ASSESSMENT DATE', assessmentDate, y); y -= 40
    label('CANDIDATE', candidateLabel, y); y -= 40
    label('ROLE TITLE', candidate.assessments?.role_title || 'Not specified', y); y -= 40
    label('PREPARED BY', candidate.users?.company_name || 'Hiring team', y); y -= 50

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 24

    // Methodology
    page.drawText('METHODOLOGY', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
    const methLines = wrap('Scenario-based work simulation, AI-scored, Equality Act 2010 compliant.', helv, 11, 515)
    methLines.forEach(l => { page.drawText(l, { x: 40, y, size: 11, font: helv, color: black }); y -= 15 })
    y -= 10

    // Scoring summary
    page.drawText('SCORING SUMMARY', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
    page.drawText(`Overall score: ${result.overall_score ?? '-'} / 100`, { x: 40, y, size: 12, font: helvB, color: navy }); y -= 18
    page.drawText(`Risk level: ${result.risk_level || '-'}`, { x: 40, y, size: 12, font: helvB, color: navy }); y -= 18
    if (conf != null) { page.drawText(`Hiring confidence: ${conf}%`, { x: 40, y, size: 12, font: helvB, color: navy }); y -= 18 }
    y -= 14

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

    // Statement
    page.drawText('STATEMENT', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
    const statement = 'This assessment was conducted using objective, scenario-based methodology. No candidate was penalised for spelling, grammar, or writing style. All scores are backed by specific evidence from the candidate\'s responses. This document forms part of the evidence trail for a fair and defensible hiring decision.'
    const stmtLines = wrap(statement, helv, 10.5, 515)
    stmtLines.forEach(l => { page.drawText(l, { x: 40, y, size: 10.5, font: helv, color: black }); y -= 14 })

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    page.drawText(`Reference: ${refNumber}`, { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
    page.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Compliance-${refNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Certificate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
