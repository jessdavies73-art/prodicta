'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { NAVY, TEAL, TEALD, TX2, TX3, F } from '../lib/constants'
import { Ic } from './Icons'
import { createClient } from '../lib/supabase'
import ProdictaLogo from './ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const BASE_NAV_TOP = [
  { key: 'dashboard',    label: 'Dashboard',     icon: 'grid',    href: '/dashboard' },
  { key: 'assessment',   label: 'New assessment', icon: 'plus',    href: '/assessment/new' },
  { key: 'compare',      label: 'Compare',        icon: 'sliders', href: '/compare' },
  { key: 'benchmarks',   label: 'Benchmarks',     icon: 'layers',  href: '/benchmarks' },
]

const BASE_NAV_BOTTOM = [
  { key: 'archive',      label: 'Archive',          icon: 'archive',  href: '/archive' },
  { key: 'how-it-works', label: 'How It Works',     icon: 'info',     href: '/how-it-works' },
  { key: 'roadmap',      label: "What's Coming",    icon: 'zap',      href: '/roadmap' },
  { key: 'settings',     label: 'Settings',         icon: 'settings', href: '/settings' },
]

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)
  const [accountType, setAccountType] = useState(null)

  // ── Notifications ──────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [active])

  async function loadNotifications(uid) {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadNotifications(user.id)
        const { data: prof } = await supabase.from('users').select('account_type').eq('id', user.id).maybeSingle()
        if (prof?.account_type) setAccountType(prof.account_type)
      }
    })
  }, [])

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => loadNotifications(userId), 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  async function markAllRead() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markAsRead(id) {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function handleNotifClick(n) {
    if (!n.read) markAsRead(n.id)
    if (n.candidate_id && n.assessment_id) {
      router.push(`/assessment/${n.assessment_id}/candidate/${n.candidate_id}`)
      setNotifOpen(false)
      setMobileOpen(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleNavClick(href) {
    router.push(href)
    setMobileOpen(false)
  }

  const notifIcon = type => type === 'scoring_finished' ? 'award' : 'check'

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
      }}>
        {[
          ...BASE_NAV_TOP,
          ...(accountType === 'agency' ? [{ key: 'placements', label: 'Active Placements', icon: 'users', href: '/outcomes?filter=active' }] : []),
          ...BASE_NAV_BOTTOM,
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

      {/* Bottom: notifications + company + logout */}
      <div style={{
        padding: '14px 12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {/* Notification bell */}
        <button
          onClick={() => setNotifOpen(v => !v)}
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
            background: notifOpen ? 'rgba(91,191,189,0.15)' : 'transparent',
            color: notifOpen ? TEAL : 'rgba(255,255,255,0.6)',
            transition: 'background 0.15s',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Ic name="bell" size={16} color={notifOpen ? TEAL : 'rgba(255,255,255,0.5)'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -5,
                right: -6,
                minWidth: 14,
                height: 14,
                borderRadius: 7,
                background: '#dc2626',
                color: '#fff',
                fontSize: 9,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          Notifications
        </button>

        {/* Notification panel */}
        {notifOpen && (
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              ...(isMobile
                ? { left: 12, right: 12, bottom: 60, width: 'auto' }
                : { left: 228, bottom: 40, width: 320 }),
              maxHeight: 460,
              background: '#fff',
              borderRadius: 14,
              border: '1px solid #e4e9f0',
              boxShadow: '0 8px 40px rgba(15,33,55,0.18)',
              zIndex: 200,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Panel header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e4e9f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    fontFamily: F, fontSize: 12, fontWeight: 600, color: TEALD,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                  <Ic name="bell" size={24} color="#e4e9f0" />
                  <p style={{ fontFamily: F, fontSize: 13, color: '#94a1b3', margin: '10px 0 0' }}>
                    No notifications yet
                  </p>
                </div>
              ) : notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding: '12px 18px',
                    borderBottom: i < notifications.length - 1 ? '1px solid #f1f5f9' : 'none',
                    background: n.read ? '#fff' : '#f0fdf9',
                    cursor: n.candidate_id ? 'pointer' : 'default',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (n.candidate_id) e.currentTarget.style.background = n.read ? '#f7f9fb' : '#e4f7f5' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? '#fff' : '#f0fdf9' }}
                >
                  {/* Icon bubble */}
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: n.type === 'scoring_finished' ? '#ecfdf5' : '#e0f2f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}>
                    <Ic
                      name={notifIcon(n.type)}
                      size={14}
                      color={n.type === 'scoring_finished' ? '#16a34a' : TEALD}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: F,
                      fontSize: 13,
                      fontWeight: n.read ? 500 : 700,
                      color: '#0f172a',
                      lineHeight: 1.35,
                      marginBottom: 3,
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontFamily: F, fontSize: 12, color: '#5e6b7f', lineHeight: 1.4 }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontFamily: F, fontSize: 11, color: '#94a1b3', marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: TEAL,
                      flexShrink: 0,
                      marginTop: 6,
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                width: 8, height: 8, borderRadius: '50%',
                background: '#dc2626',
              }} />
            )}
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
