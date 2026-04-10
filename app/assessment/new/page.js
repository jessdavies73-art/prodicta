'use client'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import { useToast } from '@/components/ToastProvider'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

const SKILLS = ['Communication', 'Problem solving', 'Prioritisation', 'Leadership']

const AGENCY_QUESTIONS = [
  {
    id: 'q0',
    text: 'What actually matters most to your client in this role?',
    type: 'multi-select',
    options: ['Speed/urgency', 'Revenue generation', 'Stakeholder management', 'Process/organisation', 'Leadership/ownership'],
  },
  {
    id: 'q1',
    text: 'What typically causes candidates to fail with this client?',
    type: 'multi-select-other',
    options: ['Poor communication', 'Missed deadlines', "Can't handle pressure", 'Cultural mismatch', 'Lack of ownership'],
  },
  {
    id: 'q2',
    text: 'What type of environment is this?',
    type: 'single-select',
    options: ['Fast-paced/reactive', 'Structured/process-driven', 'Chaotic/ambiguous', 'Sales-driven/target-heavy'],
  },
  {
    id: 'q3',
    text: 'What would make this placement fail in 3 months?',
    type: 'text',
  },
]

const EMPLOYER_QUESTIONS = [
  {
    id: 'q0',
    text: 'What does success look like in the first 90 days?',
    type: 'text',
  },
  {
    id: 'q1',
    text: 'What are the biggest challenges in this role?',
    type: 'multi-select',
    options: ['Managing stakeholders', 'High workload/pressure', 'Ambiguity', 'Conflict/difficult conversations', 'Tight deadlines'],
  },
  {
    id: 'q2',
    text: 'What type of person thrives here?',
    type: 'multi-select',
    options: ['Highly organised', 'Proactive/self-starter', 'Strong communicator', 'Commercial thinker', 'Detail-oriented'],
  },
  {
    id: 'q3',
    text: 'What has gone wrong with past hires?',
    type: 'multi-select',
    options: ["Didn't adapt quickly", 'Poor communication', "Couldn't prioritise", 'Culture misfit', 'Burned out'],
  },
]

function serializeContextAnswers(questions, answers) {
  const result = {}
  questions.forEach((q, i) => {
    const ans = answers[q.id]
    if (!ans) return
    let text = ''
    if (q.type === 'text') {
      text = typeof ans === 'string' ? ans.trim() : ''
    } else if (q.type === 'multi-select') {
      text = Array.isArray(ans) && ans.length > 0 ? ans.join(', ') : ''
    } else if (q.type === 'multi-select-other') {
      const selected = Array.isArray(ans?.selected) ? ans.selected : []
      const other = typeof ans?.other === 'string' ? ans.other.trim() : ''
      text = [...selected, other].filter(Boolean).join(', ')
    } else if (q.type === 'single-select') {
      text = typeof ans === 'string' ? ans : ''
    }
    if (text) result[i] = `${q.text}: ${text}`
  })
  return result
}

const GEN_STEPS = [
  'Analysing role requirements…',
  'Generating work scenarios…',
  'Tailoring to your role…',
  'Finalising simulations…',
]

function GeneratingLoader() {
  const [step, setStep]       = useState(0)
  const [progress, setProgress] = useState(8)
  const stepRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      stepRef.current = Math.min(stepRef.current + 1, GEN_STEPS.length - 1)
      setStep(stepRef.current)
      setProgress(Math.min(8 + stepRef.current * 24, 88))
    }, 2400)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ padding: '12px 0', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{
          width: 20, height: 20,
          border: '2.5px solid #e0f2f0',
          borderTopColor: '#00BFA5',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 14.5, color: '#009688', fontWeight: 700, fontFamily: F, minWidth: 240, textAlign: 'left' }}>
          {GEN_STEPS[step]}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#e4e9f0', overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #00BFA5, #009688)',
          width: `${progress}%`,
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function detectRoleType(jd) {
  const t = jd.toLowerCase()
  if (/sales|revenue|pipeline/.test(t)) return 'Sales'
  if (/marketing|campaign|brand/.test(t)) return 'Marketing'
  if (/engineer|developer|software/.test(t)) return 'Engineering'
  return 'General'
}

