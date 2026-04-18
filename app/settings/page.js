'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, RED, REDBG, REDBD,
  F, FM, cs, bs,
} from '@/lib/constants'

const DEFAULT_WEIGHTS = { Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 }

function LoadingSpinner() {
  const isMobile = useIsMobile()
  const shimmer = {
    background: 'linear-gradient(90deg, #e4e9f0 25%, #f1f5f9 50%, #e4e9f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 10,
  }
  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="settings" />
      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '36px 40px', minHeight: '100vh', background: BG, flex: 1 }}>
        <div style={{ ...shimmer, height: 34, width: 180, marginBottom: 36 }} />
        <div style={{ ...shimmer, height: 52, width: 340, marginBottom: 28, borderRadius: 8 }} />
        <div style={{ ...shimmer, height: 260, marginBottom: 20 }} />
        <div style={{ ...shimmer, height: 200, marginBottom: 20 }} />
        <div style={{ ...shimmer, height: 160 }} />
      </main>
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
      animation: 'fadeInUp 0.25s ease-out',
    }}>
      {isSuccess ? (
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: GRN, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : (
        <Ic name="alert" size={14} color={RED} />
      )}
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
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState('company')

  // Company tab state
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)
  const [companyToast, setCompanyToast] = useState(null)
  const [companyFocused, setCompanyFocused] = useState(false)
  const [industryFocused, setIndustryFocused] = useState(false)
  const [companySizeFocused, setCompanySizeFocused] = useState(false)
  // Credits (pay-per-assessment)
  const [assessmentCredits, setAssessmentCredits] = useState([])
  const [paygTab, setPaygTab] = useState('credits') // 'credits' | 'subscription'
  const [buyQty, setBuyQty] = useState({}) // { [credit_type]: number }
  const [buyingType, setBuyingType] = useState(null)
  const [switchConfirm, setSwitchConfirm] = useState(null) // { plan, price, key }
  const [switchSubmitting, setSwitchSubmitting] = useState(false)

  // Promo codes
  const [promoInput, setPromoInput] = useState('')
  const [promoRedemptions, setPromoRedemptions] = useState([])
  const [promoToast, setPromoToast] = useState(null)
  const [promoSubmitting, setPromoSubmitting] = useState(false)
  const [promoFocused, setPromoFocused] = useState(false)

  // Weightings tab (employer only)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [savingWeights, setSavingWeights] = useState(false)
  const [weightsToast, setWeightsToast] = useState(null)

  // Alerts tab
  const [alertThreshold, setAlertThreshold] = useState(50)
  const [savingAlerts, setSavingAlerts] = useState(false)
  const [alertsToast, setAlertsToast] = useState(null)
  const [alertThresholdFocused, setAlertThresholdFocused] = useState(false)
  const [candidateFeedbackEnabled, setCandidateFeedbackEnabled] = useState(false)
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)
  // Default employment type
  const [defaultEmploymentType, setDefaultEmploymentType] = useState('ask')
  const [savingEmploymentType, setSavingEmploymentType] = useState(false)
  const [employmentTypeToast, setEmploymentTypeToast] = useState(null)

  // Logo upload (agency only)
  const [companyLogoUrl, setCompanyLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoToast, setLogoToast] = useState(null)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordToast, setPasswordToast] = useState(null)
  const [pwFocused, setPwFocused] = useState(false)
  const [cpwFocused, setCpwFocused] = useState(false)

  const [error, setError] = useState(null)
  const [monthlyCount, setMonthlyCount] = useState(0)

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
        setWeights({ ...DEFAULT_WEIGHTS, ...(prof?.default_weightings || {}) })
        setAlertThreshold(prof?.alert_threshold ?? 50)
        setCandidateFeedbackEnabled(prof?.candidate_feedback_enabled === true)
        setDefaultEmploymentType(prof?.default_employment_type || 'ask')
        setCompanyLogoUrl(prof?.company_logo_url || '')

        // Monthly assessment count for billing tab
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase.from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
        setMonthlyCount(count || 0)

        // Load assessment credits
        const { data: credits } = await supabase.from('assessment_credits')
          .select('credit_type, credits_remaining, credits_purchased, last_purchased_at')
          .eq('user_id', user.id)
        if (credits && credits.length > 0) setAssessmentCredits(credits)

        // Load promo redemption history
        const { data: redemptions } = await supabase.from('promo_redemptions')
          .select('promo_code, redeemed_at')
          .eq('user_id', user.id)
          .order('redeemed_at', { ascending: false })
        if (redemptions) setPromoRedemptions(redemptions)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleConfirmSwitch() {
    if (!switchConfirm) return
    setSwitchSubmitting(true)
    try {
      const res = await fetch('/api/billing/switch-to-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: switchConfirm.key }),
      })
      const body = await res.json()
      if (body?.url) {
        window.location.href = body.url
        return
      }
      throw new Error(body?.error || 'Could not start checkout.')
    } catch (err) {
      setPromoToast({ type: 'error', message: err.message || 'Could not start checkout. Please try again.' })
      setTimeout(() => setPromoToast(null), 4500)
      setSwitchSubmitting(false)
      setSwitchConfirm(null)
    }
  }

  async function handleBuyCredits(credit_type) {
    const quantity = Math.max(1, parseInt(buyQty[credit_type], 10) || 1)
    setBuyingType(credit_type)
    try {
      const res = await fetch('/api/stripe/credit-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_type, quantity }),
      })
      const body = await res.json()
      if (body?.url) window.location.href = body.url
      else throw new Error(body?.error || 'Could not start checkout.')
    } catch (err) {
      setPromoToast({ type: 'error', message: err.message || 'Could not start checkout. Please try again.' })
      setTimeout(() => setPromoToast(null), 4500)
    } finally {
      setBuyingType(null)
    }
  }

  async function handleSaveCompany() {
    setSavingCompany(true)
    setCompanyToast(null)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('users')
        .update({ company_name: companyName, industry: industry || null, company_size: companySize || null })
        .eq('id', profile.id)
      if (updateErr) throw updateErr
      setProfile(prev => ({ ...prev, company_name: companyName, industry, company_size: companySize }))
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 2000)
      setCompanyToast({ type: 'success', message: 'Changes saved.' })
      setTimeout(() => setCompanyToast(null), 3500)
    } catch (err) {
      setCompanyToast({ type: 'error', message: err.message })
    } finally {
      setSavingCompany(false)
    }
  }

  async function handleSaveWeights() {
    setSavingWeights(true)
    setWeightsToast(null)
    try {
      const supabase = createClient()
      const { error: e } = await supabase.from('users').update({ default_weightings: weights }).eq('id', profile.id)
      if (e) throw e
      setWeightsToast({ type: 'success', message: 'Default weightings saved.' })
      setTimeout(() => setWeightsToast(null), 3500)
    } catch (err) {
      setWeightsToast({ type: 'error', message: err.message })
    } finally {
      setSavingWeights(false)
    }
  }

  async function handleRedeemPromo() {
    if (!promoInput.trim()) {
      setPromoToast({ type: 'error', message: 'Please enter a promo code.' })
      return
    }
    setPromoSubmitting(true)
    setPromoToast(null)
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setPromoToast({ type: 'error', message: data.message || 'Could not apply promo code.' })
        return
      }
      setPromoToast({ type: 'success', message: data.message })
      setPromoInput('')
      // Refresh redemptions and credits
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: redemptions } = await supabase.from('promo_redemptions')
          .select('promo_code, redeemed_at')
          .eq('user_id', user.id)
          .order('redeemed_at', { ascending: false })
        if (redemptions) setPromoRedemptions(redemptions)
        const { data: credits } = await supabase.from('assessment_credits')
          .select('credit_type, credits_remaining, credits_purchased, last_purchased_at')
          .eq('user_id', user.id)
        if (credits) setAssessmentCredits(credits)
      }
      setTimeout(() => setPromoToast(null), 4500)
    } catch (err) {
      setPromoToast({ type: 'error', message: 'Could not apply promo code. Please try again.' })
    } finally {
      setPromoSubmitting(false)
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

  async function handleToggleFeedback(next) {
    setSavingFeedback(true)
    setFeedbackToast(null)
    setCandidateFeedbackEnabled(next)
    try {
      const supabase = createClient()
      const { error: e } = await supabase.from('users').update({ candidate_feedback_enabled: next }).eq('id', profile.id)
      if (e) throw e
      setFeedbackToast({ type: 'success', message: next ? 'Candidate feedback enabled.' : 'Candidate feedback disabled.' })
      setTimeout(() => setFeedbackToast(null), 3500)
    } catch (err) {
      setFeedbackToast({ type: 'error', message: err.message })
      setCandidateFeedbackEnabled(!next)
    } finally {
      setSavingFeedback(false)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setLogoToast(null)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const res = await fetch('/api/upload-logo', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setCompanyLogoUrl(json.url)
      setLogoToast({ type: 'success', message: 'Logo uploaded successfully.' })
      setTimeout(() => setLogoToast(null), 3500)
    } catch (err) {
      setLogoToast({ type: 'error', message: err.message })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSaveAlerts() {
    setSavingAlerts(true)
    setAlertsToast(null)
    try {
      const supabase = createClient()
      const { error: e } = await supabase.from('users').update({ alert_threshold: alertThreshold }).eq('id', profile.id)
      if (e) throw e
      setAlertsToast({ type: 'success', message: 'Alert settings saved.' })
      setTimeout(() => setAlertsToast(null), 3500)
    } catch (err) {
      setAlertsToast({ type: 'error', message: err.message })
    } finally {
      setSavingAlerts(false)
    }
  }

  async function handleSaveEmploymentType() {
    setSavingEmploymentType(true)
    setEmploymentTypeToast(null)
    try {
      const supabase = createClient()
      const { error: e } = await supabase.from('users').update({ default_employment_type: defaultEmploymentType }).eq('id', profile.id)
      if (e) throw e
      setProfile(prev => ({ ...prev, default_employment_type: defaultEmploymentType }))
      setEmploymentTypeToast({ type: 'success', message: 'Default assessment type saved.' })
      setTimeout(() => setEmploymentTypeToast(null), 3500)
    } catch (err) {
      setEmploymentTypeToast({ type: 'error', message: err.message })
    } finally {
      setSavingEmploymentType(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const TABS = [
    { key: 'company',    label: 'Company' },
    { key: 'billing',    label: 'Billing' },
    { key: 'team',       label: 'Team' },
    { key: 'alerts',     label: 'Alerts' },
    { key: 'assessments', label: 'Assessments' },
    ...(profile?.account_type === 'employer' ? [{ key: 'weightings', label: 'Score Weightings' }] : []),
  ]

  const INDUSTRIES = [
    'Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing',
    'Professional Services', 'Education', 'Legal', 'Other',
  ]

  const COMPANY_SIZES = [
    '1,10 employees', '11,50 employees', '51,200 employees',
    '201,1000 employees', '1000+ employees',
  ]

  const PLAN_META = {
    starter:      { name: 'Starter',          price: '£49',  limit: 10,    period: 'month', color: TEAL,      desc: 'Perfect for small teams getting started with AI assessment.' },
    professional: { name: 'Professional',     price: '£120', limit: 30,    period: 'month', color: '#7C3AED', desc: 'For growing teams with higher hiring volumes.' },
    unlimited:    { name: 'Unlimited',        price: '£159', limit: null,  period: 'month', color: GRN,       desc: 'Unlimited assessments for high-volume hiring.' },
    founding:     { name: 'Founding Member',  price: '£79',  limit: null,  period: 'month', color: TEAL,      desc: 'Founder pricing locked in. Unlimited for the first 3 months, then 20 per month.' },
    // Legacy keys retained so existing rows render correctly
    growth:       { name: 'Professional',     price: '£120', limit: 30,    period: 'month', color: '#7C3AED', desc: 'For growing teams with higher hiring volumes.' },
    scale:        { name: 'Unlimited',        price: '£159', limit: null,  period: 'month', color: GRN,       desc: 'Unlimited assessments for high-volume hiring.' },
  }
  const PLAN_FEATURES = {
    starter:      ['10 assessments per month', 'AI scenario assessment', 'Pressure-Fit scoring', 'Response integrity check', 'Watch-outs and interview questions'],
    professional: ['30 assessments per month', 'Everything in Starter', 'Candidate comparison', 'Benchmarking', 'Onboarding plans'],
    unlimited:    ['Unlimited assessments', 'Everything in Professional', 'Archive and outcomes tracking', 'Agency features', 'Priority support'],
    founding:     ['Unlimited assessments for first 3 months', 'Then 20 per month', 'Everything in Unlimited', 'Founding member rate locked in for 12 months', 'Direct feedback line', 'Feature co-creation'],
    growth:       ['30 assessments per month', 'Everything in Starter', 'Candidate comparison', 'Benchmarking', 'Onboarding plans'],
    scale:        ['Unlimited assessments', 'Everything in Professional', 'Archive and outcomes tracking', 'Agency features', 'Priority support'],
  }
  const planKey    = (profile?.plan || 'starter').toLowerCase()
  const planMeta   = PLAN_META[planKey] || PLAN_META.starter
  const planFeats  = PLAN_FEATURES[planKey] || PLAN_FEATURES.starter
  const planLimit  = planMeta.limit
  const isUnlimited = planLimit === null
  const usagePct   = isUnlimited ? 0 : Math.min(100, Math.round((monthlyCount / planLimit) * 100))
  const atLimit    = !isUnlimited && monthlyCount >= planLimit
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const isPayg = profile?.plan_type === 'payg' || profile?.plan === 'payg'
  const hasActiveSubscription = profile?.subscription_status === 'active' && !isPayg
  const hasCredits = assessmentCredits.length > 0
  const payAsYouGoOnly = !hasActiveSubscription && hasCredits

  const emailInitial = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="settings" companyName={profile?.company_name} />
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        padding: isMobile ? '72px 16px 32px' : '36px 40px',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={handleSaveCompany}
                  disabled={savingCompany}
                  style={{
                    ...bs('primary', 'md'),
                    opacity: savingCompany ? 0.65 : 1,
                    cursor: savingCompany ? 'wait' : 'pointer',
                    background: companySaved
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : undefined,
                  }}
                >
                  {companySaved ? (
                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <Ic name="check" size={15} color={NAVY} />
                  )}
                  {savingCompany ? 'Saving…' : companySaved ? 'Saved!' : 'Save changes'}
                </button>
                {companyToast && <Toast message={companyToast.message} type={companyToast.type} />}
              </div>
            </div>

            {/* Agency logo upload */}
            {profile?.account_type === 'agency' && (
              <div style={{ ...cs }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX }}>
                  Company logo
                </h2>
                <p style={{ margin: '0 0 18px', fontSize: 13, color: TX2, lineHeight: 1.65 }}>
                  Upload your company logo to brand candidate development reports and feedback pages. Accepted formats: PNG, JPEG. Maximum 2MB.
                </p>
                {companyLogoUrl && (
                  <div style={{ marginBottom: 16, padding: 12, background: BG, border: `1px solid ${BD}`, borderRadius: 8, display: 'inline-block' }}>
                    <img src={companyLogoUrl} alt="Company logo" style={{ maxWidth: 200, maxHeight: 80, display: 'block' }} />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: F,
                    background: TEALLT, border: `1.5px solid ${TEAL}`, color: TEALD,
                    cursor: uploadingLogo ? 'wait' : 'pointer', opacity: uploadingLogo ? 0.65 : 1,
                  }}>
                    <Ic name="upload" size={14} color={TEALD} />
                    {uploadingLogo ? 'Uploading...' : companyLogoUrl ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {logoToast && <Toast message={logoToast.message} type={logoToast.type} />}
                </div>
              </div>
            )}

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
          <div style={{ maxWidth: 560 }}>

            {/* ── Pay-as-you-go header (no subscription, credits only) ── */}
            {payAsYouGoOnly && (
              <div style={{
                ...cs, marginBottom: 16,
                borderTop: `3px solid ${TEAL}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: TEALLT,
                    border: `1px solid ${TEAL}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ic name="shield" size={15} color={TEALD} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TX }}>Pay as you go</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: TX3, fontFamily: F }}>
                      You are on pay-per-assessment. No monthly subscription. Use credits as you need them.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Current plan card (subscription users only) ── */}
            {hasActiveSubscription && (<>
            <div style={{ ...cs, marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: TX }}>Current plan</h2>
              <div style={{
                background: NAVY, borderRadius: 12, padding: '24px 26px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.2px' }}>
                      {planMeta.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontFamily: F, fontSize: 30, fontWeight: 800, color: planMeta.color, lineHeight: 1, letterSpacing: '-0.5px' }}>{planMeta.price}</span>
                      <span style={{ fontFamily: F, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>/{planMeta.period}</span>
                    </div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
                      {planMeta.desc}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 13px', borderRadius: 50, fontSize: 11, fontWeight: 700,
                    background: `${TEAL}22`, color: TEAL, border: `1px solid ${TEAL}44`,
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
                    Active
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {planFeats.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Ic name="check" size={13} color={planMeta.color} />
                      <span style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.75)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Usage counter ── */}
              <div style={{
                background: BG, border: `1px solid ${atLimit ? '#fecaca' : BD}`,
                borderRadius: 10, padding: '16px 18px', marginBottom: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isUnlimited ? 0 : 10 }}>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TX, marginBottom: 2 }}>
                      Assessments used: {monthLabel}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>
                      {isUnlimited
                        ? `${monthlyCount} created this month · Unlimited`
                        : `${monthlyCount} of ${planLimit} used`
                      }
                    </div>
                  </div>
                  <div style={{
                    fontFamily: F, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
                    color: atLimit ? RED : isUnlimited ? GRN : TX,
                  }}>
                    {isUnlimited ? '∞' : `${monthlyCount}/${planLimit}`}
                  </div>
                </div>
                {!isUnlimited && (
                  <div>
                    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 50, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 50, transition: 'width 0.4s ease',
                        width: `${usagePct}%`,
                        background: atLimit
                          ? RED
                          : usagePct >= 80
                          ? AMB
                          : `linear-gradient(90deg, ${TEAL}, ${TEALD})`,
                      }} />
                    </div>
                    {atLimit && (
                      <div style={{ fontFamily: F, fontSize: 12, color: RED, fontWeight: 600, marginTop: 6 }}>
                        Limit reached. Upgrade to create more assessments this month.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Subscription status ── */}
            <div style={{ ...cs, marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: TX }}>Subscription</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: BG, border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden' }}>
                {[
                  { label: 'Status', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: GRN }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: GRN, display: 'inline-block' }} />Active</span> },
                  { label: 'Plan', value: <span style={{ fontWeight: 600, color: TX }}>{planMeta.name} · {planMeta.price}/mo</span> },
                  { label: 'Billing', value: <span style={{ color: TX2 }}>Monthly</span> },
                  { label: 'Payment method', value: <span style={{ color: TX3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>Managed by Prodicta</span> },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', fontFamily: F, fontSize: 13.5,
                    borderBottom: i < arr.length - 1 ? `1px solid ${BD}` : 'none',
                  }}>
                    <span style={{ color: TX2 }}>{label}</span>
                    {value}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Upgrade / manage ── */}
            {!isUnlimited ? (
              <div style={{ ...cs }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TX }}>Upgrade your plan</h2>
                <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 20px', lineHeight: 1.6 }}>
                  Get more assessments and unlock premium features.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {[
                    { plan: 'Professional', price: '£120/mo', limit: '30 assessments/mo', current: planKey === 'professional' || planKey === 'growth' },
                    { plan: 'Unlimited', price: '£159/mo', limit: 'Unlimited', current: planKey === 'unlimited' || planKey === 'scale' },
                    { plan: 'Founding Member', price: '£79/mo', limit: 'Unlimited for 3 months, then 20/mo', current: planKey === 'founding' },
                  ].filter(p => !p.current).map(p => (
                    <div key={p.plan} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${BD}`,
                      background: '#fff',
                    }}>
                      <div>
                        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{p.plan}</div>
                        <div style={{ fontFamily: F, fontSize: 12.5, color: TX3 }}>{p.limit}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{p.price}</span>
                        <a
                          href={`mailto:hello@prodicta.co.uk?subject=Upgrade to ${p.plan}`}
                          style={{
                            fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY,
                            background: TEAL, textDecoration: 'none',
                            padding: '7px 16px', borderRadius: 7,
                          }}
                        >
                          Upgrade
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: 0 }}>
                  To upgrade, email <a href="mailto:hello@prodicta.co.uk" style={{ color: TEALD }}>hello@prodicta.co.uk</a> and we'll update your plan within 24 hours.
                </p>
              </div>
            ) : (
              <div style={{ ...cs }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TX }}>Manage billing</h2>
                <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 16px', lineHeight: 1.6 }}>
                  To make changes to your subscription or billing details, contact us directly.
                </p>
                <a
                  href="mailto:hello@prodicta.co.uk?subject=Billing enquiry"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY,
                    background: TEAL, textDecoration: 'none',
                    padding: '10px 20px', borderRadius: 9,
                  }}
                >
                  Contact us →
                </a>
              </div>
            )}
            </>)}

            {/* ── PAYG two-tab billing (payg accounts only) ── */}
            {isPayg && (() => {
              const PAYG_TYPES = [
                { type: 'rapid-screen', label: 'Rapid Screen', unit: 6,  description: 'A 5-8 minute work simulation. Gives a Strong Proceed, Interview Worthwhile, or High Risk signal with a Placement Survival Score, top strengths, and key watch-outs. 1 scenario. No full narrative report.' },
                { type: 'speed-fit',    label: 'Speed-Fit',    unit: 18, description: 'A 15 minute assessment with 2 work scenarios and a full scored report including strengths, watch-outs with Week 1 interventions, skills breakdown, and interview brief. Recommended for most roles.' },
                { type: 'depth-fit',    label: 'Depth-Fit',    unit: 35, description: 'A 25 minute deep assessment with 2 work scenarios and a full narrative report, detailed competency breakdown, Monday Morning Reality, counter-offer resilience score, and tailored coaching notes.' },
                { type: 'strategy-fit', label: 'Strategy-Fit', unit: 65, description: 'A 45 minute leadership assessment with 2 work scenarios, a Day 1 workspace simulation, full narrative report, strategic thinking evaluation, stakeholder management brief, and executive summary.' },
              ]
              const PLANS = [
                { key: 'starter',      plan: 'Starter',         price: '£49/mo',  priceNum: 49,  limit: '10 assessments per month' },
                { key: 'professional', plan: 'Professional',    price: '£120/mo', priceNum: 120, limit: '30 assessments per month' },
                { key: 'unlimited',    plan: 'Unlimited',       price: '£159/mo', priceNum: 159, limit: 'Unlimited assessments' },
                { key: 'founding',     plan: 'Founding Member', price: '£79/mo',  priceNum: 79,  limit: 'Unlimited for 3 months, then 20/month' },
              ]
              return (
                <div style={{ ...cs, marginBottom: 16 }}>
                  {/* Tab toggle */}
                  <div style={{ display: 'flex', gap: 28, borderBottom: `1px solid ${BD}`, marginBottom: 22 }}>
                    {[
                      { key: 'credits',      label: 'Pay As You Go' },
                      { key: 'subscription', label: 'Monthly Subscription' },
                    ].map(t => {
                      const active = paygTab === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setPaygTab(t.key)}
                          style={{
                            fontFamily: F, fontSize: 14, fontWeight: active ? 700 : 500,
                            color: active ? TEALD : TX2,
                            background: 'transparent', border: 'none', padding: '10px 0',
                            borderBottom: active ? `2px solid ${TEAL}` : '2px solid transparent',
                            marginBottom: -1, cursor: 'pointer',
                          }}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>

                  {paygTab === 'credits' && (
                    <div>
                      <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: TX }}>Your Credits</h2>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24,
                      }}>
                        {PAYG_TYPES.map(t => {
                          const credit = assessmentCredits.find(c => c.credit_type === t.type)
                          const remaining = credit?.credits_remaining ?? 0
                          return (
                            <div key={t.type} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center' }}>
                              <div style={{ fontFamily: FM, fontWeight: 800, fontSize: 32, color: remaining > 0 ? TEAL : TX3, lineHeight: 1 }}>{remaining}</div>
                              <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, marginTop: 8 }}>{t.label}</div>
                              <div style={{ fontFamily: F, fontSize: 12, color: TX3, marginTop: 2 }}>£{t.unit} each</div>
                            </div>
                          )
                        })}
                      </div>

                      <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: TX }}>Buy more credits</h3>
                      <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: '0 0 14px', lineHeight: 1.55 }}>
 The higher the assessment level the more detailed the report. Rapid Screen gives a quick signal, Speed-Fit and above give the full picture.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {PAYG_TYPES.map(t => {
                          const qty = Math.max(1, parseInt(buyQty[t.type], 10) || 1)
                          const total = qty * t.unit
                          const busy = buyingType === t.type
                          return (
                            <div key={t.type} style={{
                              padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${BD}`, background: '#fff',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                                <div style={{ minWidth: 160 }}>
                                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{t.label} · £{t.unit}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <input
                                    type="number" min={1} max={100}
                                    value={buyQty[t.type] ?? 1}
                                    onChange={e => setBuyQty(prev => ({ ...prev, [t.type]: e.target.value }))}
                                    style={{
                                      width: 70, padding: '7px 10px', borderRadius: 7,
                                      border: `1.5px solid ${BD}`, background: CARD,
                                      fontFamily: FM, fontSize: 14, fontWeight: 700, color: TX, textAlign: 'right',
                                      outline: 'none',
                                    }}
                                  />
                                  <span style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: NAVY, minWidth: 60, textAlign: 'right' }}>£{total}</span>
                                  <button
                                    onClick={() => handleBuyCredits(t.type)}
                                    disabled={busy}
                                    style={{
                                      fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY,
                                      background: TEAL, border: 'none', padding: '7px 16px', borderRadius: 7,
                                      cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
                                    }}
                                  >
                                    {busy ? 'Opening…' : 'Buy'}
                                  </button>
                                </div>
                              </div>
                              <p style={{ fontFamily: F, fontSize: 12.5, color: TX2, margin: 0, lineHeight: 1.55 }}>
                                {t.description}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {paygTab === 'subscription' && (
                    <div>
                      <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX }}>Switch to a monthly subscription</h2>
                      <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                        Get a bundle of assessments each month.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {PLANS.map(p => (
                          <div key={p.plan} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${BD}`, background: '#fff',
                          }}>
                            <div>
                              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{p.plan}</div>
                              <div style={{ fontFamily: F, fontSize: 12.5, color: TX3 }}>{p.limit}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{p.price}</span>
                              <button
                                onClick={() => setSwitchConfirm(p)}
                                style={{
                                  fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY,
                                  background: TEAL, border: 'none',
                                  padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
                                }}
                              >
                                Switch
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Promo code ── */}
            <div style={{ ...cs, marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX }}>Promo code</h2>
              <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: '0 0 14px', lineHeight: 1.6 }}>
                Have a code from our team? Enter it below to unlock free Rapid Screens or other rewards.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: promoToast ? 12 : 0 }}>
                <input
                  type="text"
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  onFocus={() => setPromoFocused(true)}
                  onBlur={() => setPromoFocused(false)}
                  placeholder="Enter promo code"
                  style={{
                    flex: '1 1 220px',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${promoFocused ? TEAL : BD}`,
                    background: CARD,
                    fontFamily: F,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    color: TX,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleRedeemPromo}
                  disabled={promoSubmitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: TEAL,
                    color: NAVY,
                    fontFamily: F,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: promoSubmitting ? 'default' : 'pointer',
                    opacity: promoSubmitting ? 0.7 : 1,
                  }}
                >
                  {promoSubmitting ? 'Applying...' : 'Apply'}
                </button>
              </div>
              {promoToast && (
                <div style={{ marginTop: 12 }}>
                  <Toast message={promoToast.message} type={promoToast.type} />
                </div>
              )}
              {promoRedemptions.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BD}` }}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Redemption history
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {promoRedemptions.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: BG, border: `1px solid ${BD}`, borderRadius: 8 }}>
                        <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: NAVY, letterSpacing: '0.04em' }}>{r.promo_code}</span>
                        <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>
                          {r.redeemed_at ? new Date(r.redeemed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

 {/* ── Assessment Credits (pay-per-assessment, not PAYG, PAYG has its own card above) ── */}
            {hasCredits && !isPayg && (
              <div style={{ ...cs, marginBottom: 16 }}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: TX }}>Assessment Credits</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {[
                    { type: 'rapid-screen', label: 'Rapid Screen' },
                    { type: 'speed-fit', label: 'Speed-Fit' },
                    { type: 'depth-fit', label: 'Depth-Fit' },
                    { type: 'strategy-fit', label: 'Strategy-Fit' },
                    { type: 'immersive', label: 'Immersive Add-on' },
                  ].map(ct => {
                    const credit = assessmentCredits.find(c => c.credit_type === ct.type)
                    if (!credit) return null
                    return (
                      <div key={ct.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: BG, border: `1px solid ${BD}`, borderRadius: 8 }}>
                        <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX }}>{ct.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: credit.credits_remaining > 0 ? TEAL : TX3 }}>{credit.credits_remaining}</span>
                          <span style={{ fontFamily: F, fontSize: 11, color: TX3 }}>remaining</span>
                        </div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
                {(() => {
                  const lastPurchase = assessmentCredits.reduce((latest, c) => {
                    if (!c.last_purchased_at) return latest
                    return !latest || new Date(c.last_purchased_at) > new Date(latest) ? c.last_purchased_at : latest
                  }, null)
                  return lastPurchase ? (
                    <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: '0 0 14px' }}>
                      Last purchase: {new Date(lastPurchase).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  ) : null
                })()}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href="/billing/credits" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 8, border: 'none',
                    background: TEAL, color: NAVY, fontFamily: F, fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                  }}>
                    Buy more credits
                  </a>
                  <a href="mailto:hello@prodicta.co.uk?subject=Switch to monthly subscription" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${BD}`,
                    background: 'transparent', color: TX2, fontFamily: F, fontSize: 13, fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                    Switch to monthly subscription
                  </a>
                </div>
              </div>
            )}

 {/* ── No subscription and no credits: prompt to start (not PAYG, PAYG has its own card) ── */}
            {!hasActiveSubscription && !hasCredits && !isPayg && (
              <div style={{ ...cs }}>
                <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: TX }}>Choose a billing option</h2>
                <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 18px', lineHeight: 1.6 }}>
                  Start with a monthly subscription for unlimited or volume hiring, or pay per assessment with no commitment.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href="/#pricing" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '11px 22px', borderRadius: 9, border: 'none',
                    background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 700,
                    textDecoration: 'none',
                  }}>
                    See pricing
                  </a>
                  <a href="mailto:hello@prodicta.co.uk?subject=Subscription enquiry" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '11px 22px', borderRadius: 9, border: `1.5px solid ${BD}`,
                    background: 'transparent', color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600,
                    textDecoration: 'none',
                  }}>
                    Contact us
                  </a>
                </div>
              </div>
            )}
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

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 8 }}>Red Flag Alerts <InfoTooltip text="Configure the score threshold that triggers automatic email alerts when candidates are flagged." /></h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: TX2, lineHeight: 1.65 }}>
                PRODICTA will automatically send you an email alert when a candidate is scored and meets any of the following criteria: their overall score falls below your threshold, they have a high severity watch-out, or their response integrity raises a concern.
              </p>

              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '16px 18px', marginBottom: 24 }}>
                <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Trigger conditions
                </div>
                {[
                  `Overall score is below your threshold (currently ${alertThreshold})`,
                  'Any high severity watch-out is identified',
                  'Response integrity flags a concern (Possibly AI-Assisted or Suspicious)',
                ].map((condition, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: RED, marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>{condition}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <FieldLabel>Alert threshold score (0-100)</FieldLabel>
                <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: '0 0 10px', lineHeight: 1.55 }}>
                  You will receive an alert whenever a candidate scores below this number. Default is 50.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={alertThreshold}
                    onChange={e => setAlertThreshold(Math.max(0, Math.min(100, Number(e.target.value))))}
                    onFocus={() => setAlertThresholdFocused(true)}
                    onBlur={() => setAlertThresholdFocused(false)}
                    style={{
                      fontFamily: FM,
                      fontSize: 15,
                      width: 80,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1.5px solid ${alertThresholdFocused ? TEAL : BD}`,
                      background: CARD,
                      color: TX,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontFamily: F, fontSize: 13, color: TX3 }}>out of 100</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: RED, cursor: 'pointer', marginTop: 12 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>0 (alert on all)</span>
                  <span style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>100 (alert on none)</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSaveAlerts}
                  disabled={savingAlerts}
                  style={{
                    ...bs('primary', 'md'),
                    opacity: savingAlerts ? 0.55 : 1,
                    cursor: savingAlerts ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Ic name="check" size={15} color={NAVY} />
                  {savingAlerts ? 'Saving...' : 'Save alert settings'}
                </button>
                {alertsToast && <Toast message={alertsToast.message} type={alertsToast.type} />}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: TX3, fontFamily: F, lineHeight: 1.6 }}>
                Alert emails are sent to your account email address immediately after scoring completes.
              </p>
            </div>

            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 8 }}>
                Candidate feedback page
                <InfoTooltip text="When enabled, candidates will see their strengths and development areas after completing the assessment. They will never see scores, risk levels, or hiring decisions." />
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: TX2, lineHeight: 1.65 }}>
                When enabled, candidates will see their strengths and development areas after completing the assessment. They will never see scores, risk levels, or hiring decisions.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 18px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleFeedback(!candidateFeedbackEnabled)}
                  disabled={savingFeedback}
                  aria-pressed={candidateFeedbackEnabled}
                  style={{
                    width: 44, height: 24, borderRadius: 999,
                    background: candidateFeedbackEnabled ? TEAL : '#cbd5e1',
                    border: 'none', position: 'relative', cursor: savingFeedback ? 'wait' : 'pointer',
                    transition: 'background 0.15s', flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: candidateFeedbackEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(15,33,55,0.2)',
                  }} />
                </button>
                <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX }}>
                  {candidateFeedbackEnabled ? 'Enabled' : 'Disabled (default)'}
                </div>
                {feedbackToast && <Toast message={feedbackToast.message} type={feedbackToast.type} />}
              </div>
            </div>
          </div>
        )}

        {/* Weightings tab , employer only */}
        {activeTab === 'weightings' && profile?.account_type === 'employer' && (
          <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX }}>Default Score Weightings</h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: TX2, lineHeight: 1.6 }}>
                Control how important each skill is when calculating candidate scores. For example, if communication matters most for your roles, increase its weight. These are your default weights for all new assessments.
              </p>

              {Object.entries(weights).map(([skill, val]) => {
                const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
                return (
                  <div key={skill} style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX }}>{skill}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="number"
                          min={0} max={100}
                          value={val}
                          onChange={e => {
                            const n = Math.max(0, Math.min(100, Number(e.target.value)))
                            setWeights(prev => ({ ...prev, [skill]: n }))
                          }}
                          style={{
                            width: 60, padding: '5px 8px', borderRadius: 7,
                            border: `1.5px solid ${BD}`, fontFamily: FM, fontSize: 14,
                            color: TX, textAlign: 'right', outline: 'none',
                          }}
                          onFocus={e => e.target.style.borderColor = TEAL}
                          onBlur={e => e.target.style.borderColor = BD}
                        />
                        <span style={{ fontFamily: FM, fontSize: 13, color: TX3, width: 16 }}>%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0} max={100}
                      value={val}
                      onChange={e => setWeights(prev => ({ ...prev, [skill]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: TEAL, cursor: 'pointer' }}
                    />
                  </div>
                )
              })}

              {/* Total indicator */}
              {(() => {
                const total = Object.values(weights).reduce((a, b) => a + b, 0)
                return (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 8, marginBottom: 20,
                    background: total === 100 ? GRNBG : REDBG,
                    border: `1px solid ${total === 100 ? GRNBD : REDBD}`,
                  }}>
                    <Ic name={total === 100 ? 'check' : 'alert'} size={14} color={total === 100 ? GRN : RED} />
                    <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: total === 100 ? GRN : RED }}>
                      Total: {total}%{total !== 100 ? ' (must equal 100%)' : ''}
                    </span>
                  </div>
                )
              })()}

              {/* Preview: how rankings change */}
              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  What this means
                </div>
                {Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([skill, w], i) => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: `${Math.max(4, w)}%`, height: 6, borderRadius: 99,
                      background: i === 0 ? TEAL : i === 1 ? GRN : i === 2 ? AMB : '#cbd5e1',
                      transition: 'width 0.3s ease', minWidth: 4,
                    }} />
                    <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, whiteSpace: 'nowrap' }}>
                      {skill} <span style={{ fontFamily: FM, fontWeight: 700, color: TX }}>{w}%</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSaveWeights}
                  disabled={savingWeights || Object.values(weights).reduce((a, b) => a + b, 0) !== 100}
                  style={{
                    ...bs('primary', 'md'),
                    opacity: savingWeights || Object.values(weights).reduce((a, b) => a + b, 0) !== 100 ? 0.55 : 1,
                    cursor: savingWeights || Object.values(weights).reduce((a, b) => a + b, 0) !== 100 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Ic name="check" size={15} color={NAVY} />
                  {savingWeights ? 'Saving…' : 'Save as default'}
                </button>
                <button
                  onClick={() => setWeights(DEFAULT_WEIGHTS)}
                  style={{ ...bs('outline', 'md'), fontFamily: F }}
                >
                  Reset to equal
                </button>
                {weightsToast && <Toast message={weightsToast.message} type={weightsToast.type} />}
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 12, color: TX3, fontFamily: F, lineHeight: 1.6 }}>
                These defaults apply to all new assessments. You can override them per-assessment on the New Assessment page.
              </p>
            </div>
          </div>
        )}

 {/* Assessments tab, default employment type */}
        {activeTab === 'assessments' && (
          <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...cs }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX }}>
                Default Assessment Type
              </h2>
              <p style={{ fontFamily: F, fontSize: 13, color: TX3, margin: '0 0 20px', lineHeight: 1.55 }}>
                Set your default to save time when creating assessments. You can always change it on a per-assessment basis.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { value: 'permanent', label: 'Always Permanent Hire', desc: 'Every new assessment defaults to Permanent Hire.' },
                  { value: 'temporary', label: 'Always Temporary Placement', desc: 'Every new assessment defaults to Temporary Placement.' },
                  { value: 'ask', label: 'Ask Every Time', desc: 'Choose each time you create a new assessment.' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    onClick={() => setDefaultEmploymentType(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${defaultEmploymentType === opt.value ? TEAL : BD}`,
                      background: defaultEmploymentType === opt.value ? TEALLT : CARD,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="defaultEmploymentType"
                      value={opt.value}
                      checked={defaultEmploymentType === opt.value}
                      onChange={() => setDefaultEmploymentType(opt.value)}
                      style={{ accentColor: TEAL, marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{opt.label}</div>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleSaveEmploymentType}
                disabled={savingEmploymentType}
                style={{
                  ...bs('primary', 'md'),
                  opacity: savingEmploymentType ? 0.6 : 1,
                  cursor: savingEmploymentType ? 'not-allowed' : 'pointer',
                }}
              >
                {savingEmploymentType ? 'Saving...' : 'Save'}
              </button>
              {employmentTypeToast && <Toast message={employmentTypeToast.message} type={employmentTypeToast.type} />}
            </div>
          </div>
        )}

      </main>

      {switchConfirm && (
        <div
          onClick={() => !switchSubmitting && setSwitchConfirm(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(15,33,55,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CARD, borderRadius: 14, padding: '28px 28px 24px',
              maxWidth: 440, width: '100%', boxShadow: '0 24px 72px rgba(0,0,0,0.25)',
            }}
          >
            <h3 style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY, margin: '0 0 10px' }}>
              Switch to {switchConfirm.plan} at £{switchConfirm.priceNum}/month?
            </h3>
            <p style={{ fontFamily: F, fontSize: 13.5, color: TX2, margin: '0 0 22px', lineHeight: 1.6 }}>
              Your Pay As You Go credits will remain available.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSwitchConfirm(null)}
                disabled={switchSubmitting}
                style={{
                  fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX2,
                  background: 'transparent', border: `1.5px solid ${BD}`,
                  padding: '9px 18px', borderRadius: 8, cursor: switchSubmitting ? 'default' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitch}
                disabled={switchSubmitting}
                style={{
                  fontFamily: F, fontSize: 13.5, fontWeight: 800, color: NAVY,
                  background: TEAL, border: 'none',
                  padding: '9px 20px', borderRadius: 8,
                  cursor: switchSubmitting ? 'default' : 'pointer', opacity: switchSubmitting ? 0.7 : 1,
                }}
              >
                {switchSubmitting ? 'Redirecting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
