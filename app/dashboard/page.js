'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import Avatar from '@/components/Avatar'
import { Ic } from '@/components/Icons'
import InfoTooltip from '@/components/InfoTooltip'
import { useToast } from '@/components/ToastProvider'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD,
  F, FM, scolor, sbg, slabel, dL, dC, riskCol, riskBg, riskBd, cs, ps, bs
} from '@/lib/constants'
import OnboardingWizard from '@/components/OnboardingWizard'

const PLAN_LIMITS = { starter: 10, professional: 30, unlimited: null, founding: null, growth: 30, scale: null }

const PURPLE = '#7C3AED'

// ── CountUp ───────────────────────────────────────────────────────────────────
function CountUp({ target }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (typeof target !== 'number') return
    let frame = 0
    const total = 36
    if (ref.current) clearInterval(ref.current)
    ref.current = setInterval(() => {
      frame++
      const eased = 1 - Math.pow(1 - frame / total, 3)
      setVal(Math.round(target * eased))
      if (frame >= total) { clearInterval(ref.current); setVal(target) }
    }, 14)
    return () => clearInterval(ref.current)
  }, [target])
  return typeof target === 'number' ? val : target
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short'
  })
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = TEAL }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: 0,
        background: '#fff',
        border: `1px solid ${BD}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: hovered
          ? '0 8px 24px rgba(15,33,55,0.13), 0 2px 8px rgba(15,33,55,0.07)'
          : '0 2px 8px rgba(15,33,55,0.06), 0 1px 3px rgba(15,33,55,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Ic name={icon} size={14} color={accent} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 38, fontWeight: 800, color: accent, fontFamily: FM, lineHeight: 1, letterSpacing: '-1.5px', marginBottom: 8 }}>
        {typeof value === 'number' ? <CountUp target={value} /> : value}
      </div>
      {sub && <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', bg: GRNBG, color: GRN, bd: GRNBD },
    pending:   { label: 'Pending',   bg: AMBBG,  color: AMB,  bd: '#fde68a' },
    sent:      { label: 'Sent',      bg: '#f1f5f9', color: TX3,  bd: BD },
    archived:  { label: 'Archived',  bg: '#f1f5f9', color: TX3,  bd: BD },
  }
  const s = map[status] || map.sent
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 50,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.bd}`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function RiskBadge({ risk }) {
  if (!risk) return <span style={{ color: TX3, fontSize: 12 }}>-</span>
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 50,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F,
      background: riskBg(risk),
      color: riskCol(risk),
      border: `1px solid ${riskBd(risk)}`,
      whiteSpace: 'nowrap',
    }}>
      {risk}
    </span>
  )
}