function wordCount(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

const roleTypeBadgeStyle = type => {
  const map = {
    Sales:       { background: '#ecfdf5', color: '#16a34a' },
    Marketing:   { background: '#fffbeb', color: '#d97706' },
    Engineering: { background: '#e0f2f0', color: '#009688' },
    General:     { background: '#f1f5f9', color: '#5e6b7f' },
  }
  return map[type] || map.General
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const toast = useToast()
  const isMobile = useIsMobile()
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [jd, setJd] = useState('')
  const [weights, setWeights] = useState({ Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [atLimit, setAtLimit] = useState(false)
  const [limitInfo, setLimitInfo] = useState({ used: 0, limit: 10 })

  // Templates
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [mode, setMode] = useState('standard') // 'quick' | 'standard' | 'advanced'
  const [modeOverridden, setModeOverridden] = useState(false)

  // Context questions
  const [contextAnswers, setContextAnswers] = useState({})
  const [accountType, setAccountType] = useState('employer')
  const [smartQuestions, setSmartQuestions] = useState(null) // null = not yet loaded
  const [smartLoading, setSmartLoading] = useState(false)
  const smartCacheRef = useRef({ key: '', questions: null })

  // Brief Health Check
  const [briefFlags, setBriefFlags] = useState(null) // null = not checked, [] = clean, [...] = issues
  const [briefChecking, setBriefChecking] = useState(false)
  const briefCheckedRef = useRef('')

  const handleBriefCheck = async () => {
    const key = `${roleTitle.trim()}||${jd.trim()}`
    if (key === briefCheckedRef.current) return
    setBriefChecking(true)
    setBriefFlags(null)
    try {
      const res = await fetch('/api/assessment/brief-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_title: roleTitle.trim(), job_description: jd.trim() }),
      })
      const data = await res.json()
      setBriefFlags(Array.isArray(data.flags) ? data.flags : [])
      briefCheckedRef.current = key
    } catch {
      setBriefFlags([])
    } finally {
      setBriefChecking(false)
    }
  }

  useEffect(() => {
    const PLAN_LIMITS = { starter: 10, professional: 30, unlimited: null, founding: null, growth: 30, scale: null }
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('users').select('company_name, plan, account_type').eq('id', user.id).single()
      if (profile?.company_name) setCompanyName(profile.company_name)
      if (profile?.account_type) setAccountType(profile.account_type)

      // Check monthly usage limit
      const planKey = (profile?.plan || 'starter').toLowerCase()
      const planLimit = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.starter
      if (planLimit !== null) {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase.from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
        const used = count || 0
        setLimitInfo({ used, limit: planLimit })
        if (used >= planLimit) setAtLimit(true)
      }

      // Load saved templates
      const { data: tmpl } = await supabase
        .from('assessments')
        .select('id, template_name, role_title, job_description, skill_weights')
        .eq('user_id', user.id)
        .eq('is_template', true)
        .order('created_at', { ascending: false })
      setTemplates(tmpl || [])
    }
    init()
  }, [router])

  function applyTemplate(templateId) {
    const tmpl = templates.find(t => t.id === templateId)
    if (!tmpl) return
    setRoleTitle(tmpl.role_title || '')
    setJd(tmpl.job_description || '')
    if (tmpl.skill_weights) setWeights(tmpl.skill_weights)
    setSelectedTemplate(templateId)
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const words = wordCount(jd)
  const roleType = jd.length > 0 ? detectRoleType(jd) : null
  const canGenerate = roleTitle.trim().length > 0 && jd.length >= 50 && totalWeight === 100

  // Detect seniority from role title and JD
  const detectedSeniority = (() => {
    const text = `${roleTitle} ${jd}`.toLowerCase()
    if (/\b(director|head of|vp|vice president|chief|cxo|ceo|cto|cfo|coo)\b/.test(text)) return 'senior'
    if (/\b(senior|principal|lead|staff|manager of|head)\b/.test(text)) return 'senior'
    if (/\b(junior|jr\.?|graduate|trainee|entry[- ]level|apprentice|assistant)\b/.test(text)) return 'junior'
    if (/\b(mid[- ]level|associate|executive|specialist|coordinator|analyst|advisor)\b/.test(text)) return 'mid'
    if (jd.length >= 50) return 'mid'
    return null
  })()
  const recommendedMode = detectedSeniority === 'senior' ? 'advanced' : 'standard'

  // Auto-select recommended mode when seniority changes (unless user has overridden)
  useEffect(() => {
    if (modeOverridden) return
    if (detectedSeniority && recommendedMode !== mode) setMode(recommendedMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedSeniority])

  // Fetch role-specific Smart Role Context questions when role+JD are ready (debounced)
  useEffect(() => {
    if (jd.length < 50 || roleTitle.trim().length === 0) {
      setSmartQuestions(null)
      return
    }
    const key = `${accountType}::${roleTitle.trim().toLowerCase()}::${jd.length}::${jd.slice(0, 200)}`
    if (smartCacheRef.current.key === key && smartCacheRef.current.questions) {
      setSmartQuestions(smartCacheRef.current.questions)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSmartLoading(true)
      try {
        const res = await fetch('/api/assessment/context-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_title: roleTitle, job_description: jd, account_type: accountType }),
        })
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data?.questions) && data.questions.length > 0) {
          smartCacheRef.current = { key, questions: data.questions }
          setSmartQuestions(data.questions)
          setContextAnswers({})
        }
      } catch (_) {
        // fall back silently to hardcoded questions
      } finally {
        if (!cancelled) setSmartLoading(false)
      }
    }, 900)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [roleTitle, jd, accountType])

  const setWeight = (skill, val) => {
    const n = Math.max(0, Math.min(100, Number(val)))
    setWeights(prev => ({ ...prev, [skill]: n }))
  }

  const resetEqual = () => setWeights({ Communication: 25, 'Problem solving': 25, Prioritisation: 25, Leadership: 25 })

  const handleGenerate = async () => {
    setError('')
    setLoading(true)
    try {
      const contextQs = smartQuestions && smartQuestions.length > 0
        ? smartQuestions
        : (accountType === 'agency' ? AGENCY_QUESTIONS : EMPLOYER_QUESTIONS)
      const serialized = serializeContextAnswers(contextQs, contextAnswers)
      const res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_title: roleTitle,
          job_description: jd,
          skill_weights: weights,
          save_as_template: saveAsTemplate,
          template_name: saveAsTemplate ? (templateName.trim() || roleTitle.trim()) : undefined,
          context_answers: Object.keys(serialized).length > 0 ? serialized : undefined,
          assessment_mode: mode,
        })
      })
      const data = await res.json()
      if (data.id) { toast('Assessment created'); router.push(`/assessment/${data.id}`) }
      else if (data.error === 'unsuitable_role') setError(data.message || 'This role type may not be suitable for scenario-based assessment.')
      else setError(data.error || 'Failed to generate')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const badgeStyle = roleTypeBadgeStyle(roleType)

  if (atLimit) {
    return (
      <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '32px 40px', minHeight: '100vh', background: '#f7f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, padding: '40px 40px', boxShadow: '0 2px 16px rgba(15,33,55,0.08)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/>
              </svg>
            </div>
            <h2 style={{ fontFamily: F, fontSize: 21, fontWeight: 800, color: '#0f2137', margin: '0 0 10px' }}>
              Assessment limit reached
            </h2>
            <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', margin: '0 0 6px', lineHeight: 1.65 }}>
              You've used <strong>{limitInfo.used} of {limitInfo.limit}</strong> assessments this month.
            </p>
            <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', margin: '0 0 28px', lineHeight: 1.65 }}>
              Upgrade your plan to continue creating assessments.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="mailto:hello@prodicta.co.uk?subject=Upgrade my plan"
                style={{
                  display: 'block', padding: '12px 0', borderRadius: 10,
                  background: '#00BFA5', color: '#0f2137', fontFamily: F, fontSize: 14.5, fontWeight: 800,
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                Upgrade my plan →
              </a>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ padding: '11px 0', borderRadius: 10, border: '1.5px solid #e4e9f0', background: 'transparent', color: '#5e6b7f', fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, background: '#f7f9fb', minHeight: '100vh' }}>
      <Sidebar companyName={companyName} />
      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '32px 40px', minHeight: '100vh', background: '#f7f9fb' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e4e9f0',
              background: '#fff', cursor: 'pointer', color: '#5e6b7f', flexShrink: 0
            }}
          >
            <Ic name="arrow-left" size={18} />
          </button>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
            New Assessment
          </h1>
        </div>

        {/* Templates dropdown */}
        {templates.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
            padding: '20px 28px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ic name="file" size={16} color="#009688" />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Start from a template
              </span>
            </div>
            <select
              value={selectedTemplate}
              onChange={e => applyTemplate(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: '9px 13px',
                borderRadius: 8, border: '1px solid #e4e9f0',
                fontSize: 14, fontFamily: F, color: '#0f172a',
                background: '#fff', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">Choose a saved template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.template_name || t.role_title}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <button
                onClick={() => {
                  setSelectedTemplate('')
                  setRoleTitle('')
                  setJd('')
                  resetEqual()
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#94a1b3',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px', fontFamily: F,
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Card 1: Role details */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '28px 32px', marginBottom: 24
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
            Role details
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Role title
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={e => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Account Manager"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                color: '#0f172a', fontFamily: F, background: '#fff', outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#00BFA5'}
              onBlur={e => e.target.style.borderColor = '#e4e9f0'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                Job description
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {roleType && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                    background: badgeStyle.background, color: badgeStyle.color, fontFamily: F
                  }}>
                    {roleType}
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#94a1b3', fontFamily: FM }}>
                  {words} word{words !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <textarea
              rows={8}
              value={jd}
              onChange={e => { setJd(e.target.value); if (briefFlags !== null) { setBriefFlags(null); briefCheckedRef.current = '' } }}
              placeholder="Paste the job description here…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 14px',
                borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 14,
                color: '#0f172a', fontFamily: F, background: '#fff', outline: 'none',
                resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#00BFA5'}
              onBlur={e => e.target.style.borderColor = '#e4e9f0'}
            />
            {jd.length > 0 && jd.length < 50 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#dc2626' }}>
                Please enter at least 50 characters in the job description.
              </p>
            )}
          </div>

          {/* Smart Role Context */}
          {jd.length >= 50 && roleTitle.trim().length > 0 && (() => {
            const contextQs = smartQuestions && smartQuestions.length > 0
              ? smartQuestions
              : (accountType === 'agency' ? AGENCY_QUESTIONS : EMPLOYER_QUESTIONS)
            const toggleMulti = (qId, option) => setContextAnswers(prev => {
              const current = Array.isArray(prev[qId]) ? prev[qId] : []
              return { ...prev, [qId]: current.includes(option) ? current.filter(o => o !== option) : [...current, option] }
            })
            const toggleMultiOther = (qId, option) => setContextAnswers(prev => {
              const current = prev[qId] || { selected: [], other: '' }
              const selected = Array.isArray(current.selected) ? current.selected : []
              return { ...prev, [qId]: { ...current, selected: selected.includes(option) ? selected.filter(o => o !== option) : [...selected, option] } }
            })
            return (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', fontFamily: F }}>Smart Role Context</span>
                    <span style={{ fontSize: 11.5, color: '#94a1b3', fontFamily: F }}>
                      {smartLoading ? 'tailoring questions to this role...' : '(all optional)'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: '#e0f2f0', color: '#009688', fontFamily: F, letterSpacing: 0.1,
                  }}>
                    Improves prediction accuracy
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {contextQs.map(q => (
                    <div key={q.id}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f2137', marginBottom: 8, fontFamily: F }}>{q.text}</div>
                      {q.type === 'text' && (
                        <input
                          type="text"
                          value={contextAnswers[q.id] || ''}
                          onChange={e => setContextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Optional..."
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '9px 13px',
                            borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 13.5,
                            color: '#0f172a', fontFamily: F, background: '#fff',
                            outline: 'none', transition: 'border-color 0.15s',
                          }}
                          onFocus={e => e.target.style.borderColor = '#00BFA5'}
                          onBlur={e => e.target.style.borderColor = '#e4e9f0'}
                        />
                      )}
                      {q.type === 'multi-select' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {q.options.map(opt => {
                            const selected = Array.isArray(contextAnswers[q.id]) && contextAnswers[q.id].includes(opt)
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleMulti(q.id, opt)}
                                style={{
                                  padding: '6px 13px', borderRadius: 20, fontSize: 13, fontFamily: F, cursor: 'pointer',
                                  border: `1.5px solid ${selected ? '#00BFA5' : '#e4e9f0'}`,
                                  background: selected ? '#e0f2f0' : '#f7f9fb',
                                  color: selected ? '#009688' : '#5e6b7f',
                                  fontWeight: selected ? 700 : 500,
                                  transition: 'all 0.12s',
                                }}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {q.type === 'multi-select-other' && (
                        <div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {q.options.map(opt => {
                              const ans = contextAnswers[q.id] || {}
                              const selected = Array.isArray(ans.selected) && ans.selected.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleMultiOther(q.id, opt)}
                                  style={{
                                    padding: '6px 13px', borderRadius: 20, fontSize: 13, fontFamily: F, cursor: 'pointer',
                                    border: `1.5px solid ${selected ? '#00BFA5' : '#e4e9f0'}`,
                                    background: selected ? '#e0f2f0' : '#f7f9fb',
                                    color: selected ? '#009688' : '#5e6b7f',
                                    fontWeight: selected ? 700 : 500,
                                    transition: 'all 0.12s',
                                  }}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          <input
                            type="text"
                            value={(contextAnswers[q.id] || {}).other || ''}
                            onChange={e => setContextAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] || { selected: [] }), other: e.target.value } }))}
                            placeholder="Other (optional)..."
                            style={{
                              width: '100%', boxSizing: 'border-box', padding: '8px 13px',
                              borderRadius: 8, border: '1px solid #e4e9f0', fontSize: 13,
                              color: '#0f172a', fontFamily: F, background: '#fff',
                              outline: 'none', transition: 'border-color 0.15s',
                            }}
                            onFocus={e => e.target.style.borderColor = '#00BFA5'}
                            onBlur={e => e.target.style.borderColor = '#e4e9f0'}
                          />
                        </div>
                      )}
                      {q.type === 'single-select' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {q.options.map(opt => {
                            const selected = contextAnswers[q.id] === opt
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setContextAnswers(prev => ({ ...prev, [q.id]: prev[q.id] === opt ? '' : opt }))}
                                style={{
                                  padding: '6px 13px', borderRadius: 20, fontSize: 13, fontFamily: F, cursor: 'pointer',
                                  border: `1.5px solid ${selected ? '#00BFA5' : '#e4e9f0'}`,
                                  background: selected ? '#e0f2f0' : '#f7f9fb',
                                  color: selected ? '#009688' : '#5e6b7f',
                                  fontWeight: selected ? 700 : 500,
                                  transition: 'all 0.12s',
                                }}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Card 2: Skill weights */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '28px 32px', marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: F }}>
              Skill weights
            </h2>
            <button
              onClick={resetEqual}
              style={{
                fontSize: 12, fontWeight: 600, color: '#009688', background: 'none',
                border: '1px solid #00BFA5', borderRadius: 7, padding: '5px 12px',
                cursor: 'pointer', fontFamily: F
              }}
            >
              Reset to equal
            </button>
          </div>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: '#5e6b7f', lineHeight: 1.5 }}>
            Adjust how each skill is weighted in the overall score. Weights must total 100%.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SKILLS.map(skill => (
              <div key={skill}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: F }}>
                    {skill}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[skill]}
                    onChange={e => setWeight(skill, e.target.value)}
                    style={{
                      width: 64, padding: '5px 8px', borderRadius: 7, border: '1px solid #e4e9f0',
                      fontSize: 14, fontFamily: FM, color: '#0f172a', textAlign: 'right',
                      outline: 'none', background: '#f7f9fb'
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[skill]}
                  onChange={e => setWeight(skill, e.target.value)}
                  style={{ width: '100%', accentColor: '#00BFA5', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20, padding: '10px 14px', borderRadius: 8,
            background: totalWeight === 100 ? '#ecfdf5' : '#fef2f2',
            display: 'inline-flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : '#dc2626', fontFamily: FM }}>
              Total: {totalWeight}%
            </span>
            {totalWeight !== 100 && (
              <span style={{ fontSize: 12, color: '#dc2626' }}>
                Must equal 100%
              </span>
            )}
          </div>
        </div>

        {/* Save as template */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0',
          padding: '20px 28px', marginBottom: 20,
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={e => setSaveAsTemplate(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#00BFA5', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: F }}>
              Save as template
            </span>
            <span style={{ fontSize: 13, color: '#94a1b3' }}>
              Reuse this JD and weights for future assessments
            </span>
          </label>

          {saveAsTemplate && (
            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                Template name (optional)
              </label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder={roleTitle.trim() || 'e.g. Standard Sales Manager template'}
                style={{
                  width: '100%', maxWidth: 400, boxSizing: 'border-box',
                  padding: '9px 13px', borderRadius: 8, border: '1px solid #e4e9f0',
                  fontSize: 14, fontFamily: F, color: '#0f172a', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#00BFA5'}
                onBlur={e => e.target.style.borderColor = '#e4e9f0'}
              />
            </div>
          )}
        </div>

        {/* Assessment Mode selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: F, marginBottom: 6 }}>
            Assessment depth
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: '#5e6b7f', fontFamily: F }}>
            PRODICTA recommends a depth based on the seniority detected in the job description. You can override this.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {[
              {
                value: 'quick',
                title: 'Quick Assessment',
                subtitle: '15 minutes, 2 scenarios',
                description: 'Best for urgent hires, high-volume roles, or when you need a fast initial screen. Tests core competence and pressure handling. Use when speed matters more than depth.',
              },
              {
                value: 'standard',
                title: 'Standard Assessment',
                subtitle: '25 minutes, 3 scenarios',
                description: 'Best for most roles. Tests core competence, pressure handling, and team fit. The right balance of depth and candidate experience. Recommended for junior and mid-level roles.',
              },
              {
                value: 'advanced',
                title: 'Advanced Assessment',
                subtitle: '45 minutes, 4 scenarios',
                description: 'Best for senior, leadership, or high-stakes roles. Tests competence, pressure, team fit, and long-term retention risk. The most comprehensive assessment. Recommended for senior and director-level hires.',
              },
            ].map(opt => {
              const selected = mode === opt.value
              const isRecommended = recommendedMode === opt.value && detectedSeniority
              const recLabel = isRecommended
                ? `Recommended for ${detectedSeniority === 'senior' ? 'senior' : detectedSeniority === 'junior' ? 'junior' : 'mid-level'} roles`
                : null
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setMode(opt.value); setModeOverridden(true) }}
                  style={{
                    textAlign: 'left',
                    background: selected ? '#f0fbf9' : '#fff',
                    border: `1.5px solid ${selected ? '#00BFA5' : '#e4e9f0'}`,
                    borderRadius: 12,
                    padding: '18px 18px 16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                    boxShadow: selected ? '0 4px 14px rgba(0,191,165,0.12)' : 'none',
                    position: 'relative',
                    fontFamily: F,
                  }}
                >
                  {isRecommended && (
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
                      background: '#00BFA5', color: '#fff', fontFamily: F,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      Recommended
                    </span>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 2, paddingRight: isRecommended ? 90 : 0 }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#00BFA5', marginBottom: 10 }}>
                    {opt.subtitle}
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#5e6b7f', lineHeight: 1.6 }}>
                    {opt.description}
                  </p>
                  {recLabel && (
                    <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#009688' }}>
                      {recLabel}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Brief Health Check */}
        {jd.length >= 50 && roleTitle.trim().length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0', padding: '24px 32px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: briefFlags !== null ? 16 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f2137', fontFamily: F }}>Brief Health Check</span>
              </div>
              <button
                onClick={handleBriefCheck}
                disabled={briefChecking}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: '1px solid #e4e9f0',
                  background: briefChecking ? '#f7f9fb' : '#fff',
                  color: briefChecking ? '#94a1b3' : '#0f2137',
                  fontSize: 13, fontWeight: 600, fontFamily: F,
                  cursor: briefChecking ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {briefChecking ? 'Checking...' : briefFlags !== null ? 'Re-check Brief' : 'Check Brief'}
              </button>
            </div>

            {briefFlags !== null && briefFlags.length === 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 8,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#16a34a', fontFamily: F }}>Brief looks strong. No issues found.</span>
              </div>
            )}

            {briefFlags !== null && briefFlags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {briefFlags.map((f, i) => (
                  <div key={i} style={{
                    padding: '14px 16px', borderRadius: 8,
                    background: '#fffbeb', border: '1px solid #fde68a',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', fontFamily: F, marginBottom: 4 }}>
                      {f.flag}
                    </div>
                    <div style={{ fontSize: 13, color: '#78350f', fontFamily: F, lineHeight: 1.6 }}>
                      {f.detail}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: '#94a1b3', fontFamily: F, marginTop: 4 }}>
                  You can update your job description above based on these suggestions, or continue with the original.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate button */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 8,
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 14
          }}>
            {error}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e4e9f0', padding: '24px 32px' }}>
          {loading ? (
            <GeneratingLoader />
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: canGenerate ? '#00BFA5' : '#e4e9f0',
                color: canGenerate ? '#fff' : '#94a1b3',
                fontSize: 16, fontWeight: 700, fontFamily: F,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              Generate simulations
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
