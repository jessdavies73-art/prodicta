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

function buildGroups({ showDocuments }) {
  const compliance = [
    { key: 'ssp',     label: 'SSP',     icon: 'shield',   href: '/ssp' },
    { key: 'holiday', label: 'Holiday', icon: 'calendar', href: '/holiday' },
    { key: 'edi',     label: 'EDI',     icon: 'shield',   href: '/edi' },
  ]
  if (showDocuments) {
    compliance.push({ key: 'documents', label: 'Documents', icon: 'file', href: '/documents' })
  }

  return [
    { label: 'Main', items: [
      { key: 'dashboard',  label: 'Dashboard',      icon: 'grid', href: '/dashboard' },
      { key: 'assessment', label: 'New assessment', icon: 'plus', href: '/assessment/new' },
    ]},
    { label: 'Placement', items: [
      { key: 'compare',  label: 'Compare',  icon: 'sliders', href: '/compare' },
      { key: 'archive',  label: 'Archive',  icon: 'archive', href: '/archive' },
      { key: 'outcomes', label: 'Outcomes', icon: 'award',   href: '/outcomes' },
    ]},
    { label: 'Compliance', items: compliance },
  ]
}

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [active])

  useEffect(() => {
    let cancelled = false
    async function detectTempWork() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: prof } = await supabase.from('users')
        .select('default_employment_type')
        .eq('id', user.id)
        .maybeSingle()

      const defaultType = prof?.default_employment_type
      if (defaultType === 'temporary' || defaultType === 'both') {
        if (!cancelled) setShowDocuments(true)
        return
      }

      const { count } = await supabase.from('assessments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('employment_type', 'temporary')

      if (!cancelled) setShowDocuments((count || 0) > 0)
    }
    detectTempWork()
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

  const groups = buildGroups({ showDocuments })

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
            ? 'rgba(0,191,165,0.12)'
            : isHovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
          color: isActive ? TEAL : isHovered ? '#fff' : 'rgba(255,255,255,0.6)',
          boxShadow: isActive ? 'inset 0 0 16px rgba(0,191,165,0.08)' : 'none',
        }}
      >
        <Ic
          name={icon}
          size={17}
          color={isActive ? TEAL : isHovered ? '#fff' : 'rgba(255,255,255,0.5)'}
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

      {/* Compact nav: groups sized to fit without scrolling */}
      <nav
        className="prodicta-sidebar-nav"
        style={{
          padding: '10px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {groups.map(group => (
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
              {group.items.map(item => (
                <NavButton
                  key={item.key}
                  itemKey={item.key}
                  label={item.label}
                  icon={item.icon}
                  href={item.href}
                />
              ))}
            </div>
          )
        ))}
      </nav>

      {/* Pinned bottom: Account group — Settings + Sign Out only, no user display.
          marginTop: 'auto' keeps this block pinned to the bottom of the flex column. */}
      <div style={{
        marginTop: 'auto',
        padding: '8px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
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

        <NavButton itemKey="settings" label="Settings" icon="settings" href="/settings" />

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
