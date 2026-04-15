'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { NAVY, TEAL, TEALD, TX2, TX3, F } from '../lib/constants'
import { Ic } from './Icons'
import { createClient } from '../lib/supabase'
import ProdictaLogo from './ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',      icon: 'grid',     href: '/dashboard' },
  { key: 'assessment',   label: 'New assessment', icon: 'plus',     href: '/assessment/new' },
  { key: 'compare',      label: 'Compare',        icon: 'sliders',  href: '/compare' },
  { key: 'ssp',          label: 'SSP',            icon: 'shield',   href: '/ssp' },
  { key: 'holiday',      label: 'Holiday',        icon: 'calendar', href: '/holiday' },
  { key: 'archive',      label: 'Archive',        icon: 'archive',  href: '/archive' },
  { key: 'settings',     label: 'Settings',       icon: 'settings', href: '/settings' },
]

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)
  const [accountType, setAccountType] = useState(null)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [active])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: prof } = await supabase.from('users').select('account_type').eq('id', user.id).maybeSingle()
        if (prof?.account_type) setAccountType(prof.account_type)
      }
    })
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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        {[
          ...NAV_ITEMS,
          ...(accountType === 'agency' ? [{ key: 'placements', label: 'Active Placements', icon: 'users', href: '/outcomes?filter=active' }] : []),
          ...(accountType === 'employer' || accountType === 'agency' ? [{ key: 'outcomes', label: 'Outcomes', icon: 'award', href: '/outcomes' }] : []),
        ].map(({ key, label, icon, href }) => {
          const isActive = active === key
          const isHovered = hoveredKey === key
          return (
            <button
              key={key}
              onClick={() => handleNavClick(href)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                padding: '10px 12px',
                paddingLeft: isActive ? 9 : 12,
                borderRadius: 8,
                border: 'none',
                borderLeft: isActive ? `3px solid ${TEAL}` : '3px solid transparent',
                cursor: 'pointer',
                fontFamily: F,
                fontSize: 13.5,
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
              {key === 'assessment' && (
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
        })}
      </nav>

      {/* Bottom: company + sign out — pinned */}
      <div style={{
        padding: '14px 12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
      }}>
        {companyName && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              color: NAVY,
              flexShrink: 0,
            }}>
              {companyName.slice(0, 1).toUpperCase()}
            </div>
            <span style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.75)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {companyName}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '9px 12px',
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'relative' }}
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
              transition: 'opacity 0.2s',
            }}
          />
        )}

        {/* Slide-out drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260, background: NAVY,
          zIndex: 130, fontFamily: F,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {sidebarContent}
        </aside>
      </>
    )
  }

  // ── Desktop: fixed sidebar ──
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
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
