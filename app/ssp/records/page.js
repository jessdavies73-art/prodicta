'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { Ic } from '../../../components/Icons'
import { createClient } from '../../../lib/supabase'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, F, AMB, AMBBG, AMBBD, GRN, GRNBG, GRNBD, cs, bs, ps } from '../../../lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

export default function SSPRecordsPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState([])

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
        .order('created_at', { ascending: false })
      setRecords(rows || [])
      setLoading(false)
    }
    load()
  }, [])

  function fmtDate(d) {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function daysAbsent(sickDate, returnDate) {
    if (!sickDate) return '--'
    const start = new Date(sickDate + 'T00:00:00')
    const end = returnDate ? new Date(returnDate + 'T00:00:00') : new Date()
    end.setHours(0, 0, 0, 0)
    return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + (returnDate ? 0 : 1))
  }

  function sspAmount(r) {
    if (!r.daily_ssp || !r.sick_date) return '--'
    const days = daysAbsent(r.sick_date, r.return_date)
    if (days === '--') return '--'
    return `\u00A3${(r.daily_ssp * days).toFixed(2)}`
  }

  function stepsStatus(r) {
    const steps = [r.step_entitlement_confirmed, r.step_evidence_requested, r.step_payroll_actioned, r.step_review_adjusted, r.step_communication_sent]
    const done = steps.filter(Boolean).length
    return done === 5 ? 'complete' : 'outstanding'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
        <Sidebar active="ssp" companyName="" />
        <main style={{ flex: 1, marginLeft: isMobile ? 0 : 220, marginTop: isMobile ? 56 : 0, padding: isMobile ? '24px 16px' : '36px 40px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
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
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>
                SSP Records
              </h1>
              <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '6px 0 0' }}>
                Complete history of SSP records for your account.
              </p>
            </div>
            <button
              onClick={() => router.push('/ssp')}
              style={{ ...bs('primary', 'md') }}
            >
              New SSP Check
              <Ic name="plus" size={14} color={NAVY} />
            </button>
          </div>

          {/* Retention notice */}
          <div style={{
            borderLeft: `4px solid ${TEAL}`,
            background: TEALLT,
            borderRadius: '0 8px 8px 0',
            padding: '14px 18px',
            marginBottom: 24,
          }}>
            <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0, lineHeight: 1.55 }}>
              SSP records are retained for a minimum of 3 years in accordance with HMRC requirements. Holiday pay records are retained for 6 years.
            </p>
          </div>

          {/* Table */}
          {records.length === 0 ? (
            <div style={{ ...cs, textAlign: 'center', padding: '48px 24px' }}>
              <Ic name="file" size={28} color={BD} />
              <p style={{ fontFamily: F, fontSize: 14, color: TX3, margin: '12px 0 0' }}>
                No SSP records yet. Start by running an eligibility check.
              </p>
            </div>
          ) : (
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F, fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: BG }}>
                      {['Worker', 'Type', 'Sick date', 'Return date', 'Days', 'SSP', 'Status', 'Documents'].map(h => (
                        <th key={h} style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: TX2,
                          fontSize: 11.5,
                          textTransform: 'uppercase',
                          letterSpacing: 0.3,
                          borderBottom: `1px solid ${BD}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => {
                      const status = stepsStatus(r)
                      const days = daysAbsent(r.sick_date, r.return_date)
                      return (
                        <tr key={r.id} style={{ borderBottom: i < records.length - 1 ? `1px solid ${BD}` : 'none' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: TX, whiteSpace: 'nowrap' }}>
                            {r.candidate_name || '--'}
                          </td>
                          <td style={{ padding: '12px 14px', color: TX2, whiteSpace: 'nowrap' }}>
                            {r.employment_type === 'permanent' ? 'Permanent' : 'Temporary'}
                          </td>
                          <td style={{ padding: '12px 14px', color: TX2, whiteSpace: 'nowrap' }}>
                            {fmtDate(r.sick_date)}
                          </td>
                          <td style={{ padding: '12px 14px', color: TX2, whiteSpace: 'nowrap' }}>
                            {r.return_date ? fmtDate(r.return_date) : '--'}
                          </td>
                          <td style={{ padding: '12px 14px', color: TX2 }}>
                            {days}
                          </td>
                          <td style={{ padding: '12px 14px', color: TX, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {sspAmount(r)}
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 50,
                              fontSize: 11,
                              fontWeight: 700,
                              background: status === 'complete' ? GRNBG : AMBBG,
                              color: status === 'complete' ? GRN : AMB,
                              border: `1px solid ${status === 'complete' ? GRNBD : AMBBD}`,
                            }}>
                              {status === 'complete' ? 'All steps complete' : 'Steps outstanding'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {r.compliance_pack_generated && (
                                <span style={{
                                  ...ps(TEALLT, TEALD),
                                  fontSize: 10,
                                  cursor: 'default',
                                }}>
                                  Compliance
                                </span>
                              )}
                              {r.absence_record_url && (
                                <a href={r.absence_record_url} target="_blank" rel="noopener noreferrer" style={{
                                  ...ps(BG, TX2),
                                  fontSize: 10,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                }}>
                                  Absence
                                </a>
                              )}
                              {r.calculation_record_url && (
                                <a href={r.calculation_record_url} target="_blank" rel="noopener noreferrer" style={{
                                  ...ps(BG, TX2),
                                  fontSize: 10,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                }}>
                                  Calculation
                                </a>
                              )}
                              {r.ssp1_form_url && (
                                <a href={r.ssp1_form_url} target="_blank" rel="noopener noreferrer" style={{
                                  ...ps(AMBBG, AMB),
                                  fontSize: 10,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                }}>
                                  SSP1
                                </a>
                              )}
                              {!r.compliance_pack_generated && !r.absence_record_url && !r.calculation_record_url && !r.ssp1_form_url && (
                                <span style={{ fontFamily: F, fontSize: 11, color: TX3 }}>--</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
