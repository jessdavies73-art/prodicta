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

    const [{ data: result }, { data: outcome }, { data: copilot }] = await Promise.all([
      adminClient.from('results').select('overall_score, risk_level, watchouts, reality_timeline').eq('candidate_id', candidate.id).maybeSingle(),
      adminClient.from('candidate_outcomes').select('placement_date, probation_months, outcome').eq('candidate_id', candidate.id).eq('user_id', user.id).maybeSingle(),
      adminClient.from('probation_copilot').select('*').eq('candidate_id', candidate.id).eq('user_id', user.id).maybeSingle(),
    ])

    const watchoutStatuses = copilot?.watchout_statuses || {}
    const predResponses = copilot?.prediction_responses || {}
    const notes = copilot?.manager_notes || {}
    const status = copilot?.overall_status || 'On Track'

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

    const statusColor = status === 'Critical' ? red : status === 'At Risk' ? amber : green

    let page = pdf.addPage([595, 842])
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRODICTA', { x: 40, y: 800, size: 26, font: helvB, color: teal })
    page.drawText('Probation Co-pilot Report', { x: 40, y: 770, size: 13, font: helv, color: rgb(1, 1, 1) })

    let y = 720
    const drawLabel = (k, v) => {
      page.drawText(safe(k), { x: 40, y, size: 9, font: helvB, color: grey })
      page.drawText(safe(v), { x: 40, y: y - 16, size: 13, font: helvB, color: black })
      y -= 38
    }
    drawLabel('CANDIDATE', candidate.name)
    drawLabel('ROLE', candidate.assessments?.role_title || '')
    if (outcome?.placement_date) drawLabel('PLACEMENT DATE', new Date(outcome.placement_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
    drawLabel('OVERALL STATUS', status)

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

    // Predictions
    const realityTimeline = result?.reality_timeline || {}
    const predLabels = { week1: 'Week 1', month1: 'Month 1', month3: 'Month 3' }
    const predEntries = Object.entries(realityTimeline).filter(([, v]) => v)
    if (predEntries.length > 0) {
      page.drawText('PREDICTIONS', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
      for (const [k, text] of predEntries) {
        if (y < 100) { page = pdf.addPage([595, 842]); y = 790 }
        const resp = predResponses[k] || 'not_yet'
        page.drawText(`${predLabels[k] || k}: ${resp.toUpperCase()}`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 14
        const lines = wrap(text, helv, 10, 515)
        lines.forEach(l => { page.drawText(l, { x: 40, y, size: 10, font: helv, color: black }); y -= 13 })
        y -= 6
      }
      y -= 6
    }

    // Watch-outs
    const watchouts = Array.isArray(result?.watchouts) ? result.watchouts : []
    if (watchouts.length > 0) {
      if (y < 100) { page = pdf.addPage([595, 842]); y = 790 }
      page.drawText('WATCH-OUTS', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
      watchouts.forEach((w, i) => {
        if (y < 100) { page = pdf.addPage([595, 842]); y = 790 }
        const text = typeof w === 'object' ? (w.text || w.title || '') : w
        const s = watchoutStatuses[i] || 'green'
        const c = s === 'red' ? red : s === 'amber' ? amber : green
        page.drawText(s.toUpperCase(), { x: 40, y, size: 9, font: helvB, color: c })
        page.drawText(`#${i + 1}`, { x: 90, y, size: 9, font: helvB, color: grey })
        y -= 14
        const lines = wrap(text, helv, 10.5, 515)
        lines.forEach(l => { page.drawText(l, { x: 40, y, size: 10.5, font: helv, color: black }); y -= 13 })
        y -= 8
      })
      y -= 6
    }

    // Manager notes
    const phaseLabels = { week1: 'Week 1', month1: 'Month 1', month3: 'Month 3' }
    const filledNotes = Object.entries(notes).filter(([, v]) => v && String(v).trim())
    if (filledNotes.length > 0) {
      if (y < 120) { page = pdf.addPage([595, 842]); y = 790 }
      page.drawText('MANAGER NOTES', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
      for (const [k, v] of filledNotes) {
        if (y < 80) { page = pdf.addPage([595, 842]); y = 790 }
        page.drawText(phaseLabels[k] || k, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 14
        const lines = wrap(v, helv, 10.5, 515)
        lines.forEach(l => { page.drawText(l, { x: 40, y, size: 10.5, font: helv, color: black }); y -= 13 })
        y -= 8
      }
    }

    page.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    page.drawText('PRODICTA Probation Co-pilot Report', { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
    page.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Probation-${candidate.name.replace(/[^a-z0-9]+/gi, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Probation export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
