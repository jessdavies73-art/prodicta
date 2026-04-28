// 90-Day Success Plan as a standalone PDF for client delivery.
//
// Sources from results.onboarding_plan (the same data the embedded
// dashboard section used to render). This is the agency-side companion
// to the candidate-brief-pdf: it bundles into Send to Client when the
// recruiter ticks the "Include 90-Day Success Plan" toggle.
//
// Pure repackaging of existing content; no new fields, no scoring
// changes. Heading varies by role_level (Day One Management Guide /
// Strategic Onboarding Brief / 90-Day Success Plan) to match the
// dashboard wording.

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
      .select('onboarding_plan')
      .eq('candidate_id', params.candidateId)
      .maybeSingle()

    const plan = Array.isArray(result?.onboarding_plan) ? result.onboarding_plan : []
    if (plan.length === 0) {
      return NextResponse.json({ error: 'No 90-Day plan available yet' }, { status: 404 })
    }

    const { data: profile } = await admin
      .from('users')
      .select('company_name')
      .eq('id', user.id)
      .single()

    const roleLevel = candidate.assessments?.role_level || 'MID_LEVEL'
    const docTitle = roleLevel === 'OPERATIONAL'
      ? 'Day One Management Guide'
      : roleLevel === 'LEADERSHIP'
      ? 'Strategic Onboarding Brief'
      : '90-Day Success Plan'

    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const tealLight = rgb(0.88, 0.96, 0.94)
    const grey = rgb(0.42, 0.46, 0.52)
    const black = rgb(0.1, 0.13, 0.18)
    const white = rgb(1, 1, 1)
    const cardBorder = rgb(0.88, 0.9, 0.94)

    const W = 595, H = 842
    const ML = 48, MR = 48
    const TEXT_W = W - ML - MR
    const FOOTER_RESERVE = 60

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)

    let page = pdf.addPage([W, H])
    let y = H - 60

    function newPage() {
      page = pdf.addPage([W, H])
      y = H - 60
    }
    function ensure(space) {
      if (y - space < FOOTER_RESERVE + 10) newPage()
    }
    function drawWrapped(text, { size = 11, font = helv, color = black, x = ML, indent = 0 } = {}) {
      const lines = wrap(text, font, size, TEXT_W - indent)
      for (const line of lines) {
        ensure(size + 4)
        page.drawText(line, { x: x + indent, y, size, font, color })
        y -= size + 4
      }
    }
    function heading(text, size = 14, color = navy) {
      ensure(size + 12)
      y -= 6
      page.drawText(safe(text), { x: ML, y, size, font: helvB, color })
      y -= size + 8
    }
    function tag(text) {
      ensure(14)
      page.drawText(safe(text).toUpperCase(), { x: ML, y, size: 9, font: helvB, color: teal })
      y -= 13
    }

    // ── COVER ──
    page.drawRectangle({ x: 0, y: H - 130, width: W, height: 130, color: navy })
    page.drawText('PRODICTA', { x: ML, y: H - 60, size: 28, font: helvB, color: teal })
    page.drawText(safe(docTitle), { x: ML, y: H - 92, size: 16, font: helvB, color: white })
    page.drawText('Practical, candidate-specific milestones for the first 90 days.', { x: ML, y: H - 112, size: 11, font: helv, color: rgb(0.78, 0.86, 0.84) })

    y = H - 170
    page.drawText(safe(candidate.name || 'Candidate'), { x: ML, y, size: 22, font: helvB, color: black })
    y -= 22
    const assessmentDate = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    page.drawText(safe(`${candidate.assessments?.role_title || 'Role'} | ${assessmentDate}`), { x: ML, y, size: 12, font: helv, color: grey })
    y -= 28

    // Intro box
    const introH = 60
    page.drawRectangle({ x: ML, y: y - introH, width: TEXT_W, height: introH, color: tealLight, borderColor: cardBorder, borderWidth: 1 })
    page.drawText('How to use this plan', { x: ML + 14, y: y - 18, size: 10.5, font: helvB, color: navy })
    const introLines = wrap('Tailored to this candidate\'s specific gaps. Designed to be handed directly to the line manager so the first 90 days have structure, milestones, and clear checkpoints.', helv, 10, TEXT_W - 28)
    introLines.slice(0, 3).forEach((ln, i) => {
      page.drawText(ln, { x: ML + 14, y: y - 32 - (i * 12), size: 10, font: helv, color: black })
    })
    y -= introH + 16

    // ── WEEK CARDS ──
    plan.forEach((rawItem, i) => {
      // Support both new structured objects and legacy plain strings.
      const isStructured = typeof rawItem === 'object' && rawItem !== null && (rawItem.objective || rawItem.title)
      if (!isStructured) {
        const text = typeof rawItem === 'object' ? (rawItem.text || rawItem.title || '') : String(rawItem || '')
        if (!text.trim()) return
        const match = text.match(/^(Week\s*\d+):/i)
        const weekLabel = match ? match[1] : `Week ${i + 1}`
        const body = match ? text.slice(match[0].length).trim() : text
        ensure(40)
        tag(weekLabel)
        drawWrapped(body, { size: 11 })
        y -= 6
        return
      }

      const item = rawItem
      ensure(80)

      // Week header pill
      const weekText = `Week ${item.week ?? i + 1}`
      const titleText = item.title ? safe(item.title) : ''
      page.drawRectangle({ x: ML, y: y - 4, width: TEXT_W, height: 24, color: tealLight, borderColor: cardBorder, borderWidth: 0.8 })
      page.drawText(safe(weekText).toUpperCase(), { x: ML + 12, y: y + 4, size: 9, font: helvB, color: teal })
      if (titleText) {
        const titleLines = wrap(titleText, helvB, 11, TEXT_W - 90)
        page.drawText(titleLines[0] || '', { x: ML + 70, y: y + 4, size: 11, font: helvB, color: black })
      }
      y -= 28

      if (item.objective) {
        tag('Objective')
        drawWrapped(safe(item.objective), { size: 11 })
        y -= 4
      }

      if (item.checkpoint) {
        ensure(40)
        const ckLines = wrap(safe(item.checkpoint), helv, 10.5, TEXT_W - 36)
        const ckHeight = 18 + ckLines.length * 13
        page.drawRectangle({ x: ML, y: y - ckHeight, width: TEXT_W, height: ckHeight, color: tealLight, borderColor: cardBorder, borderWidth: 0.5 })
        page.drawText('CHECKPOINT', { x: ML + 14, y: y - 14, size: 9, font: helvB, color: teal })
        ckLines.forEach((ln, li) => {
          page.drawText(ln, { x: ML + 14, y: y - 28 - (li * 13), size: 10.5, font: helv, color: black })
        })
        y -= ckHeight + 8
      }

      if (Array.isArray(item.activities) && item.activities.length > 0) {
        tag('Activities')
        item.activities.forEach((act, ai) => {
          drawWrapped(`${ai + 1}. ${safe(act)}`, { size: 10.5, indent: 6 })
        })
        y -= 4
      }

      if (Array.isArray(item.involves) && item.involves.length > 0) {
        tag("Who's involved")
        drawWrapped(item.involves.join(', '), { size: 10.5, color: grey })
        y -= 2
      }

      if (item.notes) {
        tag('UK best practice')
        drawWrapped(safe(item.notes), { size: 10, color: grey })
      }

      y -= 12
    })

    // ── FOOTER ON EVERY PAGE ──
    const companyName = profile?.company_name || ''
    pdf.getPages().forEach((pg, idx) => {
      pg.drawRectangle({ x: 0, y: 0, width: W, height: 50, color: navy })
      pg.drawText(safe(companyName ? `Prepared by ${companyName} using PRODICTA` : 'Prepared using PRODICTA'), { x: ML, y: 30, size: 8.5, font: helv, color: rgb(0.78, 0.86, 0.84) })
      pg.drawText('PRODICTA', { x: ML, y: 14, size: 10, font: helvB, color: teal })
      pg.drawText('prodicta.co.uk', { x: W - MR - 80, y: 14, size: 9, font: helvB, color: teal })
      pg.drawText(`${idx + 1}`, { x: W - MR - 8, y: 30, size: 8, font: helv, color: rgb(0.78, 0.86, 0.84) })
    })

    const bytes = await pdf.save()
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    return new NextResponse(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Success-Plan-${safe(candidate.name || 'Candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Success plan PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
