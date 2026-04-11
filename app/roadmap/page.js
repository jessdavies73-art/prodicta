'use client'
import Link from 'next/link'
import { useState, useEffect, useSyncExternalStore } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const TEALD  = '#009688'
const TEALLT = '#e0f2f0'
const GOLD   = '#E8B84B'
const BG     = '#f7f9fb'
const CARD   = '#ffffff'
const BD     = '#e4e9f0'
const TX     = '#0f172a'
const TX2    = '#5e6b7f'
const TX3    = '#94a1b3'
const F      = "'Outfit', system-ui, sans-serif"

// ── Nav (matches landing page) ───────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const navLinks = [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/demo', label: 'Demo' },
    { href: '/blog', label: 'Blog' },
    { href: '/roadmap', label: "What's Coming" },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: scrolled || menuOpen ? 'rgba(13,30,48,0.96)' : NAVY,
      backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      transition: 'background 0.3s',
      padding: isMobile ? '0 16px' : '0 48px', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: isMobile && menuOpen ? 'wrap' : 'nowrap',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <ProdictaLogo size={isMobile ? 30 : 36} textColor="#ffffff" />
      </Link>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/login" style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '7px 14px', borderRadius: 7, background: TEAL }}>Get started</Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
            >
              {menuOpen ? (
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>
              ) : (
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><line x1={3} y1={6} x2={21} y2={6}/><line x1={3} y1={12} x2={21} y2={12}/><line x1={3} y1={18} x2={21} y2={18}/></svg>
              )}
            </button>
          </div>
          {menuOpen && (
            <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 0 16px' }}>
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ fontFamily: F, fontSize: 14, fontWeight: l.href === '/roadmap' ? 700 : 500, color: l.href === '/roadmap' ? TEAL : 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '10px 8px', borderRadius: 7 }}>{l.label}</Link>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '10px 8px', borderRadius: 7 }}>Sign in</Link>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={{ fontFamily: F, fontSize: 13.5, fontWeight: l.href === '/roadmap' ? 600 : 500, color: l.href === '/roadmap' ? TEAL : 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = l.href === '/roadmap' ? TEAL : 'rgba(255,255,255,0.6)'}>{l.label}</Link>
          ))}
          <Link href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', marginLeft: 4 }}>Sign in</Link>
          <Link href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '9px 20px', borderRadius: 8, background: TEAL, marginLeft: 2 }}>Get started</Link>
        </div>
      )}
    </nav>
  )
}

// ── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ title, teaser, date }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: CARD,
        border: `1.5px solid ${hovered ? TEAL : BD}`,
        borderRadius: 14,
        padding: 'clamp(20px, 3vw, 28px) clamp(20px, 3vw, 28px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
        boxShadow: hovered
          ? `0 8px 28px rgba(0,191,165,0.12), 0 2px 8px rgba(15,33,55,0.06)`
          : '0 2px 8px rgba(15,33,55,0.04)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div>
        <h3 style={{
          fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY,
          margin: 0, letterSpacing: '-0.2px', lineHeight: 1.3,
        }}>
          {title}
        </h3>
        {date && (
          <span style={{
            display: 'inline-block', marginTop: 6,
            fontFamily: F, fontSize: 11, fontWeight: 700,
            color: GOLD, background: `${GOLD}18`,
            border: `1px solid ${GOLD}44`,
            borderRadius: 5, padding: '2px 9px',
            letterSpacing: '0.04em',
          }}>
            {date}
          </span>
        )}
      </div>
      <p style={{
        fontFamily: F, fontSize: 14.5, color: TX2,
        lineHeight: 1.65, margin: 0, flex: 1,
      }}>
        {teaser}
      </p>
      <div>
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            fontFamily: F, fontSize: 13, fontWeight: 700,
            color: TEAL, background: TEALLT,
            border: `1px solid ${TEAL}44`,
            borderRadius: 8, padding: '8px 18px',
            textDecoration: 'none',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${TEAL}30`; e.currentTarget.style.borderColor = TEAL }}
          onMouseLeave={e => { e.currentTarget.style.background = TEALLT; e.currentTarget.style.borderColor = `${TEAL}44` }}
        >
          I want this
        </Link>
      </div>
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────

function Section({ label, title, features, accent = TEAL }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: F, fontSize: 11.5, fontWeight: 700,
          color: accent, textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 10,
        }}>
          {label}
        </div>
        <h2 style={{
          fontFamily: F, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800,
          color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.2, margin: 0,
        }}>
          {title}
        </h2>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: 16,
      }}>
        {features.map(f => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const COMING_NEXT = [
  {
    title: 'Live AI Simulation',
    teaser: 'Real-time adaptive scenarios. Multiple AI characters. The next level of assessment.',
    date: 'Q4 2026',
  },
  {
    title: 'Immersive Assessment Tier',
    teaser: 'Strategy-Fit, Workspace, and Live Simulation combined. For hires where getting it wrong is not an option.',
    date: 'Coming 2026',
  },
]

const IN_DEVELOPMENT = [
  {
    title: 'LinkedIn Extension',
    teaser: 'Your PRODICTA data, wherever you already work.',
  },
  {
    title: 'Skills Mirror',
    teaser: 'Your next great hire might already work for you. And your next promotion might be hiding in plain sight.',
  },
  {
    title: 'Hiring Memory',
    teaser: 'The longer you use PRODICTA, the smarter it gets.',
  },
  {
    title: 'Predictive Retention',
    teaser: 'Know who stays before you place them.',
  },
  {
    title: 'Hiring Manager Video Briefing',
    teaser: 'Let candidates hear from the manager before they start.',
  },
  {
    title: 'Sector-Specific Modules',
    teaser: 'Deep skill assessment built for your sector.',
  },
]

const ON_THE_HORIZON = [
  {
    title: 'AI Benchmarking',
    teaser: 'A new benchmark for what good looks like.',
  },
  {
    title: 'White-Label',
    teaser: 'PRODICTA under your brand.',
  },
  {
    title: 'ATS Integrations',
    teaser: 'Connect PRODICTA to the tools you already use. Bullhorn first.',
  },
  {
    title: 'Enterprise API',
    teaser: 'Built for scale.',
  },
  {
    title: 'Compliance Shield',
    teaser: 'The secure hiring guarantee. Built for ERA 2025.',
  },
  {
    title: 'International',
    teaser: 'Coming to Ireland, Australia and beyond.',
  },
  {
    title: 'AI Benchmarking vs Your Manager',
    teaser: 'How does this candidate compare to the way you actually work?',
  },
]

export default function RoadmapPage() {
  const isMobile = useIsMobile()

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <Nav />

      {/* ── Hero banner ── */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`,
        paddingTop: isMobile ? 100 : 120,
        paddingBottom: isMobile ? 48 : 64,
        paddingLeft: 24,
        paddingRight: 24,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${TEAL}12 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${TEAL}18`, border: `1px solid ${TEAL}44`,
            borderRadius: 50, padding: '6px 16px', marginBottom: 22,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: TEAL, display: 'inline-block',
            }} />
            <span style={{
              fontFamily: F, fontSize: 12, fontWeight: 700,
              color: TEAL, textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Roadmap
            </span>
          </div>

          <h1 style={{
            fontFamily: F,
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-1px',
            lineHeight: 1.15,
            margin: '0 0 18px',
          }}>
            PRODICTA is always evolving.{' '}
            <span style={{ color: TEAL }}>Here is what is coming next.</span>
          </h1>

          <p style={{
            fontFamily: F, fontSize: 'clamp(14px, 1.6vw, 17px)',
            color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto',
          }}>
            We build what hiring professionals actually need. Every feature below is shaped by real feedback from employers and agencies across the UK.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: isMobile ? '36px 16px 48px' : '48px 32px 64px',
      }}>

        <Section
          label="Coming next"
          title="Coming Next"
          features={COMING_NEXT}
          accent={TEAL}
        />

        <Section
          label="In development"
          title="In Development"
          features={IN_DEVELOPMENT}
          accent={TEALD}
        />

        <Section
          label="On the horizon"
          title="On the Horizon"
          features={ON_THE_HORIZON}
          accent={NAVY}
        />

        {/* ── CTA ── */}
        <div style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`,
          borderRadius: 18,
          padding: isMobile ? '36px 24px' : '48px 40px',
          textAlign: 'center',
          marginTop: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 400, height: 400, borderRadius: '50%',
            background: `radial-gradient(circle, ${TEAL}10 0%, transparent 65%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{
              fontFamily: F, fontSize: 'clamp(22px, 3vw, 32px)',
              fontWeight: 800, color: '#fff',
              letterSpacing: '-0.5px', lineHeight: 1.2,
              margin: '0 0 14px',
            }}>
              Start using PRODICTA today
            </h2>
            <p style={{
              fontFamily: F, fontSize: 15, color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.65, margin: '0 0 28px',
              maxWidth: 440, marginLeft: 'auto', marginRight: 'auto',
            }}>
              Every feature on this page is built for hiring professionals who want better outcomes. Join them.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '14px 36px', borderRadius: 10,
                display: 'inline-block',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${TEAL}55` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                Get started
              </Link>
              <Link href="/demo" style={{
                fontFamily: F, fontSize: 15, fontWeight: 600, color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                textDecoration: 'none',
                padding: '14px 36px', borderRadius: 10,
                display: 'inline-block',
              }}>
                Try the demo
              </Link>
            </div>
          </div>
        </div>

        {/* ── Footer line ── */}
        <div style={{
          textAlign: 'center',
          marginTop: 48,
          paddingTop: 28,
          borderTop: `1px solid ${BD}`,
        }}>
          <p style={{
            fontFamily: F, fontSize: 13.5, color: TX3,
            lineHeight: 1.6, margin: 0,
          }}>
            Got an idea?{' '}
            <a
              href="mailto:hello@prodicta.co.uk"
              style={{ color: TEAL, textDecoration: 'none', fontWeight: 600 }}
            >
              hello@prodicta.co.uk
            </a>
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        background: '#071524',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '36px clamp(16px, 4vw, 48px) 28px',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <ProdictaLogo size={28} textColor="#ffffff" />
          </Link>
          <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.28)' }}>
            &copy; {new Date().getFullYear()} PRODICTA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
