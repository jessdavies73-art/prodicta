import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

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
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('id, name, email, status, user_id, completed_at, assessments(role_title, users(company_name, account_type, company_logo_url))')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: owner } = await adminClient
      .from('users')
      .select('candidate_feedback_enabled')
      .eq('id', candidate.user_id)
      .maybeSingle()
    if (owner?.candidate_feedback_enabled !== true) {
      return NextResponse.json({ error: 'feedback_disabled' }, { status: 403 })
    }

    if (candidate.status !== 'completed') {
      return NextResponse.json({ error: 'not_ready' }, { status: 425 })
    }

    const { data: result } = await adminClient
      .from('results')
      .select('strengths, scores')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (!result) {
      return NextResponse.json({ error: 'not_ready' }, { status: 425 })
    }

    // Prepare data
    const strengthsRaw = Array.isArray(result.strengths) ? result.strengths : []
    const strengths = strengthsRaw
      .map(s => {
        if (typeof s === 'string') return { text: s, detail: '', evidence: '' }
        return {
          text: s?.text || s?.strength || s?.title || '',
          detail: s?.detail || s?.explanation || '',
          evidence: s?.evidence || '',
        }
      })
      .filter(s => s.text)
      .slice(0, 3)

    const scoresObj = result.scores && typeof result.scores === 'object' ? result.scores : {}
    const scoreEntries = Object.entries(scoresObj)
      .filter(([k, v]) => typeof v === 'number' && !k.startsWith('pf_'))
      .sort((a, b) => a[1] - b[1])
    const lowestSkills = scoreEntries.slice(0, 2).map(([skill]) => skill)

    // Generate development plan
    let development_plan = []
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const strengthsText = strengths.map(s => `${s.text}: ${s.detail || s.evidence || ''}`).join('\n')
      const prompt = `You are a career development coach. A candidate completed an assessment for a "${candidate.assessments?.role_title || 'professional'}" role. Their two lowest-scored areas are: ${lowestSkills.join(', ')}. Their strengths: ${strengthsText}. For each development area, give a positive title, specific advice, and 2 actions. UK English, no emoji, no em dashes. JSON: {"development_areas": [{"area": "string", "advice": "string", "actions": ["string"]}]}`

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        development_plan = (parsed.development_areas || []).slice(0, 2)
      }
    } catch (aiErr) {
      console.error('PDF Claude error:', aiErr)
      development_plan = lowestSkills.map(skill => ({
        area: `Building your ${skill.toLowerCase()} skills`,
        advice: `To strengthen your ${skill.toLowerCase()}, try setting aside 15 minutes each day to practise this skill deliberately.`,
        actions: [`Identify one specific situation this week where you can apply ${skill.toLowerCase()} more intentionally.`],
      }))
    }

    // Benchmarks
    let benchmarks = []
    const roleTitle = candidate.assessments?.role_title
    if (roleTitle) {
      try {
        const { data: roleResults } = await adminClient
          .from('results')
          .select('scores, candidate_id, candidates!inner(assessments!inner(role_title))')
          .ilike('candidates.assessments.role_title', roleTitle)

        if (roleResults && roleResults.length >= 10) {
          const topSkills = scoreEntries.slice(-3).reverse().map(([skill]) => skill)
          for (const skill of topSkills) {
            const candidateScore = scoresObj[skill]
            if (typeof candidateScore !== 'number') continue
            const allScores = roleResults.map(r => r.scores?.[skill]).filter(s => typeof s === 'number').sort((a, b) => a - b)
            if (allScores.length < 10) continue
            const belowCount = allScores.filter(s => s < candidateScore).length
            const percentile = Math.round((belowCount / allScores.length) * 100)
            benchmarks.push({ skill, percentile })
          }
        }
      } catch {}
    }

    // Build PDF
    const accountType = candidate.assessments?.users?.account_type || 'employer'
    const companyName = candidate.assessments?.users?.company_name || ''
    const assessmentDate = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const pdf = await PDFDocument.create()
    const helv = await pdf.embedFont(StandardFonts.Helvetica)
    const helvB = await pdf.embedFont(StandardFonts.HelveticaBold)
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const grey = rgb(0.42, 0.46, 0.52)
    const black = rgb(0.1, 0.13, 0.18)
    const white = rgb(1, 1, 1)

    let page = pdf.addPage([595, 842])
    let y = 842

    // Header
    page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: navy })
    page.drawText('PRODICTA', { x: 40, y: 800, size: 28, font: helvB, color: teal })
    if (accountType === 'agency' && companyName) {
      page.drawText(safe(`Provided by ${companyName} in partnership with PRODICTA`), { x: 40, y: 770, size: 10, font: helv, color: white })
    } else {
      page.drawText('Candidate Development Report', { x: 40, y: 770, size: 14, font: helv, color: white })
    }

    y = 720
    // Candidate info
    page.drawText(safe(candidate.name || ''), { x: 40, y, size: 16, font: helvB, color: black })
    y -= 18
    page.drawText(safe(`${candidate.assessments?.role_title || 'Role'} - ${assessmentDate}`), { x: 40, y, size: 11, font: helv, color: grey })
    y -= 28

    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

    // Helper to add new page if needed
    function checkPage(needed) {
      if (y - needed < 60) {
        page = pdf.addPage([595, 842])
        y = 800
      }
    }

    // Strengths
    page.drawText('WHAT YOU DID WELL', { x: 40, y, size: 10, font: helvB, color: teal })
    y -= 18
    for (const s of strengths) {
      checkPage(50)
      const titleLines = wrap(s.text, helvB, 11, 490)
      titleLines.forEach(l => { page.drawText(l, { x: 50, y, size: 11, font: helvB, color: black }); y -= 14 })
      if (s.detail) {
        const detailLines = wrap(s.detail, helv, 10, 490)
        detailLines.forEach(l => { page.drawText(l, { x: 50, y, size: 10, font: helv, color: grey }); y -= 13 })
      }
      if (s.evidence) {
        const evLines = wrap(`Evidence: ${s.evidence}`, helv, 9, 490)
        evLines.forEach(l => { page.drawText(l, { x: 50, y, size: 9, font: helv, color: grey }); y -= 12 })
      }
      y -= 6
    }
    y -= 10

    // Development plan
    checkPage(40)
    page.drawText('PERSONAL DEVELOPMENT PLAN', { x: 40, y, size: 10, font: helvB, color: teal })
    y -= 18
    for (const d of development_plan) {
      checkPage(60)
      const areaLines = wrap(d.area, helvB, 11, 490)
      areaLines.forEach(l => { page.drawText(l, { x: 50, y, size: 11, font: helvB, color: black }); y -= 14 })
      const adviceLines = wrap(d.advice, helv, 10, 490)
      adviceLines.forEach(l => { page.drawText(l, { x: 50, y, size: 10, font: helv, color: grey }); y -= 13 })
      y -= 4
      if (d.actions) {
        for (const action of d.actions) {
          checkPage(20)
          const actionLines = wrap(`- ${action}`, helv, 9.5, 480)
          actionLines.forEach(l => { page.drawText(l, { x: 58, y, size: 9.5, font: helv, color: black }); y -= 12 })
        }
      }
      y -= 8
    }

    // Benchmarks
    if (benchmarks.length > 0) {
      checkPage(40)
      y -= 6
      page.drawText('YOUR BENCHMARK', { x: 40, y, size: 10, font: helvB, color: teal })
      y -= 18
      for (const b of benchmarks) {
        checkPage(16)
        page.drawText(safe(`${b.skill}: Top ${100 - b.percentile}%`), { x: 50, y, size: 10.5, font: helvB, color: black })
        y -= 16
      }
    }

    // Footer
    const lastPage = pdf.getPages()[pdf.getPageCount() - 1]
    lastPage.drawRectangle({ x: 0, y: 0, width: 595, height: 36, color: navy })
    lastPage.drawText('Provided by PRODICTA', { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
    lastPage.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Development-Report-${safe(candidate.name || 'Candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Feedback PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
