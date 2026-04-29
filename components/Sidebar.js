'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { NAVY, TEAL, TEALD, F } from '../lib/constants'
import { Ic } from './Icons'
import { createClient } from '../lib/supabase'
import { isAgencyPerm } from '../lib/account-helpers'
import ProdictaLogo from './ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Grouped nav with uppercase group labels. Documents is agency + temp/both
// only. The Compliance group as a whole is hidden for permanent recruitment
// agencies (account_type 'agency' + default_employment_type 'permanent'),
// because those users are not the legal employer of record and have no
// employment-of-record compliance to track.
//
// hideCompliance defaults to false (show Compliance) so employer accounts
// always see the group, even before the async profile fetch resolves and
// even if the fetch fails or short-circuits. Agency-perm users see a brief
// flash of Compliance on first mount until the fetch flips this to true,
// which is the acceptable cost. The earlier null tri-state pessimistically
// hid Compliance for everyone until proven otherwise, which broke the
// majority case (employers) when the fetch was slow or failed.
function buildNav({ accountType, showTemp, hideCompliance }) {
  const isAgency = accountType === 'agency'
  const groups = []

  groups.push({ label: 'Main', items: [
    { key: 'dashboard',   label: 'Dashboard',      icon: 'grid',    href: '/dashboard' },
    { key: 'drill-down',  label: 'Drill-down',     icon: 'sliders', href: '/dashboard/drill-down' },
    { key: 'assessment',  label: 'New assessment', icon: 'plus',    href: '/assessment/new' },
  ]})

  const placement = [
    { key: 'compare',  label: 'Compare',  icon: 'sliders', href: '/compare' },
    { key: 'archive',  label: 'Archive',  icon: 'archive', href: '/archive' },
    { key: 'outcomes', label: 'Outcomes', icon: 'award',   href: '/outcomes' },
  ]
  if (isAgency) {
    placement.push({ key: 'placement-calculator', label: 'Placement Calculator', icon: 'target', href: '/placement-calculator' })
  }
  groups.push({ label: 'Placement', items: placement })

  if (!hideCompliance) {
    const compliance = [
      { key: 'ssp',     label: 'SSP',     icon: 'shield',   href: '/ssp' },
      { key: 'holiday', label: 'Holiday', icon: 'calendar', href: '/holiday' },
    ]
    if (isAgency && showTemp) {
      compliance.push({ key: 'documents', label: 'Documents', icon: 'file', href: '/documents' })
    }
    compliance.push({ key: 'edi', label: 'EDI', icon: 'shield', href: '/edi' })
    groups.push({ label: 'Compliance', items: compliance })
  }

  groups.push({ label: 'Account', items: [
    { key: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ]})

  return groups
}

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)
  const [accountType, setAccountType] = useState('employer')
  const [showTemp, setShowTemp] = useState(false)
  // Initial value is read synchronously from localStorage so agency-perm
  // users do not see a flash of Compliance on every page mount. The flag
  // 'prodicta_is_agency_perm' is written below when the supabase profile
  // fetch resolves; subsequent navigations read it before the first paint.
  // First-ever-login users hit the default (false: show Compliance) until
  // the fetch resolves; then localStorage is set and future mounts are
  // flash-free. Employer accounts never have the flag set, so they get
  // the safe default (show Compliance) even if the fetch fails or
  // short-circuits.
  const [hideCompliance, setHideCompliance] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem('prodicta_is_agency_perm') === 'true' } catch { return false }
  })

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
      const agencyPerm = isAgencyPerm(prof)
      // Persist for the next mount so the synchronous useState initialiser
      // above starts in the correct state on the next page navigation.
      if (typeof window !== 'undefined') {
        try {
          if (agencyPerm) localStorage.setItem('prodicta_is_agency_perm', 'true')
          else localStorage.removeItem('prodicta_is_agency_perm')
        } catch {}
      }
      setHideCompliance(agencyPerm)

      const defaultType = prof?.default_employment_type
      // 'both' and 'ask' fall through to assessments lookup so Documents only
      // appears once an agency actually has a temporary assessment on file.
      if (defaultType === 'temporary') { setShowTemp(true); return }
      if (defaultType === 'permanent') { setShowTemp(false); return }

      const { data: assess } = await supabase.from('assessments')
        .select('employment_type')
        .eq('user_id', user.id)
      if (cancelled) return
      const hasTemp = (assess || []).some(r => r.employment_type === 'temporary')
      setShowTemp(hasTemp)
    }
    loadProfile()
    return () => { cancelled = true }
  }, [])

  // ── Notifications ─────────────────────────────────────────────────────────
  // Bell reads from the notifications table populated by:
  //   app/api/assess/[token]/submit/route.js   (candidate_completed)
  //   lib/score-candidate.js                   (scoring_finished)
  // Polls every 30s for new rows; click on a row marks it read and routes
  // to the candidate report. Restored from commit c320392; previous sidebar
  // restructures dropped the block.
  const [userId, setUserId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const panelRef = useRef(null)
  const unreadCount = notifications.filter(n => !n.read).length

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadNotifications(user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => loadNotifications(userId), 30000)
    return () => clearInterval(interval)
  }, [userId])

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
    }
  }

  const notifIcon = type => type === 'scoring_finished' ? 'award' : 'check'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear the cached agency-perm flag so a different account type
    // signing in on the same browser does not inherit the previous
    // user's Compliance visibility.
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('prodicta_is_agency_perm') } catch {}
    }
    router.push('/login')
  }

  function handleNavClick(href) {
    router.push(href)
    setMobileOpen(false)
  }

  const groups = buildNav({ accountType, showTemp, hideCompliance })

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

  const GroupLabel = ({ children }) => (
    <div style={{
      fontFamily: F,
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
      padding: '10px 12px 4px',
    }}>
      {children}
    </div>
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
          padding: '6px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {groups.map(group => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 6 }}>
            <GroupLabel>{group.label}</GroupLabel>
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
        ))}
      </nav>

      {/* Pinned: notifications + sign-out */}
      <div style={{
        padding: '8px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        flexShrink: 0,
      }}>
        {/* Notification bell */}
        <button
          onClick={() => setNotifOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: F, fontSize: 13, fontWeight: 500, textAlign: 'left',
            background: notifOpen ? 'rgba(0,191,165,0.15)' : 'transparent',
            color: notifOpen ? TEAL : 'rgba(255,255,255,0.5)',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }}>
            <Ic name="bell" size={16} color={notifOpen ? TEAL : 'rgba(255,255,255,0.5)'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -6,
                minWidth: 14, height: 14, borderRadius: 7,
                background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          Notifications
        </button>

        {/* Notification panel. Anchored just to the right of the sidebar
            on desktop; on mobile the sidebar is itself a slide-out drawer
            so the panel renders inside the drawer. */}
        {notifOpen && (
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: isMobile ? 16 : 228,
              bottom: isMobile ? 16 : 60,
              width: isMobile ? 'calc(100vw - 32px)' : 320,
              maxWidth: 380,
              maxHeight: 460,
              background: '#fff', borderRadius: 14,
              border: '1px solid #e4e9f0',
              boxShadow: '0 8px 40px rgba(15,33,55,0.18)',
              zIndex: 200, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e9f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TEALD, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                  <Ic name="bell" size={24} color="#e4e9f0" />
                  <p style={{ fontFamily: F, fontSize: 13, color: '#94a1b3', margin: '10px 0 0' }}>No notifications yet</p>
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
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (n.candidate_id) e.currentTarget.style.background = n.read ? '#f7f9fb' : '#e4f7f5' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? '#fff' : '#f0fdf9' }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: n.type === 'scoring_finished' ? '#ecfdf5' : '#e8f6f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <Ic name={notifIcon(n.type)} size={14} color={n.type === 'scoring_finished' ? '#16a34a' : TEALD} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#0f172a', lineHeight: 1.35, marginBottom: 3 }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{ fontFamily: F, fontSize: 12, color: '#5e6b7f', lineHeight: 1.4 }}>{n.body}</div>
                    )}
                    <div style={{ fontFamily: F, fontSize: 11, color: '#94a1b3', marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: TEAL, flexShrink: 0, marginTop: 6 }} />
                  )}
                </div>
              ))}
            </div>
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
