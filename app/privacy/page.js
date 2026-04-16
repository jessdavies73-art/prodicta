import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#009688'
const F     = "'Outfit', system-ui, sans-serif"

const EFFECTIVE_DATE = '1 April 2025'
const LAST_UPDATED   = '16 April 2026'
const COMPANY        = 'AIAURA Group Ltd (trading as PRODICTA)'
const EMAIL          = 'hello@prodicta.co.uk'

function Nav() {
  return (
    <nav style={{
      background: NAVY, padding: '0 40px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <a href="/" style={{ textDecoration: 'none' }}>
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
function TableRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: '#374151', width: 200, flexShrink: 0 }}>{label}</div>
      <div style={{ fontFamily: F, fontSize: 13.5, color: '#6b7280', flex: 1, lineHeight: 1.6 }}>{value}</div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: F }}>
      <Nav />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 40px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: F, fontSize: 36, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', margin: '0 0 12px' }}>Privacy Policy</h1>
          <p style={{ fontFamily: F, fontSize: 14, color: '#6b7280' }}>Effective date: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}</p>
          <div style={{ marginTop: 20, padding: '14px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10 }}>
            <p style={{ fontFamily: F, fontSize: 13.5, color: '#1e40af', margin: 0, lineHeight: 1.65 }}>
              This Privacy Policy explains how {COMPANY} collects, uses, and protects personal data in connection with the Prodicta platform. We are committed to your privacy and to complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 36 }} />

        <H2>1. Who We Are</H2>
        <P>
          {COMPANY} ("Prodicta", "we", "us", "our") is the data controller for personal data processed through the Prodicta platform. Our contact details are:
        </P>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <TableRow label="Company" value={COMPANY} />
          <TableRow label="Email" value={EMAIL} />
          <TableRow label="Jurisdiction" value="England and Wales" />
        </div>
        <P>For data protection queries, contact us at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>.</P>

        <H2>2. Data We Collect</H2>
        <P><strong>Account and profile data:</strong> when you create an account, we collect your email address, company name, and account type (direct employer or recruitment agency). We also collect any profile information you add in Settings.</P>
        <P><strong>Assessment content:</strong> job titles, job descriptions, skill weightings, and assessment templates you create.</P>
        <P><strong>SSP and employment records:</strong> statutory sick pay calculations, absence records, holiday pay entitlements, attendance logs, assignment review notes, and Fair Work Agency compliance packs generated through the platform. You are the data controller for this data; we process it on your behalf as a data processor.</P>
        <P><strong>Document templates:</strong> pre-filled employment document templates generated through the platform including assignment letters, SSP forms, and probation letters.</P>
        <P><strong>Candidate data:</strong> names, email addresses, and assessment responses of candidates you invite. You are the data controller for this data; we process it on your behalf as a data processor.</P>
        <P><strong>Usage data:</strong> information about how you use the Service, including pages visited, features used, and assessment activity. This helps us improve the platform and enforce usage limits.</P>
        <P><strong>Technical data:</strong> IP address, browser type, device information, and session data collected automatically when you use the Service.</P>
        <P><strong>Payment data:</strong> if you have a paid subscription, payment processing is handled by our payment provider. We do not store full card numbers.</P>

        <H2>3. How We Use Your Data</H2>
        <UL items={[
          'To create and manage your account and provide access to the Service',
          'To generate AI-powered candidate assessments and scoring',
          'To send transactional emails such as candidate invitation links, account confirmations, and password resets',
          'To enforce plan usage limits and manage your subscription',
          'To improve the accuracy and functionality of our AI models (using aggregated and anonymised data only)',
          'To respond to support requests and communications',
          'To generate SSP calculations, holiday pay records, Fair Work Agency compliance documentation, and employment document templates',
          'To send automated alerts for SSP checks, placement health changes, assignment performance deviations, and pre-start risk notifications',
          'To comply with legal obligations and enforce our Terms of Service',
          'To send product updates and service announcements (you can opt out at any time)',
        ]} />

        <H2>4. Legal Basis for Processing</H2>
        <div style={{ marginBottom: 20 }}>
          <TableRow label="Contract performance" value="Processing necessary to provide the Service you have signed up for, including account management, assessment delivery, and results generation." />
          <TableRow label="Legitimate interests" value="Improving our Service, preventing fraud, ensuring security, and sending relevant product communications." />
          <TableRow label="Legal obligation" value="Where processing is required to comply with applicable law, including data protection obligations and financial regulations." />
          <TableRow label="Consent" value="For optional marketing communications. You may withdraw consent at any time." />
        </div>

        <H2>5. Third-Party Services</H2>
        <P>We use the following trusted sub-processors to deliver the Service:</P>
        <div style={{ marginBottom: 20 }}>
          <TableRow label="Supabase" value="Database and authentication. Data stored in EU data centres. Supabase Inc. is certified under the EU-US Data Privacy Framework." />
          <TableRow label="Vercel" value="Hosting and deployment. Infrastructure located in the EU/UK." />
          <TableRow label="Resend" value="Transactional email delivery (candidate invitations, password resets). Data processed in the US under standard contractual clauses." />
          <TableRow label="Anthropic / OpenAI" value="AI inference for scoring candidate responses. Prompts include assessment content and anonymised response text. Neither provider uses your data to train their models under our agreements." />
          <TableRow label="Stripe" value="Payment processing. PCI DSS compliant. Data processed under Stripe's privacy policy." />
        </div>
        <P>We do not sell your personal data to third parties. We do not share personal data with advertisers.</P>

        <H2>6. Data Retention</H2>
        <UL items={[
          'Account data is retained for as long as your account is active, plus 30 days following deletion',
          'Candidate assessment data is retained for as long as you maintain your account or until you delete it',
          'Anonymised and aggregated data may be retained indefinitely for product improvement purposes',
          'Billing and transaction records are retained for 7 years as required by UK tax law',
          'SSP records and absence documentation are retained for a minimum of 3 years in accordance with HMRC requirements',
          'Holiday pay records are retained for a minimum of 6 years in accordance with HMRC requirements effective 2026',
          'Fair Work Agency compliance packs are retained for as long as your account is active',
          'You may request deletion of your data at any time by emailing ' + EMAIL,
        ]} />

        <H2>7. Your Rights Under UK GDPR</H2>
        <P>As a data subject, you have the following rights. To exercise any of these rights, contact us at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>.</P>
        <div style={{ marginBottom: 20 }}>
          <TableRow label="Right of access" value="Request a copy of the personal data we hold about you." />
          <TableRow label="Right to rectification" value="Request correction of inaccurate or incomplete personal data." />
          <TableRow label="Right to erasure" value="Request deletion of your personal data in certain circumstances." />
          <TableRow label="Right to restriction" value="Request that we limit how we use your personal data." />
          <TableRow label="Right to portability" value="Request a machine-readable copy of your personal data." />
          <TableRow label="Right to object" value="Object to processing based on legitimate interests, including direct marketing." />
          <TableRow label="Right to withdraw consent" value="Withdraw consent for processing based on consent at any time." />
        </div>
        <P>
          We will respond to requests within one month. If you are unsatisfied with our response, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noreferrer" style={{ color: TEAL }}>ico.org.uk</a>.
        </P>

        <H2>8. Candidate Data: Special Note for Employers</H2>
        <P>
          When you use Prodicta to assess candidates, you act as the data controller for candidate personal data. You are responsible for:
        </P>
        <UL items={[
          'Informing candidates about how their data will be used before they complete an assessment',
          'Ensuring you have a lawful basis for processing candidate data',
          'Responding to candidate data subject requests relating to their assessment data',
          'Ensuring candidate data is only used for legitimate recruitment purposes',
        ]} />
        <P>
          Prodicta's Data Processing Agreement (DPA), available on request, governs our processing of candidate data on your behalf.
        </P>

        <H2>9. Cookies</H2>
        <P>
          Prodicta uses essential cookies only. These are strictly necessary for the platform to function, specifically for managing authentication sessions. We do not use advertising, analytics, or tracking cookies.
        </P>
        <P>
          You can control cookies through your browser settings, but disabling essential cookies will prevent you from logging in.
        </P>

        <H2>10. Security</H2>
        <P>
          We implement appropriate technical and organisational measures to protect your personal data, including encryption in transit (TLS), encrypted storage, row-level security in our database, and access controls. Despite these measures, no system is perfectly secure. If you believe your account has been compromised, contact us immediately at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>.
        </P>
        <P>
          In the event of a personal data breach that is likely to result in a high risk to your rights and freedoms, we will notify you without undue delay and, where required, notify the ICO within 72 hours of becoming aware of the breach.
        </P>

        <H2>11. International Transfers</H2>
        <P>
          Some of our sub-processors are based outside the UK or EEA. Where we transfer personal data internationally, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) approved by the UK ICO, or an adequacy decision.
        </P>

        <H2>12. Changes to This Policy</H2>
        <P>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice in the platform at least 14 days before the changes take effect. The "last updated" date at the top of this page reflects the most recent revision.
        </P>

        <H2>13. Contact and Complaints</H2>
        <P>
          For any privacy-related questions or to exercise your rights, contact us at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>. We aim to respond to all requests within 30 days.
        </P>
        <P>
          If you are unhappy with how we have handled your data, you may complain to the ICO: <a href="https://ico.org.uk/make-a-complaint" target="_blank" rel="noreferrer" style={{ color: TEAL }}>ico.org.uk/make-a-complaint</a>.
        </P>

        <div style={{ marginTop: 56, padding: '20px 24px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <p style={{ fontFamily: F, fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>
            PRODICTA is a product of <strong style={{ color: '#374151' }}>{COMPANY}</strong> · Registered in England and Wales ·{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: TEAL, textDecoration: 'none' }}>{EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
