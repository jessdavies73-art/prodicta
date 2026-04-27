'use client'
import { useEffect, useRef, useState } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY    = '#0f2137'
const NAVY2   = '#0d1e30'
const TEAL    = '#00BFA5'
const TEALD   = '#009688'
const TEALLT  = '#e0f2f0'
const CREAM   = '#FAF9F4'
const PARCHMENT = '#FAEFD9'
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


// ── Outcome Engine (agency hero only) ────────────────────────────────────────
// Live shortlisting moment. Continuous noise baseline (CSS-driven) plus a
// JS-scheduled event every 6-8 seconds:
//   filtering (1s) - label "Filtering candidates" with cycling dots
//   matching  (1.5s) - winner streak strengthens to 0.5 alpha and locks at focal
//   matched   (2.5s) - label switches to "Top Match Identified", focal pulses
// Then 600ms fade back to baseline. Long quiet between events is what makes it
// feel like a live system, not a screensaver. Reduced motion short-circuits
// the scheduler so only the static baseline remains.
function OutcomeEngine() {
  const [isMobile, setIsMobile] = useState(false)
  const [eventState, setEventState] = useState('idle')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    const tids = []
    const wait = (ms, fn) => {
      const id = setTimeout(() => { if (!cancelled) fn() }, ms)
      tids.push(id)
    }

    function schedule() {
      const quiet = 6000 + Math.random() * 2000
      wait(quiet, () => {
        setEventState('filtering')
        wait(1000, () => {
          setEventState('matching')
          wait(1500, () => {
            setEventState('matched')
            // Hold "matched" for 3s (was 2.5s) so visitors have a moment to
            // register the resolution before the field returns to baseline.
            wait(3000, () => {
              setEventState('idle')
              schedule()
            })
          })
        })
      })
    }
    schedule()
    return () => { cancelled = true; tids.forEach(clearTimeout) }
  }, [])

  // Focal point: centre-right of the hero, on the line where "before you
  // make it." sits in the headline. Percentages are relative to the hero
  // section (the absolute container has inset: 0 inside the hero), so the
  // focal stays aligned regardless of whether the hero is exactly 100vh
  // or taller (mobile stacked content).
  const FX = 62
  const FY = 45

  // Noise streaks: 10 thin jade lines entering from various edges. dur is
  // varied across three speed bands (3.5-6.5s) so the field has depth.
  // Negative delays seed the field on first paint. Coordinates are
  // percentages of the hero section (not the viewport) so streaks span
  // the full hero height even when the section grows past the viewport.
  // sx/sy and dx/dy units: % of hero width / % of hero height.
  const noiseDefs = [
    { sx: -10, sy: 8,   dx: 80,  dy: 12,  len: 70, w: 1,   op: 0.18, dur: 4.5, delay: -0.2 },
    { sx: -10, sy: 26,  dx: 90,  dy: 0,   len: 80, w: 1,   op: 0.18, dur: 6.0, delay: -1.0 },
    { sx: -10, sy: 45,  dx: 80,  dy: 8,   len: 75, w: 1,   op: 0.18, dur: 3.5, delay: -0.6 },
    { sx: -10, sy: 70,  dx: 90,  dy: -10, len: 80, w: 1,   op: 0.18, dur: 5.0, delay: -1.4 },
    { sx: -10, sy: 92,  dx: 75,  dy: -22, len: 70, w: 1,   op: 0.18, dur: 4.2, delay: -2.6 },
    { sx: 110, sy: 18,  dx: -90, dy: 25,  len: 80, w: 1,   op: 0.18, dur: 4.5, delay: -0.8 },
    { sx: 110, sy: 55,  dx: -100, dy: -10, len: 90, w: 1.2, op: 0.20, dur: 6.5, delay: -2.5 },
    { sx: 110, sy: 82,  dx: -95, dy: -18, len: 75, w: 1,   op: 0.18, dur: 4.0, delay: -1.2 },
    { sx: -10, sy: 60,  dx: 95,  dy: 20,  len: 95, w: 1.2, op: 0.20, dur: 5.0, delay: -3.0 },
    { sx: 110, sy: 38,  dx: -100, dy: 14, len: 70, w: 1,   op: 0.18, dur: 3.8, delay: -2.8 },
  ]
  // Mobile keeps a 5-streak cross-section across the four entry edges.
  const mobilePick = [0, 2, 4, 6, 8]
  const noise = isMobile ? mobilePick.map(i => noiseDefs[i]) : noiseDefs

  // Winner: single bright streak. Same start each event by design.
  const winner = { sx: -8, sy: 30 }
  const wdx = FX - winner.sx
  const wdy = FY - winner.sy
  const winnerRot = Math.atan2(wdy, wdx) * 180 / Math.PI

  const winnerAtFocal = eventState === 'matching' || eventState === 'matched'
  const winnerOpacity = eventState === 'matching' ? 0.75 : eventState === 'matched' ? 0.75 : 0
  const focalOpacity  = eventState === 'matched' ? 1.0 : eventState === 'matching' ? 0.5 : 0
  const focalScale    = eventState === 'matched' ? 1.7 : 1

  const showLabel = eventState !== 'idle'
  const labelText = eventState === 'matched' ? 'Top Match Identified' : 'Filtering candidates'
  const labelColor = eventState === 'matched' ? TEAL : '#5A6B7A'
  const showCyclingDots = eventState === 'filtering' || eventState === 'matching'

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
    }}>
      {noise.map((s, i) => {
        const x1 = s.sx + s.dx
        const y1 = s.sy + s.dy
        const rot = Math.atan2(s.dy, s.dx) * 180 / Math.PI
        const dur = isMobile ? s.dur * 1.3 : s.dur
        return (
          <div
            key={`n${i}`}
            className="pd-oe-noise"
            style={{
              position: 'absolute',
              width: s.len, height: s.w,
              borderRadius: s.w,
              background: `linear-gradient(to right, transparent 0%, ${TEAL} 30%, ${TEAL} 70%, transparent 100%)`,
              opacity: 0,
              willChange: 'left, top, opacity',
              transform: `rotate(${rot}deg)`,
              transformOrigin: '0 50%',
              animation: `pdOENoise ${dur}s ease-in-out ${s.delay}s infinite`,
              '--x0': `${s.sx}%`, '--y0': `${s.sy}%`,
              '--x1': `${x1}%`, '--y1': `${y1}%`,
              '--peak': s.op,
            }}
          />
        )
      })}
      <div
        className="pd-oe-winner"
        style={{
          position: 'absolute',
          left: winnerAtFocal ? `${FX}%` : `${winner.sx}%`,
          top:  winnerAtFocal ? `${FY}%` : `${winner.sy}%`,
          width: 110, height: 1.5,
          borderRadius: 1,
          background: `linear-gradient(to right, transparent 0%, ${TEAL} 30%, ${TEAL} 70%, transparent 100%)`,
          opacity: winnerOpacity,
          transform: `rotate(${winnerRot}deg)`,
          filter: winnerAtFocal ? `drop-shadow(0 0 8px ${TEAL}99)` : 'none',
          willChange: 'left, top, opacity',
          transformOrigin: '0 50%',
          transition: 'left 1.5s cubic-bezier(0.2, 0.8, 0.2, 1), top 1.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 600ms ease, filter 600ms ease',
        }}
      />
      <div
        className="pd-oe-focal"
        style={{
          position: 'absolute',
          left: `${FX}%`,
          top: `${FY}%`,
          width: 12, height: 12,
          borderRadius: '50%',
          background: TEAL,
          boxShadow: `0 0 16px 4px ${TEAL}88, 0 0 28px 6px ${TEAL}44`,
          transform: `translate(-50%, -50%) scale(${focalScale})`,
          opacity: focalOpacity,
          willChange: 'transform, opacity',
          transition: 'transform 1.2s ease, opacity 600ms ease',
        }}
      />
      <div
        className="pd-oe-label"
        style={{
          position: 'absolute',
          left: `${FX}%`,
          top: `calc(${FY}% + 22px)`,
          transform: 'translate(-50%, 0)',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: F,
          fontSize: isMobile ? 11 : 12.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: labelColor,
          opacity: showLabel ? 0.92 : 0,
          willChange: 'opacity',
          transition: 'opacity 600ms ease, color 600ms ease',
          whiteSpace: 'nowrap',
        }}
      >
        {showCyclingDots ? (
          <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 3, height: 3, borderRadius: '50%',
                background: '#5A6B7A',
                animation: `pdLabelDot 1.2s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </span>
        ) : (
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: TEAL,
            boxShadow: `0 0 6px ${TEAL}88`,
          }} />
        )}
        {labelText}
      </div>
    </div>
  )
}

// ── Stability Engine (employer hero only) ────────────────────────────────────
// Live control panel feel. Network sits still 12-18 seconds at a time, then
// fires one event:
//   detecting   (1.5s) - random node shifts and brightens, label "Risk detected"
//                        with a muted jade-amber dot (#D4A06B at 0.5 alpha)
//   stabilising (2.5s) - connected edges brighten, label switches to
//                        "Stabilising" with cycling dots
//   stable      (1.5s) - node settles back, label "Stable" with jade dot
// 600ms fade back to baseline calm. Long quiet sells the "in control" feel.
// Reduced motion short-circuits the scheduler so the layout stays at baseline.
function StabilityEngine({ heroPersona }) {
  // Mount/render diagnostic. Fires on every render including the first
  // paint. If this line is absent from DevTools the component never
  // mounted; if it is present the component is alive and any subsequent
  // missing event logs come from the prefers-reduced-motion gate or a
  // console-filter setting in the user's browser.
  console.log('[StabilityEngine] component rendered, heroPersona:', heroPersona)

  const [isMobile, setIsMobile] = useState(false)
  const [activeNode, setActiveNode] = useState(null)
  const [shift, setShift] = useState({ dx: 0, dy: 0 })
  const [eventState, setEventState] = useState('idle')

  // Stable ref so the scheduler effect can read the current isMobile without
  // re-running on every viewport flip (which would cancel any in-flight
  // event and leave a stale node visible until the next 12-18s quiet
  // expired). Keeping the scheduler effect's dep array empty also avoids
  // double-mount churn under React StrictMode in dev.
  const isMobileRef = useRef(false)

  useEffect(() => {
    const check = () => {
      const mob = window.innerWidth <= 768
      isMobileRef.current = mob
      setIsMobile(mob)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log('[StabilityEngine] reduced motion: scheduler skipped')
      return
    }

    let cancelled = false
    const tids = new Set()
    const wait = (ms, fn) => {
      const id = setTimeout(() => {
        tids.delete(id)
        if (!cancelled) fn()
      }, ms)
      tids.add(id)
    }

    let firstRun = true
    function schedule() {
      // First event fires after 8-10s so the page does not look static; all
      // subsequent events sit in the original 12-18s quiet so the field
      // still feels like a calm control panel rather than a screensaver.
      const quiet = firstRun
        ? 8000 + Math.random() * 2000
        : 12000 + Math.random() * 6000
      firstRun = false
      console.log(`[StabilityEngine] idle, next event in ${Math.round(quiet)}ms`)
      wait(quiet, () => {
        const count = isMobileRef.current ? 6 : 10
        const idx = Math.floor(Math.random() * count)
        const angle = Math.random() * Math.PI * 2
        // Visual-strength dial-up: node shift now travels 6-10px instead of
        // 2-4px so the movement is perceptible without crossing into busy.
        const distance = 6 + Math.random() * 4
        setActiveNode(idx)
        setShift({ dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance })
        setEventState('detecting')
        console.log('[StabilityEngine] detecting (node', idx, ')')
        wait(1500, () => {
          setEventState('stabilising')
          console.log('[StabilityEngine] stabilising')
          wait(2500, () => {
            setEventState('stable')
            setShift({ dx: 0, dy: 0 })
            console.log('[StabilityEngine] stable')
            // Hold "stable" for 2s (was 1.5s) so users have a moment to
            // register the resolution before the field returns to baseline.
            wait(2000, () => {
              setEventState('idle')
              setActiveNode(null)
              console.log('[StabilityEngine] idle')
              schedule()
            })
          })
        })
      })
    }
    schedule()

    return () => {
      cancelled = true
      tids.forEach(clearTimeout)
      tids.clear()
    }
  }, [])

  // 10 nodes in 4 loose vertical bands with vertical scatter so the layout
  // reads as a structured but organic network, not a regular grid.
  const allNodes = [
    { x: 8,  y: 25 }, { x: 10, y: 60 }, { x: 12, y: 88 },
    { x: 35, y: 15 }, { x: 38, y: 50 }, { x: 36, y: 82 },
    { x: 65, y: 22 }, { x: 68, y: 58 },
    { x: 88, y: 30 }, { x: 90, y: 70 },
  ]
  const mobilePick = [1, 3, 5, 7, 8, 9]
  const nodes = isMobile ? mobilePick.map(i => allNodes[i]) : allNodes

  // Edges only connect adjacent bands so the eye reads structure not chaos.
  const allEdges = [
    { a: 0, b: 3 }, { a: 0, b: 4 },
    { a: 1, b: 4 }, { a: 1, b: 5 },
    { a: 2, b: 5 },
    { a: 3, b: 6 }, { a: 4, b: 6 }, { a: 4, b: 7 },
    { a: 5, b: 7 },
    { a: 6, b: 8 }, { a: 7, b: 8 }, { a: 7, b: 9 },
  ]
  const edges = isMobile
    ? allEdges
        .filter(e => mobilePick.includes(e.a) && mobilePick.includes(e.b))
        .map(e => ({ a: mobilePick.indexOf(e.a), b: mobilePick.indexOf(e.b) }))
    : allEdges

  // Node is shifted/bright only during detecting and stabilising. During
  // 'stable' the shift resets and the node returns to baseline via the 1.2s
  // CSS easing while the "Stable" label still floats nearby.
  const nodeShifted = eventState === 'detecting' || eventState === 'stabilising'
  const showLabel = eventState !== 'idle' && activeNode != null
  const activePos = activeNode != null ? nodes[activeNode] : null

  const labelText = eventState === 'detecting' ? 'Risk detected'
                  : eventState === 'stabilising' ? 'Stabilising'
                  : eventState === 'stable' ? 'Stable'
                  : ''
  const showCyclingDots = eventState === 'stabilising'
  const labelColor = eventState === 'stabilising' ? NAVY : '#5A6B7A'

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
    }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {edges.map((e, i) => {
          const isActive = nodeShifted && (activeNode === e.a || activeNode === e.b)
          const a = nodes[e.a], b = nodes[e.b]
          return (
            <line
              key={`e${i}`}
              className="pd-se-edge"
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#0f2137"
              strokeWidth={isActive ? '1.5' : '1'}
              vectorEffect="non-scaling-stroke"
              style={{
                opacity: isActive ? 0.40 : 0.07,
                transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )
        })}
      </svg>
      {nodes.map((n, i) => {
        const isActive = nodeShifted && activeNode === i
        return (
          <span
            key={`n${i}`}
            className="pd-se-node"
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              width: 6, height: 6,
              borderRadius: '50%',
              transform: isActive
                ? `translate(calc(-50% + ${shift.dx}px), calc(-50% + ${shift.dy}px)) scale(1.5)`
                : 'translate(-50%, -50%) scale(1)',
              background: '#0f2137',
              opacity: isActive ? 0.55 : 0.10,
              boxShadow: isActive ? '0 0 10px 2px rgba(15,33,55,0.28)' : 'none',
              willChange: 'transform, opacity',
              transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )
      })}
      {activePos && (
        <div
          className="pd-se-label"
          style={{
            position: 'absolute',
            left: `${activePos.x}%`,
            top: `calc(${activePos.y}% + 14px)`,
            transform: 'translate(-50%, 0)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: F,
            fontSize: isMobile ? 11 : 12.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: labelColor,
            opacity: showLabel ? 0.85 : 0,
            willChange: 'opacity',
            transition: 'opacity 600ms ease, color 600ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {showCyclingDots ? (
            <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 3, height: 3, borderRadius: '50%',
                  background: NAVY,
                  animation: `pdLabelDot 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </span>
          ) : eventState === 'detecting' ? (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#D4A06B',
              opacity: 0.85,
            }} />
          ) : eventState === 'stable' ? (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: TEAL,
              opacity: 1.0,
              boxShadow: `0 0 12px ${TEAL}99`,
            }} />
          ) : null}
          {labelText}
        </div>
      )}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => { window.removeEventListener('scroll', fn); window.removeEventListener('resize', checkMobile) }
  }, [])

  const navLinks = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '/science', label: 'The Science' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#who-its-for', label: "Who it's for" },
    { href: '/audit', label: 'Free audit' },
    { href: '/blog', label: 'Blog' },
    { href: '/roadmap', label: "What's Coming" },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      // The header is global. It stays dark navy at all times so the lighter
      // employer hero never shows through behind the wordmark on first load.
      background: 'rgba(13,30,48,0.96)',
      backdropFilter: 'blur(20px)',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.04)',
      transition: 'border-color 0.3s',
      padding: isMobile ? '0 16px' : '0 48px', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: isMobile && menuOpen ? 'wrap' : 'nowrap',
    }}>
      <a href="/" style={{ textDecoration: 'none' }}>
        <ProdictaLogo size={isMobile ? 30 : 36} textColor="#ffffff" />
      </a>

      {isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="/login" style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '7px 14px', borderRadius: 7, background: TEAL }}>Get started</a>
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
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '10px 8px', borderRadius: 7 }}>{l.label}</a>
              ))}
              <a href="/login" onClick={() => setMenuOpen(false)} style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '10px 8px', borderRadius: 7 }}>Sign in</a>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {navLinks.map(l => (
            <a key={l.href} href={l.href} style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}>{l.label}</a>
          ))}
          <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', marginLeft: 4, transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.target.style.borderColor='rgba(255,255,255,0.35)'} onMouseLeave={e => e.target.style.borderColor='rgba(255,255,255,0.14)'}>Sign in</a>
          <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '9px 20px', borderRadius: 8, background: TEAL, marginLeft: 2, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}>Get started →</a>
        </div>
      )}
    </nav>
  )
}

