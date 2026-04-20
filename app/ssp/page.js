'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import Sidebar from '../../components/Sidebar'
import { Ic } from '../../components/Icons'
import InfoTooltip from '../../components/InfoTooltip'
import { createClient } from '../../lib/supabase'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, F, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, GRN, GRNBG, GRNBD, cs, bs, ps } from '../../lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

export default function SSPPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [workerName, setWorkerName] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [assignmentStatus, setAssignmentStatus] = useState('')
  const [sickDate, setSickDate] = useState('')
  const [priorToApril2026, setPriorToApril2026] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [focusedField, setFocusedField] = useState(null)
  const [sspRecordId, setSspRecordId] = useState(null)

  // Candidate search (pre-fills worker name)
  const [workerSearch, setWorkerSearch] = useState('')
  const [workerSuggestions, setWorkerSuggestions] = useState([])

  // Calculator state (step 2)
  const [showCalculator, setShowCalculator] = useState(false)
  const [awe, setAwe] = useState('')
  const [qualifyingDays, setQualifyingDays] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState(null)
  const [copied, setCopied] = useState(false)

  // Guidance panel state (step 3)
  const [showGuidance, setShowGuidance] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Documentation state (step 5)
  const [complianceGenerated, setComplianceGenerated] = useState(false)
  const [returnDate, setReturnDate] = useState('')
  const [generatingDocs, setGeneratingDocs] = useState(false)
  const [docsGenerated, setDocsGenerated] = useState(false)
  const [guidanceSteps, setGuidanceSteps] = useState({
    entitlement: { done: false, at: null },
    evidence: { done: false, at: null },
    payroll: { done: false, at: null },
    review: { done: false, at: null },
    communication: { done: false, at: null },
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (workerSearch.trim().length < 2) { setWorkerSuggestions([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('candidates')
        .select('name, email')
        .ilike('name', `%${workerSearch}%`)
        .limit(5)
      if (!cancelled) setWorkerSuggestions(data || [])
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [workerSearch])

  async function generateCompliancePack() {
    setGeneratingPdf(true)
    try {
      const pdf = await PDFDocument.create()
      const helvetica = await pdf.embedFont(StandardFonts.Helvetica)
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

      const navy = rgb(0.06, 0.13, 0.22)
      const teal = rgb(0, 0.75, 0.65)
      const grey = rgb(0.37, 0.42, 0.50)
      const black = rgb(0.06, 0.09, 0.16)
      const white = rgb(1, 1, 1)
      const lightGrey = rgb(0.95, 0.96, 0.97)

      const PAGE_W = 595
      const PAGE_H = 842
      const ML = 48
      const MR = 48
      const TEXT_W = PAGE_W - ML - MR

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

      let page = pdf.addPage([PAGE_W, PAGE_H])
      let y = PAGE_H - 48

      function checkPage(needed) {
        if (y - needed < 60) {
          // Add footer to current page before creating new one
          page.drawText('Generated by PRODICTA | prodicta.co.uk', { x: ML, y: 30, size: 7, font: helvetica, color: grey })
          page = pdf.addPage([PAGE_W, PAGE_H])
          y = PAGE_H - 48
        }
      }

      function drawKV(label, value, indent) {
        const ix = indent || 0
        checkPage(18)
        page.drawText(safe(label), { x: ML + ix, y, size: 9, font: bold, color: navy })
        const labelW = bold.widthOfTextAtSize(safe(label), 9)
        page.drawText(safe(value), { x: ML + ix + labelW + 6, y, size: 9, font: helvetica, color: black })
        y -= 16
      }

      function drawParagraph(text, size, font, color, indent) {
        const ix = indent || 0
        const lines = wrap(text, font, size, TEXT_W - ix)
        for (const line of lines) {
          checkPage(14)
          page.drawText(line, { x: ML + ix, y, size, font, color })
          y -= size + 4
        }
      }

      function drawSectionHeading(num, title) {
        checkPage(36)
        y -= 6
        page.drawRectangle({ x: ML, y: y - 4, width: TEXT_W, height: 22, color: navy })
        page.drawText(`${num}. ${safe(title)}`, { x: ML + 10, y: y + 2, size: 10, font: bold, color: white })
        y -= 30
      }

      function drawRule() {
        checkPage(12)
        page.drawRectangle({ x: ML, y, width: TEXT_W, height: 0.5, color: lightGrey })
        y -= 10
      }

      function fmtDate(d) {
        if (!d) return 'N/A'
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      }

      function fmtTimestamp(iso) {
        if (!iso) return 'Not completed'
        const d = new Date(iso)
        return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      }

      // ── Header ──
      page.drawRectangle({ x: 0, y: PAGE_H - 70, width: PAGE_W, height: 70, color: navy })
      page.drawText('PRO', { x: ML, y: PAGE_H - 48, size: 22, font: bold, color: white })
      const proW = bold.widthOfTextAtSize('PRO', 22)
      page.drawText('DICTA', { x: ML + proW, y: PAGE_H - 48, size: 22, font: bold, color: teal })
      y = PAGE_H - 100

      // Title
      page.drawText('Fair Work Agency Compliance Pack', { x: ML, y, size: 16, font: bold, color: navy })
      y -= 20
      page.drawText(`Date generated: ${fmtDate(new Date().toISOString())}`, { x: ML, y, size: 9, font: helvetica, color: grey })
      y -= 24

      // Disclaimer
      page.drawRectangle({ x: ML, y: y - 40, width: TEXT_W, height: 52, color: lightGrey })
      page.drawRectangle({ x: ML, y: y - 40, width: 3, height: 52, color: teal })
      y -= 4
      drawParagraph(
        'This document records the SSP management process followed. It does not constitute legal or payroll advice. Always seek independent professional advice for specific employment situations.',
        8, helvetica, grey, 10
      )
      y -= 8

      // ── Section 1: Worker Details ──
      drawSectionHeading('1', 'Worker Details')
      drawKV('Name: ', workerName)
      drawKV('Employment type: ', employmentType === 'permanent' ? 'Permanent Employee' : 'Temporary Worker')
      if (employmentType === 'temporary') {
        drawKV('Assignment status: ', assignmentStatus === 'active' ? 'Active Assignment' : 'Between Assignments')
      }
      drawKV('Sick date: ', fmtDate(sickDate))
      y -= 4

      // ── Section 2: Eligibility Determination ──
      drawSectionHeading('2', 'Eligibility Determination')
      drawKV('Result: ', result?.status || 'N/A')

      let ruleDesc = 'N/A'
 if (result?.badgeType === 'jade') ruleDesc = 'New 2026 rules, SSP from day one, no earnings threshold'
 else if (result?.badgeType === 'amber') ruleDesc = 'Pre-April 2026 rules, three-day waiting period, Lower Earnings Limit applies'
 else if (result?.badgeType === 'red') ruleDesc = 'Not eligible, worker between assignments'
      drawKV('Rule applied: ', ruleDesc)

      if (result?.eligible) {
        const sickDateObj = new Date(sickDate + 'T00:00:00')
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const daysSinceSick = Math.max(1, Math.floor((today - sickDateObj) / (1000 * 60 * 60 * 24)) + 1)
        drawKV('Evidence required: ', daysSinceSick > 7 ? 'Fit note from GP or healthcare professional' : 'Self-certification')
      }
      y -= 4

      // ── Section 3: SSP Calculation ──
      drawSectionHeading('3', 'SSP Calculation')
      if (calcResult) {
        drawKV('Average Weekly Earnings (AWE): ', `\u00A3${calcResult.aweVal.toFixed(2)}`)
        drawKV('80% of AWE: ', `\u00A3${calcResult.eightyPercent.toFixed(2)}`)
        drawKV('Statutory weekly rate: ', `\u00A3${calcResult.statutoryRate.toFixed(2)}`)
        drawKV('Weekly SSP (lower of the two): ', `\u00A3${calcResult.weeklySSP.toFixed(2)}`)
        drawKV('Daily SSP rate: ', `\u00A3${calcResult.dailySSP.toFixed(2)}`)
        drawKV('Qualifying days this week: ', `${calcResult.daysVal}`)
        drawKV('Rate applied: ', calcResult.earningsLinked
          ? 'Earnings-linked rate (80% of AWE)'
          : 'Standard statutory rate (\u00A3123.25 per week)')
      } else {
        drawParagraph('SSP calculation was not completed.', 9, helvetica, grey)
      }
      y -= 4

      // ── Section 4: Management Steps ──
      drawSectionHeading('4', 'Management Steps')

      const stepLabels = [
        { key: 'entitlement', label: 'Confirm Entitlement' },
        { key: 'evidence', label: 'Request Evidence' },
        { key: 'payroll', label: 'Action Payroll' },
        { key: 'review', label: 'Adjust Review' },
        { key: 'communication', label: 'Communicate with Worker' },
      ]

      stepLabels.forEach((step, i) => {
        const s = guidanceSteps[step.key]
 const status = s.done ? `Completed, ${fmtTimestamp(s.at)}` : 'Not completed'
        const statusColor = s.done ? teal : grey
        checkPage(20)
 page.drawText(`Step ${i + 1}, ${safe(step.label)}`, { x: ML, y, size: 9, font: bold, color: navy })
        y -= 14
        page.drawText(safe(status), { x: ML + 12, y, size: 8.5, font: helvetica, color: statusColor })
        y -= 16
      })
      y -= 4

      // ── Section 5: Compliance Statement ──
      drawSectionHeading('5', 'Compliance Statement')
      drawParagraph(
        'This absence was managed in accordance with Statutory Sick Pay regulations effective 6 April 2026 and the Employment Rights Act 2025. Records are retained for HMRC compliance purposes.',
        9, helvetica, black
      )
      y -= 12

      // ── Section 6: Assessment Fairness Statement ──
      drawSectionHeading('6', 'Assessment Fairness Statement')
      drawParagraph(
        `This candidate was assessed using PRODICTA, an objective AI-driven work simulation. The assessment scores responses against role-specific skill criteria and was designed to meet the standards set out in the Employment Rights Act 2025 and the Equality Act 2010. No demographic data (age, gender, ethnicity, disability, or other protected characteristic) is collected or used in scoring. All candidates for a given role receive the same scenarios, the same time allocations, and the same scoring rubric.`,
        9, helvetica, black
      )
      y -= 6
      drawKV('Assessment date: ', fmtDate(new Date().toISOString()))
      drawKV('Confirmed by: ', '________________________________')
      y -= 8

      // ── Section 7: AWR Notice ──
      drawSectionHeading('7', 'Agency Workers Regulations Notice')
      drawParagraph(
        `Under the Agency Workers Regulations 2010, this worker is entitled after 12 calendar weeks in the same role with the same hirer to equal treatment on basic working and employment conditions. Basic conditions include pay, duration of working time, night work, rest periods, rest breaks, and annual leave. This notice confirms the worker has been informed of these rights in writing at the start of the assignment.`,
        9, helvetica, black
      )
      y -= 6
      drawKV('Assignment start date: ', '________________________________')
      drawKV('12-week qualifying date: ', '________________________________')
      drawKV('Notice issued by: ', '________________________________')
      drawKV('Date issued: ', fmtDate(new Date().toISOString()))
      y -= 8

      // ── Section 8: Pay Rate Disclosure ──
      drawSectionHeading('8', 'Pay Rate Disclosure')
      drawParagraph(
        `This confirms that the worker was informed in writing of their pay rate, pay frequency, and any applicable deductions before the start of the assignment, in line with the Conduct of Employment Agencies and Employment Businesses Regulations 2003 (as amended) and the Fair Work Agency compliance framework under ERA 2025.`,
        9, helvetica, black
      )
      y -= 6
      drawKV('Pay rate confirmed: ', '________________________________')
      drawKV('Pay frequency: ', '________________________________')
      drawKV('Disclosed in writing on: ', '________________________________')
      drawKV('Confirmed by: ', '________________________________')
      y -= 8

      // ── Section 9: Right to Work Confirmation ──
      drawSectionHeading('9', 'Right to Work Confirmation')
      drawParagraph(
        `This confirms that right-to-work checks were carried out before the worker commenced the assignment, in line with the Immigration, Asylum and Nationality Act 2006 and current Home Office guidance. Copies of the documentation examined have been retained for the statutory period.`,
        9, helvetica, black
      )
      y -= 6
      drawKV('Document type verified: ', '________________________________')
      drawKV('Date of check: ', '________________________________')
      drawKV('Checked by: ', '________________________________')
      drawKV('Retention period ends: ', '________________________________')
      y -= 12

      // ── Footer on all pages ──
      const footerText = `Generated by PRODICTA | prodicta.co.uk | ${fmtDate(new Date().toISOString())}`
      const pages = pdf.getPages()
      for (const p of pages) {
        p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 36, color: lightGrey })
        p.drawText(footerText, { x: ML, y: 14, size: 7, font: helvetica, color: grey })
      }

      // Save and download
      const bytes = await pdf.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FairWorkAgency-Compliance-${safe(workerName).replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Update ssp_records
      if (sspRecordId) {
        const supabase = createClient()
        const now = new Date().toISOString()
        await supabase.from('ssp_records').update({
          compliance_pack_generated: true,
          compliance_pack_generated_at: now,
          updated_at: now,
        }).eq('id', sspRecordId)
      }
      setComplianceGenerated(true)
    } catch (err) {
      console.error('PDF generation error:', err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ── PDF helper: creates a branded pdf-lib doc with shared utilities ──
  async function createBrandedPdf(title) {
    const pdf = await PDFDocument.create()
    const helvetica = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const navy = rgb(0.06, 0.13, 0.22)
    const teal = rgb(0, 0.75, 0.65)
    const grey = rgb(0.37, 0.42, 0.50)
    const black = rgb(0.06, 0.09, 0.16)
    const white = rgb(1, 1, 1)
    const lightGrey = rgb(0.95, 0.96, 0.97)
    const PW = 595, PH = 842, ML = 48, TW = 595 - 96
    function safe(t) { if (!t) return ''; return String(t).replace(/[\u2014\u2013]/g,', ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2026]/g,'...').replace(/[^\x00-\xFF]/g,'') }
    function wrap(t, f, s, w) { const words = safe(t).split(/\s+/); const lines = []; let l = ''; for (const wd of words) { const test = l ? `${l} ${wd}` : wd; if (f.widthOfTextAtSize(test, s) > w) { if (l) lines.push(l); l = wd } else l = test } if (l) lines.push(l); return lines }
    let page = pdf.addPage([PW, PH])
    let y = PH - 48
    function checkPage(n) { if (y - n < 60) { page.drawText('Generated by PRODICTA | prodicta.co.uk', { x: ML, y: 30, size: 7, font: helvetica, color: grey }); page = pdf.addPage([PW, PH]); y = PH - 48 } }
    function kv(label, value) { checkPage(18); page.drawText(safe(label), { x: ML, y, size: 9, font: bold, color: navy }); const lw = bold.widthOfTextAtSize(safe(label), 9); page.drawText(safe(value), { x: ML + lw + 6, y, size: 9, font: helvetica, color: black }); y -= 16 }
    function para(t, s, f, c) { const lines = wrap(t, f, s, TW); for (const ln of lines) { checkPage(14); page.drawText(ln, { x: ML, y, size: s, font: f, color: c }); y -= s + 4 } }
    function heading(num, t) { checkPage(36); y -= 6; page.drawRectangle({ x: ML, y: y - 4, width: TW, height: 22, color: navy }); page.drawText(`${num}. ${safe(t)}`, { x: ML + 10, y: y + 2, size: 10, font: bold, color: white }); y -= 30 }
    function fmtD(d) { if (!d) return 'N/A'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
    function fmtTs(iso) { if (!iso) return 'Not completed'; const d = new Date(iso); return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    // Draw header
    page.drawRectangle({ x: 0, y: PH - 70, width: PW, height: 70, color: navy })
    page.drawText('PRO', { x: ML, y: PH - 48, size: 22, font: bold, color: white })
    page.drawText('DICTA', { x: ML + bold.widthOfTextAtSize('PRO', 22), y: PH - 48, size: 22, font: bold, color: teal })
    y = PH - 100
    page.drawText(safe(title), { x: ML, y, size: 16, font: bold, color: navy }); y -= 20
    page.drawText(`Date generated: ${fmtD(new Date().toISOString())}`, { x: ML, y, size: 9, font: helvetica, color: grey }); y -= 24
    return { pdf, page: () => page, helvetica, bold, navy, teal, grey, black, white, lightGrey, PW, PH, ML, TW, safe, wrap, checkPage, kv, para, heading, fmtD, fmtTs, getY: () => y, setY: (v) => { y = v }, decY: (v) => { y -= v } }
  }

  async function addFooters(ctx) {
    const footerText = `Generated by PRODICTA | prodicta.co.uk | ${ctx.fmtD(new Date().toISOString())}`
    const pages = ctx.pdf.getPages()
    for (const p of pages) {
      p.drawRectangle({ x: 0, y: 0, width: ctx.PW, height: 36, color: ctx.lightGrey })
      p.drawText(footerText, { x: ctx.ML, y: 14, size: 7, font: ctx.helvetica, color: ctx.grey })
    }
  }

  function downloadPdfBytes(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function generateDocumentation() {
    if (!calcResult) return
    setGeneratingDocs(true)

    try {
      const sickDateObj = new Date(sickDate + 'T00:00:00')
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const daysSinceSick = Math.max(1, Math.floor((today - sickDateObj) / (1000 * 60 * 60 * 24)) + 1)
      const isOverSevenDays = daysSinceSick > 7
      const returnDateObj = returnDate ? new Date(returnDate + 'T00:00:00') : null
      const totalDaysAbsent = returnDateObj ? Math.max(1, Math.floor((returnDateObj - sickDateObj) / (1000 * 60 * 60 * 24))) : daysSinceSick
      const totalSSPPaid = Math.round(calcResult.dailySSP * totalDaysAbsent * 100) / 100
      const safeName = (workerName || 'worker').replace(/\s+/g, '-')
      const dateStr = new Date().toISOString().slice(0, 10)

      // ── 1. Absence Record ──
      const a = await createBrandedPdf('Absence Record')
      a.heading('1', 'Worker Details')
      a.kv('Name: ', workerName)
      a.kv('Employment type: ', employmentType === 'permanent' ? 'Permanent Employee' : 'Temporary Worker')
      if (employmentType === 'temporary') a.kv('Assignment status: ', assignmentStatus === 'active' ? 'Active Assignment' : 'Between Assignments')
      a.kv('Sick date: ', a.fmtD(sickDate))
      a.kv('Return to work date: ', returnDate ? a.fmtD(returnDate) : 'Not yet returned')
      a.kv('Total days absent: ', `${totalDaysAbsent}`)
      a.decY(4)
      a.heading('2', 'SSP Payment')
      a.kv('Total SSP paid: ', `\u00A3${totalSSPPaid.toFixed(2)}`)
      a.kv('Evidence received: ', isOverSevenDays ? 'Fit note' : 'Self-certification')
      a.decY(4)
      a.heading('3', 'Management Steps')
      const stepLabelsDoc = [
        { key: 'entitlement', label: 'Confirm Entitlement' },
        { key: 'evidence', label: 'Request Evidence' },
        { key: 'payroll', label: 'Action Payroll' },
        { key: 'review', label: 'Adjust Review' },
        { key: 'communication', label: 'Communicate with Worker' },
      ]
      stepLabelsDoc.forEach((step, i) => {
        const s = guidanceSteps[step.key]
        a.checkPage(20)
 a.page().drawText(`Step ${i + 1}, ${a.safe(step.label)}`, { x: a.ML, y: a.getY(), size: 9, font: a.bold, color: a.navy })
        a.setY(a.getY() - 14)
 const status = s.done ? `Completed, ${a.fmtTs(s.at)}` : 'Not completed'
        a.page().drawText(a.safe(status), { x: a.ML + 12, y: a.getY(), size: 8.5, font: a.helvetica, color: s.done ? a.teal : a.grey })
        a.setY(a.getY() - 16)
      })
      await addFooters(a)
      downloadPdfBytes(await a.pdf.save(), `Absence-Record-${safeName}-${dateStr}.pdf`)

      // ── 2. SSP Calculation Record ──
      const c = await createBrandedPdf('SSP Calculation Record')
      c.heading('1', 'Earnings Basis')
      c.kv('Average Weekly Earnings (AWE): ', `\u00A3${calcResult.aweVal.toFixed(2)}`)
      c.para('AWE is calculated as total earnings in the last 8 weeks divided by 8. Includes all regular pay. Excludes overtime, expenses, and one-off payments.', 8.5, c.helvetica, c.grey)
      c.decY(4)
      c.heading('2', 'Rate Determination')
      c.kv('80% of AWE: ', `\u00A3${calcResult.eightyPercent.toFixed(2)}`)
      c.kv('Statutory weekly rate: ', `\u00A3${calcResult.statutoryRate.toFixed(2)}`)
      c.kv('Rate applied: ', calcResult.earningsLinked ? 'Earnings-linked rate (80% of AWE is lower than the statutory rate)' : 'Standard statutory rate (the statutory rate is lower than 80% of AWE)')
      c.decY(4)
      c.heading('3', 'Payment Calculation')
      c.kv('Weekly SSP: ', `\u00A3${calcResult.weeklySSP.toFixed(2)}`)
      c.kv('Daily SSP rate: ', `\u00A3${calcResult.dailySSP.toFixed(2)}`)
      c.kv('Qualifying days this week: ', `${calcResult.daysVal}`)
      c.kv('Total days absent: ', `${totalDaysAbsent}`)
      c.kv('Total SSP for this absence: ', `\u00A3${totalSSPPaid.toFixed(2)}`)
      await addFooters(c)
      downloadPdfBytes(await c.pdf.save(), `SSP-Calculation-${safeName}-${dateStr}.pdf`)

 // ── 3. SSP1 Form, only if not eligible OR absence > 28 weeks ──
      const isNotEligible = result && !result.eligible
      const exceeds28Weeks = daysSinceSick > 196
      if (isNotEligible || exceeds28Weeks) {
 const s = await createBrandedPdf('SSP1, End of SSP Notification')
        const companyName = profile?.company_name || 'Employer'
        const reason = isNotEligible
          ? (result?.badgeType === 'red' ? 'the worker is between assignments and not currently classed as gainfully employed' : 'the absence began before 6 April 2026 and old SSP rules apply')
          : 'the maximum 28-week SSP entitlement period has been reached'
        s.heading('1', 'SSP1 Notice')
        s.kv('Worker name: ', workerName)
        s.kv('Employer/agency name: ', companyName)
        s.kv('Date SSP ended or reason it does not apply: ', isNotEligible ? 'SSP does not apply' : `SSP ended after 28 weeks from ${s.fmtD(sickDate)}`)
        s.decY(8)
        s.para(`Statutory Sick Pay cannot be paid from ${s.fmtD(sickDate)} because ${reason}.`, 10, s.bold, s.black)
        s.decY(4)
        s.para('You may be able to claim Employment and Support Allowance from the Department for Work and Pensions.', 9, s.helvetica, s.grey)
        s.decY(8)
        s.heading('2', 'Employer Declaration')
        s.kv('Employer/agency: ', companyName)
        s.kv('Date issued: ', s.fmtD(new Date().toISOString()))
        await addFooters(s)
        downloadPdfBytes(await s.pdf.save(), `SSP1-Form-${safeName}-${dateStr}.pdf`)
      }

      // Update ssp_records with return date
      if (sspRecordId) {
        const supabase = createClient()
        const now = new Date().toISOString()
        await supabase.from('ssp_records').update({
          return_date: returnDate || null,
          updated_at: now,
        }).eq('id', sspRecordId)
      }

      setDocsGenerated(true)
    } catch (err) {
      console.error('Documentation generation error:', err)
    } finally {
      setGeneratingDocs(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!workerName || !employmentType || !sickDate || !priorToApril2026) return
    if (employmentType === 'temporary' && !assignmentStatus) return

    setSubmitting(true)
    setResult(null)

    let eligible = false
    let ineligibleReason = ''
    let sicknessStartRule = ''
    let status = ''
    let message = ''
    let evidenceType = null
    let badgeType = ''

    const isBetweenAssignments = employmentType === 'temporary' && assignmentStatus === 'between_assignments'
    const isOldRules = priorToApril2026 === 'yes'

    if (isBetweenAssignments) {
      eligible = false
      ineligibleReason = 'Worker is between assignments and not currently classed as gainfully employed.'
      sicknessStartRule = isOldRules ? 'old_pre_april_2026' : 'new_2026'
      status = 'NOT ELIGIBLE'
      message = 'This worker is between assignments and is not currently classed as gainfully employed. SSP does not apply during periods between assignments.'
      badgeType = 'red'
    } else if (isOldRules) {
      eligible = false
      ineligibleReason = 'Sickness began before 6 April 2026. Old SSP rules apply.'
      sicknessStartRule = 'old_pre_april_2026'
      status = 'OLD RULES APPLY'
      message = 'This absence started before 6 April 2026. The previous SSP rules apply: a three-day waiting period applies before SSP is payable (SSP starts from day 4). The Lower Earnings Limit applies.'
      badgeType = 'amber'
    } else {
      eligible = true
      sicknessStartRule = 'new_2026'
      status = 'ELIGIBLE FROM DAY ONE'
      message = 'SSP applies from the first day of sickness. No waiting period. No earnings threshold applies under the 2026 rules.'
      badgeType = 'jade'
    }

    // Save to ssp_records
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: insertedRow } = await supabase.from('ssp_records').insert({
        user_id: user.id,
        candidate_name: workerName,
        employment_type: employmentType,
        assignment_status: employmentType === 'temporary' ? assignmentStatus : null,
        sick_date: sickDate,
        sickness_start_rule: sicknessStartRule,
        eligible,
        ineligible_reason: ineligibleReason || null,
        evidence_type: evidenceType,
        step_entitlement_confirmed: eligible,
        step_entitlement_confirmed_at: eligible ? new Date().toISOString() : null,
      }).select('id').single()
      if (insertedRow?.id) {
        setSspRecordId(insertedRow.id)
        // Auto-complete any matching open ssp_alert for this worker
        try {
          const { data: openAlerts } = await supabase
            .from('ssp_alerts')
            .select('id')
            .eq('user_id', user.id)
            .eq('ssp_check_completed', false)
            .eq('resolved', false)
            .ilike('worker_name', workerName.trim())
            .limit(1)
          if (openAlerts && openAlerts.length > 0) {
            await supabase.from('ssp_alerts').update({
              ssp_check_completed: true,
              ssp_check_completed_at: new Date().toISOString(),
              ssp_record_id: insertedRow.id,
            }).eq('id', openAlerts[0].id)
          }
        } catch (_) {
 // Non-blocking, alert update failure should not affect the SSP check
        }
      }
    } catch (err) {
 // Continue even if save fails, show the result to the user
    }

    setResult({ status, message, badgeType, eligible })
    setShowCalculator(false)
    setCalcResult(null)
    setAwe('')
    setQualifyingDays('')
    setShowGuidance(false)
    setGuidanceSteps({
      entitlement: { done: false, at: null },
      evidence: { done: false, at: null },
      payroll: { done: false, at: null },
      review: { done: false, at: null },
      communication: { done: false, at: null },
    })
    setComplianceGenerated(false)
    setReturnDate('')
    setGeneratingDocs(false)
    setDocsGenerated(false)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar active="ssp" companyName="" />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ ...cs, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          </div>
        </main>
      </div>
    )
  }

  const inputStyle = (field) => ({
    fontFamily: F,
    fontSize: 14,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${focusedField === field ? TEAL : BD}`,
    background: CARD,
    color: TX,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  })

  const labelStyle = {
    fontFamily: F,
    fontSize: 13,
    fontWeight: 600,
    color: TX,
    marginBottom: 6,
    display: 'block',
  }

  const radioGroupStyle = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: 10,
  }

  const radioOptionStyle = (selected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 8,
    border: `1.5px solid ${selected ? TEAL : BD}`,
    background: selected ? TEALLT : CARD,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    flex: 1,
  })

  const badgeStyles = {
    red: { background: REDBG, color: RED, border: `1px solid ${REDBD}` },
    amber: { background: AMBBG, color: AMB, border: `1px solid ${AMBBD}` },
    jade: { background: GRNBG, color: GRN, border: `1px solid ${GRNBD}` },
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <Sidebar active="ssp" companyName={profile?.company_name || ''} />
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '24px 16px' : '36px 40px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Sub-nav */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={{ ...bs('primary', 'sm') }}>SSP Checker</button>
            <button onClick={() => router.push('/ssp/records')} style={{ ...bs('secondary', 'sm') }}>SSP Records</button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => router.push('/ssp/linked-periods')} style={{ ...bs('secondary', 'sm') }}>Linked Periods</button>
              <InfoTooltip text="Absences within 56 days of each other link together and count towards the 28-week maximum SSP entitlement." />
            </span>
          </div>

          {/* Header */}
          <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            SSP Eligibility Checker
            <InfoTooltip text="Under rules effective 6 April 2026 SSP is payable from day one with no waiting period and no minimum earnings threshold." />
          </h1>
          <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 24px' }}>
            Check whether a worker qualifies for Statutory Sick Pay under the 2026 rules.
          </p>

          {/* Disclaimer */}
          <div style={{
            borderLeft: `4px solid ${TEAL}`,
            background: TEALLT,
            borderRadius: '0 8px 8px 0',
            padding: '14px 18px',
            marginBottom: 24,
          }}>
            <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
              PRODICTA provides guidance to support your SSP process. It does not constitute legal or payroll advice. Always verify calculations with your payroll provider or accountant.
            </p>
          </div>

          {/* Form */}
          <div style={{ ...cs, marginBottom: 24 }}>
            <form onSubmit={handleSubmit}>
              {/* Find existing candidate */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <label style={labelStyle}>Find existing candidate (optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                    <Ic name="search" size={15} color={focusedField === 'workerSearch' ? TEALD : TX3} />
                  </span>
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={e => setWorkerSearch(e.target.value)}
                    onFocus={() => setFocusedField('workerSearch')}
                    onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                    placeholder="Search candidates by name..."
                    style={{ ...inputStyle('workerSearch'), paddingLeft: 36 }}
                  />
                </div>
                {workerSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    marginTop: 4, background: CARD, border: `1px solid ${BD}`, borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(15,33,55,0.08)', overflow: 'hidden',
                  }}>
                    {workerSuggestions.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault()
                          setWorkerName(c.name)
                          setWorkerSearch('')
                          setWorkerSuggestions([])
                        }}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                          width: '100%', padding: '10px 14px', background: 'none',
                          border: 'none', borderBottom: i === workerSuggestions.length - 1 ? 'none' : `1px solid ${BD}`,
                          textAlign: 'left', cursor: 'pointer', fontFamily: F,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = BG}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: TX }}>{c.name}</span>
                        {c.email && <span style={{ fontSize: 12, color: TX3 }}>{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Worker name */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Worker name</label>
                <input
                  type="text"
                  value={workerName}
                  onChange={e => setWorkerName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter worker name"
                  style={inputStyle('name')}
                  required
                />
              </div>

              {/* Employment type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Employment type</label>
                <div style={radioGroupStyle}>
                  <label style={radioOptionStyle(employmentType === 'permanent')}>
                    <input
                      type="radio"
                      name="employmentType"
                      value="permanent"
                      checked={employmentType === 'permanent'}
                      onChange={e => { setEmploymentType(e.target.value); setAssignmentStatus('') }}
                      style={{ accentColor: TEAL }}
                    />
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>Permanent Employee</span>
                  </label>
                  <label style={radioOptionStyle(employmentType === 'temporary')}>
                    <input
                      type="radio"
                      name="employmentType"
                      value="temporary"
                      checked={employmentType === 'temporary'}
                      onChange={e => setEmploymentType(e.target.value)}
                      style={{ accentColor: TEAL }}
                    />
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>Temporary Worker</span>
                  </label>
                </div>
              </div>

 {/* Assignment status, only when Temporary */}
              {employmentType === 'temporary' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Assignment status</label>
                  <div style={radioGroupStyle}>
                    <label style={radioOptionStyle(assignmentStatus === 'active')}>
                      <input
                        type="radio"
                        name="assignmentStatus"
                        value="active"
                        checked={assignmentStatus === 'active'}
                        onChange={e => setAssignmentStatus(e.target.value)}
                        style={{ accentColor: TEAL }}
                      />
                      <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>Active Assignment</span>
                    </label>
                    <label style={radioOptionStyle(assignmentStatus === 'between_assignments')}>
                      <input
                        type="radio"
                        name="assignmentStatus"
                        value="between_assignments"
                        checked={assignmentStatus === 'between_assignments'}
                        onChange={e => setAssignmentStatus(e.target.value)}
                        style={{ accentColor: TEAL }}
                      />
                      <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>Between Assignments</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Sick date */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Sick date</label>
                <input
                  type="date"
                  value={sickDate}
                  onChange={e => setSickDate(e.target.value)}
                  onFocus={() => setFocusedField('sickDate')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('sickDate')}
                  required
                />
              </div>

              {/* Pre-April 2026 */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Did sickness begin before 6 April 2026?</label>
                <div style={radioGroupStyle}>
                  <label style={radioOptionStyle(priorToApril2026 === 'yes')}>
                    <input
                      type="radio"
                      name="priorToApril2026"
                      value="yes"
                      checked={priorToApril2026 === 'yes'}
                      onChange={e => setPriorToApril2026(e.target.value)}
                      style={{ accentColor: TEAL }}
                    />
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>Yes</span>
                  </label>
                  <label style={radioOptionStyle(priorToApril2026 === 'no')}>
                    <input
                      type="radio"
                      name="priorToApril2026"
                      value="no"
                      checked={priorToApril2026 === 'no'}
                      onChange={e => setPriorToApril2026(e.target.value)}
                      style={{ accentColor: TEAL }}
                    />
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: TX }}>No</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !workerName || !employmentType || !sickDate || !priorToApril2026 || (employmentType === 'temporary' && !assignmentStatus)}
                style={{
                  ...bs('primary', 'lg'),
                  width: '100%',
                  justifyContent: 'center',
                  opacity: (submitting || !workerName || !employmentType || !sickDate || !priorToApril2026 || (employmentType === 'temporary' && !assignmentStatus)) ? 0.5 : 1,
                  cursor: (submitting || !workerName || !employmentType || !sickDate || !priorToApril2026 || (employmentType === 'temporary' && !assignmentStatus)) ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Checking...' : 'Check Eligibility'}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (
            <div style={{ ...cs, marginBottom: 24 }}>
              {/* Status badge */}
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '5px 14px',
                  borderRadius: 50,
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: F,
                  letterSpacing: 0.3,
                  ...badgeStyles[result.badgeType],
                }}>
                  {result.status}
                </span>
              </div>

              {/* Message */}
              <p style={{ fontFamily: F, fontSize: 14, color: TX, lineHeight: 1.6, margin: '0 0 16px' }}>
                {result.message}
              </p>

              {/* Action guidance */}
              {result.badgeType === 'red' && (
                <div style={{
                  background: BG,
                  borderRadius: 8,
                  padding: '12px 16px',
                }}>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, fontWeight: 600 }}>
                    Action: No further SSP steps are needed for this worker.
                  </p>
                </div>
              )}

              {result.badgeType === 'amber' && (
                <div style={{
                  background: BG,
                  borderRadius: 8,
                  padding: '12px 16px',
                }}>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, fontWeight: 600 }}>
                    Action: Process SSP from day 4 using old rates.
                  </p>
                </div>
              )}

              {result.badgeType === 'jade' && (
                <>
                  {/* Evidence requirements */}
                  <div style={{
                    background: BG,
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginBottom: 16,
                  }}>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, margin: '0 0 10px' }}>
                      Evidence required
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Ic name="check" size={15} color={TEAL} />
                        <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.45 }}>
                          <strong>Up to 7 days:</strong> Self-certification (worker completes their own form)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Ic name="check" size={15} color={TEAL} />
                        <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.45 }}>
                          <strong>8 days or more:</strong> Fit note required from a GP or healthcare professional
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Continue button */}
                  {!showCalculator && (
                    <button
                      onClick={() => setShowCalculator(true)}
                      style={{
                        ...bs('primary', 'lg'),
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      Continue to SSP Calculator
                      <Ic name="right" size={16} color={NAVY} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {/* ── Step 2: SSP Payment Calculator ── */}
          {showCalculator && result?.eligible && (
            <>
              {/* Divider */}
              <div style={{ height: 1, background: BD, margin: '8px 0 24px' }} />

              {/* Calculator header */}
              <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, margin: 0 }}>
                SSP Payment Calculator
              </h2>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 24px' }}>
                Calculate the correct SSP amount under the 2026 rules.
              </p>

              {/* Calculator disclaimer */}
              <div style={{
                borderLeft: `4px solid ${TEAL}`,
                background: TEALLT,
                borderRadius: '0 8px 8px 0',
                padding: '14px 18px',
                marginBottom: 24,
              }}>
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
                  SSP calculations are provided as guidance only. Always verify with your payroll provider or accountant before processing payment.
                </p>
              </div>

              {/* Calculator form */}
              <div style={{ ...cs, marginBottom: 24 }}>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const aweVal = parseFloat(awe)
                  const daysVal = parseInt(qualifyingDays, 10)
                  if (!aweVal || aweVal <= 0 || !daysVal || daysVal < 1 || daysVal > 7) return

                  setCalculating(true)
                  setCopied(false)

                  const eightyPercent = Math.round(aweVal * 0.80 * 100) / 100
                  const statutoryRate = 123.25
                  const weeklySSP = Math.round(Math.min(eightyPercent, statutoryRate) * 100) / 100
                  const dailySSP = Math.round((weeklySSP / daysVal) * 100) / 100
                  const earningsLinked = eightyPercent < statutoryRate

                  // Update ssp_records row
                  try {
                    if (sspRecordId) {
                      const supabase = createClient()
                      await supabase.from('ssp_records').update({
                        average_weekly_earnings: aweVal,
                        qualifying_days: daysVal,
                        weekly_ssp: weeklySSP,
                        daily_ssp: dailySSP,
                        updated_at: new Date().toISOString(),
                      }).eq('id', sspRecordId)
                    }
                  } catch (err) {
                    // Continue even if save fails
                  }

                  setCalcResult({ aweVal, eightyPercent, statutoryRate, weeklySSP, dailySSP, daysVal, earningsLinked })
                  setCalculating(false)
                }}>
                  {/* AWE field */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Average Weekly Earnings (AWE)
                      <InfoTooltip text="Average Weekly Earnings calculated over the last 8 complete weeks before the sick date. SSP is the lower of £123.25 or 80% of AWE." />
                    </label>
                    <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '0 0 8px', lineHeight: 1.5 }}>
                      Average Weekly Earnings = Total earnings in the last 8 weeks divided by 8. Include all regular pay but exclude overtime, expenses, and one-off payments.
                    </p>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontFamily: F,
                        fontSize: 14,
                        fontWeight: 600,
                        color: TX2,
                        pointerEvents: 'none',
                      }}>
                        &pound;
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={awe}
                        onChange={e => setAwe(e.target.value)}
                        onFocus={() => setFocusedField('awe')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="0.00"
                        style={{ ...inputStyle('awe'), paddingLeft: 30 }}
                        required
                      />
                    </div>
                  </div>

                  {/* Qualifying days */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Number of qualifying days this week</label>
                    <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '0 0 8px', lineHeight: 1.5 }}>
                      Qualifying days are the days the worker was contracted to work this week.
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      step="1"
                      value={qualifyingDays}
                      onChange={e => setQualifyingDays(e.target.value)}
                      onFocus={() => setFocusedField('qualifyingDays')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. 5"
                      style={inputStyle('qualifyingDays')}
                      required
                    />
                  </div>

                  {/* Calculate button */}
                  <button
                    type="submit"
                    disabled={calculating || !awe || !qualifyingDays || parseFloat(awe) <= 0 || parseInt(qualifyingDays, 10) < 1 || parseInt(qualifyingDays, 10) > 7}
                    style={{
                      ...bs('primary', 'lg'),
                      width: '100%',
                      justifyContent: 'center',
                      opacity: (calculating || !awe || !qualifyingDays) ? 0.5 : 1,
                      cursor: (calculating || !awe || !qualifyingDays) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {calculating ? 'Calculating...' : 'Calculate SSP'}
                  </button>
                </form>
              </div>

              {/* Calculator result */}
              {calcResult && (
                <div style={{ ...cs, marginBottom: 24 }}>
                  {/* Working breakdown */}
                  <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 14px' }}>
                    Calculation breakdown
                  </p>
                  <div style={{
                    background: BG,
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {[
                        ['Average Weekly Earnings', `\u00A3${calcResult.aweVal.toFixed(2)}`],
                        ['80% of AWE', `\u00A3${calcResult.eightyPercent.toFixed(2)}`],
                        ['Statutory weekly rate', `\u00A3${calcResult.statutoryRate.toFixed(2)}`],
                        ['Weekly SSP (lower of the two)', `\u00A3${calcResult.weeklySSP.toFixed(2)}`],
                        ['Qualifying days this week', `${calcResult.daysVal}`],
                        ['Daily SSP rate', `\u00A3${calcResult.dailySSP.toFixed(2)}`],
                      ].map(([label, value], i) => (
                        <div key={i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: i === 3 || i === 5 ? '6px 0' : '0',
                          borderTop: i === 3 ? `1px solid ${BD}` : 'none',
                          borderBottom: i === 3 ? `1px solid ${BD}` : 'none',
                        }}>
                          <span style={{
                            fontFamily: F,
                            fontSize: 13,
                            color: i === 3 || i === 5 ? TX : TX2,
                            fontWeight: i === 3 || i === 5 ? 700 : 500,
                          }}>
                            {label}
                          </span>
                          <span style={{
                            fontFamily: F,
                            fontSize: 13,
                            color: i === 3 || i === 5 ? TX : TX2,
                            fontWeight: i === 3 || i === 5 ? 700 : 600,
                          }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payroll output box */}
                  <div style={{
                    borderLeft: `4px solid ${TEAL}`,
                    background: TEALLT,
                    borderRadius: '0 8px 8px 0',
                    padding: '18px 20px',
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>
                          SSP this week: &pound;{calcResult.weeklySSP.toFixed(2)}
                        </p>
                        <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: 0 }}>
                          &pound;{calcResult.dailySSP.toFixed(2)} per day for {calcResult.daysVal} qualifying day{calcResult.daysVal !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const text = `SSP this week: \u00A3${calcResult.weeklySSP.toFixed(2)} (\u00A3${calcResult.dailySSP.toFixed(2)} per day for ${calcResult.daysVal} qualifying day${calcResult.daysVal !== 1 ? 's' : ''})`
                          navigator.clipboard.writeText(text)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        style={{
                          ...bs('secondary', 'sm'),
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        <Ic name={copied ? 'check' : 'copy'} size={13} color={copied ? TEAL : TX2} />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Which rule applied */}
                  <div style={{
                    background: BG,
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 20,
                  }}>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.5 }}>
                      {calcResult.earningsLinked
                        ? 'The earnings-linked rate applies (80% of average weekly earnings).'
                        : 'The standard statutory rate applies (\u00A3123.25 per week).'}
                    </p>
                  </div>

                  {/* Continue to Manager Guidance */}
                  {!showGuidance && (
                    <button
                      onClick={() => setShowGuidance(true)}
                      style={{
                        ...bs('primary', 'lg'),
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      Continue to Manager Guidance Panel
                      <Ic name="right" size={16} color={NAVY} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Manager Guidance Panel ── */}
          {showGuidance && calcResult && (() => {
            const stepKeys = ['entitlement', 'evidence', 'payroll', 'review', 'communication']
            const completedCount = stepKeys.filter(k => guidanceSteps[k].done).length
            const allComplete = completedCount === 5
            const progressPct = (completedCount / 5) * 100

            const isAgency = profile?.account_type === 'agency'

            // Calculate days since sick date
            const sickDateObj = new Date(sickDate + 'T00:00:00')
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const daysSinceSick = Math.max(1, Math.floor((today - sickDateObj) / (1000 * 60 * 60 * 24)) + 1)
            const isOverSevenDays = daysSinceSick > 7

            const dbFieldMap = {
              entitlement: { field: 'step_entitlement_confirmed', atField: 'step_entitlement_confirmed_at' },
              evidence: { field: 'step_evidence_requested', atField: 'step_evidence_requested_at' },
              payroll: { field: 'step_payroll_actioned', atField: 'step_payroll_actioned_at' },
              review: { field: 'step_review_adjusted', atField: 'step_review_adjusted_at' },
              communication: { field: 'step_communication_sent', atField: 'step_communication_sent_at' },
            }

            async function toggleStep(key) {
              const now = new Date().toISOString()
              const isCurrentlyDone = guidanceSteps[key].done
              const newDone = !isCurrentlyDone
              const newAt = newDone ? now : null

              setGuidanceSteps(prev => ({
                ...prev,
                [key]: { done: newDone, at: newAt },
              }))

              try {
                if (sspRecordId) {
                  const supabase = createClient()
                  const { field, atField } = dbFieldMap[key]
                  await supabase.from('ssp_records').update({
                    [field]: newDone,
                    [atField]: newAt,
                    updated_at: now,
                  }).eq('id', sspRecordId)
                }
              } catch (err) {
                // Continue even if save fails
              }
            }

            function formatTimestamp(iso) {
              if (!iso) return ''
              const d = new Date(iso)
              return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            }

            const steps = [
              {
                key: 'entitlement',
                number: 1,
                title: 'Confirm Entitlement',
                description: 'Confirm that SSP entitlement has been verified and recorded for this worker.',
                checkboxLabel: 'Entitlement confirmed and recorded',
              },
              {
                key: 'evidence',
                number: 2,
                title: 'Request Evidence',
                description: 'Request the appropriate evidence from the worker.',
                detail: isOverSevenDays
                  ? 'Fit note required. Ask the worker to provide a fit note from their GP or healthcare professional.'
                  : 'Self-certification form required. Ask the worker to complete a self-certification.',
                checkboxLabel: 'Evidence requested from worker',
              },
              {
                key: 'payroll',
                number: 3,
                title: 'Action Payroll',
                description: `Confirm that the SSP amount of \u00A3${(calcResult.dailySSP * daysSinceSick).toFixed(2)} has been passed to payroll for processing.`,
                checkboxLabel: 'Payroll actioned with SSP amount',
              },
              {
                key: 'review',
                number: 4,
                title: 'Adjust Review',
                description: isAgency
                  ? 'If this worker is within their assignment period, consider whether the assignment review needs to be adjusted.'
                  : 'If this employee is within their probation period, consider whether the probation review timeline needs to be adjusted.',
                checkboxLabel: isAgency
                  ? 'Assignment review adjusted if applicable'
                  : 'Probation review adjusted if applicable',
              },
              {
                key: 'communication',
                number: 5,
                title: 'Communicate with Worker',
                description: 'Confirm that the worker has been informed of their SSP entitlement and what happens next.',
                checkboxLabel: 'Communication sent to worker',
              },
            ]

            return (
              <>
                {/* Divider */}
                <div style={{ height: 1, background: BD, margin: '8px 0 24px' }} />

                {/* Guidance header */}
                <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, margin: 0 }}>
                  Manager Guidance Panel
                </h2>
                <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 24px' }}>
                  Complete all five steps to create a full audit trail for this absence.
                </p>

                {/* Guidance disclaimer */}
                <div style={{
                  borderLeft: `4px solid ${TEAL}`,
                  background: TEALLT,
                  borderRadius: '0 8px 8px 0',
                  padding: '14px 18px',
                  marginBottom: 24,
                }}>
                  <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
                    Each step you complete is time-stamped and stored. This creates a documented record of how this absence was managed.
                  </p>
                </div>

                {/* Progress bar */}
                <div style={{ ...cs, marginBottom: 24, padding: '16px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>
                      {completedCount} of 5 steps completed
                    </span>
                    <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: allComplete ? TEAL : TX3 }}>
                      {Math.round(progressPct)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: 8,
                    background: BG,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      background: TEAL,
                      borderRadius: 4,
                      transition: 'width 0.35s ease',
                    }} />
                  </div>
                </div>

                {/* Step cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {steps.map((step) => {
                    const isDone = guidanceSteps[step.key].done
                    const doneAt = guidanceSteps[step.key].at

                    return (
                      <div key={step.key} style={{
                        ...cs,
                        padding: '18px 22px',
                        borderLeft: `4px solid ${isDone ? TEAL : BD}`,
                        transition: 'border-color 0.2s',
                      }}>
                        {/* Step header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isDone ? TEAL : BG,
                            color: isDone ? '#fff' : TX3,
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: F,
                            flexShrink: 0,
                            transition: 'background 0.2s, color 0.2s',
                          }}>
                            {isDone ? <Ic name="check" size={13} color="#fff" /> : step.number}
                          </span>
                          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>
 Step {step.number}, {step.title}
                          </span>
                        </div>

                        {/* Description */}
                        <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 6px', paddingLeft: 34, lineHeight: 1.5 }}>
                          {step.description}
                        </p>

                        {/* Conditional detail for evidence step */}
                        {step.detail && (
                          <div style={{
                            background: BG,
                            borderRadius: 6,
                            padding: '10px 14px',
                            marginLeft: 34,
                            marginBottom: 6,
                          }}>
                            <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.5 }}>
                              {step.detail}
                            </p>
                          </div>
                        )}

                        {/* Checkbox row */}
                        <div style={{ paddingLeft: 34, marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => toggleStep(step.key)}
                              style={{ accentColor: TEAL, width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <span style={{
                              fontFamily: F,
                              fontSize: 13,
                              fontWeight: isDone ? 600 : 500,
                              color: isDone ? TEAL : TX2,
                              transition: 'color 0.15s',
                            }}>
                              {step.checkboxLabel}
                            </span>
                          </label>
                          {isDone && doneAt && (
                            <span style={{
                              fontFamily: F,
                              fontSize: 11,
                              color: TX3,
                              marginLeft: 4,
                            }}>
                              {formatTimestamp(doneAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* All complete banner */}
                {allComplete && (
                  <div style={{
                    background: GRNBG,
                    border: `1px solid ${GRNBD}`,
                    borderRadius: 14,
                    padding: '18px 22px',
                    marginBottom: 24,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: TEAL,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Ic name="check" size={15} color="#fff" />
                      </div>
                      <span style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: TX }}>
                        All steps completed. This absence is fully managed.
                      </span>
                    </div>
                    <button
                      onClick={generateCompliancePack}
                      disabled={generatingPdf}
                      style={{
                        ...bs('primary', 'lg'),
                        width: '100%',
                        justifyContent: 'center',
                        background: NAVY,
                        color: '#fff',
                        opacity: generatingPdf ? 0.6 : 1,
                        cursor: generatingPdf ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {generatingPdf ? 'Generating...' : 'Generate Compliance Pack'}
                      <Ic name="file" size={16} color="#fff" />
                    </button>
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Step 5: Documentation Generator ── */}
          {complianceGenerated && calcResult && (
            <>
              {/* Divider */}
              <div style={{ height: 1, background: BD, margin: '8px 0 24px' }} />

              <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: TX, margin: 0 }}>
                SSP Documentation
              </h2>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 24px' }}>
                Generate and store all required absence documentation.
              </p>

              <div style={{ ...cs, marginBottom: 24 }}>
                {/* Return to work date */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Return to work date (optional)</label>
                  <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '0 0 8px', lineHeight: 1.5 }}>
                    If the worker has returned, enter the date. Leave blank if the absence is ongoing.
                  </p>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    onFocus={() => setFocusedField('returnDate')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('returnDate')}
                  />
                </div>

                {/* SSP1 notice */}
                {(() => {
                  const sickDateObj = new Date(sickDate + 'T00:00:00')
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const daysSinceSick = Math.max(1, Math.floor((today - sickDateObj) / (1000 * 60 * 60 * 24)) + 1)
                  const exceeds28Weeks = daysSinceSick > 196
                  const isNotEligible = result && !result.eligible
                  if (exceeds28Weeks || isNotEligible) {
                    return (
                      <div style={{
                        borderLeft: `4px solid ${AMB}`,
                        background: AMBBG,
                        borderRadius: '0 8px 8px 0',
                        padding: '12px 16px',
                        marginBottom: 20,
                      }}>
                        <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.5 }}>
                          {exceeds28Weeks
                            ? 'This absence has exceeded 28 weeks. An SSP1 form will be generated to notify the worker that SSP has ended.'
                            : 'This worker is not eligible for SSP. An SSP1 form will be generated.'}
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* What will be generated */}
                <div style={{ background: BG, borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
                  <p style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, margin: '0 0 10px' }}>
                    Documents to be generated
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ic name="file" size={14} color={TEAL} />
                      <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>Absence Record</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ic name="file" size={14} color={TEAL} />
                      <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>SSP Calculation Record</span>
                    </div>
                    {(() => {
                      const sickDateObj = new Date(sickDate + 'T00:00:00')
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const daysSinceSick = Math.max(1, Math.floor((today - sickDateObj) / (1000 * 60 * 60 * 24)) + 1)
                      if (daysSinceSick > 196 || (result && !result.eligible)) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Ic name="file" size={14} color={AMB} />
                            <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>SSP1 Form (end of SSP notice)</span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>

                {/* Generate button */}
                {!docsGenerated ? (
                  <button
                    onClick={generateDocumentation}
                    disabled={generatingDocs}
                    style={{
                      ...bs('primary', 'lg'),
                      width: '100%',
                      justifyContent: 'center',
                      opacity: generatingDocs ? 0.6 : 1,
                      cursor: generatingDocs ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {generatingDocs ? 'Generating documents...' : 'Generate Documents'}
                    <Ic name="file" size={16} color={NAVY} />
                  </button>
                ) : (
                  <div style={{
                    background: GRNBG,
                    border: `1px solid ${GRNBD}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <Ic name="check" size={16} color={TEAL} />
                    <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX }}>
                      All documents generated and downloaded successfully.
                    </span>
                  </div>
                )}
              </div>

              {/* Link to SSP Records */}
              {docsGenerated && (
                <button
                  onClick={() => router.push('/ssp/records')}
                  style={{
                    ...bs('secondary', 'lg'),
                    width: '100%',
                    justifyContent: 'center',
                    marginBottom: 24,
                  }}
                >
                  View All SSP Records
                  <Ic name="right" size={16} color={TX2} />
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
