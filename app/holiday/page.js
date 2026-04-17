'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { Ic } from '../../components/Icons'
import InfoTooltip from '../../components/InfoTooltip'
import { createClient } from '../../lib/supabase'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, F, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, GRN, GRNBG, GRNBD, cs, bs, ps } from '../../lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

function fmtDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default function HolidayPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])
  const [focusedField, setFocusedField] = useState(null)

  // New record form
  const [showNewRecord, setShowNewRecord] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('permanent')
  const [formYearStart, setFormYearStart] = useState('')
  const [formYearEnd, setFormYearEnd] = useState('')
  const [formEntitlement, setFormEntitlement] = useState('28')
  const [formPayRate, setFormPayRate] = useState('')
  const [formCarryOver, setFormCarryOver] = useState('0')
  const [formCarryExpiry, setFormCarryExpiry] = useState('')
  const [savingRecord, setSavingRecord] = useState(false)

  // Selected record
  const [selectedId, setSelectedId] = useState(null)
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // New entry form
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [entryStart, setEntryStart] = useState('')
  const [entryEnd, setEntryEnd] = useState('')
  const [entryDays, setEntryDays] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [savingEntry, setSavingEntry] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: recs } = await supabase
        .from('holiday_records')
        .select('*')
        .eq('user_id', user.id)
        .order('holiday_year_start', { ascending: false })
      setRecords(recs || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectedRecord = useMemo(() => records.find(r => r.id === selectedId), [records, selectedId])

  async function loadEntries(recordId) {
    setLoadingEntries(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('holiday_entries')
      .select('*')
      .eq('holiday_record_id', recordId)
      .order('start_date', { ascending: false })
    setEntries(data || [])
    setLoadingEntries(false)
  }

  async function handleSelectRecord(id) {
    setSelectedId(id)
    setShowNewEntry(false)
    await loadEntries(id)
  }

  async function handleCreateRecord() {
    if (!formName || !formYearStart || !formEntitlement) return
    setSavingRecord(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const entitlement = parseFloat(formEntitlement)
      const carryOver = parseFloat(formCarryOver) || 0
      const { data: newRec } = await supabase.from('holiday_records').insert({
        user_id: user.id,
        worker_name: formName,
        employment_type: formType,
        holiday_year_start: formYearStart,
        holiday_year_end: formYearEnd || null,
        total_entitlement_days: entitlement,
        days_remaining: entitlement + carryOver,
        carry_over_days: carryOver,
        carry_over_expiry: formCarryExpiry || null,
        holiday_pay_rate: parseFloat(formPayRate) || null,
      }).select('*').single()
      if (newRec) {
        setRecords(prev => [newRec, ...prev])
        setShowNewRecord(false)
        setFormName(''); setFormType('permanent'); setFormYearStart(''); setFormYearEnd('')
        setFormEntitlement('28'); setFormPayRate(''); setFormCarryOver('0'); setFormCarryExpiry('')
        handleSelectRecord(newRec.id)
      }
    } catch (err) {
      console.error('Create holiday record error:', err)
    } finally {
      setSavingRecord(false)
    }
  }

  async function handleAddEntry() {
    if (!selectedId || !entryStart || !entryDays) return
    setSavingEntry(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const days = parseFloat(entryDays)
      const payAmount = selectedRecord?.holiday_pay_rate ? Math.round(days * selectedRecord.holiday_pay_rate * 100) / 100 : 0

      const { data: newEntry } = await supabase.from('holiday_entries').insert({
        holiday_record_id: selectedId,
        user_id: user.id,
        start_date: entryStart,
        end_date: entryEnd || null,
        days_taken: days,
        holiday_pay_amount: payAmount,
        notes: entryNotes || null,
      }).select('*').single()

      if (newEntry) {
        setEntries(prev => [newEntry, ...prev])
        // Update the record totals
        const newDaysTaken = (selectedRecord?.days_taken || 0) + days
        const newRemaining = (selectedRecord?.total_entitlement_days || 0) + (selectedRecord?.carry_over_days || 0) - newDaysTaken
        const newTotalPay = (selectedRecord?.total_holiday_pay || 0) + payAmount
        await supabase.from('holiday_records').update({
          days_taken: newDaysTaken,
          days_remaining: Math.max(0, newRemaining),
          total_holiday_pay: newTotalPay,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedId)
        setRecords(prev => prev.map(r => r.id === selectedId ? { ...r, days_taken: newDaysTaken, days_remaining: Math.max(0, newRemaining), total_holiday_pay: newTotalPay } : r))
        setShowNewEntry(false)
        setEntryStart(''); setEntryEnd(''); setEntryDays(''); setEntryNotes('')
      }
    } catch (err) {
      console.error('Add holiday entry error:', err)
    } finally {
      setSavingEntry(false)
    }
  }

  const inputStyle = (field) => ({
    fontFamily: F, fontSize: 14, width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1.5px solid ${focusedField === field ? TEAL : BD}`, background: CARD, color: TX,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  })
  const labelStyle = { fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 6, display: 'block' }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar active="holiday" companyName="" />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
      <Sidebar active="holiday" companyName={profile?.company_name || ''} />
      <main style={{
        flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0,
        padding: isMobile ? '24px 16px' : '36px 40px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>
                Holiday Pay Tracker
              </h1>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 0' }}>
                Track holiday entitlement and maintain 6-year HMRC compliant records.
              </p>
            </div>
            {!showNewRecord && (
              <button onClick={() => setShowNewRecord(true)} style={{ ...bs('primary', 'md') }}>
                New Holiday Record
              </button>
            )}
          </div>

          {/* Quick log prompt */}
          {selectedRecord && !showNewEntry && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, padding: '10px 18px', marginBottom: 16,
              background: TEALLT, borderRadius: 10, border: `1px solid ${TEAL}40`, flexWrap: 'wrap',
            }}>
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX }}>
                Log holiday for {selectedRecord.worker_name}
              </span>
              <button onClick={() => setShowNewEntry(true)} style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: TEAL, color: NAVY, fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}>
                Log Holiday
              </button>
            </div>
          )}

          {/* Retention notice */}
          <div style={{
            borderLeft: `4px solid ${TEAL}`, background: TEALLT, borderRadius: '0 8px 8px 0',
            padding: '14px 18px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55, flex: 1 }}>
                Holiday pay records must be retained for a minimum of 6 years under HMRC requirements. The Fair Work Agency can investigate and fine employers who cannot produce records. All records created here are time-stamped and stored.
              </p>
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                <InfoTooltip text="HMRC requires holiday pay records to be kept for a minimum of 6 years. PRODICTA stores all records automatically." />
              </span>
            </div>
          </div>

          {/* New record form */}
          {showNewRecord && (
            <div style={{ ...cs, marginBottom: 24 }}>
              <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: TX, margin: '0 0 16px' }}>
                New Holiday Record
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Worker name</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                    onFocus={() => setFocusedField('fn')} onBlur={() => setFocusedField(null)}
                    placeholder="Enter worker name" style={inputStyle('fn')} />
                </div>
                <div>
                  <label style={labelStyle}>Employment type</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)}
                    style={{ ...inputStyle('ft'), cursor: 'pointer' }}>
                    <option value="permanent">Permanent Employee</option>
                    <option value="temporary">Temporary Worker</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Holiday year start</label>
                  <input type="date" value={formYearStart} onChange={e => setFormYearStart(e.target.value)}
                    onFocus={() => setFocusedField('ys')} onBlur={() => setFocusedField(null)} style={inputStyle('ys')} />
                </div>
                <div>
                  <label style={labelStyle}>Holiday year end</label>
                  <input type="date" value={formYearEnd} onChange={e => setFormYearEnd(e.target.value)}
                    onFocus={() => setFocusedField('ye')} onBlur={() => setFocusedField(null)} style={inputStyle('ye')} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Total entitlement (days)</label>
                  <input type="number" step="0.5" min="0" value={formEntitlement} onChange={e => setFormEntitlement(e.target.value)}
                    onFocus={() => setFocusedField('te')} onBlur={() => setFocusedField(null)} style={inputStyle('te')} />
                </div>
                <div>
                  <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Carry-over days
                    <InfoTooltip text="Unused holiday that carries over from one holiday year to the next. Subject to your employment contract terms." />
                  </label>
                  <input type="number" step="0.5" min="0" value={formCarryOver} onChange={e => setFormCarryOver(e.target.value)}
                    onFocus={() => setFocusedField('co')} onBlur={() => setFocusedField(null)} style={inputStyle('co')} />
                </div>
                <div>
                  <label style={labelStyle}>Carry-over expiry</label>
                  <input type="date" value={formCarryExpiry} onChange={e => setFormCarryExpiry(e.target.value)}
                    onFocus={() => setFocusedField('ce')} onBlur={() => setFocusedField(null)} style={inputStyle('ce')} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Daily holiday pay rate (optional)</label>
                <div style={{ position: 'relative', maxWidth: isMobile ? '100%' : 'calc(33.33% - 10px)' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: F, fontSize: 14, fontWeight: 600, color: TX2, pointerEvents: 'none' }}>&pound;</span>
                  <input type="number" step="0.01" min="0" value={formPayRate} onChange={e => setFormPayRate(e.target.value)}
                    onFocus={() => setFocusedField('pr')} onBlur={() => setFocusedField(null)}
                    placeholder="0.00" style={{ ...inputStyle('pr'), paddingLeft: 30 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateRecord} disabled={!formName || !formYearStart || !formEntitlement || savingRecord}
                  style={{ ...bs('primary', 'md'), opacity: (!formName || !formYearStart || savingRecord) ? 0.5 : 1, cursor: (!formName || !formYearStart || savingRecord) ? 'not-allowed' : 'pointer' }}>
                  {savingRecord ? 'Saving...' : 'Create Record'}
                </button>
                <button onClick={() => setShowNewRecord(false)} style={{ ...bs('secondary', 'md') }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Records list */}
          {records.length === 0 && !showNewRecord ? (
            <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
              <Ic name="calendar" size={28} color={BD} />
              <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '12px 0 0' }}>
                No holiday records yet. Create one to start tracking entitlement.
              </p>
            </div>
          ) : records.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 24 }}>
              {records.map(r => {
                const totalAvailable = (r.total_entitlement_days || 0) + (r.carry_over_days || 0)
                const usedPct = totalAvailable > 0 ? Math.min(100, Math.round(((r.days_taken || 0) / totalAvailable) * 100)) : 0
                const isSelected = r.id === selectedId
                return (
                  <button key={r.id} onClick={() => handleSelectRecord(r.id)} style={{
                    ...cs, padding: '16px 20px', textAlign: 'left', cursor: 'pointer',
                    borderLeft: `4px solid ${isSelected ? TEAL : 'transparent'}`,
                    boxShadow: isSelected ? `0 2px 12px rgba(0,191,165,0.1)` : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, marginBottom: 4 }}>
                      {r.worker_name}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 11.5, color: TX3, marginBottom: 10 }}>
                      {r.employment_type === 'permanent' ? 'Permanent' : 'Temporary'} | {fmtDate(r.holiday_year_start)} — {fmtDate(r.holiday_year_end)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: F, fontSize: 12, color: TX2 }}>{r.days_taken || 0} of {totalAvailable} days used</span>
                      <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: (r.days_remaining || 0) <= 3 ? RED : TX2 }}>{r.days_remaining || 0} remaining</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: BG, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${usedPct}%`, height: '100%', background: usedPct >= 90 ? RED : usedPct >= 75 ? AMB : TEAL, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    {r.holiday_pay_rate && (
                      <div style={{ fontFamily: F, fontSize: 11, color: TX3, marginTop: 6 }}>
                        Holiday pay: {'\u00A3'}{(r.total_holiday_pay || 0).toFixed(2)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Selected record detail */}
          {selectedRecord && (
            <>
              <div style={{ ...cs, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <h2 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: TX, margin: 0 }}>
                    {selectedRecord.worker_name} — Holiday Detail
                  </h2>
                  {!showNewEntry && (
                    <button onClick={() => setShowNewEntry(true)} style={{ ...bs('primary', 'sm') }}>
                      Log Holiday
                    </button>
                  )}
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Entitlement', value: `${selectedRecord.total_entitlement_days} days` },
                    { label: 'Carry-over', value: `${selectedRecord.carry_over_days || 0} days` },
                    { label: 'Taken', value: `${selectedRecord.days_taken || 0} days` },
                    { label: 'Remaining', value: `${selectedRecord.days_remaining || 0} days`, color: (selectedRecord.days_remaining || 0) <= 3 ? RED : TEAL },
                  ].map((s, i) => (
                    <div key={i} style={{ background: BG, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: s.color || TX }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {selectedRecord.holiday_pay_rate && (
                  <div style={{ background: TEALLT, borderLeft: `4px solid ${TEAL}`, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 16 }}>
                    <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
                      Daily rate: {'\u00A3'}{selectedRecord.holiday_pay_rate.toFixed(2)} | Total holiday pay: <strong>{'\u00A3'}{(selectedRecord.total_holiday_pay || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                )}

                {selectedRecord.carry_over_days > 0 && selectedRecord.carry_over_expiry && (
                  <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                    <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0 }}>
                      {selectedRecord.carry_over_days} carry-over days expire on {fmtDate(selectedRecord.carry_over_expiry)}.
                    </p>
                  </div>
                )}

                {/* New entry form */}
                {showNewEntry && (
                  <div style={{ background: BG, borderRadius: 10, padding: '16px 18px', marginBottom: 16, border: `1px solid ${BD}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={labelStyle}>Start date</label>
                        <input type="date" value={entryStart} onChange={e => setEntryStart(e.target.value)}
                          onFocus={() => setFocusedField('es')} onBlur={() => setFocusedField(null)} style={inputStyle('es')} />
                      </div>
                      <div>
                        <label style={labelStyle}>End date (optional)</label>
                        <input type="date" value={entryEnd} onChange={e => setEntryEnd(e.target.value)}
                          onFocus={() => setFocusedField('ee')} onBlur={() => setFocusedField(null)} style={inputStyle('ee')} />
                      </div>
                      <div>
                        <label style={labelStyle}>Days taken</label>
                        <input type="number" step="0.5" min="0.5" value={entryDays} onChange={e => setEntryDays(e.target.value)}
                          onFocus={() => setFocusedField('ed')} onBlur={() => setFocusedField(null)} placeholder="e.g. 1" style={inputStyle('ed')} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Notes (optional)</label>
                      <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                        onFocus={() => setFocusedField('en')} onBlur={() => setFocusedField(null)}
                        placeholder="e.g. Bank holiday, Annual leave" style={inputStyle('en')} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAddEntry} disabled={!entryStart || !entryDays || savingEntry}
                        style={{ ...bs('primary', 'sm'), opacity: (!entryStart || !entryDays || savingEntry) ? 0.5 : 1, cursor: (!entryStart || !entryDays || savingEntry) ? 'not-allowed' : 'pointer' }}>
                        {savingEntry ? 'Saving...' : 'Add Entry'}
                      </button>
                      <button onClick={() => setShowNewEntry(false)} style={{ ...bs('secondary', 'sm') }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Entries table */}
                {loadingEntries ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 20, height: 20, border: `2.5px solid ${BD}`, borderTopColor: TEAL, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
                  </div>
                ) : entries.length === 0 ? (
                  <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: 0 }}>No holiday entries logged yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F, fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: BG }}>
                          {['Date', 'End', 'Days', 'Pay', 'Notes'].map(h => (
                            <th key={h} style={{
                              padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: TX2,
                              fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => (
                          <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? `1px solid ${BD}` : 'none' }}>
                            <td style={{ padding: '10px 12px', color: TX, whiteSpace: 'nowrap' }}>{fmtDate(e.start_date)}</td>
                            <td style={{ padding: '10px 12px', color: TX2, whiteSpace: 'nowrap' }}>{e.end_date ? fmtDate(e.end_date) : '--'}</td>
                            <td style={{ padding: '10px 12px', color: TX, fontWeight: 600 }}>{e.days_taken}</td>
                            <td style={{ padding: '10px 12px', color: TX2, whiteSpace: 'nowrap' }}>{e.holiday_pay_amount ? `\u00A3${e.holiday_pay_amount.toFixed(2)}` : '--'}</td>
                            <td style={{ padding: '10px 12px', color: TX3 }}>{e.notes || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