// ── Press credibility strip ──────────────────────────────────────────────────
const PRESS_FEATURES = [
  {
    name: 'theHRDirector',
    logo_url: '/press/the-hr-director-logo.jpg',
    article_title: 'The 6-month trap: Every hiring decision is now compliance',
    article_url: 'https://www.thehrdirector.com/features/employment-law/6-month-trap-every-hiring-decision-now-compliance/',
    publication_url: 'https://www.thehrdirector.com',
    brand_color: '#1a3a8a',
    date: 'April 2026',
  },
]

function PressEntry({ feature }) {
  const [hover, setHover] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = feature.logo_url && !logoFailed
  const href = feature.article_url || feature.publication_url

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 14, textDecoration: 'none', textAlign: 'center',
        padding: '8px 12px', borderRadius: 10,
        opacity: hover ? 1 : 0.85,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'opacity 220ms ease, transform 220ms ease, filter 220ms ease',
        filter: hover ? 'none' : 'grayscale(0.05)',
        maxWidth: 360,
      }}
    >
      {showLogo ? (
        <img
          src={feature.logo_url}
          alt={`${feature.name} logo`}
          onError={() => setLogoFailed(true)}
          className="pd-press-logo"
          style={{ maxHeight: 56, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span style={{
          fontFamily: F, fontSize: 22, fontWeight: 800,
          color: feature.brand_color || '#1a3a8a', letterSpacing: '-0.3px',
        }}>
          {feature.name}
        </span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{
          fontFamily: F, fontSize: 13.5, color: '#5A6B7A',
          fontStyle: 'italic', lineHeight: 1.45,
        }}>
          &ldquo;{feature.article_title}&rdquo;
        </span>
        <span style={{
          fontFamily: F, fontSize: 12, color: '#8A99AB',
          letterSpacing: '0.02em',
        }}>
          {feature.date}
        </span>
      </div>
    </a>
  )
}

function PressStrip() {
  const features = PRESS_FEATURES
  if (!features.length) return null
  const single = features.length === 1
  return (
    <section style={{
      background: '#FAF9F4',
      borderTop: '1px solid rgba(15,33,55,0.05)',
      borderBottom: '1px solid rgba(15,33,55,0.05)',
    }} className="pd-press-strip">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px', textAlign: 'center' }} className="pd-press-inner">
        <div style={{
          fontFamily: F, fontSize: 11, fontWeight: 700,
          color: TEAL, textTransform: 'uppercase',
          letterSpacing: '0.15em', marginBottom: 26,
        }}>
          As featured in
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: single ? 'center' : 'space-evenly',
          alignItems: 'flex-start',
          gap: 36,
        }}>
          {features.map(f => <PressEntry key={f.name} feature={f} />)}
        </div>
      </div>
    </section>
  )
}

