import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

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

    // Verify requesting user is an employer
    const { data: profile } = await adminClient
      .from('users')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'employer') {
      return NextResponse.json({ error: 'Employer accounts only' }, { status: 403 })
    }

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, name, email, user_id, completed_at, assessments(role_title)')
      .eq('id', params.id)
      .single()

    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: ownerProfile } = await adminClient
      .from('users')
      .select('company_name, account_type')
      .eq('id', candidate.user_id)
      .single()

    const { data: result } = await adminClient
      .from('results')
      .select('strengths, scores')
      .eq('candidate_id', candidate.id)
      .maybeSingle()

    if (!result) {
      return NextResponse.json({ error: 'No results available' }, { status: 404 })
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
    const lowestSkills = scoreEntries.slice(0, 3).map(([skill]) => skill)

    // Generate development plan
    let development_plan = []
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const strengthsText = strengths.map(s => `${s.text}: ${s.detail || s.evidence || ''}`).join('\n')
      const prompt = `Career development coach. Candidate assessment for "${candidate.assessments?.role_title || 'professional'}" role. Development areas: ${lowestSkills.join(', ')}. Strengths: ${strengthsText}. For each of 3 development areas: positive title, advice, and 2 concrete actions the candidate can take independently. UK English, no emoji, no em dashes. JSON: {"development_areas": [{"area":"string","advice":"string","actions":["string"]}]}`

      const msg = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }).finalMessage()
      const text = msg.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        development_plan = (JSON.parse(jsonMatch[0]).development_areas || []).slice(0, 3)
      }
    } catch (aiErr) {
      console.error('Dev feedback PDF Claude error:', aiErr)
      development_plan = lowestSkills.map(skill => ({
        area: `Building your ${skill.toLowerCase()} skills`,
        advice: `To strengthen your ${skill.toLowerCase()}, try setting aside dedicated time to practise.`,
        actions: [`Find a mentor who excels at ${skill.toLowerCase()}.`],
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
            benchmarks.push({ skill, percentile: Math.round((belowCount / allScores.length) * 100) })
          }
        }
      } catch {}
    }

    // Build PDF
    const companyName = ownerProfile?.company_name || 'Employer'
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
    page.drawText(safe(`${companyName} - Candidate Development Report`), { x: 40, y: 770, size: 11, font: helv, color: white })

    y = 720
    page.drawText(safe(candidate.name || ''), { x: 40, y, size: 16, font: helvB, color: black })
    y -= 18
    page.drawText(safe(`${candidate.assessments?.role_title || 'Role'} - ${assessmentDate}`), { x: 40, y, size: 11, font: helv, color: grey })
    y -= 28
    page.drawRectangle({ x: 40, y, width: 515, height: 1, color: rgb(0.88, 0.9, 0.94) })
    y -= 22

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
    page.drawText('YOUR DEVELOPMENT PLAN', { x: 40, y, size: 10, font: helvB, color: teal })
    y -= 18
    for (const d of development_plan) {
      checkPage(70)
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
      y -= 10
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
    lastPage.drawText(safe(`Provided by ${companyName} in partnership with PRODICTA`), { x: 40, y: 13, size: 9, font: helv, color: rgb(0.85, 0.95, 0.95) })
    lastPage.drawText('prodicta.co.uk', { x: 460, y: 13, size: 9, font: helvB, color: teal })

    const bytes = await pdf.save()
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PRODICTA-Development-Feedback-${safe(candidate.name || 'Candidate').replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    console.error('Development feedback PDF error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
