'use client'

// ── Prodicta Landing Page ─────────────────────────────────────────────────────

const NAVY   = '#0f2137'
const TEAL   = '#00BFA5'
const TEALD  = '#009688'
const TEALLT = '#e0f2f0'
const F      = "'Outfit', system-ui, sans-serif"

// ── Reusable nav ─────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(15,33,55,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px', height: 64,
    }}>
      {/* Logo */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 14, height: 14, border: '2.5px solid #fff', borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: F, fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>PRODICTA</span>
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="/how-it-works" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px' }}>How it works</a>
        <a href="/#pricing" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px' }}>Pricing</a>
        <a href="/demo" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '8px 14px' }}>Demo</a>
        <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)' }}>Sign in</a>
        <a href="/login" style={{ fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, textDecoration: 'none', padding: '8px 18px', borderRadius: 7, background: TEAL }}>Sign up →</a>
      </div>
    </nav>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, style, children }) {
  return (
    <section id={id} style={{ padding: '96px 0', ...style }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
        {children}
      </div>
    </section>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: F, background: '#fff', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-cta:hover { opacity: 0.9; transform: translateY(-1px); }
        .feature-card:hover { box-shadow: 0 8px 32px rgba(15,33,55,0.12); transform: translateY(-2px); }
        .step-card:hover { border-color: ${TEAL} !important; }
        @media (max-width: 768px) {
          .hero-btns { flex-direction: column !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          nav { padding: 0 20px !important; }
          nav .nav-links { display: none !important; }
        }
      `}</style>

      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(-45deg, #0a1929, #0f2137, #0d2a43, #091d35, #112240)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 16s ease infinite',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 40px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${TEAL}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ animation: 'fadeUp 0.6s ease-out', position: 'relative', maxWidth: 800 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${TEAL}18`, border: `1px solid ${TEAL}44`, borderRadius: 50, padding: '6px 16px', marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: TEAL }} />
            <span style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: TEAL }}>Now live · Prodicta AI Assessment Platform</span>
          </div>

          <h1 style={{
            fontFamily: F, fontSize: 58, fontWeight: 800, color: '#fff',
            letterSpacing: '-1.5px', lineHeight: 1.08, marginBottom: 24,
          }}>
            Understand likely probation
            <br />
            <span style={{ color: TEAL }}>outcomes before you hire</span>
          </h1>

          <p style={{
            fontFamily: F, fontSize: 19, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.75, marginBottom: 40, maxWidth: 620, margin: '0 auto 40px',
          }}>
            Prodicta uses AI to assess candidate potential, predict performance under pressure, and flag risks — before they become expensive hiring mistakes.
          </p>

          <div className="hero-btns" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <a
              href="/login"
              className="hero-cta"
              style={{
                fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '15px 36px', borderRadius: 12,
                transition: 'opacity 0.15s, transform 0.15s',
                display: 'inline-block',
              }}
            >
              Start free →
            </a>
            <a
              href="/demo"
              className="hero-cta"
              style={{
                fontFamily: F, fontSize: 16, fontWeight: 700, color: '#fff',
                background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)',
                textDecoration: 'none', padding: '15px 36px', borderRadius: 12,
                transition: 'opacity 0.15s, transform 0.15s',
                display: 'inline-block',
              }}
            >
              Try demo, no account needed
            </a>
          </div>

          {/* Social proof / stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
            {[
              { stat: '2 min', label: 'To create an assessment' },
              { stat: '94%', label: 'Score accuracy vs outcome' },
              { stat: '4 metrics', label: 'Scores, risk, integrity, fit' },
            ].map(({ stat, label }) => (
              <div key={stat} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: F, fontSize: 26, fontWeight: 800, color: TEAL, letterSpacing: '-0.5px' }}>{stat}</div>
                <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <Section style={{ background: '#f7f9fb' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={{ fontFamily: F, fontSize: 38, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', marginBottom: 14 }}>
            From role to result in minutes
          </h2>
          <p style={{ fontFamily: F, fontSize: 16, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
            No CVs, no guesswork. Just scenario-based AI assessment that reveals how candidates actually think.
          </p>
        </div>

        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            {
              n: '01', title: 'Describe the role',
              body: 'Enter the job title and description. Prodicta auto-detects the role type and sets up the assessment.',
              icon: '📝',
            },
            {
              n: '02', title: 'Invite candidates',
              body: 'Send a unique assessment link by email. Candidates complete it in their own time — no account needed.',
              icon: '✉️',
            },
            {
              n: '03', title: 'AI scores responses',
              body: 'Our model scores responses across communication, problem solving, prioritisation, and leadership.',
              icon: '🤖',
            },
            {
              n: '04', title: 'Get your results',
              body: 'Scores, watch-outs, Pressure-Fit rating, and tailored interview questions — ready in seconds.',
              icon: '📊',
            },
          ].map(s => (
            <div
              key={s.n}
              className="step-card"
              style={{
                background: '#fff', borderRadius: 14, padding: '28px 24px',
                border: '1px solid #e4e9f0',
                transition: 'border-color 0.15s, transform 0.15s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{s.icon}</div>
              <div style={{ fontFamily: F, fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: '0.08em', marginBottom: 8 }}>STEP {s.n}</div>
              <h3 style={{ fontFamily: F, fontSize: 16.5, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontFamily: F, fontSize: 13.5, color: '#5e6b7f', lineHeight: 1.65 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <SectionLabel>Features</SectionLabel>
          <h2 style={{ fontFamily: F, fontSize: 38, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', marginBottom: 14 }}>
            Everything you need to hire with confidence
          </h2>
          <p style={{ fontFamily: F, fontSize: 16, color: '#5e6b7f', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
            Built for direct employers and recruitment agencies.
          </p>
        </div>

        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            {
              title: 'AI Scenario Assessment',
              body: 'Candidates answer realistic work scenarios. Our model scores their thinking, not just their answers.',
              color: TEAL,
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><path d="M12 8v4l3 3"/></svg>,
            },
            {
              title: 'Pressure-Fit Score',
              body: 'Measures how candidates handle conflict, pressure, and ambiguity — the #1 predictor of probation outcomes.',
              color: '#7C3AED',
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            },
            {
              title: 'Response Integrity Check',
              body: 'Detects AI-assisted or copy-pasted answers. Know whether responses are genuine before you invest further.',
              color: '#F59E0B',
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx={12} cy={12} r={3}/></svg>,
            },
            {
              title: 'Watch-Outs & Risk Flags',
              body: 'Automatically surfaces specific concerns with recommended interview questions for each one.',
              color: '#EF4444',
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1={12} y1={9} x2={12} y2={13}/><line x1={12} y1={17} x2="12.01" y2={17}/></svg>,
            },
            {
              title: 'Candidate Comparison',
              body: 'Compare multiple candidates side-by-side across all metrics. Make decisions with data, not gut feel.',
              color: '#22C55E',
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1={18} y1={20} x2={18} y2={10}/><line x1={12} y1={20} x2={12} y2={4}/><line x1={6} y1={20} x2={6} y2={14}/></svg>,
            },
            {
              title: 'Agency: Placement Risk',
              body: 'For recruiters: a composite score estimating likelihood of successful placement, with client-ready reports.',
              color: TEAL,
              icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx={9} cy={7} r={4}/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            },
          ].map(f => (
            <div
              key={f.title}
              className="feature-card"
              style={{
                background: '#fff', borderRadius: 14, padding: '28px 26px',
                border: '1px solid #e4e9f0',
                transition: 'box-shadow 0.18s, transform 0.18s',
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: `${f.color}14`, border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: F, fontSize: 15.5, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontFamily: F, fontSize: 13.5, color: '#5e6b7f', lineHeight: 1.65 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <Section id="pricing" style={{ background: '#f7f9fb' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <SectionLabel>Pricing</SectionLabel>
          <h2 style={{ fontFamily: F, fontSize: 38, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', marginBottom: 14 }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontFamily: F, fontSize: 16, color: '#5e6b7f', lineHeight: 1.7 }}>
            No long contracts. Cancel any time.
          </p>
        </div>

        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, alignItems: 'start' }}>
          {[
            {
              name: 'Starter',
              price: '£49',
              desc: 'Perfect for small teams just getting started.',
              limit: '10 assessments/mo',
              features: ['AI scenario assessment', 'Pressure-Fit scoring', 'Response integrity check', 'Watch-outs & flags', 'Interview questions'],
              highlight: false,
              badge: null,
            },
            {
              name: 'Growth',
              price: '£99',
              desc: 'For growing teams with higher hiring volumes.',
              limit: '30 assessments/mo',
              features: ['Everything in Starter', 'Candidate comparison', 'Benchmarking', 'Onboarding plans', 'Team notes'],
              highlight: false,
              badge: null,
            },
            {
              name: 'Scale',
              price: '£120',
              desc: 'Unlimited assessments for high-volume hiring.',
              limit: 'Unlimited assessments',
              features: ['Everything in Growth', 'Unlimited assessments', 'Archive & outcomes tracking', 'Priority support', 'Agency features'],
              highlight: true,
              badge: 'MOST POPULAR',
            },
            {
              name: 'Founding',
              price: '£79',
              desc: 'Lock in founder pricing while it lasts.',
              limit: 'Unlimited assessments',
              features: ['Everything in Scale', 'Founding member rate', 'Direct feedback line', 'Feature co-creation'],
              highlight: false,
              badge: 'LIMITED TIME',
            },
          ].map(p => (
            <div
              key={p.name}
              style={{
                background: p.highlight ? NAVY : '#fff',
                borderRadius: 16,
                padding: '32px 28px',
                border: p.highlight ? `2px solid ${TEAL}` : '1px solid #e4e9f0',
                position: 'relative',
                boxShadow: p.highlight ? '0 12px 40px rgba(0,191,165,0.18)' : 'none',
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: TEAL, color: NAVY, fontFamily: F, fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 50,
                  whiteSpace: 'nowrap',
                }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: p.highlight ? TEAL : TEAL, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: F, fontSize: 38, fontWeight: 800, color: p.highlight ? '#fff' : NAVY, letterSpacing: '-1px' }}>{p.price}</span>
                <span style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.5)' : '#94a1b3' }}>/mo</span>
              </div>
              <div style={{ fontFamily: F, fontSize: 12.5, color: p.highlight ? `${TEAL}cc` : TEAL, fontWeight: 600, marginBottom: 8 }}>{p.limit}</div>
              <p style={{ fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.55)' : '#6b7280', lineHeight: 1.55, marginBottom: 24 }}>{p.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: F, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.8)' : '#374151' }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/login"
                style={{
                  display: 'block', width: '100%', padding: '12px 0', borderRadius: 10,
                  background: p.highlight ? TEAL : 'transparent',
                  border: p.highlight ? 'none' : `1.5px solid ${TEAL}`,
                  color: p.highlight ? NAVY : TEAL, fontFamily: F, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box',
                }}
              >
                Get started →
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* ══ CTA BANNER ════════════════════════════════════════════════════════ */}
      <Section style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0d2a43 100%)`,
        padding: '80px 0',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: F, fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', marginBottom: 16 }}>
            Start making better hires today
          </h2>
          <p style={{ fontFamily: F, fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
            Join employers and agencies using Prodicta to assess candidates with confidence.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/login"
              style={{
                fontFamily: F, fontSize: 16, fontWeight: 800, color: NAVY,
                background: TEAL, textDecoration: 'none',
                padding: '15px 40px', borderRadius: 12, display: 'inline-block',
              }}
            >
              Sign up free →
            </a>
            <a
              href="/demo"
              style={{
                fontFamily: F, fontSize: 16, fontWeight: 600, color: '#fff',
                background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.25)',
                textDecoration: 'none', padding: '15px 40px', borderRadius: 12, display: 'inline-block',
              }}
            >
              Try demo first
            </a>
          </div>
        </div>
      </Section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0a1929', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 40px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${TEAL}, ${TEALD})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 11, height: 11, border: '2px solid #fff', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>PRODICTA</span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['Terms', '/terms'], ['Privacy', '/privacy'], ['How it works', '/how-it-works'], ['Demo', '/demo']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ fontFamily: F, fontSize: 12.5, color: 'rgba(255,255,255,0.3)' }}>
            © {new Date().getFullYear()} Prodicta. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
