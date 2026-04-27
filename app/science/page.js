import Link from 'next/link'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#00BFA5'
const TEALD = '#00897B'
const TEALLT = '#e6f7f4'
const CREAM = '#FAF9F4'
const TX    = '#1a202c'
const TX2   = '#3f4a5c'
const TX3   = '#6b7689'
const TX4   = '#94a1b3'
const F     = "'Outfit', system-ui, sans-serif"

export const metadata = {
  title: 'The Science: Scientific Foundations of PRODICTA',
  description:
    'The research and methodology behind PRODICTA: work sample simulations, assessment centre principles, behavioural science, and AI-driven analysis of real candidate performance.',
  alternates: { canonical: 'https://prodicta.co.uk/science' },
  openGraph: {
    title: 'The Science: Scientific Foundations of PRODICTA',
    description:
      'From prediction to performance. The peer-reviewed research and industry evidence behind PRODICTA.',
    url: 'https://prodicta.co.uk/science',
    type: 'article',
  },
}

const SUBHEAD_STYLE = {
  fontFamily: F,
  fontSize: 12,
  fontWeight: 700,
  color: TEAL,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  margin: '32px 0 14px',
}

const PARA_STYLE = {
  fontFamily: F,
  fontSize: 16,
  color: TX2,
  lineHeight: 1.75,
  margin: '0 0 16px',
}