// ── Bad hire cost banner ─────────────────────────────────────────────────────
function CostBanner() {
  return (
    <section style={{
      background: 'linear-gradient(180deg, #0d1e30 0%, #0f2137 100%)',
      padding: '72px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
        <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', lineHeight: 1.15, margin: '0 0 36px' }}>
          The cost of getting it wrong
        </h2>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${TEAL}33`,
          borderRadius: 16, padding: '40px 36px',
        }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            The average bad hire costs
          </div>
          <div style={{ fontFamily: FM, fontSize: 'clamp(48px, 7vw, 76px)', fontWeight: 800, color: TEAL, lineHeight: 1, marginBottom: 28 }}>
            £42,000
          </div>
          <div style={{ fontFamily: F, fontSize: 'clamp(16px, 1.8vw, 19px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.55 }}>
            PRODICTA users reduce that by up to <strong style={{ color: TEAL, fontWeight: 800 }}>47%</strong>.
          </div>
        </div>

        <p style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: '20px 0 0' }}>
          One prevented bad hire pays for <strong style={{ color: TEAL }}>10+ years</strong> of PRODICTA subscription.
        </p>
      </div>
    </section>
  )
}

// ── 6-month trap section ──────────────────────────────────────────────────────
function SixMonthTrap() {
  return (
    <section style={{
      background: '#0a1828', padding: '88px 24px',
      borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ maxWidth: 820, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 50, padding: '6px 16px', marginBottom: 22 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><line x1={12} y1={8} x2={12} y2={12}/><line x1={12} y1={16} x2="12.01" y2={16}/></svg>
          <span style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.07em' }}>January 2027</span>
        </div>
        <h2 style={{
          fontFamily: F, fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800,
          color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.05, margin: '0 0 28px',
        }}>
          The 6-Month Trap.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75, margin: 0 }}>
            From January 2027, every employee in the UK has unfair dismissal protection after just 6 months. No qualifying period. No compensation cap. For employers, every hire is a legal and financial risk from day one.
          </p>
          <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75, margin: 0 }}>
            A bad hire costs you recruitment fees, training, lost productivity, team morale, and now an uncapped tribunal claim.
          </p>
          <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75, margin: 0 }}>
            For recruitment agencies, every placement you make carries that same risk. When a hire fails, your client blames you. Your fee is at risk. Your reputation takes the hit. And from 2027, your clients will demand proof that the candidates you sent were properly assessed.
          </p>
          <p style={{ fontFamily: F, fontSize: 17, color: '#fff', lineHeight: 1.75, margin: '14px 0 0', fontWeight: 600 }}>
            PRODICTA exists because this problem is about to get much worse. The employers who prepare now will be protected. The agencies who offer this now will win the clients. Everyone else will be scrambling in January 2027.
          </p>
        </div>
      </div>
    </section>
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
  const [openFaq, setOpenFaq] = useState(null)
  const [heroPersona, setHeroPersona] = useState('agency') // 'agency' | 'employer'

  // Toggle a body class so the global CSS rules in this file can warm the
  // existing light section backgrounds and add a touch of extra padding when
  // the visitor selects the Direct Employer view. Cleared on unmount so the
  // tone never leaks to other routes (login, sign-up, dashboard).
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (heroPersona === 'employer') document.body.classList.add('pd-employer-tone')
    else document.body.classList.remove('pd-employer-tone')
    return () => { document.body.classList.remove('pd-employer-tone') }
  }, [heroPersona])

  const [personaTab, setPersonaTab] = useState('agency_perm') // 'agency_perm' | 'agency_temp' | 'employer_perm' | 'employer_temp'
  const [pricingMode, setPricingMode] = useState('subscription') // 'subscription' | 'payg'
  const [riskJd, setRiskJd] = useState('')
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskResults, setRiskResults] = useState(null)
  const [riskRoleTitle, setRiskRoleTitle] = useState('this role')
  const [riskError, setRiskError] = useState(null)

  async function handleRiskAnalysis() {
    if (!riskJd.trim() || riskLoading) return
    const SESSION_KEY = 'prodicta_risk_count'
    const count = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10)
    if (count >= 3) {
      setRiskError('You have used your 3 free analyses this session. Create a free account for unlimited access.')
      return
    }
    setRiskLoading(true)
    setRiskResults(null)
    setRiskError(null)
    try {
      const res = await fetch('/api/risk-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: riskJd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyse risks')
      setRiskResults(data.risks)
      setRiskRoleTitle(data.role_title || 'this role')
      sessionStorage.setItem(SESSION_KEY, String(count + 1))
    } catch (e) {
      setRiskError(e.message)
    } finally {
      setRiskLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: F, background: '#fff', overflowX: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradShiftLight {
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

        /* Hero, agency view: Outcome Engine. Noise streaks loop on a CSS
           keyframe (continuous baseline). Winner streak, focal point, and
           label are React-state-driven via inline transitions, fired by the
           event scheduler. */
        @keyframes pdOENoise {
          0%   { opacity: 0; left: var(--x0); top: var(--y0); }
          15%  { opacity: var(--peak); }
          45%  { opacity: var(--peak); }
          60%  { opacity: 0; }
          100% { opacity: 0; left: var(--x1); top: var(--y1); }
        }

        /* Cycling label dot: three small dots fading in and out staggered by
           150ms each. Used in "Filtering candidates" and "Stabilising"
           label states to signal active work. */
        @keyframes pdLabelDot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40%           { opacity: 1;    transform: translateY(-1px); }
        }

        /* Reduced motion. Noise streaks freeze at start positions at peak
           alpha so the static jade field stays visible. The event scheduler
           is short-circuited in JS, so winner, focal, and label all stay
           hidden (opacity 0). Same for StabilityEngine: scheduler short
           circuits, layout stays at baseline, no transitions fire. */
        @media (prefers-reduced-motion: reduce) {
          .pd-oe-noise { animation: none !important;
            opacity: var(--peak) !important;
            left: var(--x0) !important;
            top: var(--y0) !important;
          }
          .pd-oe-label, .pd-se-label { display: none !important; }
          .pd-se-node, .pd-se-edge { transition: none !important; }
        }


        /* Direct Employer view: warm the light section backgrounds and add
           a touch more breathing room. The dark gradient sections and the
           hero are not matched by these selectors so they stay unchanged. */
        body.pd-employer-tone section[style*="background:#ffffff"],
        body.pd-employer-tone section[style*="background:#fff"],
        body.pd-employer-tone section[style*="background: #fff"] {
          background: #FAFAF7 !important;
          padding-top: 90px !important;
          padding-bottom: 90px !important;
          transition: background 600ms ease, padding 600ms ease;
        }
        body.pd-employer-tone section[style*="background:#f8f9fb"],
        body.pd-employer-tone section[style*="background: #f8f9fb"] {
          background: #F4EFE7 !important;
          padding-top: 90px !important;
          padding-bottom: 90px !important;
          transition: background 600ms ease, padding 600ms ease;
        }
        body.pd-employer-tone section[style*="background:#f1f3f5"],
        body.pd-employer-tone section[style*="background: #f1f3f5"] {
          background: #EDE6D8 !important;
          padding-top: 90px !important;
          padding-bottom: 90px !important;
          transition: background 600ms ease, padding 600ms ease;
        }
        .pd-toggle-label-full { display: inline; }
        .pd-toggle-label-short { display: none; }
        @media (max-width: 480px) {
          .pd-toggle-label-full { display: none; }
          .pd-toggle-label-short { display: inline; }
        }
        .pd-tab-full   { display: inline; }
        .pd-tab-tablet { display: none; }
        .pd-tab-mobile { display: none; }
        @media (max-width: 1024px) {
          .pd-tab-full   { display: none; }
          .pd-tab-tablet { display: inline; }
        }
        @media (max-width: 768px) {
          .pd-tab-tablet { display: none; }
          .pd-tab-mobile { display: inline; }
        }
        @media (max-width: 768px) {
          .cv-vs-prodicta {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .cv-vs-prodicta > div:nth-child(2) {
            display: flex;
            justify-content: center;
          }
          .cv-vs-prodicta > div:nth-child(2) svg {
            transform: rotate(90deg);
          }
          .pd-press-inner {
            padding: 40px 20px !important;
          }
          .pd-press-logo {
            max-height: 44px !important;
          }
        }
      ` }} />

      <Nav />

      {/* ════════════════════════════════════════════════════════════════════
          HERO
          The hero supports two persona treatments. Agency keeps the
          original dark animated gradient with white text and white-tinted
          dots. Employer swaps to a softer cream + pale jade gradient with
          navy text and navy-tinted dots, cross-faded over 600ms when the
          toggle is pressed.
      ════════════════════════════════════════════════════════════════════ */}
      {(() => { const isEmployer = heroPersona === 'employer'; return (
      <section style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        background: '#0f2137',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center',
        padding: '90px 24px 75px',
      }}>
        {/* Two stacked animated gradient layers, cross-faded by opacity. */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'linear-gradient(-45deg, #0f2137, #1a3a5c, #0a2a2e, #0f2137)',
          backgroundSize: '400% 400%', animation: 'gradShift 18s ease-in-out infinite',
          opacity: isEmployer ? 0 : 1,
          transition: 'opacity 600ms ease',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          // Jade-led palette. Three pale stops drift across 24 seconds, slow
          // enough that the movement is almost imperceptible. None of the
          // stops approach the brand jade #00BFA5 saturation, so the jade
          // CTAs and accent type still pop against this background.
          background: 'linear-gradient(-45deg, #E6F4F1, #DCEDE7, #F4F8F6, #E6F4F1)',
          backgroundSize: '400% 400%', animation: 'gradShiftLight 24s ease-in-out infinite',
          opacity: isEmployer ? 1 : 0,
          transition: 'opacity 600ms ease',
        }} />

        {/* Two atmospheric overlays cross-faded by opacity. Agency gets the
            convergence-line network (echoes the PRODICTA logo); employer gets
            soft drifting jade orbs. Both layers stay mounted so the toggle
            cross-fades smoothly over 600ms without a re-mount flicker. The
            login and sign-up pages keep their FloatingDots treatment. */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          opacity: isEmployer ? 0 : 1,
          transition: 'opacity 600ms ease',
          pointerEvents: 'none',
        }}>
          <OutcomeEngine />
        </div>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          opacity: isEmployer ? 1 : 0,
          transition: 'opacity 600ms ease',
          pointerEvents: 'none',
        }}>
          <StabilityEngine heroPersona={heroPersona} />
        </div>

        {/* Radial glow, slightly softer on the light treatment so it does not bloom. */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}${isEmployer ? '0c' : '14'} 0%, transparent 65%)`, pointerEvents: 'none', transition: 'background 600ms ease', zIndex: 0 }} />

        {/* Badge: jade-on-dark for agency, navy-on-jade-tint for employer */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
          background: isEmployer ? TEALLT : 'rgba(0,191,165,0.1)',
          border: `1px solid ${isEmployer ? `${TEAL}55` : 'rgba(0,191,165,0.3)'}`,
          borderRadius: 50, padding: '7px 18px', position: 'relative', zIndex: 1,
          animation: 'pulse 3s ease infinite',
          transition: 'background 600ms ease, border-color 600ms ease',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
          <span style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: isEmployer ? NAVY : TEAL, transition: 'color 600ms ease' }}>Built for the Employment Rights Act 2025</span>
        </div>

        {/* Logo mark: white "PRO" + jade "DICTA" on dark, navy "PRO" + jade
            "DICTA" on light. The agency view keeps a soft jade halo since it
            pops against navy; on the lighter employer hero the same blur
            softened the edges enough to read as faded, so it is removed. */}
        <div style={{
          marginTop: 4, marginBottom: 32,
          position: 'relative', zIndex: 1,
          opacity: 1,
          filter: isEmployer ? 'none' : `drop-shadow(0 0 24px ${TEAL}44)`,
          transition: 'filter 600ms ease',
        }}>
          <ProdictaLogo size={56} textColor={isEmployer ? NAVY : '#ffffff'} />
        </div>

        {/* Persona toggle */}
        <div style={{
          display: 'inline-flex', gap: 0, marginBottom: 28, position: 'relative', zIndex: 1,
          borderRadius: 50, border: `1.5px solid ${TEAL}`,
          overflow: 'hidden',
        }}>
          {[
            { key: 'agency', label: 'Recruitment Agencies', short: 'Agencies' },
            { key: 'employer', label: 'HR & Direct Employers', short: 'HR & Employers' },
          ].map(p => {
            const active = heroPersona === p.key
            return (
              <button
                key={p.key}
                onClick={() => setHeroPersona(p.key)}
                style={{
                  fontFamily: F, fontSize: 13, fontWeight: 700,
                  padding: '9px 22px',
                  background: active ? TEAL : 'transparent',
                  color: active ? '#fff' : TEAL,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.25s, color 0.25s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="pd-toggle-label-full">{p.label}</span>
                <span className="pd-toggle-label-short">{p.short}</span>
              </button>
            )
          })}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: F, fontWeight: 900, color: isEmployer ? NAVY : '#fff',
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(36px, 5.5vw, 66px)', letterSpacing: '-2px', lineHeight: 1.05,
          maxWidth: 820, marginBottom: 24,
          transition: 'color 600ms ease',
        }}>
          {heroPersona === 'agency' ? 'We tell you if a placement will fail' : 'We tell you if a hire will fail'}<br />
          <span style={{ color: isEmployer ? '#007F6E' : TEAL, textShadow: isEmployer ? 'none' : '0 0 40px rgba(0,191,165,0.35)', transition: 'color 600ms ease, text-shadow 600ms ease' }}>before you make it.</span>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: F, fontSize: 'clamp(18px, 2.2vw, 28px)', fontWeight: 600,
          color: isEmployer ? '#1f2d3d' : '#fff', lineHeight: 1.4,
          maxWidth: 660, marginBottom: 32, position: 'relative', zIndex: 1,
          transition: 'color 600ms ease',
        }}>
          {heroPersona === 'agency'
            ? 'Then we help you protect the fee.'
            : 'Then we help them perform from day one.'}
        </p>

        {/* Toggle subtext: dark slate body on light, soft white on dark */}
        <p style={{
          fontFamily: F, fontSize: 'clamp(14px, 1.5vw, 17px)', fontWeight: 500,
          color: isEmployer ? '#3a4a5e' : 'rgba(255,255,255,0.5)', lineHeight: 1.7,
          maxWidth: 620, marginBottom: 36, position: 'relative', zIndex: 1,
          minHeight: 72,
          transition: 'color 600ms ease',
        }}>
          {heroPersona === 'agency'
            ? "PRODICTA doesn't test personality or theory. We put candidates into real job situations and measure how they actually perform. Whether you place permanent hires or temps, you get evidence not guesswork. Real work simulations. Placement health in real time. SSP and compliance handled automatically. When something goes wrong you know at week one, not month four."
            : "PRODICTA doesn't test personality or theory. We put candidates into real job situations and measure how they actually perform. Whether you're hiring permanent staff or temporary cover, you get evidence not guesswork. Real work simulations. Probation tracking with ERA 2025 compliance built in. A 90-day coaching plan for every line manager so onboarding is structured, not improvised."}
        </p>

        {/* Fear line: amber on the dark agency hero (premium accent against navy);
            on the lighter employer hero amber clashes with the cool palette and
            reads like a warning, so we swap to bold navy for emphasis. */}
        <p style={{
          fontFamily: F, fontSize: 'clamp(13px, 1.3vw, 15px)', fontWeight: isEmployer ? 700 : 600,
          color: isEmployer ? NAVY : '#D97706', lineHeight: 1.6,
          maxWidth: 620, marginBottom: 28, position: 'relative', zIndex: 1,
          transition: 'color 600ms ease, font-weight 600ms ease',
        }}>
          {heroPersona === 'agency'
            ? 'Every failed placement costs you the fee, the relationship, and the rebate. PRODICTA stops that before it starts.'
            : 'Every bad hire costs between \u00A312,000 and \u00A330,000. Most hiring decisions still rely on interviews and gut feel. PRODICTA replaces guesswork with evidence before you commit.'}
        </p>

        {/* Proof points: pale cream cards with navy text and jade icons in employer view */}
        <div style={{
          display: 'flex', gap: isEmployer ? 20 : 28, justifyContent: 'center', flexWrap: 'wrap',
          marginBottom: 44, position: 'relative', zIndex: 1, maxWidth: 760,
          transition: 'gap 600ms ease',
        }}>
          {(heroPersona === 'agency' ? [
            { label: 'Perm and Temp', sub: 'One platform for every type of placement' },
            { label: 'Placement Health Score', sub: 'Know before the client calls' },
            { label: 'Full Compliance', sub: 'ERA 2025, SSP 2026, Fair Work Agency ready' },
          ] : [
            { label: 'Perm and Temp', sub: 'One platform for every type of hire' },
            { label: 'ERA 2025 protected', sub: 'Every decision documented automatically' },
            { label: 'Probation early warning', sub: 'Catch problems at week three not month four' },
          ]).map((pt, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              flex: '1 1 200px', maxWidth: 240,
              padding: isEmployer ? '14px 16px' : 0,
              background: isEmployer ? 'rgba(255,255,255,0.55)' : 'transparent',
              border: isEmployer ? `1px solid ${TEAL}33` : 'none',
              borderRadius: isEmployer ? 12 : 0,
              transition: 'padding 600ms ease, background 600ms ease, border-color 600ms ease',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: isEmployer ? NAVY : '#fff', lineHeight: 1.3, transition: 'color 600ms ease' }}>{pt.label}</div>
                <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 500, color: isEmployer ? '#46566b' : 'rgba(255,255,255,0.45)', lineHeight: 1.4, marginTop: 2, transition: 'color 600ms ease' }}>{pt.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, position: 'relative', zIndex: 1 }}>
          <a href="/demo" style={{
            fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
            background: TEAL, textDecoration: 'none',
            padding: '16px 40px', borderRadius: 12, display: 'inline-block',
            animation: 'ctaPulse 3s ease infinite',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.animation='none'; e.currentTarget.style.boxShadow=`0 12px 40px rgba(0,191,165,0.5)` }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.animation='ctaPulse 3s ease infinite'; e.currentTarget.style.boxShadow='' }}>
            See the demo
          </a>
          <a href="/login" style={{
            fontFamily: F, fontSize: 16, fontWeight: 600,
            color: isEmployer ? NAVY : '#fff',
            background: 'transparent', border: `1.5px solid ${NAVY}`,
            textDecoration: 'none', padding: '16px 40px', borderRadius: 12, display: 'inline-block',
            transition: 'background 0.15s, border-color 0.15s, color 600ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = isEmployer ? 'rgba(15,33,55,0.06)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = isEmployer ? NAVY : 'rgba(255,255,255,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=NAVY }}>
            Sign up
          </a>
        </div>

        {/* Report mockup */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 946, marginBottom: 64, zIndex: 1, overflow: 'hidden', borderRadius: 20 }}>
          {/* Jade glow behind mockup */}
          <div style={{ position: 'absolute', inset: '-48px -32px', borderRadius: 48, background: 'radial-gradient(ellipse at 50% 60%, rgba(0,191,165,0.15) 0%, transparent 68%)', pointerEvents: 'none' }} />
          <div style={{
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 30px 60px rgba(0,0,0,0.2)',
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
                <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.48)' }}>Senior Account Manager &middot; Completed 2 Apr 2026</div>
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
            <div style={{ background: '#fff', padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
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
        <div style={{
          position: 'relative', zIndex: 1, display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center',
          padding: '20px 32px',
          background: isEmployer ? 'rgba(15,33,55,0.04)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isEmployer ? 'rgba(15,33,55,0.10)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 14,
          transition: 'background 600ms ease, border-color 600ms ease',
        }}>
          {[
            { to: null, display: 'From £99', label: 'Per month' },
            { to: 4,   suffix: '',  label: 'Scenario types' },
            { to: null, display: '15-45 min', label: 'Assessment time' },
            { to: null, display: 'UK-built', label: 'For ERA 2025 compliance' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontFamily: FM, fontSize: 31, fontWeight: 700, color: isEmployer ? '#007F6E' : TEAL, letterSpacing: '-0.5px', lineHeight: 1, transition: 'color 600ms ease' }}>
                <StatNumber to={item.to} suffix={item.suffix} display={item.display} />
              </div>
              <div style={{ fontFamily: F, fontSize: 12, color: isEmployer ? '#46566b' : 'rgba(255,255,255,0.42)', marginTop: 5, whiteSpace: 'nowrap', transition: 'color 600ms ease' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.45 }}>
          <div style={{ fontFamily: F, fontSize: 11, color: isEmployer ? NAVY : '#fff', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 600ms ease' }}>Scroll</div>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isEmployer ? NAVY : '#fff'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </section>
      ) })()}

      <PressStrip />

      {/* ════════════════════════════════════════════════════════════════════
          PERSONA VALUE PROPOSITIONS
          Four-tab selector so visitors can self-identify and read the
          value prop that fits their market.
      ════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const PERSONAS = {
          agency_perm: {
            tab: 'Recruitment Agency, Permanent',
            heading: 'Stop losing fees to bad placements.',
            sub: 'PRODICTA tells you if a placement will fail before you make it. Give your clients evidence not CVs.',
            exciters: [
              { title: 'Placement Survival Score', body: 'A percentage that tells you exactly how likely this placement is to succeed. Impossible to ignore.' },
              { title: 'Day 1 Highlight Reel', body: 'A 60-second shareable video of how the candidate performed. No other agency is sending clients this.' },
              { title: 'Accountability Trail', body: 'Every risk documented. Every recommendation tracked. Your fees protected.' },
            ],
          },
          agency_temp: {
            tab: 'Recruitment Agency, Temporary and Contract',
            heading: 'Screen faster, place better, stay compliant.',
            sub: 'PRODICTA replaces candidate screening with a real work simulation, handles your SSP automatically, and catches no-shows before day one.',
            exciters: [
              { title: 'Ghosting Prevention Loop', body: 'Three automated pulses between offer and start. Catches silent no-shows before day one.' },
              { title: 'Pre-Start Risk Check', body: 'Know who is HIGH risk before they show up. Surface backup candidates instantly.' },
              { title: 'Replacement Trigger', body: 'When a placement fails PRODICTA finds your replacement before the client finishes their complaint.' },
            ],
          },
          employer_perm: {
            tab: {
              full: 'HR & Direct Employer, Permanent',
              tablet: 'HR & Direct Employer, Permanent',
              mobile: 'HR & Employer, Permanent',
            },
            heading: 'Hire with evidence not opinion.',
            sub: 'PRODICTA gives every hiring decision a documented, bias-free, legally defensible foundation. Protecting your business and your reputation.',
            exciters: [
              { title: 'Probation Co-pilot', body: 'Tracks every hire through probation with early warning alerts. Know before the problems start.' },
              { title: '90-Day Coaching Plan', body: 'A structured manager coaching plan for every new hire. Developed with Alchemy Training UK.' },
              { title: 'ERA 2025 Compliance Certificate', body: 'A legally defensible PDF for every assessment. Ready for any tribunal or investigation.' },
            ],
          },
          employer_temp: {
            tab: {
              full: 'HR & Direct Employer, Temporary and Contract',
              tablet: 'HR & Direct Employer, Temporary',
              mobile: 'HR & Employer, Temporary',
            },
            heading: 'Manage your contingent workforce from assessment to assignment end.',
            sub: 'PRODICTA screens at volume, tracks every placement in real time, and handles your Fair Work Agency compliance automatically.',
            exciters: [
              { title: 'Attendance Risk Signal', body: 'Catches reliability problems before the client complains. Not after.' },
              { title: 'SSP Automation', body: 'Handles sickness correctly under the new 2026 rules. Nothing falls through the cracks.' },
              { title: 'Fair Work Agency Compliance Pack', body: 'Full compliance documentation in one click. Every absence. Every check. Every record.' },
            ],
          },
        }
        const current = PERSONAS[personaTab] || PERSONAS.agency_perm
        const order = ['agency_perm', 'agency_temp', 'employer_perm', 'employer_temp']

        return (
          <section style={{
            background: PARCHMENT,
            padding: '78px 24px',
            borderTop: '1px solid rgba(15,33,55,0.08)',
            boxShadow: 'inset 0 12px 24px -16px rgba(15,33,55,0.10)',
          }}>
            <div style={{ maxWidth: 1080, margin: '0 auto' }}>
              <Reveal>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <span style={{
                    display: 'inline-block', padding: '5px 12px', borderRadius: 999,
                    background: '#ffffff', color: TEALD, border: `1px solid ${TEAL}55`,
                    fontFamily: F, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    marginBottom: 14,
                  }}>
                    Choose your market
                  </span>
                  <h2 style={{
                    fontFamily: F, fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800,
                    color: NAVY, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2,
                  }}>
                    Different buyers. Same proof engine.
                  </h2>
                </div>
              </Reveal>

              {/* Tab selector */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: 10, marginBottom: 32, maxWidth: 960, marginLeft: 'auto', marginRight: 'auto',
              }}>
                {order.map(key => {
                  const active = personaTab === key
                  const tab = PERSONAS[key].tab
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPersonaTab(key)}
                      style={{
                        padding: '12px 18px', borderRadius: 999,
                        border: `1.5px solid ${active ? NAVY : '#d1d5db'}`,
                        background: active ? NAVY : '#f1f5f9',
                        color: active ? '#ffffff' : '#475569',
                        fontFamily: F, fontSize: 13.5, fontWeight: 700,
                        cursor: 'pointer', textAlign: 'center',
                        transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease',
                      }}
                    >
                      {typeof tab === 'string' ? tab : (
                        <>
                          <span className="pd-tab-full">{tab.full}</span>
                          <span className="pd-tab-tablet">{tab.tablet}</span>
                          <span className="pd-tab-mobile">{tab.mobile}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Content area */}
              <div key={personaTab} style={{
                animation: 'personaFade 0.3s ease',
              }}>
                <style dangerouslySetInnerHTML={{ __html: `@keyframes personaFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}` }} />
                <div style={{ textAlign: 'center', marginBottom: 28, maxWidth: 820, margin: '0 auto 28px' }}>
                  <h3 style={{
                    fontFamily: F, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 800,
                    color: NAVY, margin: '0 0 12px', letterSpacing: '-0.4px', lineHeight: 1.25,
                  }}>
                    {current.heading}
                  </h3>
                  <p style={{
                    fontFamily: F, fontSize: 'clamp(15px, 1.5vw, 17px)', fontWeight: 400,
                    color: '#475569', margin: 0, lineHeight: 1.6,
                  }}>
                    {current.sub}
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                  gap: 16,
                }}>
                  {current.exciters.map((e, i) => (
                    <div key={i} style={{
                      background: '#ffffff',
                      border: '1px solid rgba(15,33,55,0.08)',
                      borderLeft: `4px solid ${TEAL}`,
                      borderRadius: 12, padding: '22px 24px',
                      boxShadow: '0 6px 18px rgba(15,33,55,0.08), 0 1px 3px rgba(15,33,55,0.04)',
                    }}>
                      <h4 style={{
                        fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
                        margin: '0 0 8px', letterSpacing: '-0.2px',
                      }}>
                        {e.title}
                      </h4>
                      <p style={{
                        fontFamily: F, fontSize: 14, color: '#475569',
                        margin: 0, lineHeight: 1.6,
                      }}>
                        {e.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* ════════════════════════════════════════════════════════════════════
          PROOF STATEMENT
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: NAVY, padding: '64px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: F, fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 400,
          color: 'rgba(255,255,255,0.7)', margin: '0 auto 12px',
          maxWidth: 700, lineHeight: 1.35, letterSpacing: '-0.5px',
        }}>
          Most hiring decisions are based on opinion.
        </p>
        <p style={{
          fontFamily: F, fontSize: 'clamp(24px, 3.2vw, 38px)', fontWeight: 800,
          color: TEAL, margin: '0 auto',
          maxWidth: 700, lineHeight: 1.25, letterSpacing: '-0.5px',
        }}>
          PRODICTA gives you proof.
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
 PROBLEM, The cost of getting hiring wrong
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f8f9fb', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>The problem</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                What a CV and an interview will never tell you
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 480, margin: '16px auto 0' }}>
                Whether they will actually succeed in the role.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              {
                stat: '£30,000–£50,000+',
                label: 'Cost of a bad hire (REC benchmarks)',
                body: 'REC reports a typical bad hire costs between £30,000 and £50,000. Mid-management failures can exceed £100,000. CIPD data shows average cost per hire is £6,000 for general roles and £19,000 for manager-level positions. Even small improvements in hiring accuracy reduce cost, protect revenue, and improve retention.',
                accent: '#EF4444',
              },
              {
                stat: '0.18',
                label: 'Predictive value of years of experience',
                body: 'Schmidt and Hunter’s meta-analysis (1998; updated 2016) shows years of experience has weak predictive power for job performance. Education level scores even lower at 0.10. CVs and interviews tell you what someone has done, not how they will perform. PRODICTA measures observed behaviour in realistic job scenarios.',
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
                  {card.link && (
                    <a href={card.link.href} style={{ display: 'inline-block', marginTop: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: TEAL, textDecoration: 'none', borderBottom: `1px solid ${TEAL}40`, paddingBottom: 1, transition: 'border-color 0.2s' }}
                      onMouseEnter={e => e.target.style.borderColor=TEAL} onMouseLeave={e => e.target.style.borderColor=`${TEAL}40`}
                    >{card.link.text}</a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <a href="/science" style={{
              fontFamily: F, fontSize: 14, fontWeight: 700, color: TEAL,
              textDecoration: 'none', borderBottom: `1px solid ${TEAL}55`,
              paddingBottom: 2, transition: 'border-color 0.2s, color 0.2s',
            }}
              onMouseEnter={e => { e.target.style.borderColor = TEAL; e.target.style.color = TEALD }}
              onMouseLeave={e => { e.target.style.borderColor = `${TEAL}55`; e.target.style.color = TEAL }}
            >
              Read the science behind PRODICTA →
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CV VS PRODICTA COMPARISON
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(180deg, #0f2137 0%, #1a3a5c 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>See the difference</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2, margin: 0 }}>
                What a CV tells you vs what PRODICTA reveals
              </h2>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="cv-vs-prodicta" style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', gap: '0 16px', alignItems: 'center' }}>

 {/* LEFT, Traditional CV */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: '32px 28px', opacity: 0.6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>Traditional CV</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    '5 years experience in account management',
                    'Strong communication and leadership skills',
                    'Proven track record of exceeding targets',
                    'Excellent team player with attention to detail',
                  ].map((line, i) => (
                    <div key={i} style={{ borderLeft: '2px solid rgba(255,255,255,0.12)', paddingLeft: 14, fontFamily: F, fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                  Generic. Unverified. Every CV says this.
                </div>
              </div>

 {/* CENTRE, Arrow */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>

 {/* RIGHT, PRODICTA assessment */}
              <div style={{
                background: 'rgba(0,191,165,0.06)', border: `1.5px solid ${TEAL}55`,
                borderRadius: 16, padding: '32px 28px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${TEAL}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: '#fff' }}>PRODICTA assessment</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
 {/* Card 1, jade */}
                  <div style={{ borderLeft: `3px solid ${TEAL}`, background: 'rgba(0,191,165,0.08)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Communication scored 88</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>but avoids difficult conversations under pressure</div>
                  </div>
 {/* Card 2, amber watch-out */}
                  <div style={{ borderLeft: '3px solid #E8B84B', background: 'rgba(232,184,75,0.08)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: '#E8B84B', background: 'rgba(232,184,75,0.18)', border: '1px solid rgba(232,184,75,0.4)', borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watch-out · High</span>
                    </div>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Delegation reluctance: scored 52</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Relies on doing everything personally rather than distributing work</div>
                  </div>
 {/* Card 3, red risk */}
                  <div style={{ borderLeft: '3px solid #EF4444', background: 'rgba(239,68,68,0.08)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>If ignored</span>
                    </div>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff' }}>Missed deadlines within 60 days</div>
                  </div>
 {/* Card 4, jade probability */}
                  <div style={{ borderLeft: `3px solid ${TEAL}`, background: 'rgba(0,191,165,0.08)', borderRadius: '0 8px 8px 0', padding: '12px 16px' }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>72% chance of passing probation</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>Likely to pass with structured onboarding plan</div>
                  </div>
                </div>
                <div style={{ fontFamily: F, fontSize: 12, color: TEAL, fontWeight: 600 }}>
                  Specific. Evidence-based. Actionable.
                </div>
              </div>
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal delay={150}>
            <div style={{ textAlign: 'center', marginTop: 56 }}>
              <a
                href="/login"
                style={{
                  display: 'inline-block', background: TEAL, color: NAVY,
                  fontFamily: F, fontSize: 16, fontWeight: 800,
                  padding: '16px 40px', borderRadius: 10, textDecoration: 'none',
                  boxShadow: `0 4px 20px ${TEAL}55`, transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${TEAL}66` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 20px ${TEAL}55` }}
              >
                Start assessing candidates
              </a>
              <div style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
                From just £99/month with a £49 first-month introductory price. No long setup. First assessment in 5 minutes.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PRESSURE-FIT MANIFESTO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: NAVY,
        padding: '80px 24px',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}08 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <Reveal>
            <div style={{ fontFamily: F, fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 900, color: TEAL, lineHeight: 1, marginBottom: 8 }}>&ldquo;</div>
            <h2 style={{
              fontFamily: F, fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900,
              color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: 24,
            }}>
              We test <span style={{ color: TEAL }}>pressure-fit</span>, not interview polish.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p style={{
              fontFamily: F, fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 400,
              color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto',
            }}>
              Interviews test how someone talks about pressure. PRODICTA tests whether they can actually hold up under it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: '#f1f3f5', padding: '72px 24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .hiw-steps {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0;
            position: relative;
          }
          .hiw-connector {
            position: absolute;
            top: 31px;
            left: 12.5%;
            right: 12.5%;
            height: 0;
            border-top: 2px dashed rgba(0,191,165,0.35);
            z-index: 0;
          }
          .hiw-step {
            text-align: center;
            padding: 0 28px;
            position: relative;
            z-index: 1;
            transition: transform 0.3s ease;
          }
          .hiw-step:hover {
            transform: translateY(-3px);
          }
          .hiw-step-circle {
            width: 62px;
            height: 62px;
            border-radius: 50%;
            background: ${TEAL};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 28px;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 22px;
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
              top: 62px;
              left: 30px;
              width: 2px;
              bottom: 0;
              background: linear-gradient(to bottom, ${TEAL}55, transparent);
            }
            .hiw-step:last-child::after { display: none; }
          }
        ` }} />
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 80 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>How it works</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 18 }}>
                From job description to hiring decision in minutes
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
                No personality tests. No theory. Real work simulations that show you exactly who will succeed.
              </p>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div style={{
              maxWidth: 760, margin: '0 auto 40px',
              background: '#fff', border: `1.5px solid ${TEAL}33`, borderRadius: 14,
              padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(15,33,55,0.05)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: F, fontSize: 32, fontWeight: 800, color: TEAL, lineHeight: 1 }}>Under 1 hour</div>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>With PRODICTA</div>
              </div>
              <div style={{ fontFamily: F, fontSize: 14, color: '#94a1b3', fontWeight: 600 }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: F, fontSize: 32, fontWeight: 800, color: '#94a1b3', lineHeight: 1 }}>3 to 4 weeks</div>
                <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: '#94a1b3', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Traditional process</div>
              </div>
              <div style={{ flexBasis: '100%', textAlign: 'center', fontFamily: F, fontSize: 13, color: '#6b7a90', marginTop: 4 }}>
                From job description to hiring decision.
              </div>
            </div>
          </Reveal>

          <div style={{ position: 'relative' }}>
            <div className="hiw-connector" />
            <div className="hiw-steps">
              {[
                {
                  n: 1,
                  title: 'Paste your job description',
                  body: 'PRODICTA reads every detail. The company, the targets, the team, the pressure points. Then asks you 3 to 4 sharp questions about what really matters in this role. Whether you are a recruiter briefing a client vacancy, an HR team filling an internal role, or a hiring manager replacing a leaver, PRODICTA builds an assessment tailored to exactly what success looks like in this specific position.',
                },
                {
                  n: 2,
                  title: 'Choose your assessment depth',
                  body: 'Speed-Fit for urgent hires and high-volume roles. Depth-Fit for most positions. Strategy-Fit for senior or high-stakes hires. PRODICTA recommends the right depth based on the role level. Recruiters filling multiple roles get speed. Employers hiring for critical positions get depth. Every scenario is built from the actual job description, not a generic template.',
                },
                {
                  n: 3,
                  title: 'Candidates complete real work simulations',
                  body: 'No personality tests. No tick-box questionnaires. Candidates face the exact situations they would face in their first 90 days. A difficult stakeholder. Competing deadlines. A team that needs managing. Whether you are assessing a customer service advisor or a finance director, the scenarios match the role. How they respond tells you more than any interview ever could.',
                  pill: '100% mobile optimised',
                },
                {
                  n: 4,
                  title: 'Get a report that changes how you hire',
                  body: 'Everything you need to make the right call. A clear score. An honest assessment of how they work under pressure. Where the risks are. What their first 90 days will actually look like. The questions to ask before you commit. And a plan to set them up for success from day one. One report. Clear, specific, and backed by evidence from real work.',
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div className="hiw-step">
                    <div className="hiw-step-circle">{s.n}</div>
                    <div>
                      <h3 style={{ fontFamily: F, fontSize: 15.5, fontWeight: 700, color: NAVY, marginBottom: 10, letterSpacing: '-0.2px' }}>{s.title}</h3>
                      {s.pill && (
                        <div style={{
                          display: 'inline-block', fontFamily: F, fontSize: 11, fontWeight: 700,
                          color: TEAL, background: `${TEAL}18`, border: `1px solid ${TEAL}55`,
                          borderRadius: 20, padding: '3px 10px', marginBottom: 10,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {s.pill}
                        </div>
                      )}
                      <p style={{ fontFamily: F, fontSize: 13.5, color: '#6b7a90', lineHeight: 1.75, margin: 0 }}>{s.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={120}>
            <div style={{
              maxWidth: 760, margin: '48px auto 0',
              background: '#fff', border: `1.5px solid ${TEAL}33`, borderRadius: 14,
              padding: '20px 26px', display: 'flex', alignItems: 'flex-start', gap: 16,
              boxShadow: '0 4px 18px rgba(15,33,55,0.05)',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                fontFamily: F, fontSize: 10.5, fontWeight: 800, color: TEAL,
                background: `${TEAL}18`, border: `1px solid ${TEAL}55`, borderRadius: 50,
                padding: '4px 11px', textTransform: 'uppercase', letterSpacing: '0.06em',
                flexShrink: 0,
              }}>
                Strategy-Fit
              </div>
              <p style={{ fontFamily: F, fontSize: 13.5, color: '#5e6b7f', lineHeight: 1.7, margin: 0 }}>
                Strategy-Fit assessments for senior hires include additional immersive layers: Day One Planning, Inbox Overload simulation, and the Virtual Job Tryout Workspace.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW PRODICTA WORKS (PRODICTA Placement Intelligence Model)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="placement-intelligence" style={{ background: '#fff', padding: '72px 24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .ppim-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 20px;
          }
          @media (max-width: 960px) {
            .ppim-grid { grid-template-columns: 1fr; gap: 14px; }
          }
          .ppim-step {
            background: #f8fafb;
            border: 1px solid #e4e9f0;
            border-radius: 14px;
            padding: 24px 22px;
            transition: transform 0.2s ease, border-color 0.2s ease;
          }
          .ppim-step:hover {
            transform: translateY(-3px);
            border-color: ${TEAL}55;
          }
          .ppim-num {
            display: inline-flex; align-items: center; justify-content: center;
            width: 36px; height: 36px; border-radius: 10px;
            background: ${TEAL}; color: ${NAVY};
            font-family: 'IBM Plex Mono', monospace;
            font-size: 15px; font-weight: 800;
            margin-bottom: 14px;
          }
        ` }} />
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                How PRODICTA Works
              </div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
                The PRODICTA Placement Intelligence Model
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 720, margin: '0 auto' }}>
                Four layers that turn a candidate response into an evidence-based hiring decision.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="ppim-grid">
              {[
                { n: '1', title: 'Behavioural Simulation', body: 'Candidates complete role-specific work simulations built from your job description. Every scenario reflects a real situation they will face in their first 90 days.' },
                { n: '2', title: 'Anchored Scoring',       body: 'Responses are scored against predefined behavioural anchors, not AI opinion. Each dimension has a fixed standard for high, medium, and low performance.' },
                { n: '3', title: 'Role Calibration',       body: 'Scores are weighted for your specific role family. A warehouse operative and a finance director are not measured against the same model.' },
                { n: '4', title: 'Placement Intelligence', body: 'Every insight is traceable to something the candidate actually did. Watch-outs come with evidence. Strengths come with proof. The verdict comes with a confidence level.' },
              ].map(step => (
                <div key={step.n} className="ppim-step">
                  <div className="ppim-num">{step.n}</div>
                  <h3 style={{ fontFamily: F, fontSize: 17, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontFamily: F, fontSize: 14, color: '#4a5568', margin: 0, lineHeight: 1.65 }}>
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <p style={{
              fontFamily: F, fontSize: 16, color: TEAL, fontStyle: 'italic',
              textAlign: 'center', marginTop: 36, marginBottom: 0, fontWeight: 600,
            }}>
              This is not AI guesswork. This is evidence-based placement intelligence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Pricing</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
                Simple, transparent pricing
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7 }}>Transparent pricing. No hidden fees.</p>

              {/* Pricing toggle */}
              <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 10, padding: 3, marginTop: 20 }}>
                {['subscription', 'payg'].map(m => (
                  <button key={m} onClick={() => setPricingMode(m)} style={{
                    padding: '8px 22px', borderRadius: 8, fontFamily: F, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    background: pricingMode === m ? NAVY : 'transparent', color: pricingMode === m ? '#fff' : '#5e6b7f',
                    border: 'none', transition: 'all 0.2s',
                  }}>
                    {m === 'subscription' ? 'Monthly subscription' : 'Pay as you go'}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Pay as you go */}
          {pricingMode === 'payg' && (
            <>
              <Reveal>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>No commitment. Pay per assessment.</h3>
                  <p style={{ fontFamily: F, fontSize: 15, color: '#5e6b7f', margin: 0 }}>Perfect for occasional hiring or trying PRODICTA before subscribing.</p>
                </div>
              </Reveal>
              <Reveal>
                <p style={{
                  textAlign: 'center', fontFamily: F, fontSize: 14, color: '#5e6b7f',
                  maxWidth: 680, margin: '0 auto 32px', lineHeight: 1.6,
                }}>
 The higher the assessment level the more detailed the report. Rapid Screen gives a quick signal, Speed-Fit and above give the full picture.
                </p>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, alignItems: 'start', marginBottom: 20 }}>
                {[
                  {
                    name: 'Rapid Screen', price: '£6',
                    time: '5-8 minutes · 1 scenario',
                    desc: 'A 5-8 minute work simulation. 1 scenario. Gives a Strong Proceed, Interview Worthwhile, or High Risk signal with a Placement Survival Score, top strengths, and key watch-outs. No full narrative report.',
                  },
                  {
                    name: 'Speed-Fit', price: '£18',
                    time: '15 minutes · 2 scenarios',
                    desc: 'A 15 minute assessment with 2 work scenarios and a full scored report including strengths, watch-outs with Week 1 interventions, skills breakdown, and interview brief. Recommended for most roles.',
                    highlight: true,
                  },
                  {
                    name: 'Depth-Fit', price: '£35',
                    time: '25 minutes · 3 scenarios',
                    desc: 'A 25 minute deep assessment with 3 work scenarios and a full narrative report, detailed competency breakdown, Monday Morning Reality, counter-offer resilience score, and tailored coaching notes.',
                  },
                  {
                    name: 'Strategy-Fit', price: '£65',
                    time: '45 minutes · 4 scenarios + Workspace',
                    desc: 'A 45 minute leadership assessment with 4 work scenarios, a Day 1 workspace simulation, full narrative report, strategic thinking evaluation, stakeholder management brief, and executive summary.',
                  },
                ].map((p, i) => (
                  <Reveal key={p.name} delay={i * 80}>
                    <div style={{
                      background: p.highlight ? NAVY : '#fff', borderRadius: 18, padding: '36px 30px',
                      border: p.highlight ? `2px solid ${TEAL}` : '1px solid #e4e9f0',
                      boxShadow: p.highlight ? `0 16px 48px ${TEAL}22` : '0 2px 8px rgba(15,33,55,0.05)',
                    }}>
                      <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 6 }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
                        <span style={{ fontFamily: FM, fontSize: 40, fontWeight: 700, color: p.highlight ? '#fff' : NAVY, letterSpacing: '-1px' }}>{p.price}</span>
                        <span style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.45)' : '#94a1b3' }}>per assessment</span>
                      </div>
                      <div style={{ fontFamily: F, fontSize: 12.5, color: TEAL, fontWeight: 600, marginBottom: 10 }}>{p.time}</div>
                      <p style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.5)' : '#6b7280', lineHeight: 1.55, marginBottom: 26 }}>{p.desc}</p>
                      <a href="/login" style={{
                        display: 'block', width: '100%', padding: '13px 0', borderRadius: 10, boxSizing: 'border-box',
                        background: p.highlight ? TEAL : 'transparent', border: p.highlight ? 'none' : `1.5px solid ${TEAL}`,
                        color: p.highlight ? NAVY : TEAL, fontFamily: F, fontSize: 14, fontWeight: 700,
                        textDecoration: 'none', textAlign: 'center',
                      }}>
                        Buy credits
                      </a>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <p style={{ textAlign: 'center', fontFamily: F, fontSize: 14, color: '#5e6b7f', lineHeight: 1.6, maxWidth: 640, margin: '0 auto' }}>
                  Add <strong style={{ color: NAVY }}>Immersive</strong> to Rapid Screen, Speed-Fit, or Depth-Fit for <strong style={{ color: TEAL }}>£25 extra</strong>, a Day 1 Workspace Simulation plus a 60-second Highlight Reel you can share with your client in one click. Strategy-Fit already includes the workspace, add the Highlight Reel only for <strong style={{ color: TEAL }}>£10 extra</strong>.
                </p>
              </Reveal>
            </>
          )}

          {pricingMode === 'subscription' && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
            {[
              {
                name: 'Starter',
                price: '£99',
                promo: 'First 30 days: £49 then £99/month',
                limit: '10 assessments/mo · Up to 2 users',
                desc: 'For small teams getting started with AI assessment.',
                features: ['10 assessments per month', 'Up to 2 users, extra £35/user/month', 'AI scenario generation', 'Pressure-Fit scoring', 'Response integrity check', 'Watch-outs and interview questions', 'Workspace simulation included free with Strategy-Fit', 'Workspace simulation £25 add-on per Speed-Fit or Depth-Fit', 'All features included'],
                highlight: false,
              },
              {
                name: 'Professional',
                price: '£299',
                promo: 'First 30 days: £149 then £299/month',
                limit: '30 assessments/mo · Up to 5 users',
                desc: 'For growing teams hiring at volume.',
                features: ['30 assessments per month', 'Up to 5 users, extra £35/user/month', 'Everything in Starter', 'Candidate comparison', 'Benchmarking tools', 'Archive and outcomes tracking', 'Workspace simulation included free with Strategy-Fit', 'Workspace simulation £25 add-on per Speed-Fit or Depth-Fit', 'All features included'],
                highlight: false,
              },
              {
                name: 'Business',
                price: '£499',
                promo: 'First 30 days: £249 then £499/month',
                limit: '100 assessments/mo · Up to 15 users',
                desc: 'For high-volume hiring and recruitment agencies.',
                features: ['100 assessments per month', 'Up to 15 users, extra £35/user/month', 'Everything in Professional', 'Agency features', 'Placement risk scores', 'Document upload and send', 'FREE unlimited Workspace simulation on Strategy-Fit assessments', 'Workspace simulation £25 add-on per Speed-Fit or Depth-Fit', 'All features included'],
                highlight: true,
                badge: 'BEST VALUE',
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
                  <div style={{ fontFamily: F, fontSize: 12.5, color: TEAL, fontWeight: 600, marginBottom: 6 }}>{p.limit}</div>
                  {p.promo && (
                    <div style={{
                      fontFamily: F, fontSize: 12, fontWeight: 700,
                      color: p.highlight ? 'rgba(255,255,255,0.85)' : NAVY,
                      background: p.highlight ? 'rgba(0,191,165,0.18)' : '#FFFBF0',
                      border: `1px solid ${p.highlight ? 'rgba(0,191,165,0.35)' : '#F5E1A4'}`,
                      padding: '6px 10px', borderRadius: 6, marginBottom: 12,
                      display: 'inline-block',
                    }}>
                      {p.promo}
                    </div>
                  )}
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
          </>}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOR AGENCIES / FOR EMPLOYERS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="who-its-for" style={{ background: '#fff', padding: '72px 24px', scrollMarginTop: 84 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Who it's for</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                Built for three types of hiring professional
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 24, alignItems: 'stretch' }}>
            {[
              {
                tag: 'For Recruitment Agencies',
                headline: 'Place faster. Protect every placement.',
                sub: 'One platform for permanent, temporary, and contract placements. From first assessment to final day.',
                points: [
 'Real work simulations, Every candidate assessed on the actual situations they will face in the role. Perm or temp. Not a personality test.',
 'Day 1 Highlight Reel, Send clients a 60-second video of how the candidate performed. No other agency offers that.',
 'Placement Health Score, Live traffic light dashboard for every active placement. Amber alert before the client calls. Never be the one who did not see it coming.',
 'ERA 2025 and Fair Work Agency ready, Compliance documentation generated automatically for every perm hire and every temp placement.',
 'Full SSP Management, Eligibility checker, payment calculator, compliance pack. 2026 rules built in. Nothing falls through the cracks.',
 'Works on your phone, Log attendance, report sickness, check placements on the go. Installs as an app on any phone or desktop.',
                ],
                more: 'And so much more. Rapid Screen at \u00A36, Replacement Trigger, Attendance Risk Signal, Client Visibility Layer, Document Templates, Holiday Pay Tracker, Assignment Review Tracker, and more.',
                bg: NAVY,
                dark: true,
                href: '/login',
              },
              {
                tag: 'For HR Teams',
                headline: 'Defensible decisions. Consistent process.',
                sub: 'Internal HR and Talent teams need evidence, not opinion. PRODICTA gives you both.',
                points: [
 'Real work simulations, built from the actual role. Every candidate experiences the same fair Day 1 pressure, regardless of who interviewed them.',
 'ERA 2025 audit trail, every hiring decision documented with the evidence behind it. Defensible at tribunal from day one.',
 '90-day coaching plans for line managers, onboarding becomes structured, not improvised. Every new hire supported through probation.',
 'Bias-Free Hiring built in, Equality Act 2010 and Fair Work Agency 2026 compliance handled automatically. Equal experience for every candidate.',
 'Team management, invite coordinators, business partners, and directors. Clear roles and permissions. See activity across the whole HR function.',
 'Drill-down by role and team, see how hires are performing by role, team, location, or hiring manager. Spot patterns before they become problems.',
                ],
                more: 'And so much more. Manager DNA Assessment, Highlight Reels, Probation Timeline Tracker with ERA 2025 danger line, Team Dynamics, Outcome Tracking, Candidate Development Portal, and more.',
                bg: '#1f3450',
                dark: true,
                href: '/signup?account=hr',
              },
              {
                tag: 'For Direct Employers',
                headline: 'Hire with evidence. Protect every decision.',
                sub: 'Most hiring decisions are based on opinion. PRODICTA gives you proof.',
                points: [
 'Real work simulations, Built from the role itself. Not a personality test. See exactly how candidates perform under real pressure before you commit.',
 'ERA 2025 protected, Every hiring decision documented automatically. Legally defensible from day one with no qualifying period.',
 'Probation early warning, Detects when a hire is deviating from predictions at week three. Not month four when it is too late.',
 'SSP and holiday compliance, 2026 SSP rules built in. Holiday pay records kept for 6 years automatically. Fair Work Agency ready.',
 'Document templates, Probation letters, family leave acknowledgements, SSP forms. Pre-filled from the candidate profile. Built to current legislation.',
 'Perm, temp and contract, One platform whether you hire permanently or use temporary and contract workers. Same evidence. Same protection.',
                ],
                more: 'And so much more. Manager DNA Assessment, Team Dynamics, Probation Co-pilot, Outcome Tracking, Candidate Development Portal, Rejected Candidate Development Plan, and more.',
                bg: '#f0fdf8',
                dark: false,
                href: '/login',
              },
            ].map((col, i) => (
              <Reveal key={col.tag} delay={i * 100}>
                <div style={{
                  background: col.bg, borderRadius: 20, padding: 'clamp(24px, 4vw, 44px) clamp(20px, 3.5vw, 40px)',
                  height: '100%', border: col.dark ? 'none' : `1px solid ${TEAL}30`,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(15,33,55,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                  <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>{col.tag}</div>
                  <h3 style={{ fontFamily: F, fontSize: 'clamp(20px, 2vw, 26px)', fontWeight: 800, color: col.dark ? '#fff' : NAVY, letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 10 }}>{col.headline}</h3>
                  <p style={{ fontFamily: F, fontSize: 14.5, color: col.dark ? 'rgba(255,255,255,0.5)' : '#5e6b7f', lineHeight: 1.65, marginBottom: 28 }}>{col.sub}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {col.points.map(p => {
                      const dash = p.indexOf(' \u2014 ')
 const emIdx = p.indexOf(', ')
                      const splitAt = dash > -1 ? dash : emIdx
                      const title = splitAt > -1 ? p.slice(0, splitAt) : p
                      const desc = splitAt > -1 ? p.slice(splitAt + 3) : ''
                      return (
                        <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <Check color={TEAL} size={15} />
                          <span style={{ fontFamily: F, fontSize: 14, color: col.dark ? 'rgba(255,255,255,0.85)' : '#374151', lineHeight: 1.6 }}>
                            <strong>{title}</strong>{desc ? ` \u2014 ${desc}` : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {col.more && (
                    <p style={{ fontFamily: F, fontSize: 12.5, fontStyle: 'italic', color: col.dark ? 'rgba(255,255,255,0.35)' : '#94a1b3', lineHeight: 1.6, marginTop: 20, marginBottom: 0 }}>
                      {col.more}
                    </p>
                  )}
                  <div style={{ marginTop: 28 }}>
                    <a href={col.href} style={{
                      display: 'inline-block', fontFamily: F, fontSize: 14, fontWeight: 700,
                      color: col.dark ? NAVY : '#fff',
                      background: TEAL,
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
 FEATURES, 2×3 grid
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(180deg, #0f2137 0%, #1a3a5c 100%)', padding: '72px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}0a 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Features</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 14 }}>
                Test how they work. Not how they interview.
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
                Designed for UK employers, HR teams, and recruitment agencies.
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {[
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                title: 'How they handle the hard days',
                body: "Find out how candidates handle conflicting priorities, difficult conversations, and tight deadlines. The number one predictor of whether someone will pass probation.",
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/></svg>,
                title: 'Are their answers genuine?',
                body: 'Know whether candidates wrote their own answers or had help. Timing analysis, consistency checks, and authenticity scoring give you confidence before you invest further.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><path d="M12 8v4l3 3"/></svg>,
                title: 'Scored across the skills that matter',
                body: 'Four skill dimensions scored with detailed evidence. Every strength and concern is traced back to what the candidate actually wrote.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={20} x2={18} y2={10}/><line x1={12} y1={20} x2={12} y2={4}/><line x1={6} y1={20} x2={6} y2={14}/></svg>,
                title: 'Compare Candidates',
                body: 'See your candidates side by side. Who scores highest, who handles pressure best, who is the strongest fit for this specific role.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: 'Equality Act Compliant',
                body: 'Scenario-based assessments that are fair, objective, and anonymous. No candidate is penalised for spelling, grammar, or writing style. Documented and defensible.',
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: 'A plan for their first six weeks',
                body: "Every report includes a structured onboarding plan tailored to this candidate's specific gaps. Hand it to the line manager on day one.",
              },
              {
                icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={5} y={2} width={14} height={20} rx={2} ry={2}/><line x1={12} y1={18} x2={12} y2={18}/></svg>,
                title: 'Mobile Optimised',
                body: 'Candidates complete assessments on any device. No app to download. Perfect for sectors where candidates are rarely at a desk, from care workers to site managers.',
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div style={{
                  padding: '32px 30px', borderRadius: 12,
                  border: '1px solid rgba(0,191,165,0.15)',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                  height: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(0,191,165,0.4)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0,191,165,0.08)'
                  e.currentTarget.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(0,191,165,0.15)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 11, marginBottom: 20,
                    background: `${TEAL}28`, border: `1px solid ${TEAL}50`,
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
          BUILT FOR EVERY ROLE
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f8f9fb', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Every level, every role</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.18, marginBottom: 14 }}>
                Built for every role, not just senior hires.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
              {[
                { label: 'Customer Service Advisor', icon: 'headphones' },
                { label: 'Care Worker',              icon: 'heart' },
                { label: 'Accounts Assistant',       icon: 'calculator' },
                { label: 'Sales Executive',          icon: 'trending' },
                { label: 'Operations Manager',       icon: 'settings' },
                { label: 'Finance Director',         icon: 'briefcase' },
              ].map(role => (
                <div key={role.label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#fff', border: `1.5px solid ${TEAL}33`,
                  borderRadius: 50, padding: '10px 18px',
                  boxShadow: '0 2px 8px rgba(15,33,55,0.04)',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, display: 'inline-block' }} />
                  <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>{role.label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={140}>
            <p style={{
              fontFamily: F, fontSize: 16, color: '#5e6b7f', lineHeight: 1.75,
              maxWidth: 780, margin: '0 auto', textAlign: 'center',
            }}>
              Every role gets scenarios built from the actual job description. A care worker gets a safeguarding scenario. A receptionist gets a multitasking scenario. A director gets a strategic scenario. PRODICTA adapts to the role, not the other way around.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MARKET GROWTH STAT
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #0f2137 0%, #1a3a5c 100%)',
        padding: '72px 24px',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <Reveal>
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: FM, fontSize: 'clamp(72px, 10vw, 120px)', fontWeight: 900, color: TEAL, lineHeight: 1, letterSpacing: '-3px', textShadow: `0 0 60px ${TEAL}40` }}>84%</div>
              <div style={{ fontFamily: F, fontSize: 'clamp(16px, 2vw, 20px)', fontWeight: 600, color: NAVY, marginTop: 12, letterSpacing: '-0.3px' }}>
                of recruitment leaders expect sales growth in 2026
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.5vw, 40px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 24 }}>
              The market is growing. The smart agencies are investing.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p style={{ fontFamily: F, fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: 640, margin: '0 auto' }}>
              84% of recruitment leaders expect growth in 2026. The agencies that win will not be the ones sending the most CVs. They will be the ones sending the best evidence. One PRODICTA assessment gives your client more insight than three rounds of interviews.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SAMPLE REPORT PREVIEW
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f1f3f5', padding: '72px 24px' }}>
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
            <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 30px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
              {/* Browser chrome */}
              <div style={{ background: '#1e293b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {['#EF4444', '#F59E0B', '#22C55E'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
                <div style={{ flex: 1, background: '#334155', borderRadius: 6, padding: '5px 14px', marginLeft: 8, maxWidth: 300 }}>
                  <span style={{ fontFamily: FM, fontSize: 11, color: '#94a3b8' }}>prodicta.co.uk/assessment/...</span>
                </div>
              </div>

              {/* Report body */}
              <div style={{ background: NAVY, padding: '28px 32px' }}>

                {/* Candidate header strip */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Assessment Report</div>
                    <div style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 3 }}>Alex Johnson</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>Senior Account Manager &middot; Completed 2 Apr 2026</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: `conic-gradient(${TEAL} 0% 82%, rgba(255,255,255,0.1) 82%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: FM, fontSize: 15, fontWeight: 800, color: TEAL }}>82</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: F, fontSize: 11, color: TEAL, fontWeight: 700 }}>Strong Hire</div>
                      <div style={{ fontFamily: F, fontSize: 10, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>Top 18%</div>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>Strengths</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {[
                      { title: 'Clear stakeholder communication', body: 'Consistently structured responses around audience needs. Adapted tone for different scenarios.' },
                      { title: 'Commercial awareness', body: 'Strong grasp of revenue impact and client retention priorities.' },
                    ].map(s => (
                      <div key={s.title} style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.5)', borderLeft: '3px solid #22C55E', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                          <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{s.title}</span>
                        </div>
                        <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Watch-outs */}
                <div>
                  <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>Watch-outs</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {[
                      { title: 'Delegation hesitancy', body: 'Showed reluctance to distribute tasks. May become a bottleneck in senior roles.', color: '#EF4444', borderRgba: 'rgba(239,68,68,0.5)', bg: 'rgba(239,68,68,0.07)' },
                      { title: 'Time pressure response', body: 'Quality dropped noticeably under tight deadlines. Responses became less structured.', color: '#F59E0B', borderRgba: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.07)' },
                    ].map(w => (
                      <div key={w.title} style={{ background: w.bg, border: `1px solid ${w.borderRgba}`, borderLeft: `3px solid ${w.color}`, borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{w.title}</span>
                        </div>
                        <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{w.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f8f9fb', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>What people say</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                Trusted by hiring professionals
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              {
                quote: "We used to rely on gut feel and interviews. PRODICTA showed us things in 45 minutes that took three months of probation to find out the hard way. It is now part of every hire we make.",
                name: 'Sarah Mitchell',
                role: 'HR Director',
                company: 'Manufacturing, 200 employees',
              },
              {
                quote: "Our clients ask for PRODICTA reports now. It sets us apart from every other agency they use. We send candidates with evidence, not just a CV and a cover letter.",
                name: 'James Cooper',
                role: 'Managing Director',
                company: 'Cooper Recruitment',
              },
              {
                quote: "I was sceptical about AI hiring tools. This is different. The assessment actually reflects what the job is like. Candidates tell us it feels relevant, not generic.",
                name: 'Rachel Adams',
                role: 'People Manager',
                company: 'Technology sector',
              },
            ].map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '36px 32px',
                  border: '1px solid #e4e9f0', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,33,55,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ fontFamily: F, fontSize: 32, color: TEAL, lineHeight: 1, marginBottom: 16, fontWeight: 900 }}>&ldquo;</div>
                  <p style={{ fontFamily: F, fontSize: 15.5, color: '#374151', lineHeight: 1.75, marginBottom: 28, flex: 1 }}>{t.quote}</p>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                    <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>{t.name}</div>
                    <div style={{ fontFamily: F, fontSize: 13, color: '#6b7280', marginTop: 3 }}>{t.role}</div>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: TEAL, marginTop: 2 }}>{t.company}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          BAD HIRE COST BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <CostBanner />

      {/* ════════════════════════════════════════════════════════════════════
          THE 6-MONTH TRAP
      ════════════════════════════════════════════════════════════════════ */}
      <SixMonthTrap />

      {/* ════════════════════════════════════════════════════════════════════
          ERA 2025
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #0f2137 0%, #1a3a5c 100%)',
        padding: '72px 24px',
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

            <p style={{ fontFamily: F, fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 24 }}>
              You would not sign a contract without legal advice. Why would you make a hire without PRODICTA?
            </p>
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
          FAQ
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', padding: '72px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>FAQ</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                Common questions about PRODICTA
              </h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                {
                  q: 'What is the Employment Rights Act 2025 and why does it matter?',
                  a: 'The Employment Rights Act 2025 is new UK legislation that fundamentally changes employer risk. From January 2027, the qualifying period for unfair dismissal claims drops from 2 years to 6 months. The statutory compensation cap is being removed entirely. This means a bad hire can take you to tribunal after just 6 months with no limit on what they can claim. Every hiring decision you make from now on needs to be documented, objective, and defensible. PRODICTA gives you that documentation automatically with every assessment.',
                },
                {
                  q: 'How much does PRODICTA cost?',
                  a: 'Starter is £99 per month (£49 for the first 30 days) for 10 assessments and up to 2 users. Professional is £299 per month (£149 for the first 30 days) for 30 assessments and up to 5 users. Business is £499 per month (£249 for the first 30 days) for 100 assessments and up to 15 users. Extra users are £35 per user per month on any plan. All plans include every feature. Transparent pricing. No hidden fees. No setup costs.',
                },
                {
                  q: 'What makes PRODICTA different from personality tests and psychometric assessments?',
                  a: 'Personality tests tell you how someone thinks. PRODICTA tells you how someone works. We do not ask candidates to answer multiple choice questions or rate themselves on a scale. We give them the actual tasks they would face in their first 90 days and measure how they respond under realistic pressure. Every scenario is built from your specific job description, not a generic template. The result is a prediction of how they will actually perform, not a personality label.',
                },
                {
                  q: 'How long does an assessment take?',
                  a: 'It depends on the role. Rapid Screen is a 5-8 minute single-scenario signal for high-volume screening. Speed-Fit assessments take 15 minutes with 2 scenarios, recommended for most roles. Depth-Fit assessments take 25 minutes with 3 scenarios and a full narrative report. Strategy-Fit assessments take 45 minutes with 4 scenarios plus a Day 1 workspace simulation, best for senior or high stakes hires. PRODICTA recommends the right level based on the role but you can choose. Reports are available within minutes of the candidate finishing.',
                },
                {
                  q: 'What roles does PRODICTA work for?',
                  a: 'PRODICTA works for any role where you need to know how someone will actually perform. Customer service advisors, care workers, accounts assistants, office managers, sales executives, marketing managers, operations leads, finance directors. The scenarios adapt to the job description. A care worker gets a safeguarding scenario. A receptionist gets a multitasking scenario. A finance director gets a strategic decision scenario. This is not just for senior hires. The hardest roles to get right are often the everyday ones.',
                },
                {
                  q: 'How does PRODICTA ensure compliance with UK employment law?',
                  a: 'Every PRODICTA assessment is scenario based, objective, and anonymous. No candidate is penalised for spelling, grammar, or writing style in line with the Equality Act 2010. Every score is backed by specific evidence from what the candidate actually wrote. Every report includes a compliance statement documenting the assessment methodology, date, and fairness standards applied. This creates a documented audit trail that can be used as evidence of a fair and objective hiring process.',
                },
                {
                  q: 'Can candidates use AI to write their answers?',
                  a: 'PRODICTA includes built in response integrity analysis. It detects AI assisted responses, copy paste answers, rushed submissions, and inconsistent quality across scenarios. Every candidate receives an authenticity rating. The scenarios are unique to each job description and timed, so there is nothing to prepare for or look up. If a candidate does use AI, the integrity analysis flags it and you can probe it at interview.',
                },
                {
                  q: 'How quickly do I get results?',
                  a: 'Reports are generated within minutes of the candidate completing their assessment. There is no waiting for human scorers or manual review. You get the full report including overall score, candidate type, predicted outcomes, strengths, watch outs, onboarding plan, and interview questions as soon as the candidate submits. Most users have a complete hiring insight within 24 hours of sending the assessment.',
                },
                {
                  q: 'Do we need to train our team to use it?',
                  a: 'No. Paste a job description, answer 3 to 4 quick questions about the role, send to your candidates, and receive a report. There is no software to install, no training required, and no complex setup. Most users create their first assessment within 5 minutes. The reports are designed to be understood by anyone, and include a Simple View option that translates everything into plain, jargon free language for line managers.',
                },
                {
                  q: 'What happens after January 2027?',
                  a: 'From January 2027, employees gain unfair dismissal protection from their first day of employment. There is no qualifying period and no cap on compensation. This means every hire you make is a legal and financial risk from day one. PRODICTA helps you document fair, evidence based hiring decisions before you make the offer. It also includes a Probation Timeline Tracker with automated review reminders at month 1, 3, and 5 so you never miss a critical checkpoint during the probation period.',
                },
                {
                  q: 'Can I pay per assessment instead of a monthly subscription?',
                  a: 'Yes. PRODICTA offers pay-per-assessment pricing with no monthly commitment. Speed-Fit assessments are £18, Depth-Fit are £35, and Strategy-Fit are £65. Toggle to Pay as you go on our pricing page to see the options.',
                },
                {
                  q: 'What is the Virtual Job Tryout Workspace?',
                  a: 'Strategy-Fit assessments include a Virtual Job Tryout Workspace. After completing their work scenarios, candidates spend 15 minutes inside a browser-based simulation of their first morning in the role. They work through a real inbox, a prioritised task list, team messages, and a calendar packed with meetings. No guidance. No hints. Just them and the job. You see exactly how they think, prioritise, and perform under pressure before you make the offer. Available for senior and leadership hires.',
                },
              ].map((item, i) => (
                <div key={i} style={{
                  border: '1px solid #e4e9f0', borderRadius: 12, overflow: 'hidden',
                  marginBottom: 8,
                  transition: 'box-shadow 0.2s',
                }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '20px 24px', background: openFaq === i ? '#f8f9fb' : '#fff',
                      border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontFamily: F, fontSize: 15.5, fontWeight: 700, color: NAVY, lineHeight: 1.45 }}>{item.q}</span>
                    <svg
                      width={18} height={18} viewBox="0 0 24 24" fill="none"
                      stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                      style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 24px 22px', background: '#f8f9fb' }}>
                      <p style={{ fontFamily: F, fontSize: 15, color: '#5e6b7f', lineHeight: 1.75, margin: 0 }}>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PRE-HIRE RISK REPORT
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: PARCHMENT, padding: '72px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Free tool</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 40px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 16 }}>
                See your hiring risks in seconds
              </h2>
              <p style={{ fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
                Paste any job description and PRODICTA will instantly show you the top 3 risks this role creates in hiring.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div style={{
              background: '#fff',
              border: `1.5px solid ${TEAL}33`,
              borderRadius: 16,
              padding: '32px',
              boxShadow: '0 4px 24px rgba(15,33,55,0.06)',
            }}>
              <textarea
                value={riskJd}
                onChange={e => setRiskJd(e.target.value)}
                placeholder="Paste a job description here..."
                rows={7}
                style={{
                  width: '100%',
                  fontFamily: F,
                  fontSize: 14,
                  color: NAVY,
                  background: '#fff',
                  border: '1.5px solid #e4e9f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.65,
                  marginBottom: 16,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = TEAL }}
                onBlur={e => { e.target.style.borderColor = '#e4e9f0' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontFamily: F, fontSize: 12.5, color: '#94a1b3' }}>
                  No account needed. Up to 3 free analyses per session.
                </span>
                <button
                  onClick={handleRiskAnalysis}
                  disabled={riskLoading || !riskJd.trim()}
                  style={{
                    fontFamily: F,
                    fontSize: 14,
                    fontWeight: 700,
                    color: NAVY,
                    background: riskLoading || !riskJd.trim() ? '#b2dfdb' : TEAL,
                    border: 'none',
                    borderRadius: 9,
                    padding: '12px 28px',
                    cursor: riskLoading || !riskJd.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, transform 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={e => { if (!riskLoading && riskJd.trim()) e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {riskLoading ? (
                    <>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Analysing...
                    </>
                  ) : 'Analyse risks'}
                </button>
              </div>

              {riskError && (
                <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9 }}>
                  <p style={{ fontFamily: F, fontSize: 13.5, color: '#dc2626', margin: 0 }}>{riskError}</p>
                </div>
              )}

              {riskResults && (
                <div style={{ marginTop: 28 }}>
                  {/* Results header */}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{
                      fontFamily: F, fontSize: 11, fontWeight: 800, color: TEAL,
                      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                    }}>
                      Risk report
                    </div>
                    <h3 style={{
                      fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY,
                      letterSpacing: '-0.4px', lineHeight: 1.3, margin: '0 0 8px',
                    }}>
                      {riskResults.length} hiring risks identified for: {riskRoleTitle}
                    </h3>
                    <p style={{ fontFamily: F, fontSize: 14, color: '#5e6b7f', lineHeight: 1.6, margin: 0 }}>
                      These are the risks built into this role that your hiring process needs to test for.
                    </p>
                  </div>

                  {/* Risk cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {riskResults.map((risk, i) => {
                      const severityColors = {
                        High:   { bar: '#EF4444', tint: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.18)',  badge: '#DC2626', icon: '#EF4444' },
                        Medium: { bar: '#F59E0B', tint: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)', badge: '#D97706', icon: '#F59E0B' },
                        Low:    { bar: '#22C55E', tint: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.18)',  badge: '#16A34A', icon: '#22C55E' },
                      }
                      const c = severityColors[risk.severity] || severityColors.Medium
                      return (
                        <div key={i} style={{
                          background: c.tint,
                          border: `1px solid ${c.border}`,
                          borderLeft: `6px solid ${c.bar}`,
                          borderRadius: 12,
                          padding: '20px 22px',
                          position: 'relative',
                          boxShadow: '0 2px 10px rgba(15,33,55,0.04)',
                        }}>
                          {/* Severity badge top right */}
                          <span style={{
                            position: 'absolute', top: 16, right: 18,
                            fontFamily: F, fontSize: 10.5, fontWeight: 800, color: '#fff',
                            background: c.badge, borderRadius: 5, padding: '4px 10px',
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>
                            {risk.severity}
                          </span>

                          {/* Title row with shield icon */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, paddingRight: 80 }}>
                            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <h4 style={{
                              fontFamily: F, fontSize: 18, fontWeight: 800, color: NAVY,
                              letterSpacing: '-0.2px', lineHeight: 1.35, margin: 0,
                            }}>
                              {risk.title}
                            </h4>
                          </div>
                          <p style={{
                            fontFamily: F, fontSize: 15, color: '#374151',
                            lineHeight: 1.75, margin: 0, paddingLeft: 34,
                          }}>
                            {risk.explanation}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Closing context + CTA */}
                  <div style={{ marginTop: 28, padding: '24px 24px 22px', background: '#fff', border: `1px solid ${TEAL}33`, borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontFamily: F, fontSize: 14.5, color: '#374151', lineHeight: 1.65, margin: '0 0 6px' }}>
                      PRODICTA's work simulations are designed to test candidates against exactly these risks.
                    </p>
                    <p style={{ fontFamily: F, fontSize: 13.5, color: '#5e6b7f', lineHeight: 1.6, margin: '0 0 18px' }}>
                      Every scenario is built from your job description.
                    </p>
                    <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>
                      See how PRODICTA tests for these exact risks
                    </div>
                    <a href="/login" style={{
                      fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY,
                      background: TEAL, textDecoration: 'none',
                      padding: '13px 32px', borderRadius: 10, display: 'inline-block',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,191,165,0.35)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                      Start assessing candidates
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(180deg, #0f2137 0%, #1a3a5c 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Get started</div>
            <h2 style={{ fontFamily: F, fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 20 }}>
              Stop guessing. Start knowing.
            </h2>
            <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, marginBottom: 40 }}>
              Join employers, HR teams, and recruitment agencies across the UK using PRODICTA to hire with confidence.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/login" style={{
                fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '16px 44px', borderRadius: 12,
                boxShadow: `0 8px 32px ${TEAL}44`,
              }}>
                Get started →
              </a>
              <a href="/demo" style={{
                fontFamily: F, fontSize: 16, fontWeight: 600, color: '#fff',
                background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.22)',
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
      <footer style={{ background: '#071524', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px clamp(16px, 4vw, 48px) 36px' }}>
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

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              © 2026 PRODICTA. All rights reserved.
            </p>
            <p style={{ fontFamily: F, fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '4px 0 0' }}>
              Powered by AIAURA Group Ltd
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
