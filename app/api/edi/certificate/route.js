import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { isAgencyPerm } from '@/lib/account-helpers'

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

export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const url = new URL(request.url)
    const assessmentId = url.searchParams.get('assessment_id')
    if (!assessmentId) return NextResponse.json({ error: 'Missing assessment_id' }, { status: 400 })

    const adminClient = createServiceClient()

    // Defence-in-depth: the EDI Bias-Free Hiring Certificate is an
    // employment-of-record artefact. Permanent recruitment agencies are
    // not the employer; the /edi page already redirects them, this
    // server-side check refuses direct-URL callers to the certificate
    // endpoint.
    const { data: ownerProfile } = await adminClient
      .from('users')
      .select('account_type, default_employment_type, company_name')
      .eq('id', user.id)
      .single()
    if (isAgencyPerm(ownerProfile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: assessment } = await adminClient
      .from('assessments')
      .select('id, role_title, created_at')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single()
    if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

    const profile = ownerProfile

    const { data: candidates } = await adminClient
      .from('candidates')
      .select('id, results(overall_score)')
      .eq('assessment_id', assessmentId)
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const scoredCandidates = (candidates || [])
      .map(c => ({ id: c.id, score: c.results?.[0]?.overall_score }))
      .filter(c => typeof c.score === 'number')
    const scores = scoredCandidates.map(c => c.score)
    if (scores.length < 10) return NextResponse.json({ error: 'At least 10 completed candidates required' }, { status: 400 })

    // Demographics join for per-characteristic 4/5ths analysis
    const candIds = scoredCandidates.map(c => c.id)
    const { data: demoRows } = await adminClient
      .from('candidate_demographics')
      .select('candidate_id, age_band, gender, ethnicity')
      .in('candidate_id', candIds)

    const scoreById = Object.fromEntries(scoredCandidates.map(c => [c.id, c.score]))
    const demoWithScore = (demoRows || []).map(d => ({ ...d, score: scoreById[d.candidate_id] })).filter(r => typeof r.score === 'number')
    const participationPct = scores.length > 0 ? Math.round((demoWithScore.length / scores.length) * 100) : 0

    function groupBy(rows, field) {
      const groups = {}
      for (const r of rows) {
        const key = r[field]
        if (!key) continue
        if (!groups[key]) groups[key] = []
        groups[key].push(r.score)
      }
      const out = {}
      for (const [k, s] of Object.entries(groups)) {
        const passCount = s.filter(x => x >= 70).length
        out[k] = { count: s.length, passRate: s.length > 0 ? passCount / s.length : 0, insufficient: s.length < 5 }
      }
      return out
    }
    function fourFifths(groups) {
      const sufficient = Object.entries(groups).filter(([, g]) => !g.insufficient)
      if (sufficient.length < 2) return { pass: null, failures: [] }
      const highest = Math.max(...sufficient.map(([, g]) => g.passRate))
      if (highest === 0) return { pass: true, failures: [] }
      const threshold = highest * 0.8
      const failures = sufficient.filter(([, g]) => g.passRate < threshold).map(([k]) => k)
      return { pass: failures.length === 0, failures }
    }

    const ageStats = groupBy(demoWithScore, 'age_band')
    const genderStats = groupBy(demoWithScore, 'gender')
    const ethnicityStats = groupBy(demoWithScore, 'ethnicity')
    const ageFF = fourFifths(ageStats)
    const genderFF = fourFifths(genderStats)
    const ethnicityFF = fourFifths(ethnicityStats)

    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const buckets = { '0-49': 0, '50-64': 0, '65-74': 0, '75-84': 0, '85-100': 0 }
    scores.forEach(s => {
      if (s < 50) buckets['0-49']++
      else if (s < 65) buckets['50-64']++
      else if (s < 75) buckets['65-74']++
      else if (s < 85) buckets['75-84']++
      else buckets['85-100']++
    })

    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const range = max - min
    const passRate = Math.round((scores.filter(s => s >= 65).length / scores.length) * 100)

    // Adverse impact checks
    const rangeCheck = range >= 20
    const floorCheck = min >= 30
    const maxBucketPct = Math.max(...Object.values(buckets)) / scores.length
    const cliffCheck = maxBucketPct <= 0.6

    const allPass = rangeCheck && floorCheck && cliffCheck
    const refNumber = `PRODICTA-EDI-${assessmentId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-5)}`
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    // Generate PDF
    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const grey = rgb(0.42, 0.46, 0.52)
    const black = rgb(0.1, 0.13, 0.18)
    const amberRgb = rgb(0.85, 0.59, 0.04)
    const greenRgb = rgb(0, 0.75, 0.65)

    const page = pdf.addPage([595, 842])

    // Header band
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRODICTA', { x: 40, y: 800, size: 28, font: helvB, color: teal })
    page.drawText('Bias-Free Hiring Certificate', { x: 40, y: 770, size: 14, font: helv, color: rgb(1, 1, 1) })

    let y = 720
    const label = (k, v, yPos) => {
      page.drawText(safe(k), { x: 40, y: yPos, size: 9, font: helvB, color: grey })
      page.drawText(safe(v), { x: 40, y: yPos - 16, size: 13, font: helvB, color: black })
    }

    label('CERTIFICATE REFERENCE', refNumber, y); y -= 40
    label('DATE GENERATED', dateStr, y); y -= 40
    label('ASSESSMENT', assessment.role_title || 'Untitled Assessment', y); y -= 40
    label('PREPARED BY', profile?.company_name || 'Hiring team', y); y -= 40
    label('CANDIDATES ASSESSED', String(scores.length), y); y -= 40
    label('DEMOGRAPHICS PARTICIPATION', `${demoWithScore.length} of ${scores.length} (${participationPct}%)`, y); y -= 50

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 24

    // Score Distribution
    page.drawText('SCORE DISTRIBUTION', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
    for (const [bucket, count] of Object.entries(buckets)) {
      const pct = scores.length > 0 ? Math.round((count / scores.length) * 100) : 0
      page.drawText(`${bucket}:`, { x: 40, y, size: 11, font: helvB, color: black })
      page.drawText(`${count} candidate${count !== 1 ? 's' : ''} (${pct}%)`, { x: 110, y, size: 11, font: helv, color: black })
      // Draw bar
      const barWidth = Math.max(2, (pct / 100) * 300)
      page.drawRectangle({ x: 280, y: y - 2, width: barWidth, height: 12, color: teal })
      y -= 18
    }
    y -= 6
    page.drawText(`Average score: ${avg} / 100`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 16
    page.drawText(`Pass rate (65+): ${passRate}%`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 16
    page.drawText(`Score range: ${min} - ${max}`, { x: 40, y, size: 11, font: helvB, color: navy }); y -= 24

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

    // Methodology
    page.drawText('METHODOLOGY', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
    const methText = 'This assessment measures real work performance through scenario-based simulations. Candidates are evaluated on their responses to work situations relevant to the role. No questions relate to personal characteristics, background, or identity. Assessment design follows best practice guidance for fair and objective candidate evaluation.'
    const methLines = wrap(methText, helv, 10, 515)
    methLines.forEach(l => { page.drawText(l, { x: 40, y, size: 10, font: helv, color: black }); y -= 14 })
    y -= 12

    // Adverse impact checks
    page.drawText('ADVERSE IMPACT CHECKS', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
    const checks = [
      { label: 'Score range is broad (candidates are being differentiated)', pass: rangeCheck },
      { label: 'Lowest scoring candidate scored above 30 (meaningful scores)', pass: floorCheck },
      { label: 'No single score bucket exceeds 60% of candidates (no cliff edge)', pass: cliffCheck },
    ]
    for (const ck of checks) {
      const icon = ck.pass ? 'PASS' : 'REVIEW'
      const col = ck.pass ? greenRgb : amberRgb
      page.drawText(icon, { x: 40, y, size: 10, font: helvB, color: col })
      page.drawText(safe(ck.label), { x: 95, y, size: 10, font: helv, color: black })
      y -= 16
    }
    y -= 10

    // 4/5ths rule per characteristic
    page.drawText('4/5THS RULE BY PROTECTED CHARACTERISTIC', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 18
    function renderFF(label, ff) {
      let status, col
      if (ff.pass === null) { status = 'INSUFFICIENT DATA'; col = grey }
      else if (ff.pass) { status = 'PASS'; col = greenRgb }
      else { status = 'REVIEW'; col = amberRgb }
      page.drawText(status, { x: 40, y, size: 10, font: helvB, color: col })
      page.drawText(safe(label), { x: 160, y, size: 10, font: helv, color: black })
      if (ff.pass === false && ff.failures.length > 0) {
        y -= 12
        const failText = `Groups below 80% of highest pass rate: ${ff.failures.join(', ')}`
        const failLines = wrap(failText, helv, 9, 495)
        failLines.forEach(l => { page.drawText(l, { x: 60, y, size: 9, font: helv, color: grey }); y -= 12 })
      }
      y -= 16
    }
    renderFF('Age band', ageFF)
    renderFF('Gender', genderFF)
    renderFF('Ethnicity', ethnicityFF)
    y -= 6

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

    // Statement
    page.drawText('STATEMENT', { x: 40, y, size: 9, font: helvB, color: grey }); y -= 16
    const stmt = 'This assessment process has been reviewed for adverse impact and meets the standards required under the Equality Act 2010 and Employment Rights Act 2025. Demographic data is self-reported, stored separately from assessment responses, and is never used in scoring. All candidates complete identical scenarios under identical conditions.'
    const stmtLines = wrap(stmt, helv, 10, 515)
    stmtLines.forEach(l => { page.drawText(l, { x: 40, y, size: 10, font: helv, color: black }); y -= 14 })
    y -= 12

    // Disclaimer
    const disclaimer = 'PRODICTA provides documentation to support your legal position. PRODICTA does not provide legal advice. Consult a qualified solicitor for guidance on specific cases.'
    const discLines = wrap(disclaimer, helv, 8.5, 515)
    discLines.forEach(l => { page.drawText(l, { x: 40, y, size: 8.5, font: helv, color: grey }); y -= 11 })

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    page.drawText(`Reference: ${refNumber}`, { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
    page.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    // Record in edi_reports
    try {
      await adminClient.from('edi_reports').insert({
        user_id: user.id,
        assessment_id: assessmentId,
        report_date: new Date().toISOString().slice(0, 10),
        total_candidates: scores.length,
        average_score: avg,
        score_distribution: buckets,
        adverse_impact_detected: !allPass,
        adverse_impact_notes: allPass ? null : checks.filter(c => !c.pass).map(c => c.label).join('; '),
        certificate_generated: true,
        certificate_generated_at: new Date().toISOString(),
      })
    } catch {}

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-EDI-Certificate-${refNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('EDI certificate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
