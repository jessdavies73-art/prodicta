'use client'
import { useEffect, useRef, useState } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY    = '#0f2137'
const NAVY2   = '#0d1e30'
const TEAL    = '#00BFA5'
const TEALD   = '#009688'
const TEALLT  = '#e0f2f0'
const GOLD    = '#E8B84B'
const F       = "'Outfit', system-ui, sans-serif"
const FM      = "'IBM Plex Mono', monospace"

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Floating dots (same as login) ─────────────────────────────────────────────
function FloatingDots() {
  const dots = [
    { size: 4,  left: '6%',  delay: '0s',   dur: '18s', opacity: 0.18, color: TEAL },
    { size: 3,  left: '14%', delay: '4s',   dur: '22s', opacity: 0.09, color: '#fff' },
    { size: 6,  left: '24%', delay: '8s',   dur: '15s', opacity: 0.12, color: TEAL },
    { size: 3,  left: '35%', delay: '2s',   dur: '24s', opacity: 0.07, color: '#fff' },
    { size: 5,  left: '48%', delay: '11s',  dur: '17s', opacity: 0.10, color: TEAL },
    { size: 4,  left: '58%', delay: '5s',   dur: '20s', opacity: 0.08, color: '#fff' },
    { size: 7,  left: '68%', delay: '1s',   dur: '14s', opacity: 0.13, color: TEAL },
    { size: 3,  left: '78%', delay: '7s',   dur: '19s', opacity: 0.08, color: '#fff' },
    { size: 5,  left: '88%', delay: '3s',   dur: '21s', opacity: 0.11, color: TEAL },
    { size: 4,  left: '95%', delay: '9s',   dur: '16s', opacity: 0.09, color: TEAL },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: -16, left: d.left,
          width: d.size, height: d.size, borderRadius: '50%',
          background: d.color, opacity: d.opacity,
          animation: `floatDot ${d.dur} linear ${d.delay} infinite`,
        }} />
      ))}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: scrolled ? 'rgba(13,30,48,0.96)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
      transition: 'background 0.3s, border-color 0.3s',
      padding: '0 48px', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <a href="/" style={{ textDecoration: 'none' }}>
        <ProdictaLogo size={36} textColor="#ffffff" />
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <a href="#how-it-works" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}>How it works</a>
        <a href="#pricing" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}>Pricing</a>
        <a href="/demo" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}>Demo</a>
        <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', marginLeft: 4, transition: 'border-color 0.15s' }}
          onMouseEnter={e => e.target.style.borderColor='rgba(255,255,255,0.35)'} onMouseLeave={e => e.target.style.borderColor='rgba(255,255,255,0.14)'}>Sign in</a>
        <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '9px 20px', borderRadius: 8, background: TEAL, marginLeft: 2, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}>Start free →</a>
      </div>
    </nav>
  )
}

