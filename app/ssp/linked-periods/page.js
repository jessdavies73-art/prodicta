'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import Sidebar from '../../../components/Sidebar'
import { Ic } from '../../../components/Icons'
import { createClient } from '../../../lib/supabase'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, F, cs, bs, ps } from '../../../lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const JADE = '#00BFA5'
const AMBER = '#D97706'
const AMBERBG = '#fffbeb'
const AMBERBD = '#fcd34d'
const DRED = '#B91C1C'
const DREDBG = '#fef2f2'
const DREDBD = '#fca5a5'
const GRN = '#00BFA5'
const GRNBG = '#E6F7F5'
const GRNBD = '#80DFD2'

function toDate(s) { return new Date(s + 'T00:00:00') }
function daysBetween(a, b) { return Math.round((b - a) / (1000 * 60 * 60 * 24)) }
function fmtDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

function computeLinkedPeriods(records) {
  const sorted = [...records].sort((a, b) => new Date(a.sick_date) - new Date(b.sick_date))
  const groups = []
  let current = null

  for (const r of sorted) {
    const start = toDate(r.sick_date)
    const end = r.return_date ? toDate(r.return_date) : new Date()
    const sickDays = Math.max(1, daysBetween(start, end))
    const dailySsp = r.daily_ssp || 0
    const sspPaid = Math.round(dailySsp * sickDays * 100) / 100

    if (!current) {
      current = { absences: [{ ...r, start, end, sickDays, sspPaid }], periodStart: start, periodEnd: end }
    } else {
      const gap = daysBetween(current.periodEnd, start)
      if (gap <= 56) {
        current.absences.push({ ...r, start, end, sickDays, sspPaid })
        if (end > current.periodEnd) current.periodEnd = end
      } else {
        groups.push(current)
        current = { absences: [{ ...r, start, end, sickDays, sspPaid }], periodStart: start, periodEnd: end }
      }
    }
  }
  if (current) groups.push(current)

  return groups.map(g => {
    const totalDays = g.absences.reduce((s, a) => s + a.sickDays, 0)
    const totalSSP = Math.round(g.absences.reduce((s, a) => s + a.sspPaid, 0) * 100) / 100
    const remaining = Math.max(0, 196 - totalDays)
    return { ...g, totalDays, totalSSP, remaining }
  })
}

