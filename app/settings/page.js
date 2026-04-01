'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, RED, REDBG, REDBD,
  F, FM, cs, bs,
} from '@/lib/constants'

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44,
          border: `3px solid ${BD}`,
          borderTop: `3px solid ${TEAL}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <div style={{ color: TX2, fontSize: 14, fontFamily: F }}>Loading settings…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

function Toast({ message, type = 'success', onDismiss }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 16px',
      borderRadius: 9,
      background: isSuccess ? GRNBG : REDBG,
      border: `1px solid ${isSuccess ? GRNBD : REDBD}`,
      color: isSuccess ? GRN : RED,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: F,
    }}>
      <Ic name={isSuccess ? 'check' : 'alert'} size={14} color={isSuccess ? GRN : RED} />
      {message}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 12.5,
      fontWeight: 700,
      color: TX2,
      marginBottom: 6,
      fontFamily: F,
      letterSpacing: '0.02em',
    }}>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', readOnly = false, focused, onFocus, onBlur }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        fontFamily: F,
        fontSize: 14,
        width: '100%',
        padding: '10px 14px',
        borderRadius: 8,
        border: `1.5px solid ${focused ? TEAL : BD}`,
        background: readOnly ? BG : CARD,
        color: readOnly ? TX3 : TX,
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
        cursor: readOnly ? 'default' : 'text',
      }}
    />
  )
}

function SelectInput({ value, onChange, children, focused, onFocus, onBlur }) {
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        fontFamily: F,
        fontSize: 14,
        width: '100%',
        padding: '10px 14px',
        borderRadius: 8,
        border: `1.5px solid ${focused ? TEAL : BD}`,
        background: CARD,
        color: value ? TX : TX3,
        outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
        cursor: 'pointer',
        appearance: 'none',
      }}
    >
      {children}
    </select>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState('company')

  // Company tab state
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [companyToast, setCompanyToast] = useState(null)
  const [companyFocused, setCompanyFocused] = useState(false)
  const [industryFocused, setIndustryFocused] = useState(false)
  const [companySizeFocused, setCompanySizeFocused] = useState(false)
  const [accountType, setAccountType] = useState('employer')
  const [accountTypeFocused, setAccountTypeFocused] = useState(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordToast, setPasswordToast] = useState(null)
  const [pwFocused, setPwFocused] = useState(false)
  const [cpwFocused, setCpwFocused] = useState(false)

  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) { router.push('/login'); return }

        setUserEmail(user.email || '')

        const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile({ ...prof, id: user.id })
        setCompanyName(prof?.company_name || '')
        setIndustry(prof?.industry || '')
        setCompanySize(prof?.company_size || '')
        setAccountType(prof?.account_type || 'employer')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleSaveCompany() {
    setSavingCompany(true)
    setCompanyToast(null)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('users')
        .update({ company_name: companyName, industry: industry || null, company_size: companySize || null, account_type: accountType })
        .eq('id', profile.id)
      if (updateErr) throw updateErr
      setProfile(prev => ({ ...prev, company_name: companyName, industry, company_size: companySize, account_type: accountType }))
      setCompanyToast({ type: 'success', message: 'Changes saved.' })
      setTimeout(() => setCompanyToast(null), 3500)
    } catch (err) {
      setCompanyToast({ type: 'error', message: err.message })
    } finally {
      setSavingCompany(false)
    }
  }

  async function handleUpdatePassword() {
    setPasswordToast(null)
    if (newPassword.length < 8) {
      setPasswordToast({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordToast({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr
      setNewPassword('')
      setConfirmPassword('')
      setPasswordToast({ type: 'success', message: 'Password updated successfully.' })
      setTimeout(() => setPasswordToast(null), 3500)
    } catch (err) {
      setPasswordToast({ type: 'error', message: err.message })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const TABS = [
    { key: 'company', label: 'Company' },
    { key: 'billing', label: 'Billing' },
    { key: 'team', label: 'Team' },
  ]

  const INDUSTRIES = [
    'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing',
    'Professional Services', 'Education', 'Legal', 'Other',
  ]

  const COMPANY_SIZES = [
    '1–10 employees', '11–50 employees', '51–200 employees',
    '201–1000 employees', '1000+ employees',
  ]

  const STARTER_FEATURES = [
    'Unlimited assessments',
    'AI scenario generation',
    'AI candidate scoring',
    'Email invitations',
    'Candidate comparison',
    'Benchmarking',
  ]

  const emailInitial = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="settings" companyName={profile?.company_name} />
      <main style={{
        marginLeft: 220,
        padding: '36px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: '-0.5px' }}>
            Settings
          </h1>
        </div>

        {error && (
          <div style={{
            ...cs,
            background: REDBG,
            border: `1px solid ${REDBD}`,
            color: RED,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            padding: '14px 18px',
          }}>
            <Ic name="alert" size={16} color={RED} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          background: CARD,
          border: `1px solid ${BD}`,
          borderRadius: 10,
          padding: 4,
          width: 'fit-content',
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 22px',
                  borderRadius: 7,
                  border: 'none',
                  background: isActive ? TEALLT : 'transparent',
                  color: isActive ? TEALD : TX2,
                  fontFamily: F,
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderBottom: isActive ? `2px solid ${TEAL}` : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Company profile tab */}
        {activeTab === 'company' && (
          <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: TX }}>
                Company details
              </h2>

              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Company name</FieldLabel>
                <TextInput
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                  focused={companyFocused}
                  onFocus={() => setCompanyFocused(true)}
                  onBlur={() => setCompanyFocused(false)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Industry</FieldLabel>
                <SelectInput
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  focused={industryFocused}
                  onFocus={() => setIndustryFocused(true)}
                  onBlur={() => setIndustryFocused(false)}
                >
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </SelectInput>
              </div>

              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Company size</FieldLabel>
                <SelectInput
                  value={companySize}
                  onChange={e => setCompanySize(e.target.value)}
                  focused={companySizeFocused}
                  onFocus={() => setCompanySizeFocused(true)}
                  onBlur={() => setCompanySizeFocused(false)}
                >
                  <option value="">Select company size…</option>
                  {COMPANY_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </SelectInput>
              </div>

              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Account type</FieldLabel>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: TX3, fontFamily: F }}>
                  Are you a direct employer or a recruitment agency?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'employer', label: 'Direct Employer' },
                    { value: 'agency',   label: 'Recruitment Agency' },
                  ].map(opt => {
                    const active = accountType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAccountType(opt.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `1.5px solid ${active ? TEAL : BD}`,
                          background: active ? TEALLT : BG,
                          color: active ? TEALD : TX2,
                          fontFamily: F,
                          fontSize: 13.5,
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleSaveCompany}
                  disabled={savingCompany}
                  style={{
                    ...bs('primary', 'md'),
                    opacity: savingCompany ? 0.65 : 1,
                    cursor: savingCompany ? 'wait' : 'pointer',
                  }}
                >
                  <Ic name="check" size={15} color={NAVY} />
                  {savingCompany ? 'Saving…' : 'Save changes'}
                </button>
                {companyToast && <Toast message={companyToast.message} type={companyToast.type} />}
              </div>
            </div>

            {/* Account security */}
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: TX }}>
                Account security
              </h2>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel>New password</FieldLabel>
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={e => { setNewPassword(e.target.value); setPasswordToast(null) }}
                  placeholder="Minimum 8 characters"
                  focused={pwFocused}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <FieldLabel>Confirm new password</FieldLabel>
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordToast(null) }}
                  placeholder="Re-enter new password"
                  focused={cpwFocused}
                  onFocus={() => setCpwFocused(true)}
                  onBlur={() => setCpwFocused(false)}
                />
                {confirmPassword.length > 0 && (
                  <div style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: newPassword === confirmPassword ? GRN : RED,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Ic
                      name={newPassword === confirmPassword ? 'check' : 'x'}
                      size={12}
                      color={newPassword === confirmPassword ? GRN : RED}
                    />
                    {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleUpdatePassword}
                  disabled={savingPassword}
                  style={{
                    ...bs('primary', 'md'),
                    opacity: savingPassword ? 0.65 : 1,
                    cursor: savingPassword ? 'wait' : 'pointer',
                  }}
                >
                  <Ic name="shield" size={15} color={NAVY} />
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
                {passwordToast && <Toast message={passwordToast.message} type={passwordToast.type} />}
              </div>
            </div>
          </div>
        )}

        {/* Billing tab */}
        {activeTab === 'billing' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: TX }}>
                Your plan
              </h2>

              {/* Plan card */}
              <div style={{
                background: NAVY,
                borderRadius: 12,
                padding: '22px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                      Founding Member
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: TEAL, lineHeight: 1 }}>
                      £79<span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>/month</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                      Unlimited. No seat limits, no usage caps.
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: 50,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${TEAL}25`,
                    color: TEAL,
                    border: `1px solid ${TEAL}55`,
                    flexShrink: 0,
                  }}>
                    Active
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STARTER_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Ic name="check" size={14} color={TEAL} />
                      <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', fontFamily: F }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing details */}
              <div style={{
                background: BG,
                border: `1px solid ${BD}`,
                borderRadius: 10,
                padding: '16px 18px',
                marginBottom: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: TX2, fontFamily: F }}>Next billing date</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TX, fontFamily: F }}>1 May 2025</span>
                </div>
                <div style={{ height: 1, background: BD }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: TX2, fontFamily: F }}>Payment method</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TX3, fontFamily: F }}>•••• •••• •••• 4242</span>
                </div>
              </div>

              <button
                disabled
                style={{ ...bs('primary', 'md'), opacity: 0.5, cursor: 'default' }}
              >
                Manage billing
              </button>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: TX3, fontFamily: F }}>
                Billing management coming soon
              </p>
            </div>
          </div>
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: TX }}>
                Team members
              </h2>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: BG,
                border: `1px solid ${BD}`,
                borderRadius: 10,
                marginBottom: 20,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: TEALLT,
                  border: `1.5px solid ${TEAL}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FM,
                  fontSize: 15,
                  fontWeight: 700,
                  color: TEALD,
                  flexShrink: 0,
                }}>
                  {emailInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: TX,
                    fontFamily: F,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {userEmail}
                  </span>
                </div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: 50,
                  fontSize: 11,
                  fontWeight: 700,
                  background: TEALLT,
                  color: TEALD,
                  border: `1px solid ${TEAL}55`,
                  flexShrink: 0,
                }}>
                  Owner
                </span>
              </div>

              <button
                disabled
                style={{
                  ...bs('primary', 'md'),
                  opacity: 0.5,
                  cursor: 'default',
                }}
              >
                <Ic name="plus" size={15} color={NAVY} />
                Invite team member
              </button>
              <p style={{ margin: '10px 0 0', fontSize: 12, color: TX3, fontFamily: F }}>
                Team management coming soon
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
