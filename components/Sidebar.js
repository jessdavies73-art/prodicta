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

// Flat navigation per account/employment type, with dividers marking
// logical groupings. `accountType` is 'agency' | 'employer'. `showTemp` and
// `showPerm` pick which employment slices the account has in use, so temp-only
// items (SSP, holiday pay, documents) hide for perm-only accounts.
function buildNav({ accountType, showTemp, showPerm }) {
  const isAgency = accountType === 'agency'
  const items = []

  items.push({ key: 'dashboard',       label: 'Dashboard',          icon: 'grid',    href: '/dashboard' })
  items.push({ key: 'assessment',      label: 'New assessment',     icon: 'plus',    href: '/assessment/new' })
  items.push({ key: 'all-candidates',  label: 'All candidates',     icon: 'users',   href: '/dashboard' })
  items.push({ key: 'compare',         label: 'Compare candidates', icon: 'sliders', href: '/compare' })
  if (isAgency) {
    items.push({ key: 'feedback',      label: 'Candidate feedback', icon: 'mail',    href: '/candidate-feedback' })
  }

  items.push({ divider: true })

  if (isAgency) {
    items.push({ key: 'placements',    label: 'Placements',          icon: 'shield', href: '/dashboard#post-placement' })
    items.push({ key: 'assignments',   label: 'Assignment reviews',  icon: 'file',   href: '/assignment-reviews' })
  } else {
    if (showTemp) {
      items.push({ key: 'placement-health', label: 'Placement health', icon: 'shield', href: '/dashboard#post-placement' })
    }
    if (showPerm) {
      items.push({ key: 'probation',   label: 'Probation tracker',   icon: 'shield', href: '/dashboard#post-placement' })
    }
  }
  items.push({ key: 'outcomes',        label: 'Outcomes',            icon: 'award',  href: '/outcomes' })
  if (showTemp) {
    items.push({ key: 'ssp',           label: 'SSP',                 icon: 'shield',   href: '/ssp' })
    items.push({ key: 'holiday',       label: 'Holiday pay',         icon: 'calendar', href: '/holiday' })
    if (isAgency) {
      items.push({ key: 'documents',   label: 'Documents',           icon: 'file',     href: '/documents' })
    }
  }

  items.push({ divider: true })

  items.push({ key: 'edi',             label: 'EDI monitor',         icon: 'shield',   href: '/edi' })
  items.push({ key: 'settings',        label: 'Settings',            icon: 'settings', href: '/settings' })

  return items
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
      // 'both' and 'ask' fall through to assessments lookup so the sidebar
      // mirrors actual use rather than the requested default.
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
      // Empty account defaults to perm so a new user does not see temp-only
      // items until they actually create a temp assessment.
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

  const items = buildNav({ accountType, showTemp, showPerm })

  function NavButton({ itemKey, label, icon, href }) {
    const isActive = active === itemKey
    const isHovered = hoveredKey === itemKey
    return (
      <button
        onClick={() => handleNavClick(href)}
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
          borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
          cursor: 'pointer',
          fontFamily: F,
          fontSize: 13,
          fontWeight: isActive ? 700 : 500,
          textAlign: 'left',
          transition: 'background 0.15s, color 0.15s, border-color 0.15s',
          background: isActive
            ? `${TEAL}1F`
            : isHovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
          color: isActive ? TEAL : isHovered ? '#fff' : 'rgba(255,255,255,0.6)',
          boxShadow: isActive ? `inset 0 0 16px ${TEAL}14` : 'none',
        }}
      >
        <Ic
          name={icon}
          size={17}
          color={isActive ? TEAL : isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
        />
        {label}
      </button>
    )
  }

  const Divider = () => (
    <div style={{
      height: 1,
      background: 'rgba(255,255,255,0.07)',
      margin: '8px 4px',
    }} />
  )

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

      <nav
        className="prodicta-sidebar-nav"
        style={{
          padding: '10px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {items.map((item, i) => item.divider
          ? <Divider key={`divider-${i}`} />
          : (
            <NavButton
              key={item.key}
              itemKey={item.key}
              label={item.label}
              icon={item.icon}
              href={item.href}
            />
          )
        )}
      </nav>

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

  // Mobile: hamburger bar + slide-out drawer
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

  // Desktop: fixed full-height sidebar with scrollable body
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
