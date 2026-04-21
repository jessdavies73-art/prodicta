'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { NAVY, TEAL, F } from '../lib/constants'
import { Ic } from './Icons'
import { createClient } from '../lib/supabase'
import ProdictaLogo from './ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

// Per-bucket accent on the sidebar. Navy on the dashboard maps to a muted
// blue-grey here because the sidebar itself is navy, and dark-on-dark would
// disappear. Slate stays muted to indicate compliance is a "quiet" group.
const GROUP_ACCENTS = {
  1: '#00BFA5', // jade, Assessment and Screening
  2: '#93C5FD', // light blue, Shortlisting and Progression
  3: '#E8B84B', // gold, Post-placement and Aftercare
  4: '#94A3B8', // slate, Compliance
}

// Build the four-bucket nav. `accountType` is 'agency' | 'employer'.
// `showTemp` and `showPerm` indicate which employment types the account
// currently has active or has set as default. Items only surface if their
// bucket has at least one item for this account.
function buildGroups({ accountType, showTemp, showPerm }) {
  const isAgency   = accountType === 'agency'
  const isEmployer = accountType === 'employer'

  const group1 = [
    { key: 'dashboard',  label: 'Dashboard',          icon: 'grid',    href: '/dashboard' },
    { key: 'assessment', label: 'New assessment',     icon: 'plus',    href: '/assessment/new' },
    { key: 'all-candidates', label: 'All candidates', icon: 'users',   href: '/dashboard' },
    { key: 'compare',    label: 'Compare candidates', icon: 'sliders', href: '/compare' },
    { key: 'archive',    label: 'Archive',            icon: 'archive', href: '/archive' },
  ]

  const group2 = [
    { key: 'shortlist', label: 'Shortlist',          icon: 'check', href: '/dashboard#shortlisting' },
    { key: 'feedback',  label: 'Candidate feedback', icon: 'mail',  href: '/candidate-feedback' },
  ]

  const group3 = []
  if (isAgency) {
    group3.push({ key: 'placements',  label: 'Placements',         icon: 'shield', href: '/dashboard#post-placement' })
    group3.push({ key: 'assignments', label: 'Assignment reviews', icon: 'file',   href: '/assignment-reviews' })
  }
  if (isEmployer) {
    group3.push({ key: 'probation',   label: 'Probation tracker',  icon: 'shield', href: '/dashboard#post-placement' })
  }
  group3.push({ key: 'outcomes', label: 'Outcomes', icon: 'award', href: '/outcomes' })

  const group4 = []
  if (isAgency && showTemp) {
    group4.push({ key: 'ssp',       label: 'SSP',         icon: 'shield',   href: '/ssp' })
    group4.push({ key: 'holiday',   label: 'Holiday pay', icon: 'calendar', href: '/holiday' })
    group4.push({ key: 'documents', label: 'Documents',   icon: 'file',     href: '/documents' })
  }
  if (isEmployer) {
    if (showTemp) {
      group4.push({ key: 'ssp',     label: 'SSP',         icon: 'shield',   href: '/ssp' })
      group4.push({ key: 'holiday', label: 'Holiday pay', icon: 'calendar', href: '/holiday' })
    }
    if (showPerm) {
      group4.push({ key: 'era',     label: 'ERA 2025 compliance', icon: 'shield', href: '/edi' })
    }
  }
  group4.push({ key: 'edi',      label: 'EDI monitor', icon: 'shield',   href: '/edi' })
  group4.push({ key: 'settings', label: 'Settings',    icon: 'settings', href: '/settings' })

  return [
    { number: 1, label: 'Assessment and Screening',   items: group1 },
    { number: 2, label: 'Shortlisting and Progression', items: group2 },
    { number: 3, label: 'Post-placement and Aftercare', items: group3 },
    { number: 4, label: 'Compliance',                 items: group4 },
  ]
}

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)
  const [accountType, setAccountType] = useState('employer')
  const [showTemp, setShowTemp] = useState(false)
  const [showPerm, setShowPerm] = useState(true)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => { setMobileOpen(false) }, [active])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: prof } = await supabase.from('users')
        .select('account_type, default_employment_type')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return

      const acct = prof?.account_type === 'agency' ? 'agency' : 'employer'
      setAccountType(acct)

      const defaultType = prof?.default_employment_type
      // Decide temp vs perm scope. 'both' and 'ask' fall back to checking
      // the account's actual assessments so the sidebar reflects real use.
      if (defaultType === 'temporary') {
        setShowTemp(true); setShowPerm(false)
        return
      }
      if (defaultType === 'permanent') {
        setShowTemp(false); setShowPerm(true)
        return
      }

      const { data: assess } = await supabase.from('assessments')
        .select('employment_type')
        .eq('user_id', user.id)
      if (cancelled) return
      const rows = assess || []
      const hasTemp = rows.some(r => r.employment_type === 'temporary')
      const hasPerm = rows.some(r => r.employment_type !== 'temporary')
      // Empty account: default to perm so the sidebar does not start wider
      // than it needs to for a new user; temp items appear the moment they
      // create their first temp assessment.
      setShowTemp(hasTemp)
      setShowPerm(hasPerm || (!hasTemp && !hasPerm))
    }
    loadProfile()
    return () => { cancelled = true }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick(href) {
    router.push(href)
    setMobileOpen(false)
  }

  function showSidebarToast(label) {
    setToastMessage(`${label} is coming soon`)
    setTimeout(() => setToastMessage(''), 2400)
  }

  const groups = buildGroups({ accountType, showTemp, showPerm })

  function NavButton({ itemKey, label, icon, href, accent, comingSoon }) {
    const isActive = active === itemKey
    const isHovered = hoveredKey === itemKey
    return (
      <button
        onClick={() => {
          if (comingSoon) {
            showSidebarToast(label)
            return
          }
          handleNavClick(href)
        }}
        onMouseEnter={() => setHoveredKey(itemKey)}
        onMouseLeave={() => setHoveredKey(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          width: '100%',
          padding: '8px 12px',
          paddingLeft: isActive ? 9 : 12,
          borderRadius: 8,
          border: 'none',
          borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
          cursor: 'pointer',
          fontFamily: F,
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          textAlign: 'left',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          background: isActive
            ? `${accent}1F`
            : isHovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
          color: isActive ? accent : isHovered ? '#fff' : 'rgba(255,255,255,0.6)',
          boxShadow: isActive ? `inset 0 0 16px ${accent}14` : 'none',
        }}
      >
        <Ic
          name={icon}
          size={17}
          color={isActive ? accent : isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
        />
        {label}
        {itemKey === 'assessment' && (
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 5,
            background: TEAL,
            color: NAVY,
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
          }}>
            +
          </span>
        )}
        {comingSoon && (
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '1px 7px', borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.55)',
            fontFamily: F, fontSize: 9.5, fontWeight: 800,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            Soon
          </span>
        )}
      </button>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <ProdictaLogo textColor="#ffffff" size={32} />
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <Ic name="x" size={20} color="rgba(255,255,255,0.6)" />
          </button>
        )}
      </div>

      {/* Four-bucket nav, scrollable if it overflows */}
      <nav
        className="prodicta-sidebar-nav"
        style={{
          padding: '10px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {groups.map(group => {
          if (!group.items || group.items.length === 0) return null
          const accent = GROUP_ACCENTS[group.number]
          return (
            <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '2px 12px 6px',
              }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: accent, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: F, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {group.label}
                </span>
              </div>
              {group.items.map(item => (
                <NavButton
                  key={item.key}
                  itemKey={item.key}
                  label={item.label}
                  icon={item.icon}
                  href={item.href}
                  accent={accent}
                  comingSoon={item.comingSoon}
                />
              ))}
            </div>
          )
        })}
      </nav>

      {/* Coming-soon toast (transient) */}
      {toastMessage && (
        <div style={{
          position: 'fixed', left: isMobile ? '50%' : 240, bottom: 24,
          transform: isMobile ? 'translateX(-50%)' : 'none',
          background: NAVY, color: '#fff',
          padding: '10px 16px', borderRadius: 8,
          fontFamily: F, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          border: `1px solid ${TEAL}55`,
          zIndex: 200,
          pointerEvents: 'none',
          animation: 'sidebarToastIn 0.2s ease-out',
        }}>
          <style>{`@keyframes sidebarToastIn{from{opacity:0;transform:${isMobile ? 'translateX(-50%) translateY(8px)' : 'translateY(8px)'}}to{opacity:1;transform:${isMobile ? 'translateX(-50%) translateY(0)' : 'translateY(0)'}}}`}</style>
          {toastMessage}
        </div>
      )}

      {/* Pinned sign-out */}
      <div style={{
        padding: '8px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        flexShrink: 0,
      }}>
        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontFamily: F,
            fontSize: 13,
            fontWeight: 500,
            textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
            background: logoutHover ? 'rgba(220,38,38,0.12)' : 'transparent',
            color: logoutHover ? '#f87171' : 'rgba(255,255,255,0.4)',
          }}
        >
          <Ic name="logout" size={16} color={logoutHover ? '#f87171' : 'rgba(255,255,255,0.35)'} />
          Sign out
        </button>
      </div>
    </>
  )

  // ── Mobile: hamburger bar + slide-out drawer ──
  if (isMobile) {
    return (
      <>
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 110,
          height: 56, background: NAVY,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <ProdictaLogo textColor="#ffffff" size={28} />
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'relative' }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <line x1={3} y1={6} x2={21} y2={6}/>
              <line x1={3} y1={12} x2={21} y2={12}/>
              <line x1={3} y1={18} x2={21} y2={18}/>
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: 'rgba(0,0,0,0.5)',
              transition: 'opacity 0.2s',
            }}
          />
        )}

        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260, height: '100vh', background: NAVY,
          zIndex: 130, fontFamily: F,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          {sidebarContent}
        </aside>
      </>
    )
  }

  // ── Desktop: fixed full-height sidebar with scrollable body ──
  return (
    <aside style={{
      width: 220,
      height: '100vh',
      background: NAVY,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
      fontFamily: F,
    }}>
      {sidebarContent}
    </aside>
  )
}
