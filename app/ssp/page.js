'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { Ic } from '../../components/Icons'
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
      await supabase.from('ssp_records').insert({
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
      })
    } catch (err) {
      // Continue even if save fails — show the result to the user
    }

    setResult({ status, message, badgeType, eligible })
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
          {/* Header */}
          <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: 0 }}>
            SSP Eligibility Checker
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

              {/* Assignment status — only when Temporary */}
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
                  <button
                    onClick={() => router.push('/ssp/calculator')}
                    style={{
                      ...bs('primary', 'lg'),
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    Continue to SSP Calculator
                    <Ic name="right" size={16} color={NAVY} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
