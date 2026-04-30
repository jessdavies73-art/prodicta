import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#009688'
const F     = "'Outfit', system-ui, sans-serif"

const EFFECTIVE_DATE = '30 April 2026'
const LAST_UPDATED   = '30 April 2026'
const NEXT_REVIEW    = '31 October 2026'
const FULL_AUDIT_BY  = '31 December 2026'
const COMPANY        = 'AIAURA Group Ltd (trading as PRODICTA)'
const EMAIL          = 'hello@prodicta.co.uk'

export const metadata = {
  title: 'Accessibility Statement',
  description: 'PRODICTA accessibility statement. We aim to meet WCAG 2.2 Level AA. Automated audit completed; manual testing across assistive technologies ongoing.',
}

function Nav() {
  return (
    <nav style={{
      background: NAVY, padding: '0 40px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <a href="/" style={{ textDecoration: 'none' }} aria-label="PRODICTA home">
        <ProdictaLogo textColor="#ffffff" size={32} />
      </a>
      <a href="/login" style={{ fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>Sign in</a>
    </nav>
  )
}

function H2({ children }) {
  return <h2 style={{ fontFamily: F, fontSize: 19, fontWeight: 700, color: NAVY, margin: '36px 0 10px', letterSpacing: '-0.2px' }}>{children}</h2>
}
function P({ children }) {
  return <p style={{ fontFamily: F, fontSize: 14.5, color: '#374151', lineHeight: 1.8, margin: '0 0 14px' }}>{children}</p>
}
function UL({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: 22 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontFamily: F, fontSize: 14.5, color: '#374151', lineHeight: 1.8, marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  )
}

export default function AccessibilityPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: F }}>
      <Nav />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 40px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: F, fontSize: 36, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', margin: '0 0 12px' }}>Accessibility Statement</h1>
          <p style={{ fontFamily: F, fontSize: 14, color: '#6b7280' }}>Effective date: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}</p>
          <div style={{ marginTop: 20, padding: '14px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
            <p style={{ fontFamily: F, fontSize: 13.5, color: '#1e40af', margin: 0, lineHeight: 1.65 }}>
              PRODICTA aims to meet WCAG 2.2 Level AA. This statement records the work completed to date and the work that is still in progress.
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 36 }} />

        <H2>1. Our commitment</H2>
        <P>
          PRODICTA aims to meet WCAG 2.2 Level AA standards. We have completed an automated accessibility audit on {EFFECTIVE_DATE} and addressed the findings. Manual testing across assistive technologies is ongoing. We commit to a full professional audit by {FULL_AUDIT_BY}.
        </P>

        <H2>2. Standards we work towards</H2>
        <P>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA, the standard required for public sector digital services in the United Kingdom under the Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018.
        </P>

        <H2>3. What we have done</H2>
        <UL items={[
          'Completed an automated WCAG 2.2 AA audit across the codebase',
          'Restored visible keyboard focus indicators across all inputs, buttons, and interactive elements (WCAG 2.4.7 Focus Visible)',
          'Added a "skip to main content" link on every page so keyboard users can bypass navigation (WCAG 2.4.1 Bypass Blocks)',
          'Set the page language to en-GB on the root document so assistive technologies pronounce content correctly (WCAG 3.1.1 Language of Page)',
          'Added support for the prefers-reduced-motion media query so users who prefer reduced motion see shortened or removed transitions (WCAG 2.3.3 Animation from Interactions)',
          'Standardised the info-tooltip component across the product so the tooltip anchors correctly to its trigger, supports keyboard activation (Enter and Space), respects Escape to dismiss, and exposes the relationship to assistive technologies via aria-describedby (WCAG 1.4.13, 2.1.1, 4.1.2)',
          'Confirmed presence of semantic page landmarks (nav, main) on the root layout',
          'Reviewed transactional email templates for adequate colour contrast and decorative-image alt text',
          'Shipped a Reasonable Adjustments Layer 1 disclosure UI on the candidate landing screen so candidates can declare adjustments under the Equality Act 2010 before starting an assessment, with informational notice to the inviting agency or employer',
          'Shipped Reasonable Adjustments Layer 2 candidate-controlled adjustments: a Simplified Mode toggle that pauses animations and de-emphasises time pressure indicators, voice-response improvements with keyboard activation and screen reader announcements, and auto-pre-tick of these modes when the candidate previously declared the corresponding need in Layer 1',
          'Added keyboard activation, screen reader announcements via aria-live regions, and pick-up-and-drop pattern (Space, arrow keys, Escape) to the forced-choice ranking, select-exclude, and trade-off scenario types',
          'Added empty-submission and incomplete-submission validation across all candidate response types (typed, voice, forced-choice) with role=alert error banners, aria-invalid, and focus management',
          'Completed the Workspace simulation accessibility sprint for the Strategy-Fit candidate experience: task list semantics with 44px touch targets and aria-pressed (WCAG 2.5.5, 4.1.2), email inbox row buttons with aria-expanded, messages and inbox triage region landmarks with contextual aria-labels, calendar surfaces with labelled selects and inputs and aria-expanded note toggles, mid-task interruption converted to a proper dialog with role=dialog, aria-modal, focus trap, Escape handler, and focus restoration, and live-region announcements on the in-scenario and surprise notification toasts',
          'Exported the PRODICTA logo as standalone SVG and PNG variants in /brand/ for accessible external use',
        ]} />

        <H2>4. What is still in progress</H2>
        <UL items={[
          'Manual testing with screen readers (JAWS, NVDA, VoiceOver) is ongoing across all candidate-facing and agency-facing surfaces. The keyboard and ARIA work shipped above is verified by code review and follows WAI-ARIA authoring practices, but real-device screen reader passes are still pending and may surface wording or flow refinements',
          'Form error association on agency and employer-facing surfaces (login, account creation, settings, billing) still relies on visual-only error display; the consistent aria-invalid and role=alert pattern shipped on candidate responses will be extended to these surfaces',
          'Brand jade #00BFA5 is used as an accent rather than for body text; we are auditing remaining surfaces where jade is used for small text against white to ensure 4.5:1 contrast',
          'Reasonable adjustments configurable by the inviting agency or employer (extended time configurable per candidate, additional screen reader presets) is planned for later in 2026',
          'Professional accessibility audit scheduled for completion by ' + FULL_AUDIT_BY,
        ]} />

        <H2>5. Reasonable adjustments</H2>
        <P>
          If you require adjustments to take a PRODICTA assessment, please contact the agency or employer who invited you. They can request adjustments on your behalf and we will work with them to provide what you need.
        </P>

        <H2>6. Reporting accessibility issues</H2>
        <P>
          If you encounter an accessibility issue with PRODICTA, please contact us at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>. We commit to acknowledging your report within 7 working days and addressing the issue or providing an alternative way to access the content.
        </P>

        <H2>7. Compatibility</H2>
        <P>PRODICTA aims to be compatible with:</P>
        <UL items={[
          'Modern browsers: Chrome, Edge, Firefox, Safari (latest two major versions)',
          'Screen readers: JAWS, NVDA, VoiceOver (testing ongoing)',
          'Keyboard-only navigation',
          'Mobile devices (iOS and Android)',
        ]} />

        <H2>8. Last reviewed and next review</H2>
        <P>
          Last reviewed: {LAST_UPDATED}<br />
          Next scheduled review: {NEXT_REVIEW}
        </P>

        <div style={{ marginTop: 56, padding: '20px 24px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <p style={{ fontFamily: F, fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>
            PRODICTA is a product of <strong style={{ color: '#374151' }}>{COMPANY}</strong> · Registered in England and Wales ·{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: TEAL, textDecoration: 'none' }}>{EMAIL}</a>
          </p>
        </div>

        <div style={{ marginTop: 36, textAlign: 'center' }}>
          <p style={{ fontFamily: F, fontSize: 12.5, color: '#6b7280', margin: 0 }}>
            © 2026 PRODICTA. All rights reserved.
          </p>
          <p style={{ fontFamily: F, fontSize: 11, color: '#94a1b3', margin: '4px 0 0' }}>
            Powered by AIAURA Group Ltd
          </p>
        </div>
      </div>
    </div>
  )
}