function LoadingSkeleton() {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f4f8 25%, #e4eaf2 50%, #f0f4f8 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease infinite',
    borderRadius: 8,
  }
  return (
    <div style={{ display: 'flex' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: '#f7f9fb', flex: 1 }}>
        {/* Header skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ ...shimmer, width: 160, height: 32 }} />
          <div style={{ ...shimmer, width: 200, height: 36, borderRadius: 8 }} />
        </div>
        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, background: '#fff', border: '1px solid #e4e9f0', borderRadius: 14, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ ...shimmer, width: 80, height: 14 }} />
                <div style={{ ...shimmer, width: 34, height: 34, borderRadius: 9 }} />
              </div>
              <div style={{ ...shimmer, width: 60, height: 36, borderRadius: 6 }} />
              <div style={{ ...shimmer, width: 100, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div style={{ background: '#fff', border: '1px solid #e4e9f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e4e9f0' }}>
            <div style={{ ...shimmer, width: 120, height: 18 }} />
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ padding: '14px 24px', borderBottom: '1px solid #e4e9f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ ...shimmer, width: 32, height: 32, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...shimmer, width: 140, height: 14, marginBottom: 6 }} />
                <div style={{ ...shimmer, width: 100, height: 11 }} />
              </div>
              <div style={{ ...shimmer, width: 60, height: 20, borderRadius: 20 }} />
              <div style={{ ...shimmer, width: 40, height: 18, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const router = useRouter()
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: `linear-gradient(135deg, ${TEALLT}, #c7f0ea)`,
        border: `2px solid ${TEAL}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 22px',
        boxShadow: `0 4px 20px ${TEAL}22`,
      }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={TEALD} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: TX, fontFamily: F, marginBottom: 8 }}>
        No candidates yet
      </div>
      <div style={{ fontSize: 13.5, color: TX2, fontFamily: F, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>
        Ready to find your best hire? Create an assessment and send your first invite.
      </div>
      <button
        onClick={() => router.push('/assessment/new')}
        style={bs('primary', 'md')}
      >
        <Ic name="plus" size={15} color={NAVY} />
        New assessment
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [assessments, setAssessments] = useState([])
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [archivingIds, setArchivingIds] = useState(new Set())

  const [deletingIds, setDeletingIds] = useState(new Set())
  const [openMenu, setOpenMenu] = useState(null)
  const [confirmArchive, setConfirmArchive] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activePlacements, setActivePlacements] = useState([])
  const [candidateOutcomes, setCandidateOutcomes] = useState([])
  const [probationHires, setProbationHires] = useState([])
  const [accuracyData, setAccuracyData] = useState(null)
  const [overrideStats, setOverrideStats] = useState(null)
  const [pendingCheckins, setPendingCheckins] = useState([])

  // Close ⋯ menu when clicking anywhere outside
  useEffect(() => {
    if (!openMenu) return
    function close() { setOpenMenu(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenu])

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()

        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          router.push('/login')
          return
        }

        const { data: prof } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(prof)

        const { data: cands, error: candsErr } = await supabase
          .from('candidates')
          .select('*, assessments!inner(role_title, id), results(overall_score, risk_level, percentile, pressure_fit_score)')
          .eq('user_id', user.id)
          .neq('status', 'archived')
          .order('invited_at', { ascending: false })

        if (candsErr) throw candsErr
        setCandidates(cands || [])

        const { data: assess, error: assessErr } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')

        if (assessErr) throw assessErr
        setAssessments(assess || [])

        // Monthly usage count
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { count } = await supabase.from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth)
        setMonthlyCount(count || 0)

        // Load active placements for agency accounts
        if (prof?.account_type === 'agency') {
          try {
            const { data: placements } = await supabase
              .from('candidate_outcomes')
              .select('*, candidates(id, name, assessment_id, assessments(role_title))')
              .eq('user_id', user.id)
              .not('placement_date', 'is', null)
              .not('rebate_weeks', 'is', null)
              .order('placement_date', { ascending: false })
            const nowMs = Date.now()
            const active = (placements || []).filter(p => {
              if (!p.placement_date || !p.rebate_weeks) return false
              const end = new Date(p.placement_date).getTime() + p.rebate_weeks * 7 * 86400000
              return end > nowMs
            })
            setActivePlacements(active)
          } catch (_) {
            // Columns may not exist yet; skip silently
          }
        }

        // Load candidate outcomes (for cost saved calculator)
        try {
          const { data: outcomes } = await supabase
            .from('candidate_outcomes')
            .select('candidate_id, outcome')
            .eq('user_id', user.id)
          setCandidateOutcomes(outcomes || [])

          // Prediction accuracy: join outcomes with results.pass_probability
          try {
            const { data: outcomesWithResults } = await supabase
              .from('candidate_outcomes')
              .select('candidate_id, outcome, override_warning, candidates!inner(results(pass_probability))')
              .eq('user_id', user.id)
            // Override outcomes counter
            const overrides = (outcomesWithResults || []).filter(r => r.override_warning === true)
            const overrideFailed = overrides.filter(r => ['failed_probation', 'left_probation', 'dismissed', 'left_early'].includes((r.outcome || '').toLowerCase()))
            if (overrides.length > 0) {
              setOverrideStats({ total: overrides.length, failed: overrideFailed.length })
            }
            const judged = []
            let pending = 0
            for (const row of (outcomesWithResults || [])) {
              const r = Array.isArray(row.candidates?.results) ? row.candidates.results[0] : row.candidates?.results
              const pp = r?.pass_probability
              const oc = (row.outcome || '').toLowerCase()
              const passed = oc === 'passed_probation' || oc === 'still_employed' || oc === 'still_in_probation'
              const failed = oc === 'failed_probation' || oc === 'left_early' || oc === 'dismissed'
              if (pp == null || (!passed && !failed)) { pending++; continue }
              if (pp >= 70 && passed) judged.push(true)
              else if (pp < 50 && failed) judged.push(true)
              else if (pp >= 70 && failed) judged.push(false)
              else if (pp < 50 && passed) judged.push(false)
              else pending++
            }
            const total = judged.length
            const correct = judged.filter(Boolean).length
            const incorrect = total - correct
            if (total >= 3) {
              setAccuracyData({
                total,
                correct,
                incorrect,
                pending,
                accuracy: Math.round((correct / total) * 100),
              })
            }
          } catch (_) {}

          // Pending outcome check-ins (reminders awaiting response)
          try {
            const { data: pending } = await supabase
              .from('outcome_reminders')
              .select('id, reminder_month, sent_at, candidate_outcome_id, candidate_outcomes!inner(candidate_id, user_id, candidates(id, name, assessment_id, assessments(role_title)))')
              .is('responded_at', null)
              .eq('candidate_outcomes.user_id', user.id)
              .order('sent_at', { ascending: false })
              .limit(20)
            setPendingCheckins(pending || [])
          } catch (_) {}
        } catch (_) {
          // Table may not exist for all accounts
        }

        // Load probation hires for employer accounts
        if (prof?.account_type === 'employer') {
          try {
            const { data: hires } = await supabase
              .from('candidate_outcomes')
              .select('*, candidates(id, name, assessment_id, assessments(role_title))')
              .eq('user_id', user.id)
              .eq('outcome', 'still_in_probation')
              .order('created_at', { ascending: false })
            setProbationHires(hires || [])
          } catch (_) {
            // Skip silently
          }
        }

        // Show onboarding wizard for new users
        if (prof && !prof.onboarding_complete) setShowOnboarding(true)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleArchive(id) {
    setConfirmArchive(null)
    setArchivingIds(prev => new Set([...prev, id]))
    try {
      const supabase = createClient()
      await supabase.from('candidates').update({ status: 'archived' }).eq('id', id)
      setCandidates(prev => prev.filter(c => c.id !== id))
      toast('Candidate archived')
    } finally {
      setArchivingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  async function handleDelete(id) {
    setConfirmDelete(null)
    setDeletingIds(prev => new Set([...prev, id]))
    try {
      const supabase = createClient()
      await supabase.from('responses').delete().eq('candidate_id', id)
      await supabase.from('results').delete().eq('candidate_id', id)
      await supabase.from('candidates').delete().eq('id', id)
      setCandidates(prev => prev.filter(c => c.id !== id))
      toast('Candidate deleted')
    } finally {
      setDeletingIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar active="dashboard" companyName={profile?.company_name} />
        <main style={{ marginLeft: 220, padding: '32px 40px', minHeight: '100vh', background: BG, fontFamily: F }}>
          <div style={{
            ...cs, background: REDBG, border: `1px solid #fecaca`,
            display: 'flex', alignItems: 'center', gap: 12, color: RED,
          }}>
            <Ic name="alert" size={18} color={RED} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
          </div>
        </main>
      </div>
    )
  }

  // ── plan / usage ────────────────────────────────────────────────────────────
  const planKey = (profile?.plan || 'starter').toLowerCase()
  const planLimit = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.starter
  const atLimit = planLimit !== null && monthlyCount >= planLimit

  // ── computed stats ──────────────────────────────────────────────────────────

  const completed = candidates.filter(c => c.status === 'completed')
  const pendingCandidates = candidates.filter(c => c.status === 'sent' || c.status === 'pending')

  const avgScore = completed.length
    ? Math.round(
        completed.reduce((sum, c) => {
          const score = c.results?.[0]?.overall_score ?? 0
          return sum + score
        }, 0) / completed.length
      )
    : null

  const recommendedCount = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length

  // Time to insight: avg minutes from invited_at to completed_at
  const timedCandidates = completed.filter(c => c.invited_at && c.completed_at)
  const avgMinutesToInsight = timedCandidates.length
    ? Math.round(
        timedCandidates.reduce((sum, c) => {
          const ms = new Date(c.completed_at) - new Date(c.invited_at)
          return sum + ms / 60000
        }, 0) / timedCandidates.length
      )
    : null

  function fmtInsight(mins) {
    if (mins === null) return '-'
    if (mins < 60) return `${mins} minutes`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  // Hiring cost saved: completed candidates scoring below 70 with no positive outcome
  const POSITIVE_OUTCOMES = new Set(['hired', 'offer_accepted', 'passed_probation', 'still_in_probation', 'placed'])
  const outcomesById = Object.fromEntries((candidateOutcomes || []).map(o => [o.candidate_id, o.outcome]))
  const BAD_HIRE_COST = 30000
  const avoidedBadHires = completed.filter(c => {
    const score = c.results?.[0]?.overall_score ?? 0
    const outcome = outcomesById[c.id]
    return score < 70 && (!outcome || !POSITIVE_OUTCOMES.has(outcome))
  })
  const costSaved = avoidedBadHires.length * BAD_HIRE_COST

  // ── filtered candidates ─────────────────────────────────────────────────────

  const filtered = search.trim()
    ? candidates.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      )
    : candidates

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', fontFamily: F }}>
      <Sidebar active="dashboard" companyName={profile?.company_name} />

      {/* ── Onboarding wizard ── */}
      {showOnboarding && (
        <OnboardingWizard
          userId={profile?.id}
          initialAccountType={profile?.account_type}
          onComplete={(accountType) => {
            setShowOnboarding(false)
            setProfile(prev => ({ ...prev, account_type: accountType, onboarding_complete: true }))
          }}
        />
      )}

      {/* ── Upgrade modal ── */}
      {showUpgrade && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15,33,55,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowUpgrade(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: CARD, borderRadius: 18, padding: '36px 36px 32px', maxWidth: 460, width: '100%', boxShadow: '0 24px 72px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: AMBBG, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Ic name="layers" size={22} color={AMB} />
            </div>
            <h3 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>
              Assessment limit reached
            </h3>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 6px', lineHeight: 1.65 }}>
              You've used <strong>{monthlyCount} of {planLimit}</strong> assessments this month on the <strong style={{ textTransform: 'capitalize' }}>{planKey}</strong> plan.
            </p>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 28px', lineHeight: 1.65 }}>
              Upgrade to create unlimited assessments and access premium features.
            </p>
            <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Available plans</div>
              {[
                { plan: 'Professional', price: '£120', limit: '30 assessments/mo', highlight: true },
                { plan: 'Unlimited', price: '£159', limit: 'Unlimited', highlight: false },
                { plan: 'Founding Member', price: '£79', limit: 'Unlimited for 3 months, then 20/mo', highlight: false },
              ].map(p => (
                <div key={p.plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BD}` }}>
                  <div>
                    <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: TX }}>{p.plan}</span>
                    {p.highlight && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: TEAL, background: TEALLT, padding: '1px 6px', borderRadius: 50 }}>POPULAR</span>}
                    <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{p.limit}</div>
                  </div>
                  <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{p.price}<span style={{ fontSize: 11, fontWeight: 500, color: TX3 }}>/mo</span></span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href="mailto:hello@prodicta.co.uk?subject=Upgrade my plan"
                style={{
                  display: 'block', width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  background: TEAL, color: NAVY, fontFamily: F, fontSize: 14.5, fontWeight: 800,
                  cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
                }}
              >
                Upgrade my plan →
              </a>
              <button
                onClick={() => setShowUpgrade(false)}
                style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation modal ── */}
      {confirmArchive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,33,55,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
          onClick={() => setConfirmArchive(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CARD, borderRadius: 14, padding: '28px 32px',
              maxWidth: 420, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: REDBG, border: `1px solid #fecaca`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ic name="archive" size={22} color={RED} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: TX }}>
              Archive this candidate?
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: TX2, lineHeight: 1.6 }}>
              <strong>{confirmArchive.name}</strong> will be removed from your active pipeline. You can restore them at any time from the Archive page.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleArchive(confirmArchive.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: RED, color: '#fff', fontFamily: F,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Archive candidate
              </button>
              <button
                onClick={() => setConfirmArchive(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,33,55,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CARD, borderRadius: 14, padding: '28px 32px',
              maxWidth: 420, width: '100%',
              boxShadow: '0 16px 48px rgba(15,33,55,0.2)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: REDBG, border: `1px solid #fecaca`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ic name="trash" size={20} color={RED} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: TX }}>
              Are you sure you want to permanently delete this candidate?
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: TX2, lineHeight: 1.6 }}>
              <strong>{confirmDelete.name}</strong> and all their responses and results will be permanently removed. This cannot be undone.
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 12.5, color: TX3, lineHeight: 1.5 }}>
              If you just want to hide them from your pipeline, use Archive instead.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: RED, color: '#fff', fontFamily: F,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Delete permanently
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: `1.5px solid ${BD}`, background: 'transparent',
                  color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main style={{
        marginLeft: 220,
        padding: '32px 40px',
        minHeight: '100vh',
        background: BG,
        flex: 1,
        minWidth: 0,
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          gap: 16,
        }}>
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 800,
            color: NAVY, letterSpacing: '-0.5px', flexShrink: 0,
          }}>
            Dashboard
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                <Ic name="search" size={15} color={searchFocused ? TEALD : TX3} />
              </div>
              <input
                type="text"
                placeholder="Search candidates…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  fontFamily: F,
                  fontSize: 13.5,
                  padding: '9px 14px 9px 36px',
                  borderRadius: 8,
                  border: `1.5px solid ${searchFocused ? TEAL : BD}`,
                  background: CARD,
                  color: TX,
                  outline: 'none',
                  width: 220,
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            <button
              onClick={() => atLimit ? setShowUpgrade(true) : router.push('/assessment/new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: atLimit ? '#e2e8f0' : TEAL,
                color: atLimit ? TX3 : '#fff',
                fontFamily: F, fontSize: 13.5, fontWeight: 700,
                cursor: atLimit ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Ic name="plus" size={15} color={atLimit ? TX3 : '#fff'} />
              New assessment
            </button>

            {planLimit !== null && (
              <div style={{
                fontFamily: F, fontSize: 11.5, fontWeight: 600,
                color: atLimit ? '#b91c1c' : TX3,
                background: atLimit ? '#fef2f2' : BG,
                border: `1px solid ${atLimit ? '#fecaca' : BD}`,
                borderRadius: 6, padding: '4px 10px',
                flexShrink: 0,
              }}>
                {monthlyCount} of {planLimit} this month
                {atLimit && ' · Limit reached'}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <StatCard
            icon="check"
            label="Completed"
            value={completed.length}
            sub="Completed assessments"
            accent={TEAL}
          />
          <StatCard
            icon="clock"
            label="Pending"
            value={pendingCandidates.length}
            sub="Awaiting completion"
            accent={AMB}
          />
          <StatCard
            icon="bar"
            label="Avg score"
            value={avgScore !== null ? avgScore : '-'}
            sub={avgScore !== null ? slabel(avgScore) : 'No data yet'}
            accent={avgScore !== null ? (avgScore >= 75 ? GRN : avgScore >= 50 ? AMB : RED) : TX3}
          />
          <StatCard
            icon="award"
            label="Recommended"
            value={recommendedCount}
            sub="Scoring 70 or above"
            accent={TEAL}
          />
        </div>

        {/* ── Secondary stats row ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {/* Time to insight */}
          <div style={{
            flex: 1, minWidth: 200,
            background: CARD, border: `1px solid ${BD}`, borderTop: `3px solid ${TEALD}`,
            borderRadius: 12, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ic name="clock" size={13} color={TEALD} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Average time to insight
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: TEALD, lineHeight: 1 }}>
                  {avgMinutesToInsight !== null ? fmtInsight(avgMinutesToInsight) : '-'}
                </div>
                <div style={{ fontSize: 10.5, color: TEALD, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                  PRODICTA
                </div>
              </div>
              <div style={{ fontSize: 14, color: TX3, fontFamily: F, fontWeight: 600 }}>vs</div>
              <div>
                <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: TX3, lineHeight: 1 }}>
                  3 to 4 weeks
                </div>
                <div style={{ fontSize: 10.5, color: TX3, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                  Traditional process
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>
              {timedCandidates.length > 0
                ? `From JD to hiring decision, across ${timedCandidates.length} candidate${timedCandidates.length !== 1 ? 's' : ''}`
                : 'From JD to hiring decision'}
            </div>
          </div>

          {/* Cost saved */}
          <div style={{
            flex: 2, minWidth: 280,
            background: costSaved > 0 ? GRNBG : CARD,
            border: `1px solid ${costSaved > 0 ? GRNBD : `${TEAL}55`}`,
            borderTop: `3px solid ${costSaved > 0 ? GRN : TEAL}`,
            borderRadius: 12, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ic name="shield" size={13} color={costSaved > 0 ? GRN : TEAL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Estimated cost of bad hires avoided
              </span>
            </div>
            {costSaved > 0 ? (
              <>
                <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: GRN, lineHeight: 1, marginBottom: 6 }}>
                  £{costSaved.toLocaleString('en-GB')}
                </div>
                <div style={{ fontSize: 12, color: TX3, fontFamily: F }}>
                  {avoidedBadHires.length} below-threshold candidate{avoidedBadHires.length !== 1 ? 's' : ''} not hired &middot; £30,000 average bad hire cost
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: TX2, fontFamily: F, lineHeight: 1.55, marginTop: 2 }}>
                Once you start assessing candidates, PRODICTA will calculate how much you have saved by avoiding bad hires.
              </div>
            )}
          </div>
        </div>

        {/* ── Active Placements (agency only) ── */}
        {profile?.account_type === 'agency' && (
          <ActivePlacements placements={activePlacements} router={router} />
        )}

        {/* ── Prediction Accuracy ── */}
        {accuracyData && (
          <div style={{
            ...cs,
            marginBottom: 20,
            padding: '20px 24px',
            borderTop: `3px solid ${TEAL}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="shield" size={14} color={TEAL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Prediction Accuracy
              </span>
            </div>
            <div style={{ fontFamily: F, fontSize: 16, color: TX, marginBottom: 14, lineHeight: 1.55 }}>
              PRODICTA prediction accuracy across your {accuracyData.total} {accuracyData.total === 1 ? 'hire' : 'hires'} with logged outcomes: <strong style={{ color: TEAL, fontSize: 22 }}>{accuracyData.accuracy}%</strong>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ background: GRNBG, border: `1px solid ${GRNBD}`, borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Correct</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: GRN, fontFamily: FM }}>{accuracyData.correct}</div>
              </div>
              <div style={{ background: REDBG, border: `1px solid #fecaca`, borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Incorrect</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: RED, fontFamily: FM }}>{accuracyData.incorrect}</div>
              </div>
              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pending</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: TX2, fontFamily: FM }}>{accuracyData.pending}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Pending check-ins ── */}
        {pendingCheckins.length > 0 && (
          <div style={{
            ...cs, marginBottom: 20, padding: '20px 24px',
            borderTop: `3px solid ${TEAL}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="clock" size={14} color={TEAL} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pending check-ins: {pendingCheckins.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingCheckins.slice(0, 8).map(r => {
                const co = r.candidate_outcomes
                const cand = co?.candidates
                if (!cand) return null
                return (
                  <a
                    key={r.id}
                    href={`/assessment/${cand.assessment_id}/candidate/${cand.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 8,
                      background: BG, border: `1px solid ${BD}`, textDecoration: 'none',
                      color: TX, fontFamily: F, fontSize: 13.5,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: TX }}>{cand.name}</div>
                      <div style={{ fontSize: 12, color: TX3 }}>{cand.assessments?.role_title || ''} &middot; {r.reminder_month}-month review</div>
                    </div>
                    <div style={{ fontSize: 11, color: TEALD, fontWeight: 700 }}>Open report</div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Override Outcomes ── */}
        {overrideStats && (
          <div style={{
            ...cs, marginBottom: 20, padding: '20px 24px',
            borderTop: `3px solid ${RED}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ic name="alert" size={14} color={RED} />
              <span style={{ fontSize: 11, fontWeight: 700, color: TX3, fontFamily: F, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Override outcomes
              </span>
            </div>
            <div style={{ fontFamily: F, fontSize: 16, color: TX, marginBottom: 6, lineHeight: 1.55 }}>
              You overrode PRODICTA warnings <strong style={{ color: RED, fontSize: 22 }}>{overrideStats.total}</strong> time{overrideStats.total === 1 ? '' : 's'}. <strong style={{ color: RED }}>{overrideStats.failed}</strong> of those hire{overrideStats.failed === 1 ? '' : 's'} {overrideStats.failed === 1 ? 'has' : 'have'} since failed.
            </div>
            <p style={{ fontFamily: F, fontSize: 12.5, color: TX3, margin: 0, lineHeight: 1.6 }}>
              An override is recorded when you hire a candidate PRODICTA flagged as high risk (score below 55 or risk level High).
            </p>
          </div>
        )}

        {/* ── Hiring Risk Overview ── */}
        <HiringRiskOverview completed={completed} />

        {/* ── Assessment Insights ── */}
        <AssessmentInsights candidates={candidates} />

        {/* ── Probation Tracker (employer only) ── */}
        {profile?.account_type === 'employer' && (
          <ProbationTracker hires={probationHires} router={router} />
        )}

        {/* ── ERA 2025 Risk Calculator / Placement Risk + Cost of Vacancy ── */}
        <RiskCalculator profile={profile} completed={completed} />
        <CostOfVacancyCard profile={profile} />

        {/* ── Bottom grid: table + assessments panel ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Candidates table ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...cs,
              padding: 0,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: `1px solid ${BD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <h2 style={{
                    margin: 0, fontSize: 15.5, fontWeight: 700, color: TX,
                  }}>
                    All Candidates
                  </h2>
                  {search && (
                    <div style={{ fontSize: 12, color: TX3, marginTop: 2 }}>
                      {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
                    </div>
                  )}
                </div>
                {candidates.length > 0 && (
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: TX3,
                    background: BG, border: `1px solid ${BD}`,
                    borderRadius: 6, padding: '3px 10px',
                  }}>
                    {candidates.length} total
                  </span>
                )}
              </div>

              {filtered.length === 0 ? (
                <EmptyState />
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '17%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BD}` }}>
                        {['Candidate', 'Role', 'Status', 'Score', 'Pressure', 'Risk', 'Date', ''].map(h => (
                          <th key={h} style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: TX3,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            background: BG,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => {
                        const result      = c.results?.[0]
                        const score       = result?.overall_score ?? null
                        const pf          = result?.pressure_fit_score ?? null
                        const risk        = result?.risk_level ?? null
                        const isCompleted = c.status === 'completed'
                        const isHovered   = hoveredRow === c.id
                        const isClickable = isCompleted
                        const isArchiving = archivingIds.has(c.id)
                        const isDeleting  = deletingIds.has(c.id)
                        const menuOpen    = openMenu === c.id

                        return (
                          <tr
                            key={c.id}
                            onClick={() => {
                              if (isClickable) {
                                router.push(`/assessment/${c.assessments.id}/candidate/${c.id}`)
                              }
                            }}
                            onMouseEnter={() => setHoveredRow(c.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                              borderBottom: i < filtered.length - 1 ? `1px solid ${BD}` : 'none',
                              background: isHovered && isClickable ? '#f0fdfb' : CARD,
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'background 0.15s',
                              boxShadow: isHovered && isClickable ? `inset 3px 0 0 #00BFA5` : 'none',
                            }}
                          >
                            {/* Candidate name + email */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={c.name} size={28} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    fontSize: 12.5, fontWeight: 600, color: TX,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.name}
                                  </div>
                                  <div style={{
                                    fontSize: 11, color: TX3,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {c.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                                {c.assessments?.id && (
                                  <div style={{
                                    width: 22, height: 22, borderRadius: 5,
                                    background: roleColor(c.assessments.id),
                                    flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                                    </svg>
                                  </div>
                                )}
                                <span style={{
                                  fontSize: 12, color: TX2, fontWeight: 500,
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {c.assessments?.role_title || '-'}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <StatusBadge status={c.status} />
                            </td>

                            {/* Score */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted && score !== null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                  <span style={{
                                    fontFamily: FM, fontSize: 15, fontWeight: 700,
                                    color: scolor(score), lineHeight: 1,
                                  }}>
                                    {score}
                                  </span>
                                  <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 12 }}>-</span>
                              )}
                            </td>

                            {/* Pressure-Fit */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted && pf !== null ? (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                                  <span style={{
                                    fontFamily: FM, fontSize: 15, fontWeight: 700, lineHeight: 1,
                                    color: pf >= 75 ? GRN : pf >= 55 ? TEALD : pf >= 40 ? AMB : RED,
                                  }}>
                                    {pf}
                                  </span>
                                  <span style={{ fontSize: 10, color: TX3 }}>/100</span>
                                </div>
                              ) : (
                                <span style={{ color: TX3, fontSize: 12 }}>-</span>
                              )}
                            </td>

                            {/* Risk */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              {isCompleted ? <RiskBadge risk={risk} /> : <span style={{ color: TX3, fontSize: 12 }}>-</span>}
                            </td>

                            {/* Date */}
                            <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                              <span style={{ fontSize: 11.5, color: TX3, whiteSpace: 'nowrap' }}>
                                {isCompleted ? fmt(c.completed_at) : fmt(c.invited_at)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '10px 4px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmArchive(c) }}
                                  disabled={isArchiving || isDeleting}
                                  title="Archive"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 30, height: 30, borderRadius: 7, padding: 0,
                                    border: `1px solid ${BD}`, background: 'transparent',
                                    cursor: (isArchiving || isDeleting) ? 'wait' : 'pointer',
                                    transition: 'all 0.15s',
                                    opacity: (isArchiving || isDeleting) ? 0.5 : 1,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = BG; e.currentTarget.style.borderColor = TX3 }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = BD }}
                                >
                                  <Ic name="archive" size={13} color={TX3} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmDelete(c) }}
                                  disabled={isArchiving || isDeleting}
                                  title="Delete permanently"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 30, height: 30, borderRadius: 7, padding: 0,
                                    border: `1px solid ${BD}`, background: 'transparent',
                                    cursor: (isArchiving || isDeleting) ? 'wait' : 'pointer',
                                    transition: 'all 0.15s',
                                    opacity: (isArchiving || isDeleting) ? 0.5 : 1,
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = REDBG; e.currentTarget.style.borderColor = RED }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = BD }}
                                >
                                  <Ic name="trash" size={13} color={RED} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Assessments sidebar panel ── */}
          <div style={{ width: 268, flexShrink: 0 }}>
            <div style={{ ...cs, padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '18px 20px',
                borderBottom: `1px solid ${BD}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: TX }}>
                  Active Assessments
                </h2>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, color: TEALD,
                  background: TEALLT, borderRadius: 6, padding: '2px 8px',
                }}>
                  {assessments.length}
                </span>
              </div>

              {assessments.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: TEALLT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <Ic name="layers" size={18} color={TEALD} />
                  </div>
                  <div style={{ fontSize: 13, color: TX2, fontWeight: 600, marginBottom: 6 }}>
                    No active assessments
                  </div>
                  <div style={{ fontSize: 12, color: TX3, marginBottom: 16, lineHeight: 1.5 }}>
                    Create one to start inviting candidates.
                  </div>
                  <button
                    onClick={() => router.push('/assessment/new')}
                    style={{ ...bs('secondary', 'sm'), width: '100%', justifyContent: 'center' }}
                  >
                    <Ic name="plus" size={13} color={TX2} />
                    New assessment
                  </button>
                </div>
              ) : (
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {assessments.map(a => {
                    const candidatesForAssessment = candidates.filter(
                      c => c.assessments?.id === a.id
                    )
                    const completedCount = candidatesForAssessment.filter(c => c.status === 'completed').length
                    const totalForAssessment = candidatesForAssessment.length

                    return (
                      <AssessmentCard
                        key={a.id}
                        assessment={a}
                        completed={completedCount}
                        total={totalForAssessment}
                        onClick={() => router.push(`/assessment/${a.id}`)}
                      />
                    )
                  })}

                  <button
                    onClick={() => router.push('/assessment/new')}
                    style={{
                      ...bs('secondary', 'sm'),
                      width: '100%',
                      justifyContent: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Ic name="plus" size={13} color={TX2} />
                    New assessment
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function ProbationTracker({ hires = [], router }) {
  const now = Date.now()

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${BD}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 6 }}>
            Probation Tracker
          </h2>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2, marginBottom: 6 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: TX3, fontFamily: F }}>
            Hired candidates currently in their probation period.
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 12px', borderRadius: 20,
          background: '#00BFA5', fontSize: 12, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {hires.length} active
        </span>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {hires.length === 0 ? (
          <div style={{
            background: 'rgba(0,191,165,0.06)',
            border: '1px solid rgba(0,191,165,0.18)',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <p style={{ margin: 0, fontSize: 13.5, color: TX3, lineHeight: 1.6, fontFamily: F }}>
              No hires being tracked yet. Log an outcome on a candidate's report to start tracking probation.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {hires.map((h, idx) => {
              const candidate = h.candidates
              const name = candidate?.name || 'Unknown candidate'
              const role = candidate?.assessments?.role_title || 'Unknown role'
              const assessmentId = candidate?.assessment_id
              const candidateId = candidate?.id
              const startDate = h.placement_date || h.outcome_date || h.created_at
              const probMonths = h.probation_months || 6
              const totalDays = Math.round(probMonths * 30.44)
              const elapsedDays = startDate
                ? Math.max(0, Math.floor((now - new Date(startDate).getTime()) / 86400000))
                : 0
              const remainingDays = Math.max(0, totalDays - elapsedDays)
              const pct = Math.min(100, totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0)
              const monthsIn = startDate ? Math.floor(elapsedDays / 30.44) : 0
              const monthsLeft = Math.max(0, probMonths - monthsIn)
              const done = elapsedDays >= totalDays
              const danger = !done && remainingDays <= 30
              const barColor = done ? GRN : danger ? RED : TEAL
              const isClickable = assessmentId && candidateId

              const hireDateLabel = startDate
                ? new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Date unknown'

              return (
                <div
                  key={h.id || idx}
                  onClick={() => isClickable && router.push(`/assessment/${assessmentId}/candidate/${candidateId}`)}
                  style={{
                    padding: '14px 0',
                    borderBottom: idx < hires.length - 1 ? `1px solid ${BD}` : 'none',
                    cursor: isClickable ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  }}
                  onMouseEnter={e => { if (isClickable) e.currentTarget.style.background = BG }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Name + role */}
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: TX, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: 12, color: TX3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role}</div>
                  </div>

                  {/* Hire date */}
                  <div style={{ flex: '0 0 auto', minWidth: 100, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Started</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: TX2 }}>{hireDateLabel}</div>
                  </div>

                  {/* Months remaining */}
                  <div style={{ flex: '0 0 auto', minWidth: 90, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Remaining</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: done ? GRN : danger ? RED : TX }}>
                      {done ? 'Complete' : `${monthsLeft} month${monthsLeft !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: TX3 }}>Month {Math.min(monthsIn, probMonths)} of {probMonths}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s ease' }} />
                    </div>
                    {danger && !done && (
                      <div style={{ fontSize: 11, color: RED, marginTop: 4, fontWeight: 600 }}>Within 30 days of end</div>
                    )}
                  </div>

                  {/* Arrow */}
                  {isClickable && (
                    <Ic name="right" size={13} color={TX3} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ActivePlacements({ placements, router }) {
  if (!placements || placements.length === 0) return null
  const now = new Date()

  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMB, boxShadow: `0 0 0 3px ${AMBBG}` }} />
          <span style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: TX }}>Active Placements</span>
          <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: AMBBG, color: AMB, border: `1px solid ${AMBBD}` }}>
            {placements.length} in rebate
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '9px 24px', background: BG, borderBottom: `1px solid ${BD}` }}>
          {['Candidate', 'Client', 'Placed', 'Rebate period', 'Status'].map(h => (
            <div key={h} style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>

        {placements.map((p, i) => {
          if (!p.placement_date || !p.rebate_weeks) return null
          const start    = new Date(p.placement_date)
          const totalMs  = p.rebate_weeks * 7 * 86400000
          const endDate  = new Date(start.getTime() + totalMs)
          const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000))
          const weeksLeft = Math.ceil(daysLeft / 7)
          const elapsed  = Math.max(0, Math.floor((now - start) / 86400000))
          const pct      = Math.max(0, Math.round(100 - (elapsed / (p.rebate_weeks * 7)) * 100))
          const urgent   = weeksLeft <= 1
          const cand     = p.candidates || {}

          return (
            <div
              key={p.id}
              onClick={() => cand?.id && router.push(`/assessment/${cand.assessment_id || ''}/candidate/${cand.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '13px 24px',
                borderBottom: i < placements.length - 1 ? `1px solid ${BD}` : 'none',
                alignItems: 'center', cursor: cand?.id ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = BG }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: TX }}>{cand?.name || '-'}</div>
              <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>{p.client_name || '-'}</div>
              <div style={{ fontFamily: FM, fontSize: 12, color: TX3 }}>
                {start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontFamily: F, fontSize: 12.5, color: TX2 }}>{p.rebate_weeks} weeks</div>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: F, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                  background: urgent ? REDBG : AMBBG,
                  color: urgent ? RED : AMB,
                  border: `1px solid ${urgent ? REDBD : AMBBD}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: urgent ? RED : AMB }} />
                  {weeksLeft}w left &middot; {pct}% rebate
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssessmentInsights({ candidates = [] }) {
  if (!candidates.length) return null

  const PLATFORM_AVG = 68 // platform-wide completion rate baseline

  const totalSent      = candidates.length
  const totalCompleted = candidates.filter(c => c.status === 'completed').length
  const completionRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0

  const completedWithTimes = candidates.filter(c => c.status === 'completed' && c.invited_at && c.completed_at)
  const avgHours = completedWithTimes.length > 0
    ? Math.round(completedWithTimes.reduce((sum, c) => {
        const diff = (new Date(c.completed_at).getTime() - new Date(c.invited_at).getTime()) / (1000 * 60 * 60)
        return sum + diff
      }, 0) / completedWithTimes.length)
    : null
  const avgDisplay = avgHours == null ? '-' : avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`

  // Per-assessment breakdown
  const byAssessment = {}
  for (const c of candidates) {
    const aid = c.assessments?.id || c.assessment_id
    const role = c.assessments?.role_title || 'Unknown role'
    if (!aid) continue
    if (!byAssessment[aid]) byAssessment[aid] = { aid, role, sent: 0, completed: 0 }
    byAssessment[aid].sent += 1
    if (c.status === 'completed') byAssessment[aid].completed += 1
  }
  const lowRoles = Object.values(byAssessment)
    .map(a => ({ ...a, rate: a.sent > 0 ? Math.round((a.completed / a.sent) * 100) : 0 }))
    .filter(a => a.sent >= 3 && a.rate < PLATFORM_AVG)

  const rateColor = completionRate >= PLATFORM_AVG ? TEAL : completionRate >= 40 ? AMB : RED

  return (
    <div style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
      overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{
        padding: '18px 22px 14px', borderBottom: `1px solid ${BD}`,
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 6 }}>
          Assessment Insights <InfoTooltip text="How candidates engage with the assessments you send. Low completion rates may indicate the assessment length or job description is putting candidates off." />
        </h2>
        <div style={{ width: 36, height: 2, background: TEAL, borderRadius: 2, marginBottom: 6 }} />
        <p style={{ margin: 0, fontSize: 12.5, color: TX3, fontFamily: F }}>
          Completion rates and time-to-complete across all your assessments.
        </p>
      </div>

      <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total sent',      value: totalSent,         sub: 'All time',                color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
          { label: 'Total completed', value: totalCompleted,    sub: `${totalSent - totalCompleted} not completed`, color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
          { label: 'Completion rate', value: `${completionRate}%`, sub: `Platform avg ${PLATFORM_AVG}%`, color: rateColor, bg: completionRate >= PLATFORM_AVG ? TEALLT : completionRate >= 40 ? AMBBG : REDBG, bd: `${rateColor}55` },
          { label: 'Avg time to complete', value: avgDisplay, sub: avgHours == null ? 'Not enough data' : 'From invite to submit', color: TEALD, bg: TEALLT, bd: `${TEAL}55` },
        ].map(m => (
          <div key={m.label} style={{ background: m.bg, border: `1px solid ${m.bd}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1.1, marginBottom: 2 }}>{m.value}</div>
            <div style={{ fontFamily: F, fontSize: 11.5, color: TX3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {lowRoles.length > 0 && (
        <div style={{ padding: '0 22px 18px' }}>
          {lowRoles.map(r => (
            <div key={r.aid} style={{
              background: AMBBG, border: `1px solid ${AMBBD}`, borderLeft: `4px solid ${AMB}`,
              borderRadius: 8, padding: '10px 14px', marginTop: 10,
            }}>
              <div style={{ fontFamily: F, fontSize: 12.5, color: TX, lineHeight: 1.55 }}>
                <strong>{r.role}</strong> has a {r.rate}% completion rate. The platform average is {PLATFORM_AVG}%. Consider whether the assessment length or JD is a barrier.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HiringRiskOverview({ completed }) {
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // This month's completed candidates
  const thisMonth = completed.filter(c => {
    if (!c.completed_at) return false
    const d = new Date(c.completed_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  // Fall back to all-time if nothing this month
  const pool = thisMonth.length > 0 ? thisMonth : completed
  const periodLabel = thisMonth.length > 0 ? monthLabel : 'All time'
  const isThisMonth = thisMonth.length > 0

  const assessed  = pool.length
  const passed    = pool.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length
  const failed    = assessed - passed
  const passRate  = assessed > 0 ? Math.round((passed / assessed) * 100) : null
  const avgScore  = assessed > 0
    ? Math.round(pool.reduce((sum, c) => sum + (c.results?.[0]?.overall_score ?? 0), 0) / assessed)
    : null

  // High risk = any result where risk_level contains 'High'
  const highRisk  = completed.filter(c => {
    const rl = c.results?.[0]?.risk_level ?? ''
    return rl.toLowerCase().includes('high')
  })

  const passColor = passRate === null ? TX3 : passRate >= 70 ? TEAL : passRate >= 50 ? AMB : RED
  const passBg    = passRate === null ? BG   : passRate >= 70 ? TEALLT : passRate >= 50 ? AMBBG : REDBG
  const passBd    = passRate === null ? BD   : passRate >= 70 ? `${TEAL}55` : passRate >= 50 ? '#fde68a' : '#fecaca'

  const avgColor  = avgScore === null ? TX3 : avgScore >= 70 ? TEAL : avgScore >= 50 ? AMB : RED
  const avgBg     = avgScore === null ? BG   : avgScore >= 70 ? TEALLT : avgScore >= 50 ? AMBBG : REDBG

  const METRICS = [
    {
      label: 'Assessed',
      value: assessed > 0 ? assessed : '-',
      sub: isThisMonth ? 'This month' : 'All time',
      color: TEALD, bg: TEALLT, bd: `${TEAL}55`,
    },
    {
      label: 'Pass rate',
      value: passRate !== null ? `${passRate}%` : '-',
      sub: `${passed} of ${assessed} scored 70+`,
      color: passColor, bg: passBg, bd: passBd,
    },
    {
      label: 'Average score',
      value: avgScore !== null ? avgScore : '-',
      sub: avgScore !== null ? (avgScore >= 70 ? 'Above threshold' : avgScore >= 50 ? 'Below threshold' : 'Needs attention') : 'No data yet',
      color: avgColor, bg: avgBg, bd: `${avgColor}55`,
    },
  ]

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BD}`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${BD}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 15.5, fontWeight: 700, color: TX, display: 'flex', alignItems: 'center', gap: 6 }}>
            Hiring Pipeline Health <InfoTooltip text="Monthly snapshot of assessment quality across all your active roles." />
          </h2>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2, marginBottom: 6 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: TX3, fontFamily: F }}>
            Quality snapshot across all active assessments, useful for employers and recruitment agencies alike.
          </p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, flexShrink: 0,
          background: isThisMonth ? TEALLT : BG,
          border: `1px solid ${isThisMonth ? `${TEAL}55` : BD}`,
          fontSize: 12, fontWeight: 700,
          color: isThisMonth ? TEALD : TX3,
        }}>
          <Ic name="calendar" size={12} color={isThisMonth ? TEALD : TX3} />
          {periodLabel}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {completed.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '24px 0', color: TX3, fontSize: 13.5 }}>
            <Ic name="bar" size={28} color={BD} />
            <div style={{ marginTop: 10 }}>No completed assessments yet. Stats will appear here once candidates finish.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
              {/* 3 metric tiles */}
              {METRICS.map(({ label, value, sub, color, bg, bd }) => (
                <div key={label} style={{
                  flex: 1, minWidth: 140,
                  background: bg,
                  border: `1px solid ${bd}`,
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11.5, color: TX3 }}>{sub}</div>
                </div>
              ))}

              {/* High risk callout , larger, red */}
              <div style={{
                flex: '1 1 180px',
                background: highRisk.length > 0
                  ? `linear-gradient(135deg, ${REDBG}, #fff5f5)`
                  : TEALLT,
                border: `1.5px solid ${highRisk.length > 0 ? '#fecaca' : `${TEAL}55`}`,
                borderRadius: 10, padding: '14px 16px',
                position: 'relative', overflow: 'hidden',
              }}>
                {highRisk.length > 0 && (
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 56, height: 56, borderRadius: '50%',
                    background: `${RED}15`,
                  }} />
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
                  color: highRisk.length > 0 ? RED : TEAL,
                }}>
                  High risk flagged
                </div>
                <div style={{
                  fontFamily: FM, fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 4,
                  color: highRisk.length > 0 ? RED : TEAL,
                }}>
                  {highRisk.length}
                </div>
                <div style={{ fontSize: 11.5, color: TX3 }}>
                  {highRisk.length === 0
                    ? 'No high-risk candidates'
                    : highRisk.length === 1
                    ? '1 candidate needs attention'
                    : `${highRisk.length} candidates need attention`}
                </div>
              </div>
            </div>

            {/* Pass / fail bar */}
            {assessed > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: GRN }}>
                    {passed} passed (≥70)
                  </span>
                  {failed > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: RED }}>
                      {failed} below threshold
                    </span>
                  )}
                </div>
                <div style={{ height: 7, borderRadius: 4, background: REDBG, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${passRate ?? 0}%`,
                    background: `linear-gradient(90deg, ${GRN}, #34d399)`,
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11.5, color: TX3, marginTop: 6 }}>
                  Pass rate vs fail rate across {assessed} scored candidate{assessed !== 1 ? 's' : ''}
                  {isThisMonth ? ' this month' : ' in total'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PlacementRiskCard({ completed = [] }) {
  const [fee, setFee] = useState('5000')
  const [feeFocused, setFeeFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const feeVal = Math.max(0, parseInt(fee.replace(/[^0-9]/g, '')) || 0)
  const replacementSearch = 3000
  const totalLoss = feeVal + replacementSearch

  function gbp(n) {
    return '£' + n.toLocaleString('en-GB')
  }

  const inputStyle = focused => ({
    fontFamily: F,
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: '#fff',
    color: NAVY,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  return (
    <div style={{
      background: '#0f2137',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Placement risk / cost of failed placement
          </div>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Average placement fee
            </label>
            <div style={{ position: 'relative', width: 180 }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={fee}
                onChange={e => setFee(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setFeeFocused(true)}
                onBlur={() => setFeeFocused(false)}
                style={{ ...inputStyle(feeFocused), paddingLeft: 26, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${feeFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
                placeholder="5000"
              />
            </div>
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: AMB, lineHeight: 1 }}>
              {gbp(totalLoss)}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
          Lost fee + replacement search + reputational damage.
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F,
            padding: 0, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Lost placement fee',         value: gbp(feeVal),            note: 'Not recovered on failed placement',              color: RED  },
              { label: 'Replacement search cost',    value: gbp(replacementSearch), note: 'Average cost to source a replacement',           color: AMB  },
              { label: 'Client relationship damage', value: 'Reputational',         note: 'Loss of future instructions, hard to quantify',  color: TEAL },
            ].map(({ label, value, note, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CostOfVacancyCard({ profile }) {
  const isAgency = profile?.account_type === 'agency'
  const [salary, setSalary] = useState(isAgency ? '6000' : '35000')
  const [days, setDays] = useState('14')
  const [salFocused, setSalFocused] = useState(false)
  const [daysFocused, setDaysFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const sal = Math.max(0, parseInt(String(salary).replace(/[^0-9]/g, '')) || 0)
  const d   = Math.max(0, parseInt(String(days).replace(/[^0-9]/g, '')) || 0)

  // Employer: lost productivity per working day (annual salary / 260)
  const dailyCost = isAgency ? 0 : Math.round(sal / 260)
  const totalCost = isAgency ? 0 : dailyCost * d

  // Agency: fee at risk grows with elapsed days, capped at the full fee.
  // Treat 30 days as the point at which the client is most likely to walk.
  const urgencyFactor = Math.min(1, d / 30)
  const feeAtRisk    = isAgency ? Math.round(sal * urgencyFactor) : 0

  function gbp(n) { return '£' + n.toLocaleString('en-GB') }

  const inputStyle = focused => ({
    fontFamily: F, fontSize: 15, fontWeight: 700, width: '100%',
    padding: '10px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.08)', color: '#fff',
    border: `1.5px solid ${focused ? TEAL : 'rgba(255,255,255,0.18)'}`,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  })

  const headlineFigure = isAgency ? feeAtRisk : totalCost
  const headlineLabel  = isAgency ? 'Estimated lost revenue' : 'Estimated cost of vacancy'
  const subline = isAgency
    ? `This role has been open for ${d} day${d !== 1 ? 's' : ''}.`
    : `This role has been empty for ${d} day${d !== 1 ? 's' : ''}.`

  return (
    <div style={{
      background: '#0f2137',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 24,
    }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Cost of vacancy
          </div>
          <div style={{ width: 36, height: 2, background: TEAL, borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              {isAgency ? 'Expected placement fee' : 'Annual salary'}
            </label>
            <div style={{ position: 'relative', width: 160 }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={salary}
                onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setSalFocused(true)}
                onBlur={() => setSalFocused(false)}
                style={{ ...inputStyle(salFocused), paddingLeft: 26 }}
                placeholder={isAgency ? '6000' : '35000'}
              />
            </div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Days {isAgency ? 'open' : 'vacant'}
            </label>
            <input
              type="text"
              value={days}
              onChange={e => setDays(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => setDaysFocused(true)}
              onBlur={() => setDaysFocused(false)}
              style={{ ...inputStyle(daysFocused), width: 100 }}
              placeholder="14"
            />
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              {headlineLabel}
            </div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: TEAL, lineHeight: 1 }}>
              {gbp(headlineFigure)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
              {subline}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F,
            padding: 0, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isAgency ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Placement fee</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Expected fee on placement</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color: '#fff' }}>{gbp(sal)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Urgency factor</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Risk client goes elsewhere after 30 days</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color: AMB }}>{Math.round(urgencyFactor * 100)}%</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Daily lost productivity</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Annual salary divided by 260 working days</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color: '#fff' }}>{gbp(dailyCost)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Days vacant</div>
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>Working days the role has been empty</div>
                  </div>
                  <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color: AMB }}>{d}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RiskCalculator({ profile, completed = [] }) {
  const [salary, setSalary] = useState('30000')
  const [hires, setHires] = useState('5')
  const [salFocused, setSalFocused] = useState(false)
  const [hiresFocused, setHiresFocused] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (profile?.account_type === 'agency') {
    return <PlacementRiskCard completed={completed} />
  }

  const sal = Math.max(0, parseInt(salary.replace(/[^0-9]/g, '')) || 0)
  const h   = Math.max(1, parseInt(hires.replace(/[^0-9]/g, '')) || 1)

  const recruitment  = Math.round(sal * 0.15)
  const training     = 3000
  const productivity = Math.round(sal * 0.25)
  const tribunal     = Math.round(sal * 0.75)
  const totalPerHire = recruitment + training + productivity + tribunal

  const failCount     = Math.max(1, Math.round(h * 0.2))
  const totalExposure = totalPerHire * failCount

  function gbp(n) {
    return '£' + n.toLocaleString('en-GB')
  }

  const inputStyle = focused => ({
    fontFamily: F,
    fontSize: 15,
    fontWeight: 700,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1.5px solid ${focused ? TEAL : BD}`,
    background: '#fff',
    color: NAVY,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  const BREAK = [
    { label: 'Recruitment cost',       value: recruitment,  note: '15% of salary',          color: AMB, bg: AMBBG },
    { label: 'Training and onboarding', value: training,    note: 'Average cost per hire',   color: AMB, bg: AMBBG },
    { label: 'Lost productivity',      value: productivity, note: 'Roughly 3 months in role', color: AMB, bg: AMBBG },
    { label: 'ERA 2025 tribunal risk', value: tribunal,     note: 'Uncapped from Jan 2027',  color: RED, bg: REDBG },
  ]

  return (
    <div style={{
      background: '#0f2137',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            ERA 2025 risk calculator
          </div>
          <div style={{ width: 36, height: 2, background: '#00BFA5', borderRadius: 2 }} />
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Average salary
            </label>
            <div style={{ position: 'relative', width: 160 }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
              }}>£</span>
              <input
                type="text"
                value={salary}
                onChange={e => setSalary(e.target.value.replace(/[^0-9]/g, ''))}
                onFocus={() => setSalFocused(true)}
                onBlur={() => setSalFocused(false)}
                style={{ ...inputStyle(salFocused), paddingLeft: 26, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${salFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
                placeholder="30000"
              />
            </div>
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontFamily: F }}>
              Hires this year
            </label>
            <input
              type="text"
              value={hires}
              onChange={e => setHires(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => setHiresFocused(true)}
              onBlur={() => setHiresFocused(false)}
              style={{ ...inputStyle(hiresFocused), width: 100, background: 'rgba(255,255,255,0.08)', color: '#fff', border: `1.5px solid ${hiresFocused ? TEAL : 'rgba(255,255,255,0.18)'}` }}
              placeholder="5"
            />
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total exposure</div>
            <div style={{ fontFamily: FM, fontSize: 30, fontWeight: 800, color: AMB, lineHeight: 1 }}>
              {gbp(totalExposure)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
              {failCount} of {h} hire{h !== 1 ? 's' : ''} failing · 20% industry average
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, color: TEAL, fontFamily: F,
            padding: 0, display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BREAK.map(({ label, value, note, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{note}</div>
                </div>
                <div style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color, flexShrink: 0 }}>
                  {gbp(value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ROLE_PALETTE = ['#00BFA5', '#0f2137', '#E8B84B', '#E87461', '#7C5CFC', '#4FC3F7']
function roleColor(id = '') {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ROLE_PALETTE[h % ROLE_PALETTE.length]
}

function BriefcaseIcon({ color }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9, background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    </div>
  )
}

function AssessmentCard({ assessment, completed, total, onClick }) {
  const [hovered, setHovered] = useState(false)
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const iconColor = roleColor(assessment.id)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        border: `1.5px solid ${hovered ? TEAL : BD}`,
        background: hovered ? TEALLT : CARD,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <BriefcaseIcon color={iconColor} />
        <div style={{
          fontSize: 13, fontWeight: 700, color: TX,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {assessment.role_title}
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: total > 0 ? 8 : 0,
      }}>
        <span style={{ fontSize: 11.5, color: TX3 }}>
          {total} candidate{total !== 1 ? 's' : ''}
          {total > 0 ? ` · ${completed} done` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Ic name="right" size={12} color={hovered ? TEALD : TX3} />
        </div>
      </div>
      {total > 0 && (
        <div style={{
          height: 4, borderRadius: 2, background: BD, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${TEAL}, ${TEALD})`,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
      <div style={{
        fontSize: 11, color: TX3, marginTop: total > 0 ? 5 : 0,
      }}>
        {assessment.detected_role_type && (
          <span style={{
            display: 'inline-block',
            padding: '1px 7px',
            borderRadius: 4,
            background: BG,
            border: `1px solid ${BD}`,
            fontSize: 10.5,
            fontWeight: 600,
            color: TX3,
            textTransform: 'capitalize',
          }}>
            {assessment.detected_role_type}
          </span>
        )}
      </div>
    </div>
  )
}
