'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Ic } from './Icons'
import { isDemoAgencyPerm } from '../lib/account-helpers'
import ProdictaLogo from './ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }
import { NAVY, TEAL, TEALD, TEALLT, CARD, BD, TX, TX2, TX3, GRN, GRNBG, GRNBD, F, FM, bs } from '../lib/constants'

// ── Demo Banner ───────────────────────────────────────────────────────────────
export function DemoBanner() {
  const router = useRouter()
  const isMobile = useIsMobile()
  return (
    <div style={{
      background: `linear-gradient(90deg, ${NAVY} 0%, #1a3a5c 100%)`,
      borderBottom: `2px solid ${TEAL}`,
      padding: isMobile ? '8px 12px' : '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 8 : 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, minWidth: 0 }}>
        <div style={{ background: TEAL, color: NAVY, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', flexShrink: 0 }}>
          DEMO
        </div>
        {!isMobile && (
          <span style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            You're viewing a demo. Sign up to assess your own candidates.
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => router.push('/login')}
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 7, padding: isMobile ? '5px 10px' : '7px 14px', fontFamily: F, fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Exit Demo
        </button>
        <button
          onClick={() => router.push('/login')}
          style={{ background: TEAL, color: NAVY, border: 'none', borderRadius: 7, padding: isMobile ? '6px 12px' : '8px 18px', fontFamily: F, fontSize: isMobile ? 12 : 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Sign up →
        </button>
      </div>
    </div>
  )
}

// ── Demo Sidebar ──────────────────────────────────────────────────────────────
// The Compliance group as a whole is hidden for the agency-permanent demo
// viewer (matches the live agency-perm sidebar). Documents stays gated to
// agency + temp/both within the group when the group is visible at all.
function buildDemoGroups({ showDocuments, hideCompliance }) {
  const groups = [
    { label: 'Main', items: [
      { key: 'dashboard',  label: 'Dashboard',      icon: 'grid',    href: '/demo' },
      { key: 'drill-down', label: 'Drill-down',     icon: 'sliders', href: '/demo/drill-down' },
      { key: 'assessment', label: 'New assessment', icon: 'plus',    restricted: true },
    ]},
    { label: 'Placement', items: [
      { key: 'compare',  label: 'Compare',  icon: 'sliders', href: '/demo/compare' },
      { key: 'archive',  label: 'Archive',  icon: 'archive', href: '/demo/archive' },
      { key: 'outcomes', label: 'Outcomes', icon: 'award',   restricted: true },
    ]},
  ]

  if (!hideCompliance) {
    const compliance = [
      { key: 'ssp',     label: 'SSP',     icon: 'shield',   href: '/demo/ssp' },
      { key: 'holiday', label: 'Holiday', icon: 'calendar', href: '/demo/holiday' },
      { key: 'edi',     label: 'EDI',     icon: 'shield',   href: '/demo/edi' },
    ]
    if (showDocuments) {
      compliance.push({ key: 'documents', label: 'Documents', icon: 'file', href: '/demo/documents' })
    }
    groups.push({ label: 'Compliance', items: compliance })
  }

  return groups
}

export function DemoSidebar({ active, demoEmploymentType }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signupModal, setSignupModal] = useState(false)
  const [demoAccountType, setDemoAccountType] = useState(null)

  // The demo dashboard persists the agency/employer toggle to localStorage
  // (prodicta_demo_account_type) so subpages and the sidebar stay in sync
  // as the user navigates around. Read it client-side to gate Compliance.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { setDemoAccountType(localStorage.getItem('prodicta_demo_account_type')) } catch {}
  }, [])

  // Documents visibility is driven by the toggle on the demo dashboard.
  // When demoEmploymentType is not passed (other demo pages that don't own the
 // toggle), default to showing Documents, the demo default is 'both'.
  const showDocuments =
    demoEmploymentType == null ||
    demoEmploymentType === 'temporary' ||
    demoEmploymentType === 'both'

  const hideCompliance = isDemoAgencyPerm(demoAccountType, demoEmploymentType)

  function handleNavClick(href) {
    router.push(href)
    setMobileOpen(false)
  }

  function renderNavItem({ key, label, icon, href, restricted }) {
    const isActive = active === key
    if (restricted) {
      return (
        <button
          key={key}
          onClick={() => setSignupModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 11,
            width: '100%', padding: '8px 12px',
            borderRadius: 8, border: 'none', borderLeft: '3px solid transparent',
            cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 500,
            textAlign: 'left', background: 'transparent',
            color: 'rgba(255,255,255,0.3)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Ic name={icon} size={17} color="rgba(255,255,255,0.18)" />
          {label}
        </button>
      )
    }
    return (
      <button
        key={key}
        onClick={() => handleNavClick(href)}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          width: '100%', padding: '8px 12px',
          paddingLeft: isActive ? 9 : 12,
          borderRadius: 8,
          borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
          border: 'none',
          cursor: 'pointer', fontFamily: F, fontSize: 13,
          fontWeight: isActive ? 700 : 500, textAlign: 'left',
          background: isActive ? 'rgba(0,191,165,0.12)' : 'transparent',
          color: isActive ? TEAL : 'rgba(255,255,255,0.6)',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' } }}
      >
        <Ic name={icon} size={17} color={isActive ? TEAL : 'rgba(255,255,255,0.5)'} />
        {label}
      </button>
    )
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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

      {/* Compact nav: grouped items, sized to fit without scrolling */}
      <nav
        className="prodicta-demo-sidebar-nav"
        style={{
          padding: '10px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {buildDemoGroups({ showDocuments, hideCompliance }).map(group => (
          group.items.length > 0 && (
            <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <div style={{
                fontFamily: F,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.32)',
                padding: '0 12px 4px',
              }}>
                {group.label}
              </div>
              {group.items.map(renderNavItem)}
            </div>
          )
        ))}
      </nav>

 {/* Pinned bottom: Account, Settings + Sign Out only, no Demo Account badge.
          marginTop: 'auto' keeps Sign Out at the bottom of the flex column. */}
      <div style={{
        marginTop: 'auto',
        padding: '8px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', gap: 1,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: F,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.32)',
          padding: '4px 12px 4px',
        }}>
          Account
        </div>

        {renderNavItem({ key: 'settings', label: 'Settings', icon: 'settings', href: '/demo/settings' })}

        <button
          onClick={() => router.push('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
            borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 500,
            textAlign: 'left', background: 'transparent', color: 'rgba(255,255,255,0.4)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          <Ic name="logout" size={16} color="rgba(255,255,255,0.35)" />
          Sign out
        </button>
      </div>

      {signupModal && <SignUpModal onClose={() => setSignupModal(false)} />}
    </>
  )

  if (isMobile) {
    return (
      <>
        {/* Top bar with hamburger */}
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <line x1={3} y1={6} x2={21} y2={6}/>
              <line x1={3} y1={12} x2={21} y2={12}/>
              <line x1={3} y1={18} x2={21} y2={18}/>
            </svg>
          </button>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
        )}

        {/* Slide-out drawer */}
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

  return (
    <aside style={{
      width: 220, height: '100vh', background: NAVY,
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 100, fontFamily: F,
    }}>
      {sidebarContent}
    </aside>
  )
}

// ── Sign-up required modal ─────────────────────────────────────────────────────
export function SignUpModal({ onClose }) {
  const router = useRouter()
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: CARD, borderRadius: 16, padding: '28px 24px', maxWidth: 420, width: '100%', boxShadow: '0 24px 72px rgba(0,0,0,0.35)', animation: 'fadeInUp 0.2s ease-out' }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, background: TEALLT, border: `1px solid ${TEAL}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Ic name="award" size={24} color={TEALD} />
        </div>
        <h3 style={{ fontFamily: F, fontSize: 19, fontWeight: 800, color: NAVY, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
          This feature is available when you sign up
        </h3>
        <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '0 0 26px', lineHeight: 1.65 }}>
          Create your account to start assessing your own candidates, create assessments, and access all features.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => router.push('/login')}
            style={{ width: '100%', padding: '13px 0', borderRadius: 9, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Sign up →
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Continue exploring demo
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Demo page wrapper (banner + sidebar + main + footer) ───────────────────────
export function DemoLayout({ active, demoEmploymentType, children }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ display: 'flex', fontFamily: F, flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ position: 'fixed', top: isMobile ? 56 : 0, left: 0, right: 0, zIndex: 300 }}>
        <DemoBanner />
      </div>
      <DemoSidebar active={active} demoEmploymentType={demoEmploymentType} />
      {children}
      <footer style={{
        marginLeft: isMobile ? 0 : 220,
        padding: '16px',
        textAlign: 'center',
        fontFamily: F,
        fontSize: 11.5,
        color: TX3,
      }}>
        Powered by AIAURA Group Ltd
      </footer>
    </div>
  )
}
