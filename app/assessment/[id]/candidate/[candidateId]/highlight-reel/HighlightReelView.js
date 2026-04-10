'use client'
import { useState, useEffect, useRef } from 'react'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#009688'
const GOLD = '#E8B84B'
const RED = '#dc2626'
const F = "'Outfit',system-ui,sans-serif"
const FM = "'IBM Plex Mono',monospace"

const SLIDE_DURATIONS = [8, 10, 12, 12, 10, 8] // seconds per slide
const TOTAL_SLIDES = 6

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
  const [slide, setSlide] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [shareMsg, setShareMsg] = useState('')
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

  // Auto-advance
  useEffect(() => {
    if (!playing) return
    const dur = SLIDE_DURATIONS[slide] * 1000
    const start = Date.now()
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / dur, 1))
    }, 50)
    timerRef.current = setTimeout(() => {
      if (slide < TOTAL_SLIDES - 1) { setSlide(s => s + 1); setProgress(0) }
      else { setPlaying(false); setProgress(1) }
    }, dur)
    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current) }
  }, [slide, playing])

  function goTo(n) { setSlide(n); setProgress(0); setPlaying(true) }

  async function handleShare() {
    if (isDemo) return
    try {
      const res = await fetch(`/api/candidates/${data.candidateId}/highlight-reel-token`, { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        await navigator.clipboard.writeText(json.url)
        setShareMsg('Link copied. Anyone with this link can view the reel.')
        setTimeout(() => setShareMsg(''), 3000)
      }
    } catch {}
  }

  const slideStyle = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', transition: 'opacity 0.6s ease', fontFamily: F }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: NAVY, overflow: 'hidden', fontFamily: F }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .reel-fade { animation: fadeIn 0.6s ease forwards; }
      `}</style>

      {/* Slides */}
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 60px)' }}>

        {/* SLIDE 1: Title */}
        <div style={{ ...slideStyle, opacity: slide === 0 ? 1 : 0, pointerEvents: slide === 0 ? 'auto' : 'none' }}>
          <div className="reel-fade" key={`s1-${slide === 0}`}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEAL, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>PRODICTA</div>
            <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-1px' }}>{data.name}</h1>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>{data.role}</div>
            <ScoreRing score={score} size={120} />
            <div style={{ fontSize: 16, fontWeight: 700, color: TEAL, marginTop: 12 }}>{scoreLabel}</div>
          </div>
        </div>

        {/* SLIDE 2: Verdict */}
        <div style={{ ...slideStyle, opacity: slide === 1 ? 1 : 0, pointerEvents: slide === 1 ? 'auto' : 'none' }}>
          {slide === 1 && <div className="reel-fade">
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
          </div>}
        </div>

        {/* SLIDE 3: Top Strength */}
        <div style={{ ...slideStyle, opacity: slide === 2 ? 1 : 0, pointerEvents: slide === 2 ? 'auto' : 'none' }}>
          {slide === 2 && topStrength && <div className="reel-fade">
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
          </div>}
        </div>

        {/* SLIDE 4: Watch-Out */}
        <div style={{ ...slideStyle, opacity: slide === 3 ? 1 : 0, pointerEvents: slide === 3 ? 'auto' : 'none' }}>
          {slide === 3 && topWatchout && <div className="reel-fade">
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
          </div>}
        </div>

        {/* SLIDE 5: Key Numbers */}
        <div style={{ ...slideStyle, opacity: slide === 4 ? 1 : 0, pointerEvents: slide === 4 ? 'auto' : 'none' }}>
          {slide === 4 && <div className="reel-fade">
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
          </div>}
        </div>

        {/* SLIDE 6: Next Steps */}
        <div style={{ ...slideStyle, opacity: slide === 5 ? 1 : 0, pointerEvents: slide === 5 ? 'auto' : 'none' }}>
          {slide === 5 && <div className="reel-fade">
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
          </div>}
        </div>
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
        <button onClick={() => { if (slide < TOTAL_SLIDES - 1) goTo(slide + 1) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>&#8594;</button>
        <span style={{ fontFamily: FM, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{slide + 1} / {TOTAL_SLIDES}</span>
        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginLeft: 8 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: TEAL, borderRadius: 2, transition: 'width 0.05s linear' }} />
        </div>
        {canShare && (
          <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontFamily: F, fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer' }}>
            {shareMsg || 'Share this reel'}
          </button>
        )}
        {!canShare && !isDemo && (
          <a href="https://prodicta.co.uk" style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TEAL, textDecoration: 'none' }}>prodicta.co.uk</a>
        )}
      </div>
    </div>
  )
}