// ── Check icon ────────────────────────────────────────────────────────────────
function Check({ color = TEAL, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Div({ style = {} }) {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', ...style }} />
}

// ── Count-up number for stats bar ─────────────────────────────────────────────
function StatNumber({ to, suffix = '', display }) {
  const ref = useRef(null)
  const [val, setVal] = useState(to == null ? display : 0)
  const started = useRef(false)
  useEffect(() => {
    if (to == null) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        obs.disconnect()
        const dur = 1400
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(eased * to))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])
  return <span ref={ref}>{to == null ? display : val}{to != null ? suffix : ''}</span>
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: F, background: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        @keyframes floatDot {
          0%   { transform: translateY(0) scale(1);   opacity: var(--op, 0.12); }
          50%  { transform: translateY(-60vh) scale(1.1); opacity: calc(var(--op, 0.12) * 0.6); }
          100% { transform: translateY(-120vh) scale(0.8); opacity: 0; }
        }
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
        @keyframes ctaPulse {
          0%,100% { box-shadow: 0 8px 32px rgba(0,191,165,0.34); }
          50% { box-shadow: 0 8px 48px rgba(0,191,165,0.6), 0 0 0 10px rgba(0,191,165,0.1); }
        }
        @keyframes goldPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>

      <Nav />

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        background: `linear-gradient(160deg, #0f2137 0%, #132d4a 35%, #0f2137 65%, #132d4a 100%)`,
        backgroundSize: '300% 300%', animation: 'gradShift 8s ease infinite',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 100px',
      }}>
        <FloatingDots />

        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}14 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
          background: 'rgba(0,191,165,0.1)', border: '1px solid rgba(0,191,165,0.3)',
          borderRadius: 50, padding: '7px 18px', position: 'relative', zIndex: 1,
          animation: 'pulse 3s ease infinite',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TEAL }}>Built for the Employment Rights Act 2025</span>
        </div>

        {/* Logo mark */}
        <div style={{ marginBottom: 28, position: 'relative', zIndex: 1, filter: `drop-shadow(0 0 24px ${TEAL}44)` }}>
          <ProdictaLogo size={56} textColor="#ffffff" />
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: F, fontWeight: 900, color: '#fff', position: 'relative', zIndex: 1,
          fontSize: 'clamp(36px, 5.5vw, 66px)', letterSpacing: '-2px', lineHeight: 1.05,
          maxWidth: 820, marginBottom: 24,
        }}>
          Understand likely probation{' '}
          <span style={{ color: TEAL, textShadow: '0 0 40px rgba(0,191,165,0.35)' }}>outcomes</span>{' '}
          <span style={{ color: GOLD, textShadow: '0 0 40px rgba(232,184,75,0.35)' }}>before you hire.</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: F, fontSize: 'clamp(16px, 1.8vw, 20px)', fontWeight: 400,
          color: 'rgba(255,255,255,0.6)', lineHeight: 1.75,
          maxWidth: 620, marginBottom: 44, position: 'relative', zIndex: 1,
        }}>
          Turn hiring uncertainty into conviction. Work simulations tailored to the role, the company, and the challenges that matter. Predict probation outcomes, reduce hiring risk, and add a layer of protection to every hiring decision.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, position: 'relative', zIndex: 1 }}>
          <a href="/login" style={{
            fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
            background: TEAL, textDecoration: 'none',
            padding: '16px 40px', borderRadius: 12, display: 'inline-block',
            animation: 'ctaPulse 3s ease infinite',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.animation='none'; e.currentTarget.style.boxShadow=`0 12px 40px rgba(0,191,165,0.5)` }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.animation='ctaPulse 3s ease infinite'; e.currentTarget.style.boxShadow='' }}>
            Start Free Trial
          </a>
          <a href="/demo" style={{
            fontFamily: F, fontSize: 16, fontWeight: 600, color: '#fff',
            background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.22)',
            textDecoration: 'none', padding: '16px 40px', borderRadius: 12, display: 'inline-block',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.13)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.22)' }}>
            Try Demo, no account needed
          </a>
        </div>

        {/* Report mockup */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 946, marginBottom: 64, zIndex: 1 }}>
          {/* Jade glow behind mockup */}
          <div style={{ position: 'absolute', inset: '-48px -32px', borderRadius: 48, background: 'radial-gradient(ellipse at 50% 60%, rgba(0,191,165,0.15) 0%, transparent 68%)', pointerEvents: 'none' }} />
          <div style={{
            transform: 'rotate(2deg)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(0,191,165,0.15)',
            textAlign: 'left',
          }}>
            {/* Browser chrome */}
            <div style={{ background: '#1e293b', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 7 }}>
              {['#EF4444', '#F59E0B', '#22C55E'].map(c => (
                <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
              ))}
              <div style={{ flex: 1, background: '#334155', borderRadius: 5, padding: '4px 12px', marginLeft: 8, maxWidth: 280 }}>
                <span style={{ fontFamily: FM, fontSize: 10.5, color: '#94a3b8' }}>prodicta.co.uk/assessment/...</span>
              </div>
            </div>
            {/* Report header */}
            <div style={{ background: NAVY, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Assessment Report</div>
                <div style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 3 }}>Alex Johnson</div>
                <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.48)' }}>Senior Account Manager &middot; Completed 12 Mar 2025</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% 82%, rgba(255,255,255,0.1) 82%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: FM, fontSize: 17, fontWeight: 800, color: TEAL }}>82</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 11, color: TEAL, fontWeight: 700, marginTop: 5 }}>Strong Hire</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Risk Level</div>
                  <div style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: TEAL }}>Low</div>
                  <div style={{ fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Percentile</div>
                  <div style={{ fontFamily: FM, fontSize: 15, fontWeight: 700, color: TEAL }}>Top 18%</div>
                </div>
              </div>
            </div>
            {/* Score strips */}
            <div style={{ background: '#fff', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Communication', score: 88 },
                { label: 'Problem Solving', score: 79 },
                { label: 'Prioritisation', score: 75 },
                { label: 'Leadership', score: 84 },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: F, fontSize: 11.5, color: '#5e6b7f', fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontFamily: FM, fontSize: 11.5, color: TEAL, fontWeight: 700 }}>{s.score}</span>
                  </div>
                  <div style={{ height: 4, background: '#f1f5f9', borderRadius: 50 }}>
                    <div style={{ height: '100%', width: `${s.score}%`, background: TEAL, borderRadius: 50 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', padding: '20px 32px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
          {[
            { to: 500, suffix: '+', label: 'Candidates assessed' },
            { to: 4,   suffix: '',  label: 'Scenario types' },
            { to: 45,  suffix: ' min', label: 'Assessment time' },
            { to: null, display: 'UK-built', label: 'For ERA 2025 compliance' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontFamily: FM, fontSize: 31, fontWeight: 700, color: TEAL, letterSpacing: '-0.5px', lineHeight: 1 }}>
                <StatNumber to={item.to} suffix={item.suffix} display={item.display} />
              </div>
              <div style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 5, whiteSpace: 'nowrap' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Founding member urgency */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, position: 'relative', zIndex: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, display: 'inline-block', flexShrink: 0, animation: 'goldPulse 2s ease infinite' }} />
          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: GOLD }}>Currently onboarding founding members</span>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.35 }}>
          <div style={{ fontFamily: F, fontSize: 11, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scroll</div>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PROBLEM — The cost of getting hiring wrong
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f7f9fb', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>The problem</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                The cost of getting hiring wrong
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              {
                stat: '£12,000\u201330,000+',
                label: 'Cost of a bad hire',
                body: 'Recruitment fees, onboarding, lost productivity, and management time. Before you even consider the cost of starting over.',
                accent: '#EF4444',
              },
              {
                stat: '77%',
                label: 'Employers say probation reveals more than interviews',
                body: 'Yet most organisations still rely on interviews alone to make hiring decisions. PRODICTA changes that.',
                accent: '#F59E0B',
              },
              {
                stat: 'Jan 2027',
                label: 'Unfair dismissal from day one',
                body: 'The Employment Rights Act extends unfair dismissal protection and removes the compensation cap. Getting hiring right is no longer optional.',
                accent: TEAL,
              },
            ].map((card, i) => (
              <Reveal key={card.stat} delay={i * 100}>
                <div
                  style={{
                    background: '#fff', borderRadius: 16, padding: '32px 28px',
                    border: '1px solid #e4e9f0',
                    borderLeft: `2px solid ${card.accent}`,
                    height: '100%',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,33,55,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontFamily: FM, fontSize: 32, fontWeight: 700, color: card.accent, letterSpacing: '-0.5px', marginBottom: 8, lineHeight: 1.1 }}>{card.stat}</div>
                  <div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{card.label}</div>
                  <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', lineHeight: 1.7 }}>{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: '#F8FAFB', padding: '96px 24px' }}>
        <style>{`
          .hiw-steps {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0;
            position: relative;
          }
          .hiw-connector {
            position: absolute;
            top: 28px;
            left: 12.5%;
            right: 12.5%;
            height: 1px;
            background: linear-gradient(to right, transparent, ${TEAL}55 20%, ${TEAL}55 80%, transparent);
            z-index: 0;
          }
          .hiw-step {
            text-align: center;
            padding: 0 28px;
            position: relative;
            z-index: 1;
          }
          .hiw-step-circle {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${TEAL};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 20px;
            font-weight: 700;
            color: #fff;
            box-shadow: 0 4px 24px ${TEAL}44;
            position: relative;
            z-index: 1;
          }
          @media (max-width: 720px) {
            .hiw-steps {
              grid-template-columns: 1fr;
              gap: 0;
            }
            .hiw-connector { display: none; }
            .hiw-step {
              display: flex;
              align-items: flex-start;
              text-align: left;
              gap: 20px;
              padding: 0 0 40px 0;
              position: relative;
            }
            .hiw-step:last-child { padding-bottom: 0; }
            .hiw-step-circle {
              margin: 0;
              flex-shrink: 0;
            }
            .hiw-step::after {
              content: '';
              position: absolute;
              top: 56px;
              left: 27px;
              width: 2px;
              bottom: 0;
              background: linear-gradient(to bottom, ${TEAL}55, transparent);
            }
            .hiw-step:last-child::after { display: none; }
          }
        `}</style>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>How it works</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 18 }}>
                From job description to hiring decision in minutes
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
                No personality tests. No guesswork. Real work simulations that show you exactly who will succeed.
              </p>
            </div>
          </Reveal>

          <div style={{ position: 'relative' }}>
            <div className="hiw-connector" />
            <div className="hiw-steps">
              {[
                {
                  n: 1,
                  title: 'Paste your job description',
                  body: 'Our AI reads every detail. The company, the targets, the team, the challenges. It builds 4 realistic scenarios this candidate would face in their first 90 days. Every assessment is unique to the role.',
                },
                {
                  n: 2,
                  title: 'Send to your candidates',
                  body: 'One click sends a professional branded email. Candidates complete 4 timed scenarios in about 45 minutes. No login, no download. They just click and start.',
                },
                {
                  n: 3,
                  title: 'AI analyses every response',
                  body: 'Two AI passes score each candidate across skills, pressure handling, integrity, and commercial awareness. Every score backed by specific evidence from what they wrote.',
                },
                {
                  n: 4,
                  title: 'Get a report worth paying for',
                  body: 'Overall score, Pressure-Fit Assessment, risk level, hiring recommendation, strengths with evidence, concerns with actions, a 6-week onboarding plan, and interview questions targeting each candidate\'s gaps.',
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div className="hiw-step">
                    <div className="hiw-step-circle">{s.n}</div>
                    <div>
                      <h3 style={{ fontFamily: F, fontSize: 15.5, fontWeight: 700, color: NAVY, marginBottom: 10, letterSpacing: '-0.2px' }}>{s.title}</h3>
                      <p style={{ fontFamily: F, fontSize: 13.5, color: '#6b7a90', lineHeight: 1.75, margin: 0 }}>{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES — 2×3 grid
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: NAVY, padding: '96px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}0a 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Features</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
                Everything you need to hire with confidence
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
                Designed for UK employers and recruitment agencies.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {[
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                title: 'Pressure-Fit Assessment',
                body: "Measures how candidates perform under workplace pressure: conflicting priorities, difficult conversations, and tight deadlines. The #1 predictor of whether someone passes probation.",
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/></svg>,
                title: 'Response Integrity Analysis',
                body: 'Detects AI-assisted or copy-pasted responses before you invest further. Timing analysis, consistency checks, and authenticity scoring built in.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><path d="M12 8v4l3 3"/></svg>,
                title: 'Intelligent AI Scoring',
                body: 'Four skill dimensions (Communication, Problem Solving, Prioritisation, and Leadership), each scored with detailed narrative explanations.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={20} x2={18} y2={10}/><line x1={12} y1={20} x2={12} y2={4}/><line x1={6} y1={20} x2={6} y2={14}/></svg>,
                title: 'Compare Candidates',
                body: 'Side-by-side comparison of all candidates in an assessment. Rank by score, risk level, or any dimension. Make data-driven shortlisting decisions.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: 'Equality Act Compliant',
                body: 'Scenario-based assessments are role-relevant and anonymised from protected characteristics. Documented, defensible, and auditable hiring decisions.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: 'Personalised Onboarding Plans',
                body: "Each report includes a tailored first-90-days onboarding plan based on the candidate's specific strengths and watch-outs. Hit the ground running from day one.",
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div style={{
                  padding: '32px 30px', borderRadius: 0,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'background 0.2s',
                  borderRadius: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.055)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11, marginBottom: 20,
                    background: `${TEAL}18`, border: `1px solid ${TEAL}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: '-0.1px' }}>{f.title}</h3>
                  <p style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOR AGENCIES / FOR EMPLOYERS
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Who it's for</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                Built for two types of hiring professional
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24 }}>
            {[
              {
                tag: 'For Recruitment Agencies',
                headline: 'Your competitors send CVs. You send proof.',
                body: 'Every candidate you place comes with a professional AI assessment report. Your client sees their score, how they handle pressure, where the risks are, and exactly what to ask in the interview. No other agency offers this.',
                points: [
                  'Placement Risk Score predicts if this hire will last beyond probation',
                  'Professional reports with scores, pressure-fit analysis, strengths, concerns, and evidence',
                  'AI-generated interview questions specific to each candidate\'s gaps',
                  'Personalised onboarding plan your client can use from day one',
                  'Accountability trail that documents every risk you flagged, protecting your fees',
                  'Configurable reports: choose exactly what your client sees',
                  'Response integrity checks detect AI-assisted or rushed answers before you present the candidate',
                ],
                bg: NAVY,
                dark: true,
              },
              {
                tag: 'For Direct Employers',
                headline: 'Stop gambling on interviews. Start predicting outcomes.',
                body: '77% of employers say probation reveals more about capability than interviews. PRODICTA gives you that probation insight before you make the offer. Every candidate is tested in realistic scenarios specific to your role.',
                points: [
                  'Predict probation outcomes before you make the offer',
                  'Pressure-Fit Assessment reveals how candidates handle conflict, deadlines, and competing priorities',
                  'Every score backed by evidence: specific quotes from what the candidate actually wrote',
                  'Track your hiring accuracy over time and see which scores predict real-world success',
                  'Custom skill weightings that match what your roles actually need',
                  'Personalised onboarding plan for every candidate, tailored to their specific gaps',
                ],
                bg: '#f0fdf8',
                dark: false,
              },
            ].map((col, i) => (
              <Reveal key={col.tag} delay={i * 100}>
                <div style={{
                  background: col.bg, borderRadius: 20, padding: '44px 40px',
                  height: '100%', border: col.dark ? 'none' : `1px solid ${TEAL}30`,
                }}>
                  <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>{col.tag}</div>
                  <h3 style={{ fontFamily: F, fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 800, color: col.dark ? '#fff' : NAVY, letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 18 }}>{col.headline}</h3>
                  <p style={{ fontFamily: F, fontSize: 14.5, color: col.dark ? 'rgba(255,255,255,0.6)' : '#5e6b7f', lineHeight: 1.75, marginBottom: 28 }}>{col.body}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {col.points.map(p => (
                      <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <Check color={TEAL} size={15} />
                        <span style={{ fontFamily: F, fontSize: 14, color: col.dark ? 'rgba(255,255,255,0.78)' : '#374151', lineHeight: 1.5 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 36 }}>
                    <a href="/login" style={{
                      display: 'inline-block', fontFamily: F, fontSize: 14, fontWeight: 700,
                      color: col.dark ? NAVY : '#fff',
                      background: col.dark ? TEAL : TEAL,
                      textDecoration: 'none', padding: '12px 26px', borderRadius: 9,
                    }}>
                      Get started →
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SAMPLE REPORT PREVIEW
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f7f9fb', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>See it in action</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16 }}>
                See what a PRODICTA report looks like
              </h2>
              <p style={{ fontFamily: F, fontSize: 16, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 32px' }}>
                Explore a real demo report. No account needed.
              </p>
              <a href="/demo" style={{
                display: 'inline-block', fontFamily: F, fontSize: 15, fontWeight: 700,
                color: NAVY, background: TEAL, textDecoration: 'none',
                padding: '13px 32px', borderRadius: 10,
              }}>
                View demo report →
              </a>
            </div>
          </Reveal>

          {/* Report preview mockup */}
          <Reveal delay={100}>
            <div style={{
              background: '#fff', borderRadius: 20, overflow: 'hidden',
              border: '1px solid #e4e9f0',
              boxShadow: '0 24px 80px rgba(15,33,55,0.13)',
              textAlign: 'left',
            }}>
              {/* Browser chrome */}
              <div style={{ background: '#1e293b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {['#EF4444', '#F59E0B', '#22C55E'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
                <div style={{ flex: 1, background: '#334155', borderRadius: 6, padding: '5px 14px', marginLeft: 8, maxWidth: 300 }}>
                  <span style={{ fontFamily: FM, fontSize: 11, color: '#94a3b8' }}>prodicta.co.uk/assessment/...</span>
                </div>
              </div>

              {/* Report header */}
              <div style={{ background: NAVY, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Assessment Report</div>
                  <div style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 4 }}>Alex Johnson</div>
                  <div style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Senior Account Manager · Completed 12 Mar 2025</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% 82%, rgba(255,255,255,0.1) 82%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: FM, fontSize: 18, fontWeight: 800, color: TEAL }}>82</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 11.5, color: TEAL, fontWeight: 700, marginTop: 6 }}>Strong Hire</div>
                </div>
              </div>

              {/* Score strips */}
              <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Communication', score: 88, color: '#22C55E' },
                  { label: 'Problem Solving', score: 79, color: TEAL },
                  { label: 'Prioritisation', score: 75, color: '#F59E0B' },
                  { label: 'Leadership', score: 84, color: TEAL },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: F, fontSize: 12, color: '#5e6b7f', fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontFamily: FM, fontSize: 12, color: s.color, fontWeight: 700 }}>{s.score}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 50 }}>
                      <div style={{ height: '100%', width: `${s.score}%`, background: s.color, borderRadius: 50 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Watch-outs preview */}
              <div style={{ padding: '0 32px 28px' }}>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/>
                  </svg>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Watch-out: Delegation hesitancy</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: '#b45309', lineHeight: 1.5 }}>Candidate shows reluctance to delegate. May become a bottleneck in a senior role. Probe with: "Tell me about a time you handed off a responsibility you weren't comfortable letting go of."</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Pricing</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
                Simple, transparent pricing
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7 }}>Transparent pricing. No hidden fees.</p>
            </div>
          </Reveal>

          {/* Founding callout */}
          <Reveal>
            <div style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, #0d2a43 100%)`,
              borderRadius: 16, padding: '24px 32px', marginBottom: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 20,
              border: `1.5px solid ${TEAL}44`,
              boxShadow: `0 8px 32px ${TEAL}18`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: `${TEAL}22`, border: `1px solid ${TEAL}44`, borderRadius: 10, padding: '8px 14px', fontFamily: FM, fontSize: 13, fontWeight: 700, color: TEAL, whiteSpace: 'nowrap' }}>OFFER</div>
                <div>
                  <div style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Founding Member: £79/month</div>
                  <div style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.55)' }}>Limited time offer: unlimited assessments, all features, for 12 months. Lock in before it's gone.</div>
                </div>
              </div>
              <a href="/login" style={{
                fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '11px 24px', borderRadius: 9, whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Claim founding price →
              </a>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
            {[
              {
                name: 'Starter',
                price: '£49',
                limit: '10 assessments/mo',
                desc: 'For small teams getting started with AI assessment.',
                features: ['10 assessments per month', 'AI scenario generation', 'Pressure-Fit scoring', 'Response integrity check', 'Watch-outs & interview Qs', 'Onboarding plans'],
                highlight: false,
              },
              {
                name: 'Growth',
                price: '£99',
                limit: '30 assessments/mo',
                desc: 'For growing teams hiring at volume.',
                features: ['30 assessments per month', 'Everything in Starter', 'Candidate comparison', 'Benchmarking tools', 'Archive & outcomes tracking', 'Priority email support'],
                highlight: true,
                badge: 'MOST POPULAR',
              },
              {
                name: 'Scale',
                price: '£120',
                limit: 'Unlimited assessments',
                desc: 'For high-volume hiring with no limits.',
                features: ['Unlimited assessments', 'Everything in Growth', 'Agency features', 'Placement risk scores', 'Document upload & send', 'Accountability records'],
                highlight: false,
              },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 80}>
                <div style={{
                  background: p.highlight ? NAVY : '#fff',
                  borderRadius: 18, padding: '36px 30px',
                  border: p.highlight ? `2px solid ${TEAL}` : '1px solid #e4e9f0',
                  position: 'relative',
                  boxShadow: p.highlight ? `0 16px 48px ${TEAL}22` : '0 2px 8px rgba(15,33,55,0.05)',
                }}>
                  {p.badge && (
                    <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: TEAL, color: NAVY, fontFamily: F, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 50, whiteSpace: 'nowrap' }}>{p.badge}</div>
                  )}
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                    <span style={{ fontFamily: FM, fontSize: 40, fontWeight: 700, color: p.highlight ? '#fff' : NAVY, letterSpacing: '-1px' }}>{p.price}</span>
                    <span style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.45)' : '#94a1b3' }}>/mo</span>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 12.5, color: TEAL, fontWeight: 600, marginBottom: 10 }}>{p.limit}</div>
                  <p style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.5)' : '#6b7280', lineHeight: 1.55, marginBottom: 26 }}>{p.desc}</p>
                  <div style={{ height: 1, background: p.highlight ? 'rgba(255,255,255,0.08)' : '#f1f5f9', marginBottom: 22 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 30 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <Check color={TEAL} size={14} />
                        <span style={{ fontFamily: F, fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,0.75)' : '#374151', lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/login" style={{
                    display: 'block', width: '100%', padding: '13px 0', borderRadius: 10, boxSizing: 'border-box',
                    background: p.highlight ? TEAL : 'transparent',
                    border: p.highlight ? 'none' : `1.5px solid ${TEAL}`,
                    color: p.highlight ? NAVY : TEAL, fontFamily: F, fontSize: 14, fontWeight: 700,
                    textDecoration: 'none', textAlign: 'center',
                  }}>
                    Get started →
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          ERA 2025
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${NAVY} 0%, #0a1f34 50%, #071a2b 100%)`,
        padding: '96px 24px',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '30%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 50, padding: '6px 16px', marginBottom: 28 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/></svg>
              <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: '#FCA5A5' }}>Employment Rights Act 2025</span>
            </div>

            <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 24 }}>
              The Employment Rights Act 2025 changes everything
            </h2>

            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 32px', marginBottom: 32, textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'From January 2027', body: 'Employees will have unfair dismissal protection from their first day of employment, with no qualifying period.' },
                  { label: 'No compensation cap', body: "The upper limit on unfair dismissal compensation will be removed, exposing employers to significantly larger awards." },
                  { label: 'Probationary periods tightened', body: "You'll still be able to dismiss during a defined probation period, but only with a clear, fair process. You'll need to evidence it." },
                ].map(({ label, body }) => (
                  <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', marginTop: 7, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 36 }}>
              Are you ready?
            </p>
            <a href="/login" style={{
              display: 'inline-block', fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
              background: TEAL, textDecoration: 'none',
              padding: '16px 44px', borderRadius: 12,
              boxShadow: `0 8px 32px ${TEAL}55`,
            }}>
              Start assessing candidates →
            </a>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f7f9fb', padding: '96px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Get started</div>
            <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 20 }}>
              Start making better hires today
            </h2>
            <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.75, marginBottom: 40 }}>
              Join employers and recruitment agencies across the UK using PRODICTA to hire with confidence.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/login" style={{
                fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '16px 44px', borderRadius: 12,
                boxShadow: `0 8px 32px ${TEAL}44`,
              }}>
                Start Free Trial →
              </a>
              <a href="/demo" style={{
                fontFamily: F, fontSize: 16, fontWeight: 600, color: NAVY,
                background: 'transparent', border: `1.5px solid ${TEAL}`,
                textDecoration: 'none', padding: '16px 44px', borderRadius: 12,
              }}>
                Try Demo
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#071524', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 48px 36px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            {/* Brand */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ marginBottom: 14 }}>
                <ProdictaLogo size={32} textColor="#ffffff" />
              </div>
              <p style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
                AI-powered candidate assessment that predicts probation outcomes before you hire.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Product</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['How it works', '#how-it-works'], ['Pricing', '#pricing'], ['Demo', '/demo'], ['Sample report', '/demo']].map(([label, href]) => (
                    <a key={href+label} href={href} style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                      onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.85)'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.5)'}>{label}</a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[['Terms of Service', '/terms'], ['Privacy Policy', '/privacy']].map(([label, href]) => (
                    <a key={href} href={href} style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                      onMouseEnter={e => e.target.style.color='rgba(255,255,255,0.85)'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.5)'}>{label}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.28)' }}>
              AIAURA Group Ltd trading as PRODICTA · Registered in England and Wales
            </p>
            <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.28)' }}>
              © {new Date().getFullYear()} PRODICTA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