const BULLET_LIST_STYLE = {
  listStyle: 'none',
  padding: 0,
  margin: '0 0 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

function Bullet({ children }) {
  return (
    <li
      style={{
        fontFamily: F,
        fontSize: 16,
        color: TX2,
        lineHeight: 1.7,
        position: 'relative',
        paddingLeft: 22,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 4,
          top: 11,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: TEAL,
          display: 'inline-block',
        }}
      />
      {children}
    </li>
  )
}

function Quote({ text, citation }) {
  return (
    <figure
      style={{
        margin: '20px 0 22px',
        padding: '4px 0 4px 20px',
        borderLeft: `3px solid ${TEAL}`,
      }}
    >
      <blockquote
        style={{
          fontFamily: F,
          fontSize: 17,
          fontStyle: 'italic',
          color: NAVY,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        &ldquo;{text}&rdquo;
      </blockquote>
      {citation && (
        <figcaption
          style={{
            fontFamily: F,
            fontSize: 13,
            color: TX3,
            marginTop: 8,
            fontStyle: 'normal',
          }}
        >
          {citation}
        </figcaption>
      )}
    </figure>
  )
}

function Section({ number, title, bg, children }) {
  return (
    <section
      style={{
        background: bg,
        padding: 'clamp(56px, 7vw, 88px) 24px',
        borderTop: bg === CREAM ? '1px solid rgba(15,33,55,0.05)' : 'none',
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div
          className="pd-science-row"
          style={{
            display: 'flex',
            gap: 'clamp(18px, 3vw, 36px)',
            alignItems: 'flex-start',
          }}
        >
          <div
            className="pd-science-num"
            style={{
              flexShrink: 0,
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: TEALLT,
              border: `2px solid ${TEAL}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: F,
              fontSize: 30,
              fontWeight: 800,
              color: TEALD,
              lineHeight: 1,
              letterSpacing: '-0.5px',
            }}
          >
            {number}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: F,
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 800,
                color: NAVY,
                letterSpacing: '-0.6px',
                lineHeight: 1.2,
                margin: '6px 0 22px',
              }}
            >
              {title}
            </h2>
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

function PlainSection({ title, bg, children, narrow = false }) {
  return (
    <section
      style={{
        background: bg,
        padding: 'clamp(56px, 7vw, 88px) 24px',
        borderTop: bg === CREAM ? '1px solid rgba(15,33,55,0.05)' : 'none',
      }}
    >
      <div style={{ maxWidth: narrow ? 720 : 880, margin: '0 auto' }}>
        {title && (
          <h2
            style={{
              fontFamily: F,
              fontSize: 'clamp(26px, 3.4vw, 36px)',
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '-0.6px',
              lineHeight: 1.2,
              margin: '0 0 22px',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

export default function SciencePage() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: F, color: TX, background: '#fff' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @media (max-width: 640px) {
          .pd-science-row { flex-direction: column !important; gap: 14px !important; }
          .pd-science-num { width: 56px !important; height: 56px !important; font-size: 22px !important; }
        }
      `,
        }}
      />

      <header
        style={{
          background: NAVY,
          padding: '18px clamp(16px, 3vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <ProdictaLogo textColor="#ffffff" size={32} />
        </Link>
        <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            Home
          </Link>
          <Link href="/science" style={{ fontSize: 13, color: TEAL, textDecoration: 'none', fontWeight: 700 }}>
            The Science
          </Link>
          <Link href="/blog" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            Blog
          </Link>
          <Link href="/demo" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            Demo
          </Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section
        style={{
          background: CREAM,
          padding: 'clamp(72px, 9vw, 120px) 24px',
          borderBottom: '1px solid rgba(15,33,55,0.05)',
        }}
      >
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: F,
              fontSize: 12,
              fontWeight: 700,
              color: TEAL,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginBottom: 18,
            }}
          >
            The Science
          </div>
          <h1
            style={{
              fontFamily: F,
              fontSize: 'clamp(36px, 5.4vw, 60px)',
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '-1.4px',
              lineHeight: 1.08,
              margin: '0 0 18px',
            }}
          >
            Scientific Foundations of PRODICTA
          </h1>
          <p
            style={{
              fontFamily: F,
              fontSize: 'clamp(17px, 1.8vw, 20px)',
              color: TX2,
              lineHeight: 1.6,
              margin: '0 0 32px',
              fontWeight: 500,
            }}
          >
            From prediction to performance
          </p>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'left' }}>
            <p style={PARA_STYLE}>
              Traditional hiring methods focus on measuring traits such as personality, cognitive
              ability, and behavioural preferences. These approaches are widely used and supported by
              research. But they answer a limited question: What is this person like?
            </p>
            <p style={{ ...PARA_STYLE, margin: 0 }}>
              PRODICTA is built to answer a more important one: How will this person actually
              perform in the job?
            </p>
          </div>
        </div>
      </section>

      {/* Section 1 */}
      <Section number="1" title="Work sample simulations" bg="#fff">
        <p style={PARA_STYLE}>
          PRODICTA replaces CV screening and theoretical assessment with realistic job simulations.
        </p>

        <div style={SUBHEAD_STYLE}>The science</div>
        <Quote
          text="Work sample tests, where candidates perform real job tasks, are among the most predictive indicators of job performance."
          citation="Schmidt and Hunter (1998; updated 2016)"
        />
        <p style={PARA_STYLE}>In comparison:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Years of experience has low predictive value, around 0.18</Bullet>
          <Bullet>Education level has low predictive value, around 0.10</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>Traditional hiring relies on proxies:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>CVs</Bullet>
          <Bullet>Qualifications</Bullet>
          <Bullet>Self-reported answers</Bullet>
        </ul>
        <p style={PARA_STYLE}>
          Work simulations measure something fundamentally different: Observed performance in
          job-relevant situations.
        </p>

        <div style={SUBHEAD_STYLE}>The PRODICTA approach</div>
        <p style={PARA_STYLE}>PRODICTA places candidates into Day 1 scenarios where they must:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Prioritise tasks</Bullet>
          <Bullet>Make decisions under pressure</Bullet>
          <Bullet>Respond to real constraints</Bullet>
          <Bullet>Communicate in context</Bullet>
        </ul>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          Not what they say they would do, but what they actually do.
        </p>
      </Section>

      {/* Section 2 */}
      <Section number="2" title="Behaviour depends on context" bg={CREAM}>
        <p style={PARA_STYLE}>Research shows behaviour is shaped by the situation.</p>

        <div style={SUBHEAD_STYLE}>The science</div>
        <Quote
          text="Performance is influenced as much by context as by personality."
          citation="Mischel (1968)"
        />
        <p style={PARA_STYLE}>The same individual may behave differently depending on:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Pressure</Bullet>
          <Bullet>Competing priorities</Bullet>
          <Bullet>Stakeholder expectations</Bullet>
          <Bullet>Organisational environment</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          Assessing candidates outside of real context limits accuracy. To understand performance,
          behaviour must be observed in realistic conditions.
        </p>
      </Section>

      {/* Section 3 */}
      <Section number="3" title="From traits to behaviour" bg="#fff">
        <p style={PARA_STYLE}>
          Research shows that while personality traits describe general tendencies, observed
          behaviour in real situations provides a stronger and more reliable signal for predictive
          analysis.
        </p>
        <p style={PARA_STYLE}>
          Personality-performance research demonstrates moderate correlations between traits and
          job outcomes (Barrick and Mount, 1991), while behavioural science shows that performance
          is highly dependent on situational context (Mischel, 1968).
        </p>
        <p style={PARA_STYLE}>
          Meta-analyses of hiring methods further show that approaches based on real job tasks,
          such as work sample tests, are among the most predictive indicators of performance
          (Schmidt and Hunter, 1998; 2016).
        </p>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          Personality provides useful insight, but it does not capture how someone behaves when it
          matters. Observed behaviour in context provides a stronger, more reliable signal.
        </p>
      </Section>

      {/* Section 4 */}
      <Section number="4" title="Assessment centre methodology" bg={CREAM}>
        <p style={PARA_STYLE}>
          PRODICTA reflects principles used in assessment centres, a long-established approach in
          high-stakes hiring.
        </p>

        <div style={SUBHEAD_STYLE}>The science</div>
        <p style={PARA_STYLE}>Assessment centres evaluate candidates through:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Simulations</Bullet>
          <Bullet>Role-based exercises</Bullet>
          <Bullet>Real-world tasks</Bullet>
        </ul>
        <Quote
          text="Research shows these methods have strong predictive validity and are widely trusted for evaluating job performance."
          citation="Thornton and Rupp (2006)"
        />

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>Assessment centres are effective but traditionally:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Expensive</Bullet>
          <Bullet>Time-intensive</Bullet>
          <Bullet>Difficult to scale</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>The PRODICTA approach</div>
        <p style={PARA_STYLE}>
          PRODICTA brings the same principles into a scalable, digital format:
        </p>
        <ul style={{ ...BULLET_LIST_STYLE, marginBottom: 0 }}>
          <Bullet>On-demand simulations</Bullet>
          <Bullet>Role-specific scenarios</Bullet>
          <Bullet>Consistent evaluation</Bullet>
        </ul>
      </Section>

      {/* Section 5 */}
      <Section number="5" title="Experiential performance" bg="#fff">
        <p style={PARA_STYLE}>
          Research in experiential learning shows that performance is best understood through
          action.
        </p>
        <p style={{ ...PARA_STYLE, color: TX3, fontSize: 14 }}>Kolb (1984)</p>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>People demonstrate capability most accurately when:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Actively performing tasks</Bullet>
          <Bullet>Making decisions in context</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>The PRODICTA approach</div>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          PRODICTA captures behaviour as it naturally occurs during real work simulation.
        </p>
      </Section>

      {/* Section 6 */}
      <Section number="6" title="Decision-making under pressure" bg={CREAM}>
        <p style={PARA_STYLE}>
          Real-world performance depends on how individuals operate under constraint.
        </p>

        <div style={SUBHEAD_STYLE}>The science</div>
        <p style={PARA_STYLE}>Decision science shows that behaviour is influenced by:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Time pressure</Bullet>
          <Bullet>Incomplete information</Bullet>
          <Bullet>Cognitive load</Bullet>
        </ul>
        <p style={{ ...PARA_STYLE, color: TX3, fontSize: 14 }}>
          Kahneman (2011); Sweller (Cognitive Load Theory)
        </p>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>Traditional tests do not reflect real working conditions.</p>

        <div style={SUBHEAD_STYLE}>The PRODICTA approach</div>
        <p style={PARA_STYLE}>PRODICTA introduces:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Time constraints</Bullet>
          <Bullet>Competing priorities</Bullet>
          <Bullet>Imperfect information</Bullet>
        </ul>
        <p style={{ ...PARA_STYLE, margin: 0 }}>To reveal true decision-making behaviour.</p>
      </Section>

      {/* Section 7 */}
      <Section number="7" title="Behaviour vs intention" bg="#fff">
        <p style={PARA_STYLE}>
          Behavioural science shows that individuals do not always act in line with their
          self-perception.
        </p>
        <p style={{ ...PARA_STYLE, color: TX3, fontSize: 14 }}>Kahneman and Tversky</p>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>Self-reported answers:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Can be biased</Bullet>
          <Bullet>May not reflect real behaviour</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>The PRODICTA approach</div>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          PRODICTA measures actual decisions, not stated intentions.
        </p>
      </Section>

      {/* Section 8 */}
      <Section number="8" title="AI-driven behavioural analysis" bg={CREAM}>
        <p style={PARA_STYLE}>
          PRODICTA combines behavioural science with modern AI to interpret candidate performance.
        </p>

        <div style={SUBHEAD_STYLE}>The science</div>
        <p style={PARA_STYLE}>Research in AI and HR analytics shows:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Data-driven hiring improves consistency and decision quality</Bullet>
          <Bullet>Behavioural data provides stronger signals than self-reported input</Bullet>
          <Bullet>Structured evaluation reduces bias and variability</Bullet>
        </ul>
        <p style={PARA_STYLE}>Supported by:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>IBM Smarter Workforce Institute</Bullet>
          <Bullet>McKinsey research</Bullet>
          <Bullet>Frontiers in Psychology (2022)</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>
          AI is most effective when applied to real behavioural data observed in context, rather
          than relying solely on abstract or self-reported questionnaire responses.
        </p>

        <div style={SUBHEAD_STYLE}>The PRODICTA application</div>
        <p style={PARA_STYLE}>PRODICTA analyses:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Decision patterns</Bullet>
          <Bullet>Prioritisation behaviour</Bullet>
          <Bullet>Risk awareness</Bullet>
          <Bullet>Consistency under pressure</Bullet>
          <Bullet>Communication style</Bullet>
        </ul>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          Turning observed behaviour into structured, data-driven hiring insight.
        </p>
      </Section>

      {/* Section 9 */}
      <Section number="9" title="AI, data, and modern hiring" bg="#fff">
        <p style={PARA_STYLE}>Research shows that:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>AI improves hiring speed and efficiency</Bullet>
          <Bullet>Predictive analytics improves workforce outcomes</Bullet>
          <Bullet>Data-driven organisations make better talent decisions</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>The critical insight</div>
        <p style={PARA_STYLE}>AI is only as powerful as the data it is trained on.</p>
        <p style={PARA_STYLE}>Traditional systems rely on:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>CV data</Bullet>
          <Bullet>Keyword matching</Bullet>
          <Bullet>Static inputs</Bullet>
        </ul>
        <p style={PARA_STYLE}>
          PRODICTA uses observed behavioural data from realistic job scenarios.
        </p>

        <div style={SUBHEAD_STYLE}>What this enables</div>
        <ul style={{ ...BULLET_LIST_STYLE, marginBottom: 0 }}>
          <Bullet>Deeper pattern recognition</Bullet>
          <Bullet>Early identification of risk</Bullet>
          <Bullet>Stronger prediction of performance and retention</Bullet>
          <Bullet>More consistent and defensible decisions</Bullet>
        </ul>
      </Section>

      {/* Section 10 */}
      <Section number="10" title="The commercial reality" bg={CREAM}>
        <p style={PARA_STYLE}>Hiring accuracy has direct financial impact.</p>

        <div style={SUBHEAD_STYLE}>Industry benchmarks</div>
        <p style={PARA_STYLE}>CIPD reports:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Average cost per hire around £6,000</Bullet>
          <Bullet>Manager-level hires around £19,000</Bullet>
        </ul>
        <p style={PARA_STYLE}>REC benchmarks indicate:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>Typical bad hire cost between £30,000 and £50,000</Bullet>
          <Bullet>Mid-management failures can exceed £100,000</Bullet>
        </ul>

        <div style={SUBHEAD_STYLE}>What this means</div>
        <p style={PARA_STYLE}>Even small improvements in hiring accuracy:</p>
        <ul style={{ ...BULLET_LIST_STYLE, marginBottom: 0 }}>
          <Bullet>Reduce cost</Bullet>
          <Bullet>Protect revenue</Bullet>
          <Bullet>Improve retention</Bullet>
          <Bullet>Strengthen client relationships</Bullet>
        </ul>
      </Section>

      {/* Bringing it together */}
      <PlainSection title="Bringing it together" bg="#fff" narrow>
        <p style={PARA_STYLE}>Across research and industry evidence:</p>
        <ul style={{ ...BULLET_LIST_STYLE, marginBottom: 0 }}>
          <Bullet>Personality provides general signals</Bullet>
          <Bullet>Behaviour depends on context</Bullet>
          <Bullet>Real work reveals performance</Bullet>
          <Bullet>Experiential methods improve accuracy</Bullet>
          <Bullet>Behavioural data strengthens prediction</Bullet>
          <Bullet>AI enhances consistency and insight</Bullet>
        </ul>
      </PlainSection>

      {/* The PRODICTA principle highlight */}
      <section
        style={{
          background: TEAL,
          padding: 'clamp(72px, 9vw, 110px) 24px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: F,
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              marginBottom: 22,
            }}
          >
            The PRODICTA principle
          </div>
          <p
            style={{
              fontFamily: F,
              fontSize: 'clamp(24px, 3.4vw, 36px)',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.3,
              letterSpacing: '-0.4px',
              margin: '0 0 22px',
            }}
          >
            We do not test personality or theory.
          </p>
          <p
            style={{
              fontFamily: F,
              fontSize: 'clamp(20px, 2.6vw, 28px)',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1.45,
              letterSpacing: '-0.2px',
              margin: 0,
            }}
          >
            We put candidates into real job situations and measure how they actually perform.
          </p>
        </div>
      </section>

      {/* Final thought */}
      <PlainSection title="Final thought" bg={CREAM} narrow>
        <p style={PARA_STYLE}>Hiring should not rely on:</p>
        <ul style={BULLET_LIST_STYLE}>
          <Bullet>What candidates say</Bullet>
          <Bullet>What their CV suggests</Bullet>
          <Bullet>Abstract testing alone</Bullet>
        </ul>
        <p style={PARA_STYLE}>
          It should be based on: How they actually perform when it matters.
        </p>
        <p style={{ ...PARA_STYLE, margin: 0 }}>
          PRODICTA brings real work into the hiring process so decisions are based on evidence, not
          guesswork.
        </p>
        <div style={{ marginTop: 36, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              fontFamily: F,
              fontSize: 14,
              fontWeight: 700,
              color: NAVY,
              background: TEAL,
              padding: '12px 22px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            Get started →
          </Link>
          <Link
            href="/demo"
            style={{
              display: 'inline-block',
              fontFamily: F,
              fontSize: 14,
              fontWeight: 700,
              color: NAVY,
              border: `1.5px solid ${NAVY}`,
              padding: '12px 22px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            See the demo
          </Link>
        </div>
      </PlainSection>

      {/* References */}
      <section style={{ background: '#fff', padding: 'clamp(56px, 7vw, 88px) 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: F,
              fontSize: 'clamp(24px, 3vw, 30px)',
              fontWeight: 800,
              color: NAVY,
              letterSpacing: '-0.4px',
              margin: '0 0 22px',
            }}
          >
            References
          </h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {[
              'Schmidt, F. L., and Hunter, J. E. (1998; 2016) Psychological Bulletin',
              'Barrick, M. R., and Mount, M. K. (1991) Personnel Psychology',
              'Mischel, W. (1968) Personality and Assessment',
              'Thornton, G. C., and Rupp, D. E. (2006) Assessment Centre Method',
              'Kolb, D. A. (1984) Experiential Learning',
              'Kahneman, D. (2011) Thinking, Fast and Slow',
              'Kahneman, D., and Tversky, A. Behavioural decision theory',
              'Sweller, J. Cognitive Load Theory',
              'Christian et al. (2010) Personnel Psychology',
              'McDaniel et al. (2007) Personnel Psychology',
              'Webster et al. (2020) Medical Education',
              'IBM Smarter Workforce Institute research',
              'McKinsey research on data-driven decision-making',
              'Frontiers in Psychology (2022)',
              'CIPD Resourcing and Talent Planning Reports',
              'REC industry benchmarks',
            ].map((ref, i) => (
              <li
                key={i}
                style={{
                  fontFamily: F,
                  fontSize: 14,
                  color: TX3,
                  lineHeight: 1.65,
                  position: 'relative',
                  paddingLeft: 18,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 2,
                    top: 9,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: TX4,
                    display: 'inline-block',
                  }}
                />
                {ref}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer style={{ padding: '32px 24px 48px', textAlign: 'center', background: '#fff' }}>
        <p style={{ fontFamily: F, fontSize: 12.5, color: '#6b7280', margin: 0 }}>
          © 2026 PRODICTA. All rights reserved.
        </p>
        <p style={{ fontFamily: F, fontSize: 11, color: TX4, margin: '4px 0 0' }}>
          Powered by AIAURA Group Ltd
        </p>
      </footer>
    </div>
  )
}
