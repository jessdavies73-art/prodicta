'use client'
import { useEffect, useRef, useState } from 'react'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY   = '#0f2137'
const NAVY2  = '#0d1e30'
const TEAL   = '#00BFA5'
const TEALD  = '#009688'
const GOLD   = '#E8B84B'
const F      = "'Outfit', system-ui, sans-serif"
const FM     = "'IBM Plex Mono', monospace"

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
        <a href="/demo" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, transition: 'color 0.15s' }}
          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.6)'}>Demo</a>
        <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '9px 20px', borderRadius: 8, background: TEAL, marginLeft: 2, transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}>Get started</a>
      </div>
    </nav>
  )
}

const cardBase = {
  background: '#fff',
  borderRadius: 14,
  padding: '36px 32px',
  border: '1px solid #e8ecf1',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
}

const cardHover = {
  transform: 'translateY(-4px)',
  boxShadow: '0 12px 32px rgba(15,33,55,0.10)',
}

function Card({ title, body, delay = 0 }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Reveal delay={delay}>
      <div
        style={{ ...cardBase, ...(hovered ? cardHover : {}) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <h3 style={{ fontFamily: F, fontSize: 19, fontWeight: 700, color: NAVY, marginBottom: 14, lineHeight: 1.3 }}>{title}</h3>
        <p style={{ fontFamily: F, fontSize: 15, color: '#5e6b7f', lineHeight: 1.75, margin: 0 }}>{body}</p>
      </div>
    </Reveal>
  )
}

function DarkCard({ title, body, delay = 0 }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Reveal delay={delay}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 14,
          padding: '32px 28px',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'transform 0.25s ease, border-color 0.25s ease',
          ...(hovered ? { transform: 'translateY(-4px)', borderColor: 'rgba(0,191,165,0.25)' } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <h3 style={{ fontFamily: F, fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>{title}</h3>
        <p style={{ fontFamily: F, fontSize: 14.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, margin: 0 }}>{body}</p>
      </div>
    </Reveal>
  )
}

export default function PressureFitPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <style>{`
        @keyframes floatDot {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        .pf-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .pf-grid-2x3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 900px) {
          .pf-grid-3 { grid-template-columns: 1fr; }
          .pf-grid-2x3 { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .pf-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(170deg, ${NAVY} 0%, ${NAVY2} 100%)`,
        padding: '160px 24px 100px',
        textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <Reveal>
            <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 24 }}>Pressure-Fit Assessment</div>
          </Reveal>
          <Reveal delay={80}>
            <h1 style={{
              fontFamily: F, fontSize: 'clamp(28px, 4.5vw, 52px)', fontWeight: 900,
              color: '#fff', letterSpacing: '-1.5px', lineHeight: 1.12, marginBottom: 28,
            }}>
              They were brilliant in the interview. Six months later, completely different person.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p style={{
              fontFamily: F, fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 400,
              color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 40px',
            }}>
              Interviews test polish. Roles test judgement. PRODICTA tests both before you make the offer.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/demo" style={{
                fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, textDecoration: 'none',
                padding: '14px 32px', borderRadius: 10, background: TEAL, transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}
              >Try the demo</a>
              <a href="/login" style={{
                fontFamily: F, fontSize: 15, fontWeight: 600, color: '#fff', textDecoration: 'none',
                padding: '14px 32px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.target.style.borderColor='rgba(255,255,255,0.5)'} onMouseLeave={e => e.target.style.borderColor='rgba(255,255,255,0.2)'}
              >Get started</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────────────────────── */}
      <section style={{ background: '#f7f9fb', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>The problem</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                The problem nobody talks about until it is too late.
              </h2>
            </div>
          </Reveal>
          <div className="pf-grid-3">
            <Card
              title="Interview polish is not job performance."
              body="In the interview they were composed and articulate. Every answer landed. In the role, the pressure hit and everything changed. The team quietly routed around them. You hired presentation skills, not judgement under pressure."
              delay={0}
            />
            <Card
              title="Culture risk shows up in results before anyone notices."
              body="The silence when someone underperforms. The avoidance when a difficult conversation needs to happen. The overload on your best people because they will just get on with it. Silence becomes acceptance. Acceptance becomes the standard. The standard becomes your results."
              delay={80}
            />
            <Card
              title="Everyone agreed on this hire."
              body="Three months in: why is it not working? Because everyone assessed how the candidate talked about pressure. Nobody tested whether they could hold up under it."
              delay={160}
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(170deg, ${NAVY} 0%, ${NAVY2} 100%)`,
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>How it works</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 18 }}>
                PRODICTA tests pressure-fit for every role.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <p style={{
              fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75,
              maxWidth: 580, margin: '0 auto 48px', textAlign: 'center',
            }}>
              Paste the job description. PRODICTA builds realistic scenarios specific to that role.
            </p>
          </Reveal>
          <div className="pf-grid-3" style={{ marginBottom: 48 }}>
            {[
              'A Finance Director gets a board presentation under pressure with incomplete data.',
              'A Care Home Manager gets a safeguarding incident with conflicting information from staff.',
              'A Sales Director gets a pipeline crisis with a key client threatening to leave.',
              'An Operations Manager gets three urgent requests from different departments on the same morning.',
              'An Office Manager gets a team conflict, a compliance deadline, and an IT failure all at once.',
            ].map((text, i) => (
              <Reveal key={i} delay={i * 60}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: '24px 24px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: 8,
                    background: `${TEAL}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FM, fontSize: 12, fontWeight: 700, color: TEAL,
                  }}>{i + 1}</div>
                  <p style={{ fontFamily: F, fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, margin: 0 }}>{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={360}>
            <div style={{
              background: 'rgba(0,191,165,0.06)',
              borderRadius: 14,
              border: `1px solid ${TEAL}25`,
              padding: '32px 36px',
              maxWidth: 720, margin: '0 auto',
              textAlign: 'center',
            }}>
              <p style={{ fontFamily: F, fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: 0 }}>
                The candidate completes the assessment in 15 to 45 minutes. You get a report predicting their first 90 days, their pressure-fit score, and exactly where the risk is.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WHAT YOU GET ──────────────────────────────────────────────────── */}
      <section style={{ background: '#f7f9fb', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>What you get</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.15 }}>
                One assessment. More insight than three rounds of interviews.
              </h2>
            </div>
          </Reveal>
          <div className="pf-grid-2x3">
            {[
              { title: 'Pressure-fit score', body: 'Shows how they perform when it gets hard. Not a personality label. A prediction based on how they actually responded under realistic pressure.' },
              { title: 'Tuesday Reality', body: 'What managing this person actually looks like day-to-day. Not the interview version. The version you get on a normal Tuesday when everything is happening at once.' },
              { title: 'Watch-outs', body: 'Framed as "what gets tolerated if you do not address it". Specific behaviours the report flags so you can manage them from day one.' },
              { title: '90-Day Coaching Plan', body: 'A structured hiring manager coaching plan built with Alchemy Training UK. Practical guidance for the first 90 days, tailored to the candidate.' },
              { title: 'ERA 2025 Compliance Certificate', body: 'Every assessment generates a compliance certificate documenting the methodology, fairness standards, and evidence trail. Built for the new employment legislation.' },
              { title: 'Predicted 90-day outcomes', body: 'Specific milestones and predictions for the first 90 days. Where they will excel, where they will need support, and what to watch for at each stage.' },
            ].map((item, i) => (
              <Card key={i} title={item.title} body={item.body} delay={i * 60} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT IS FOR ─────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(170deg, ${NAVY} 0%, ${NAVY2} 100%)`,
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Who it is for</div>
              <h2 style={{ fontFamily: F, fontSize: 'clamp(26px, 3.2vw, 42px)', fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1.15 }}>
                Built for the people who cannot afford to get it wrong.
              </h2>
            </div>
          </Reveal>
          <div className="pf-grid-3">
            <DarkCard
              title="Employers"
              body="See whether your next hire will hold up under real pressure, not just interview pressure. Every sector. Every role level."
              delay={0}
            />
            <DarkCard
              title="Recruitment Agencies"
              body="Send your clients proof, not just CVs. Protect your placement fees by showing you assessed the candidate before they started."
              delay={80}
            />
            <DarkCard
              title="Hiring Managers"
              body="Know what managing this person will actually look like before you say yes. The Tuesday Reality, not the interview version."
              delay={160}
            />
          </div>
        </div>
      </section>

      {/* ── COST ──────────────────────────────────────────────────────────── */}
      <section style={{ background: '#f7f9fb', padding: '80px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>The cost</div>
            <h2 style={{ fontFamily: F, fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 800, color: NAVY, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 24 }}>
              A bad hire costs between {'\u00A3'}30,000 and {'\u00A3'}50,000. PRODICTA costs {'\u00A3'}49 a month.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p style={{
              fontFamily: F, fontSize: 17, color: '#5e6b7f', lineHeight: 1.75,
              maxWidth: 620, margin: '0 auto',
            }}>
              Recruitment fees, wasted salary, team disruption, management time, and from January 2027, uncapped tribunal risk. One prevented bad hire pays for a decade of subscription. The maths is not complicated.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{
        background: TEAL,
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{
              fontFamily: F, fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900,
              color: NAVY, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 32,
            }}>
              Stop hiring interview polish. Start hiring pressure-fit.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/demo" style={{
                fontFamily: F, fontSize: 15, fontWeight: 700, color: TEAL, textDecoration: 'none',
                padding: '14px 32px', borderRadius: 10, background: NAVY, transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}
              >Try the demo</a>
              <a href="/login" style={{
                fontFamily: F, fontSize: 15, fontWeight: 700, color: NAVY, textDecoration: 'none',
                padding: '14px 32px', borderRadius: 10, background: '#fff', transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.target.style.opacity='0.88'} onMouseLeave={e => e.target.style.opacity='1'}
              >Get started</a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
