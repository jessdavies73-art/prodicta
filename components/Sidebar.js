'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NAVY, TEAL, TEALD, TX2, TX3, F } from '../lib/constants'
import { Ic } from './Icons'
import { createClient } from '../lib/supabase'

const NAV = [
  { key: 'dashboard',       label: 'Dashboard',       icon: 'grid',     href: '/dashboard' },
  { key: 'assessment',      label: 'New assessment',  icon: 'plus',     href: '/assessment/new' },
  { key: 'benchmarks',      label: 'Benchmarks',      icon: 'layers',   href: '/benchmarks' },
  { key: 'archive',         label: 'Archive',         icon: 'archive',  href: '/archive' },
  { key: 'settings',        label: 'Settings',        icon: 'settings', href: '/settings' },
]

export default function Sidebar({ active, companyName }) {
  const router = useRouter()
  const [hoveredKey, setHoveredKey] = useState(null)
  const [logoutHover, setLogoutHover] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      {/* Logo */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="Prodicta"
            style={{ height: '36px', width: 'auto', display: 'block' }}
          />
          <span style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.3px',
            fontFamily: F,
          }}>
            Prodicta
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {NAV.map(({ key, label, icon, href }) => {
          const isActive = active === key
          const isHovered = hoveredKey === key

          return (
            <button
              key={key}
              onClick={() => router.push(href)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: F,
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                transition: 'background 0.15s, color 0.15s',
                background: isActive
                  ? 'rgba(91,191,189,0.15)'
                  : isHovered
                  ? 'rgba(255,255,255,0.06)'
                  : 'transparent',
                color: isActive
                  ? TEAL
                  : isHovered
                  ? '#fff'
                  : 'rgba(255,255,255,0.6)',
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

      {/* Bottom: company + logout */}
      <div style={{
        padding: '14px 12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
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
          <Ic
            name="logout"
            size={16}
            color={logoutHover ? '#f87171' : 'rgba(255,255,255,0.35)'}
          />
          Sign out
        </button>
      </div>
    </aside>
  )
}