export default function LinkedPeriodsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allRecords, setAllRecords] = useState([])
  const [workerNames, setWorkerNames] = useState([])
  const [search, setSearch] = useState('')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [focusedField, setFocusedField] = useState(null)

  // New absence check
  const [newSickDate, setNewSickDate] = useState('')
  const [linkCheckResult, setLinkCheckResult] = useState(null)

  // SSP1 generation
  const [generatingSsp1, setGeneratingSsp1] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: rows } = await supabase
        .from('ssp_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('eligible', true)
        .order('sick_date', { ascending: true })
      const recs = rows || []
      setAllRecords(recs)
      const names = [...new Set(recs.map(r => r.candidate_name).filter(Boolean))]
      setWorkerNames(names)
      setLoading(false)
    }
    load()
  }, [])

  const filteredNames = useMemo(() => {
    if (!search) return workerNames
    const q = search.toLowerCase()
    return workerNames.filter(n => n.toLowerCase().includes(q))
  }, [search, workerNames])

  const workerRecords = useMemo(() => {
    if (!selectedWorker) return []
    return allRecords.filter(r => r.candidate_name === selectedWorker)
  }, [selectedWorker, allRecords])

  const linkedPeriods = useMemo(() => computeLinkedPeriods(workerRecords), [workerRecords])

  const totalDaysUsed = linkedPeriods.reduce((s, g) => s + g.totalDays, 0)
  const totalDaysRemaining = Math.max(0, 196 - totalDaysUsed)
  const pct = Math.min(100, Math.round((totalDaysUsed / 196) * 100))
  const barColor = pct >= 90 ? DRED : pct >= 75 ? AMBER : JADE

  // Calendar data for the selected worker
  const calendarData = useMemo(() => {
    if (!workerRecords.length) return { months: [], dayMap: {} }
    const dayMap = {}
    const sorted = [...workerRecords].sort((a, b) => new Date(a.sick_date) - new Date(b.sick_date))

    // Mark absence days
    for (const r of sorted) {
      const start = toDate(r.sick_date)
      const end = r.return_date ? toDate(r.return_date) : new Date()
      const d = new Date(start)
      while (d <= end) {
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = { type: 'absent', record: r }
        d.setDate(d.getDate() + 1)
      }
    }

    // Mark gap days between absences
    for (let i = 0; i < sorted.length - 1; i++) {
      const endCurr = sorted[i].return_date ? toDate(sorted[i].return_date) : new Date()
      const startNext = toDate(sorted[i + 1].sick_date)
      const gap = daysBetween(endCurr, startNext)
      if (gap > 0 && gap <= 56) {
        const d = new Date(endCurr)
        d.setDate(d.getDate() + 1)
        while (d < startNext) {
          const key = d.toISOString().slice(0, 10)
          if (!dayMap[key]) dayMap[key] = { type: 'linked-gap' }
          d.setDate(d.getDate() + 1)
        }
      } else if (gap > 56) {
        const d = new Date(endCurr)
        d.setDate(d.getDate() + 1)
        const gapEnd = new Date(d); gapEnd.setDate(gapEnd.getDate() + Math.min(gap, 70))
        while (d < startNext && d < gapEnd) {
          const key = d.toISOString().slice(0, 10)
          if (!dayMap[key]) dayMap[key] = { type: 'unlinked-gap' }
          d.setDate(d.getDate() + 1)
        }
      }
    }

    // Determine month range
    const allDates = Object.keys(dayMap).sort()
    if (!allDates.length) return { months: [], dayMap }
    const first = new Date(allDates[0] + 'T00:00:00')
    const last = new Date(allDates[allDates.length - 1] + 'T00:00:00')
    const months = []
    const cur = new Date(first.getFullYear(), first.getMonth(), 1)
    while (cur <= last) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() })
      cur.setMonth(cur.getMonth() + 1)
    }
    return { months, dayMap }
  }, [workerRecords])

  function checkNewAbsence() {
    if (!newSickDate || !workerRecords.length) { setLinkCheckResult(null); return }
    const sorted = [...workerRecords].sort((a, b) => new Date(a.sick_date) - new Date(b.sick_date))
    const lastRecord = sorted[sorted.length - 1]
    const lastEnd = lastRecord.return_date ? toDate(lastRecord.return_date) : new Date()
    const newStart = toDate(newSickDate)
    const gap = daysBetween(lastEnd, newStart)
    if (gap <= 56) {
      setLinkCheckResult({ linked: true, gap })
    } else {
      setLinkCheckResult({ linked: false, gap })
    }
  }

  async function generateSsp1() {
    setGeneratingSsp1(true)
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
      const PW = 595, PH = 842, ML = 48, TW = PW - 96
      function safe(t) { if (!t) return ''; return String(t).replace(/[\u2014\u2013]/g,', ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2026]/g,'...').replace(/[^\x00-\xFF]/g,'') }
      function wrap(t, f, s, w) { const words = safe(t).split(/\s+/); const lines = []; let l = ''; for (const wd of words) { const test = l ? `${l} ${wd}` : wd; if (f.widthOfTextAtSize(test, s) > w) { if (l) lines.push(l); l = wd } else l = test } if (l) lines.push(l); return lines }

      const page = pdf.addPage([PW, PH])
      let y = PH - 48

      // Header
      page.drawRectangle({ x: 0, y: PH - 70, width: PW, height: 70, color: navy })
      page.drawText('PRO', { x: ML, y: PH - 48, size: 22, font: bold, color: white })
      page.drawText('DICTA', { x: ML + bold.widthOfTextAtSize('PRO', 22), y: PH - 48, size: 22, font: bold, color: teal })
      y = PH - 100

      page.drawText('SSP1 — End of SSP Notification', { x: ML, y, size: 16, font: bold, color: navy }); y -= 20
      page.drawText(`Date generated: ${fmtDate(new Date().toISOString())}`, { x: ML, y, size: 9, font: helvetica, color: grey }); y -= 30

      function kv(label, value) { page.drawText(safe(label), { x: ML, y, size: 9, font: bold, color: navy }); const lw = bold.widthOfTextAtSize(safe(label), 9); page.drawText(safe(value), { x: ML + lw + 6, y, size: 9, font: helvetica, color: black }); y -= 16 }

      // Section 1
      page.drawRectangle({ x: ML, y: y - 4, width: TW, height: 22, color: navy })
      page.drawText('1. SSP1 Notice', { x: ML + 10, y: y + 2, size: 10, font: bold, color: white }); y -= 30

      kv('Worker name: ', selectedWorker || '')
      kv('Employer/agency name: ', profile?.company_name || 'Employer')
      kv('Total SSP days used: ', `${totalDaysUsed} of 196 days`)
      kv('Reason: ', 'The maximum 28-week SSP entitlement period has been reached')
      y -= 8

      const lines = wrap(`Statutory Sick Pay cannot be paid because the maximum 28-week SSP entitlement period has been reached. ${totalDaysUsed} days of SSP have been paid across linked periods of sickness.`, bold, 10, TW)
      for (const ln of lines) { page.drawText(ln, { x: ML, y, size: 10, font: bold, color: black }); y -= 14 }
      y -= 8

      const lines2 = wrap('You may be able to claim Employment and Support Allowance from the Department for Work and Pensions.', helvetica, 9, TW)
      for (const ln of lines2) { page.drawText(ln, { x: ML, y, size: 9, font: helvetica, color: grey }); y -= 13 }
      y -= 16

      // Section 2
      page.drawRectangle({ x: ML, y: y - 4, width: TW, height: 22, color: navy })
      page.drawText('2. Employer Declaration', { x: ML + 10, y: y + 2, size: 10, font: bold, color: white }); y -= 30
      kv('Employer/agency: ', profile?.company_name || 'Employer')
      kv('Date issued: ', fmtDate(new Date().toISOString()))

      // Footer
      page.drawRectangle({ x: 0, y: 0, width: PW, height: 36, color: lightGrey })
      page.drawText(`Generated by PRODICTA | prodicta.co.uk | ${fmtDate(new Date().toISOString())}`, { x: ML, y: 14, size: 7, font: helvetica, color: grey })

      const bytes = await pdf.save()
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SSP1-Form-${(selectedWorker || 'worker').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('SSP1 generation error:', err)
    } finally {
      setGeneratingSsp1(false)
    }
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

  const labelStyle = { fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 6, display: 'block' }

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar active="ssp" companyName="" />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ ...cs, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          </div>
        </main>
      </div>
    )
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
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Sub-nav */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/ssp')} style={{ ...bs('secondary', 'sm') }}>SSP Checker</button>
            <button onClick={() => router.push('/ssp/records')} style={{ ...bs('secondary', 'sm') }}>SSP Records</button>
            <button style={{ ...bs('primary', 'sm') }}>Linked Periods</button>
          </div>

          {/* Header */}
          <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>
            Linked Period Tracker
          </h1>
          <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 24px' }}>
            Track linked periods of sickness and monitor SSP entitlement across multiple absences.
          </p>

          {/* Info box */}
          <div style={{
            borderLeft: `4px solid ${TEAL}`,
            background: TEALLT,
            borderRadius: '0 8px 8px 0',
            padding: '14px 18px',
            marginBottom: 24,
          }}>
            <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
              Under SSP rules effective 6 April 2026, separate periods of sickness are treated as one linked period if the gap between them is 56 days or less. SSP is payable for a maximum of 28 weeks (196 days) across all linked periods.
            </p>
          </div>

          {/* Worker search */}
          <div style={{ ...cs, marginBottom: 24 }}>
            <label style={labelStyle}>Search for a worker</label>
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedWorker(null); setLinkCheckResult(null); setNewSickDate('') }}
              onFocus={() => setFocusedField('search')}
              onBlur={() => setTimeout(() => setFocusedField(null), 150)}
              placeholder="Type a worker name..."
              style={inputStyle('search')}
            />
            {search && filteredNames.length > 0 && !selectedWorker && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {filteredNames.map(name => (
                  <button
                    key={name}
                    onClick={() => { setSelectedWorker(name); setSearch(name); setLinkCheckResult(null); setNewSickDate('') }}
                    style={{
                      fontFamily: F, fontSize: 13, fontWeight: 500, color: TX,
                      background: BG, border: `1px solid ${BD}`, borderRadius: 8,
                      padding: '8px 14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = TEALLT}
                    onMouseLeave={e => e.currentTarget.style.background = BG}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {search && filteredNames.length === 0 && (
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '10px 0 0' }}>No workers found matching that name.</p>
            )}
          </div>

          {/* ── Selected worker content ── */}
          {selectedWorker && workerRecords.length > 0 && (
            <>
              {/* Entitlement tracker */}
              <div style={{ ...cs, marginBottom: 24 }}>
                <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 12px' }}>
                  SSP Entitlement — {selectedWorker}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
                    {totalDaysUsed} of 196 days used
                  </span>
                  <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: barColor }}>
                    {totalDaysRemaining} days remaining
                  </span>
                </div>
                <div style={{ width: '100%', height: 10, background: BG, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 5, transition: 'width 0.35s ease, background 0.35s ease' }} />
                </div>
                <p style={{ fontFamily: F, fontSize: 11.5, color: TX3, margin: '8px 0 0' }}>
                  Maximum entitlement: 196 days (28 weeks)
                </p>

                {/* Warnings */}
                {totalDaysUsed >= 196 && (
                  <div style={{ background: DREDBG, border: `1px solid ${DREDBD}`, borderRadius: 8, padding: '12px 16px', marginTop: 14 }}>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: DRED, margin: '0 0 10px' }}>
                      SSP entitlement exhausted. Issue SSP1 form immediately.
                    </p>
                    <button
                      onClick={generateSsp1}
                      disabled={generatingSsp1}
                      style={{
                        ...bs('primary', 'md'),
                        background: DRED,
                        color: '#fff',
                        opacity: generatingSsp1 ? 0.6 : 1,
                        cursor: generatingSsp1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {generatingSsp1 ? 'Generating...' : 'Generate SSP1 Form'}
                      <Ic name="file" size={14} color="#fff" />
                    </button>
                  </div>
                )}
                {totalDaysUsed >= 176 && totalDaysUsed < 196 && (
                  <div style={{ background: DREDBG, border: `1px solid ${DREDBD}`, borderRadius: 8, padding: '12px 16px', marginTop: 14 }}>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: DRED, margin: 0 }}>
                      This worker is close to exhausting SSP entitlement. Prepare SSP1 form now.
                    </p>
                  </div>
                )}
                {totalDaysUsed >= 150 && totalDaysUsed < 176 && (
                  <div style={{ background: AMBERBG, border: `1px solid ${AMBERBD}`, borderRadius: 8, padding: '12px 16px', marginTop: 14 }}>
                    <p style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: AMBER, margin: 0 }}>
                      This worker is approaching the 28-week SSP limit. Consider issuing an SSP1 form soon.
                    </p>
                  </div>
                )}
              </div>

              {/* Calendar view */}
              {calendarData.months.length > 0 && (
                <div style={{ ...cs, marginBottom: 24, padding: '18px 20px' }}>
                  <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 6px' }}>
                    Absence Calendar
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: DRED }} />
                      <span style={{ fontFamily: F, fontSize: 11, color: TX2 }}>Absent</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: AMBER }} />
                      <span style={{ fontFamily: F, fontSize: 11, color: TX2 }}>Linked gap</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: BD }} />
                      <span style={{ fontFamily: F, fontSize: 11, color: TX2 }}>Unlinked gap</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {calendarData.months.map(({ year, month }) => {
                      const firstDay = new Date(year, month, 1)
                      const daysInMonth = new Date(year, month + 1, 0).getDate()
                      // Monday=0 based offset
                      let startDow = firstDay.getDay() - 1
                      if (startDow < 0) startDow = 6

                      const cells = []
                      for (let i = 0; i < startDow; i++) cells.push(null)
                      for (let d = 1; d <= daysInMonth; d++) {
                        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                        cells.push({ day: d, data: calendarData.dayMap[key] || null })
                      }

                      return (
                        <div key={`${year}-${month}`}>
                          <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TX, margin: '0 0 8px' }}>
                            {MONTH_NAMES[month]} {year}
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                            {DAY_NAMES.map(d => (
                              <div key={d} style={{ fontFamily: F, fontSize: 9, fontWeight: 700, color: TX3, textAlign: 'center', padding: '2px 0' }}>
                                {d}
                              </div>
                            ))}
                            {cells.map((cell, i) => {
                              if (!cell) return <div key={`e-${i}`} />
                              let bg = 'transparent'
                              let fg = TX3
                              if (cell.data) {
                                if (cell.data.type === 'absent') { bg = DRED; fg = '#fff' }
                                else if (cell.data.type === 'linked-gap') { bg = AMBER; fg = '#fff' }
                                else if (cell.data.type === 'unlinked-gap') { bg = BD; fg = TX2 }
                              }
                              return (
                                <div key={`d-${cell.day}`} style={{
                                  fontFamily: F, fontSize: 10, fontWeight: 600,
                                  textAlign: 'center', padding: '4px 0',
                                  borderRadius: 4, background: bg, color: fg,
                                  minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {cell.day}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Linked period analysis */}
              <div style={{ ...cs, marginBottom: 24 }}>
                <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 14px' }}>
                  Linked Period Analysis
                </p>
                {linkedPeriods.length === 0 ? (
                  <p style={{ fontFamily: F, fontSize: 13, color: TX3 }}>No linked periods found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {linkedPeriods.map((g, gi) => (
                      <div key={gi} style={{
                        background: BG,
                        borderRadius: 8,
                        padding: '14px 16px',
                        borderLeft: `4px solid ${g.remaining === 0 ? DRED : g.remaining <= 46 ? AMBER : JADE}`,
                      }}>
                        <p style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, margin: '0 0 8px' }}>
                          Linked Period {gi + 1}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '4px 24px' }}>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                            <strong style={{ color: TX }}>Start:</strong> {fmtDate(g.periodStart.toISOString())}
                          </div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                            <strong style={{ color: TX }}>End:</strong> {fmtDate(g.periodEnd.toISOString())}
                          </div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                            <strong style={{ color: TX }}>Sick days:</strong> {g.totalDays}
                          </div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                            <strong style={{ color: TX }}>SSP paid:</strong> {'\u00A3'}{g.totalSSP.toFixed(2)}
                          </div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>
                            <strong style={{ color: TX }}>Absences:</strong> {g.absences.length}
                          </div>
                          <div style={{ fontFamily: F, fontSize: 12.5, color: g.remaining === 0 ? DRED : g.remaining <= 46 ? AMBER : TX2 }}>
                            <strong style={{ color: TX }}>Days remaining:</strong> {g.remaining}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New absence check */}
              <div style={{ ...cs, marginBottom: 24 }}>
                <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 6px' }}>
                  New Absence Check
                </p>
                <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 16px', lineHeight: 1.5 }}>
                  Check whether a new sick date links to the most recent absence for this worker.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>New sick date</label>
                  <input
                    type="date"
                    value={newSickDate}
                    onChange={e => { setNewSickDate(e.target.value); setLinkCheckResult(null) }}
                    onFocus={() => setFocusedField('newSickDate')}
                    onBlur={() => setFocusedField(null)}
                    style={inputStyle('newSickDate')}
                  />
                </div>
                <button
                  onClick={checkNewAbsence}
                  disabled={!newSickDate}
                  style={{
                    ...bs('primary', 'md'),
                    width: '100%',
                    justifyContent: 'center',
                    opacity: !newSickDate ? 0.5 : 1,
                    cursor: !newSickDate ? 'not-allowed' : 'pointer',
                  }}
                >
                  Check Linked Period
                </button>

                {linkCheckResult && (
                  <div style={{
                    marginTop: 16,
                    borderRadius: 8,
                    padding: '14px 16px',
                    background: linkCheckResult.linked ? AMBERBG : GRNBG,
                    border: `1px solid ${linkCheckResult.linked ? AMBERBD : GRNBD}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 50,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: F,
                        background: linkCheckResult.linked ? AMBER : JADE,
                        color: '#fff',
                      }}>
                        {linkCheckResult.linked ? 'LINKED PERIOD' : 'NEW PERIOD'}
                      </span>
                    </div>
                    <p style={{ fontFamily: F, fontSize: 13, color: TX, margin: 0, lineHeight: 1.5 }}>
                      {linkCheckResult.linked
                        ? `This absence links to the previous period (${linkCheckResult.gap} day gap). SSP entitlement continues from where it left off.`
                        : `This absence starts a new SSP period (${linkCheckResult.gap} day gap, exceeds 56-day threshold). Full 28-week entitlement applies.`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedWorker && workerRecords.length === 0 && (
            <div style={{ ...cs, textAlign: 'center', padding: '36px 24px' }}>
              <Ic name="file" size={28} color={BD} />
              <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '12px 0 0' }}>
                No eligible SSP records found for {selectedWorker}.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
