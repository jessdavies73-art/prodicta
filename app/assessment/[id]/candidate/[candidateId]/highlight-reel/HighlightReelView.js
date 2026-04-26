'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { buildModularSlides } from './buildModularSlides'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#009688'
const GOLD = '#E8B84B'
const RED = '#dc2626'
const BD_LIGHT = '#cbd5e1'
const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

// Legacy 6-slide structure. Used when workspace_block_scores is absent
// (legacy Strategy-Fit Workspace, or any non-modular assessment).
const LEGACY_SLIDES = [
  { type: 'title',    duration: 8 },
  { type: 'verdict',  duration: 10 },
  { type: 'strength', duration: 12 },
  { type: 'watchout', duration: 12 },
  { type: 'numbers',  duration: 10 },
  { type: 'next',     duration: 8 },
]

function ScoreRing({ score, size = 100, color = TEAL, delay = 0 }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 300 + delay); return () => clearTimeout(t) }, [])
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${(drawn ? score / 100 : 0) * circ} ${circ}`}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: size * 0.3, fontWeight: 800, color }}>{drawn ? score : 0}</span>
      </div>
    </div>
  )
}

function CountUp({ target, duration = 1200, delay = 300 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1)
        setVal(Math.round(p * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(t)
  }, [target])
  return <>{val}</>
}

export default function HighlightReel({ data, canShare = false, isDemo = false }) {
  // Build the slide list once per data change. Modular gets 7-8 slides
  // sourced from workspace_block_scores; legacy gets the original 6.
  const slides = useMemo(() => buildModularSlides(data) || LEGACY_SLIDES, [data])
  const totalSlides = slides.length

  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const [shareWorking, setShareWorking] = useState(false)
  const timerRef = useRef(null)
  const progressRef = useRef(null)

  const score = data.overall_score ?? 0
  const scoreLabel = score >= 85 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 65 ? 'Good' : score >= 50 ? 'Developing' : 'Concern'
  const verdict = score >= 80 ? 'Strong Hire' : score >= 70 ? 'Hire' : score >= 55 ? 'Review' : 'Do Not Hire'
  const verdictColor = score >= 80 ? '#22C55E' : score >= 70 ? TEAL : score >= 55 ? GOLD : RED
  const roleLevelLabel = data.roleLevel === 'OPERATIONAL' ? 'Operational' : data.roleLevel === 'LEADERSHIP' ? 'Leadership' : 'Mid-Level'
  const topStrength = (data.strengths || [])[0]
  const topWatchout = (data.watchouts || [])[0]
  const questions = (data.interview_questions || []).slice(0, 3)

  const isAgency = (data.accountType || '').toLowerCase() === 'agency'
  const shareModalCopy = isAgency
    ? "Share this candidate's 60-second Highlight Reel with your client."
    : "Share this candidate's 60-second Highlight Reel with the hiring manager or panel."

  // Auto-advance. Reset to slide 0 if the slide count changes (e.g.,
  // upstream data was hot-swapped between modular and legacy).
  useEffect(() => { if (slide >= totalSlides) setSlide(0) }, [totalSlides, slide])

  useEffect(() => {
    if (!playing) return
    const dur = (slides[slide]?.duration || 10) * 1000
    const start = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / dur, 1))
    }, 50)
    timerRef.current = setTimeout(() => {
      if (slide < totalSlides - 1) { setSlide(s => s + 1); setProgress(0) }
      else { setPlaying(false); setProgress(1) }
    }, dur)
    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current) }
  }, [slide, playing, totalSlides, slides])

  function goTo(n) { setSlide(Math.max(0, Math.min(n, totalSlides - 1))); setProgress(0); setPlaying(true) }

  async function openShareModal() {
    if (isDemo || !data.candidateId) return
    setShareOpen(true)
    setShareStatus('')
    setPlaying(false)
    if (shareUrl) return
    setShareWorking(true)
    try {
      const res = await fetch(`/api/candidates/${data.candidateId}/highlight-reel-token`, { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        setShareUrl(json.url)
      } else {
        setShareStatus('Could not generate share link.')
      }
    } catch {
      setShareStatus('Could not generate share link.')
    } finally {
      setShareWorking(false)
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('Link copied. Anyone with this link can view the reel.')
    } catch {
      setShareStatus('Copy failed. Select the link and copy manually.')
    }
  }

  function closeShareModal() {
    setShareOpen(false)
    setShareStatus('')
  }

  const slideStyle = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', transition: 'opacity 0.6s ease', fontFamily: F }

  // ─── Render helpers per slide type ─────────────────────────────────────
  const slideContent = (s, idx) => {
    const active = slide === idx
    if (s.type === 'title') return (
      <div className="reel-fade" key={`s-title-${active}`}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>PRODICTA</div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-1px' }}>{data.name}</h1>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>{data.role}</div>
        <ScoreRing score={score} size={120} />
        <div style={{ fontSize: 16, fontWeight: 700, color: TEAL, marginTop: 12 }}>{scoreLabel}</div>
      </div>
    )
    if (s.type === 'verdict') return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>The Verdict</div>
        <div style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: verdictColor, marginBottom: 16 }}>{verdict}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${verdictColor}22`, color: verdictColor, border: `1px solid ${verdictColor}55` }}>
            Risk: {data.risk_level || 'N/A'}
          </span>
          <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            {roleLevelLabel}
          </span>
        </div>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>
          {data.ai_summary ? (data.ai_summary.length > 200 ? data.ai_summary.slice(0, 200) + '...' : data.ai_summary) : ''}
        </p>
      </div>
    )
    if (s.type === 'strength' && topStrength) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Where they shine</div>
        <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: TEAL, margin: '0 0 20px', maxWidth: 600 }}>
          {topStrength.text || topStrength.strength || topStrength.title}
        </h2>
        {(topStrength.evidence || topStrength.detail) && (
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.65 }}>
            "{topStrength.evidence || topStrength.detail}"
          </p>
        )}
        {data.pressure_fit_score != null && (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Pressure-Fit</span>
              <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: TEAL }}>{data.pressure_fit_score}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${data.pressure_fit_score}%`, background: TEAL, borderRadius: 3, transition: 'width 1s ease 0.3s' }} />
            </div>
          </div>
        )}
      </div>
    )
    if (s.type === 'watchout' && topWatchout) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>What to watch</div>
        <h2 style={{ fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 800, color: GOLD, margin: '0 0 16px', maxWidth: 600 }}>
          {topWatchout.watchout || topWatchout.title || topWatchout.text}
        </h2>
        {topWatchout.if_ignored && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto 16px', lineHeight: 1.65 }}>
            {topWatchout.if_ignored}
          </p>
        )}
        {topWatchout.severity && (
          <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${topWatchout.severity === 'High' ? RED : GOLD}22`, color: topWatchout.severity === 'High' ? RED : GOLD, border: `1px solid ${topWatchout.severity === 'High' ? RED : GOLD}55` }}>
            {topWatchout.severity} severity
          </span>
        )}
      </div>
    )
    if (s.type === 'numbers') return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32 }}>Key Numbers</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Overall', value: score, color: TEAL },
            data.pressure_fit_score != null && { label: 'Pressure-Fit', value: data.pressure_fit_score, color: TEAL },
            data.execution_reliability != null && { label: 'Execution', value: data.execution_reliability, color: TEAL },
            data.spoken_delivery_score != null && { label: 'Spoken Delivery', value: data.spoken_delivery_score, color: TEAL },
          ].filter(Boolean).map((item, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: FM, fontSize: 48, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                <CountUp target={item.value} delay={i * 200} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
    if (s.type === 'next') return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>What happens next</div>
        <div style={{ textAlign: 'left', maxWidth: 480, margin: '0 auto 32px' }}>
          {questions.map((q, i) => {
            const text = typeof q === 'string' ? q : (q?.question || q?.text || '')
            return text ? (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: TEAL, flexShrink: 0 }}>{i + 1}.</span>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>{text.length > 120 ? text.slice(0, 120) + '...' : text}</p>
              </div>
            ) : null
          })}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEAL, marginBottom: 4 }}>PRODICTA</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Full report available at prodicta.co.uk</div>
      </div>
    )

    // ─── Modular slide renderers ───────────────────────────────────────
    if (s.type === 'block_strength' && s.payload) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          {s.payload.block_label}: strength
        </div>
        <div style={{ fontFamily: FM, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
          Block score {s.payload.score}
        </div>
        <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 32px)', fontWeight: 800, color: TEAL, margin: '0 auto 18px', maxWidth: 640, lineHeight: 1.3 }}>
          {s.payload.strength}
        </h2>
        {s.payload.narrative ? (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 540, margin: '0 auto', lineHeight: 1.65, fontStyle: 'italic' }}>
            {s.payload.narrative}
          </p>
        ) : null}
      </div>
    )
    if ((s.type === 'decision_moment' || s.type === 'performance_moment') && s.payload) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          {s.type === 'decision_moment' ? 'Decision under pressure' : 'Top performance moment'}
        </div>
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
          {s.payload.block_label} &middot; block score {s.payload.score ?? '—'}
        </div>
        {s.payload.signal?.evidence ? (
          <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', fontWeight: 700, color: '#fff', maxWidth: 640, margin: '0 auto 16px', lineHeight: 1.45 }}>
            {s.payload.signal.evidence}
          </p>
        ) : null}
        {s.payload.signal?.type ? (
          <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: `${TEAL}22`, color: TEAL, border: `1px solid ${TEAL}55`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {(s.payload.signal.type || '').replace(/_/g, ' ')} &middot; {s.payload.signal.weight || 'medium'} weight
          </span>
        ) : null}
      </div>
    )
    if (s.type === 'conversation_moment' && s.payload) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Conversation handling
        </div>
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
          {s.payload.block_label} &middot; block score {s.payload.score ?? '—'}
        </div>
        {s.payload.signal?.evidence ? (
          <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', fontWeight: 700, color: '#fff', maxWidth: 640, margin: '0 auto 16px', lineHeight: 1.45 }}>
            {s.payload.signal.evidence}
          </p>
        ) : null}
        {s.payload.signal?.type ? (
          <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: `${TEAL}22`, color: TEAL, border: `1px solid ${TEAL}55`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {(s.payload.signal.type || '').replace(/_/g, ' ')} &middot; {s.payload.signal.weight || 'medium'} weight
          </span>
        ) : null}
      </div>
    )
    if (s.type === 'block_watch_out' && s.payload) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          {s.payload.block_label}: watch-out
        </div>
        <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 18 }}>
          Block score {s.payload.score ?? '—'}
        </div>
        <h2 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 800, color: GOLD, margin: '0 auto 16px', maxWidth: 620, lineHeight: 1.4 }}>
          {s.payload.watch_out}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 480, margin: '0 auto', lineHeight: 1.55 }}>
          Recommended verification at interview before any decision is taken.
        </p>
      </div>
    )
    if (s.type === 'questions' && s.payload?.questions?.length) return (
      <div className="reel-fade">
        <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>Where to dig at interview</div>
        <div style={{ textAlign: 'left', maxWidth: 480, margin: '0 auto 32px' }}>
          {s.payload.questions.map((q, i) => {
            const text = typeof q === 'string' ? q : (q?.question || q?.text || '')
            return text ? (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: TEAL, flexShrink: 0 }}>{i + 1}.</span>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>{text.length > 120 ? text.slice(0, 120) + '...' : text}</p>
              </div>
            ) : null
          })}
        </div>
      </div>
    )
    if (s.type === 'branding') return (
      <div className="reel-fade">
        <div style={{ fontSize: 14, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>PRODICTA</div>
        <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 800, color: '#fff', margin: '0 auto 20px', maxWidth: 540, lineHeight: 1.3 }}>
          We tell you if a hire will fail before you make it.
        </h2>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Full report available at prodicta.co.uk</div>
      </div>
    )
    return null
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: NAVY, overflow: 'hidden', fontFamily: F }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .reel-fade { animation: fadeIn 0.6s ease forwards; }
      `}</style>

      {/* Slides */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)' }}>
        {slides.map((s, i) => (
          <div key={`slide-${i}-${s.type}`} style={{ ...slideStyle, opacity: slide === i ? 1 : 0, pointerEvents: slide === i ? 'auto' : 'none' }}>
            {slide === i ? slideContent(s, i) : null}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'rgba(15,33,55,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
        <button onClick={() => goTo(0)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontFamily: F, fontWeight: 600 }}>Restart</button>
        <button onClick={() => { if (slide > 0) goTo(slide - 1) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>&#8592;</button>
        <button onClick={() => setPlaying(p => !p)} style={{ width: 32, height: 32, borderRadius: '50%', background: TEAL, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {playing ? (
            <svg width={12} height={12} viewBox="0 0 12 12"><rect x={1} y={1} width={3.5} height={10} fill={NAVY}/><rect x={7.5} y={1} width={3.5} height={10} fill={NAVY}/></svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 12 12"><polygon points="2,0 12,6 2,12" fill={NAVY}/></svg>
          )}
        </button>
        <button onClick={() => { if (slide < totalSlides - 1) goTo(slide + 1) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>&#8594;</button>
        <span style={{ fontFamily: FM, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{slide + 1} / {totalSlides}</span>
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginLeft: 8 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: TEAL, borderRadius: 2, transition: 'width 0.05s linear' }} />
        </div>
        {canShare && (
          <button onClick={openShareModal} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontFamily: F, fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer' }}>
            Share Reel
          </button>
        )}
        {!canShare && !isDemo && (
          <a href="https://prodicta.co.uk" style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TEAL, textDecoration: 'none' }}>prodicta.co.uk</a>
        )}
      </div>

      {/* Share modal. Account-type-aware copy. Only opens on the signed-in
          path where canShare is true; the public /reel/[token] route
          renders with canShare=false so this never opens for viewers. */}
      {shareOpen ? (
        <div
          role="dialog"
          aria-modal={true}
          onClick={closeShareModal}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 28,
              maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              fontFamily: F, color: NAVY,
            }}
          >
            <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Share Highlight Reel
            </div>
            <h3 style={{ fontFamily: F, fontSize: 20, fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.3 }}>
              {shareModalCopy}
            </h3>
            <p style={{ fontFamily: F, fontSize: 13.5, color: '#475569', lineHeight: 1.6, margin: '0 0 18px' }}>
              The link below auto-plays the 60-second reel. Anyone with the link can view it; no login required. PRODICTA reports should be one input to your hiring decision, not the sole basis.
            </p>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12,
              padding: '10px 12px', borderRadius: 8,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
            }}>
              <input
                type="text"
                value={shareWorking ? 'Generating link…' : (shareUrl || '')}
                readOnly
                onFocus={e => e.target.select()}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontFamily: FM, fontSize: 12.5, color: NAVY,
                }}
              />
              <button
                type="button"
                onClick={copyShareUrl}
                disabled={!shareUrl || shareWorking}
                style={{
                  fontFamily: F, fontSize: 12.5, fontWeight: 700,
                  padding: '7px 14px', borderRadius: 6, border: 'none',
                  background: shareUrl && !shareWorking ? TEAL : '#cbd5e1',
                  color: '#fff',
                  cursor: shareUrl && !shareWorking ? 'pointer' : 'not-allowed',
                }}
              >
                Copy link
              </button>
            </div>
            {shareStatus ? (
              <div style={{ fontFamily: F, fontSize: 12.5, color: TEALD, marginBottom: 12 }}>
                {shareStatus}
              </div>
            ) : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={closeShareModal}
                style={{
                  fontFamily: F, fontSize: 13, fontWeight: 700,
                  padding: '8px 16px', borderRadius: 6,
                  background: 'transparent', border: `1px solid ${BD_LIGHT}`,
                  color: '#475569', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

