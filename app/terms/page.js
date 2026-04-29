import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY  = '#0f2137'
const TEAL  = '#009688'
const F     = "'Outfit', system-ui, sans-serif"

const EFFECTIVE_DATE = '1 April 2025'
const LAST_UPDATED   = '16 April 2026'
const COMPANY        = 'AIAURA Group Ltd'
const EMAIL          = 'hello@prodicta.co.uk'
const DOMAIN         = 'prodicta.co.uk'

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

export default function TermsPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: F }}>
      <Nav />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 40px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: F, fontSize: 36, fontWeight: 800, color: NAVY, letterSpacing: '-0.8px', margin: '0 0 12px' }}>Terms of Service</h1>
          <p style={{ fontFamily: F, fontSize: 14, color: '#6b7280' }}>Effective date: {EFFECTIVE_DATE} · Last updated: {LAST_UPDATED}</p>
          <div style={{ marginTop: 20, padding: '14px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
            <p style={{ fontFamily: F, fontSize: 13.5, color: '#166534', margin: 0, lineHeight: 1.65 }}>
              Please read these Terms of Service carefully before using Prodicta. By creating an account or using our platform, you agree to be bound by these terms.
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 36 }} />

        <H2>1. About Prodicta</H2>
        <P>
          Prodicta is an AI-powered candidate assessment platform operated by {COMPANY} ("Prodicta", "we", "us", or "our"). Our platform is accessible at {DOMAIN} and enables employers and recruitment agencies to assess candidate potential and predict hiring outcomes using artificial intelligence.
        </P>
        <P>
          These Terms of Service ("Terms") govern your access to and use of Prodicta's website, platform, APIs, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of a company or other legal entity, you represent that you have authority to bind that entity to these Terms.
        </P>

        <H2>2. Eligibility and Accounts</H2>
        <P>To use Prodicta, you must:</P>
        <UL items={[
          'Be at least 18 years of age',
          'Have the legal authority to enter into a binding contract in your jurisdiction',
          'Provide accurate and complete registration information',
          'Keep your account credentials secure and not share them with others',
          'Promptly notify us of any unauthorised access to your account at ' + EMAIL,
        ]} />
        <P>
          You are responsible for all activity that occurs under your account. We reserve the right to suspend or terminate accounts that violate these Terms, are used fraudulently, or remain inactive for an extended period.
        </P>

        <H2>3. The Service</H2>
        <P>
          Prodicta provides tools for creating scenario-based assessments, inviting candidates to complete those assessments, receiving AI-generated scoring and analysis, managing statutory sick pay calculations and compliance documentation, tracking holiday pay entitlements, monitoring placement health for recruitment agencies, generating employment-related document templates, and supporting Fair Work Agency compliance record keeping. The Service is intended for use in legitimate recruitment and hiring processes.
        </P>
        <P>You agree to use the Service only for its intended purpose. You must not:</P>
        <UL items={[
          'Use the Service for any unlawful purpose or in violation of any applicable laws or regulations',
          'Discriminate against candidates on the basis of protected characteristics including age, disability, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, or sexual orientation',
          'Use AI-generated scores as the sole or determinative basis for hiring decisions without applying human judgement',
          'Attempt to reverse-engineer, decompile, or extract the underlying models or algorithms',
          'Resell, sublicense, or commercially exploit the Service without our prior written consent',
          'Use automated tools to scrape, crawl, or extract data from the Service',
          'Upload or transmit malicious code, viruses, or other harmful content',
          'Impersonate any person or entity or misrepresent your affiliation with any person or entity',
        ]} />

        <H2>4. Candidate Data and Consent</H2>
        <P>
          When using Prodicta to assess candidates, you are the data controller for the personal data you collect about candidates. You are responsible for ensuring that you have a valid legal basis for processing candidate data and that candidates are informed about how their data will be used.
        </P>
        <P>
          Prodicta acts as a data processor on your behalf when processing candidate data. You must ensure that your use of the Service complies with applicable data protection laws, including the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
        </P>
        <P>You must not use the Service to assess individuals without their knowledge or consent.</P>

        <H2>5. AI Outputs and Limitations</H2>
        <P>
          The scores, assessments, watch-outs, and other outputs generated by Prodicta are produced by artificial intelligence and are provided for informational and decision-support purposes only. They do not constitute professional HR, legal, or psychological advice.
        </P>
        <P>
          AI-generated outputs may contain errors or inaccuracies. You acknowledge that:
        </P>
        <UL items={[
          'AI assessments are one input into your hiring process, not a replacement for human judgement',
          'Results should be interpreted in context and considered alongside other information',
          'Prodicta does not guarantee the accuracy, completeness, or fitness for purpose of any AI-generated output',
          'You remain solely responsible for any hiring decisions made using the Service',
        ]} />

        <H2>5a. SSP Calculations and Compliance Tools</H2>
        <P>
          PRODICTA provides tools to assist with Statutory Sick Pay calculations, Fair Work Agency compliance documentation, and employment record keeping. These tools are provided as guidance only and do not constitute legal or payroll advice. SSP calculations are based on legislation effective as of the date shown and may not reflect subsequent changes in law.
        </P>
        <P>
          You remain solely responsible for verifying all SSP calculations with a qualified payroll provider or accountant and for ensuring your employment practices comply with applicable legislation including the Employment Rights Act 2025 and SSP regulations. PRODICTA's compliance packs and documentation tools create records of process but do not guarantee legal compliance or protect against tribunal claims. PRODICTA provides documentation to support your legal position; it does not provide legal advice. Consult a qualified solicitor for guidance on specific cases.
        </P>

        <H2>6. Subscription and Billing</H2>
        <P>
          Access to certain features of the Service requires a paid subscription. Subscription fees are charged monthly in advance. By subscribing, you authorise us to charge your payment method on a recurring basis until you cancel.
        </P>
        <P>
          We reserve the right to modify pricing with 30 days' notice. Continued use of the Service after a price change constitutes acceptance of the new pricing. Refunds are not provided for partial months of service, except where required by applicable law.
        </P>
        <P>
          You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing period. We do not offer prorated refunds for unused time within a billing period.
        </P>
        <P>Assessment usage limits are reset at the start of each calendar month based on your plan tier.</P>

        <H2>7. Intellectual Property</H2>
        <P>
          The Service, including its design, code, models, algorithms, and content, is owned by {COMPANY} and protected by intellectual property laws. Nothing in these Terms grants you ownership of any part of the Service.
        </P>
        <P>
          You retain ownership of any content you upload to the Service, including job descriptions and assessment materials. By uploading content, you grant Prodicta a limited, non-exclusive licence to process that content for the purpose of providing the Service to you.
        </P>

        <H2>8. Confidentiality</H2>
        <P>
          Each party agrees to keep confidential any non-public information received from the other party in connection with the Service, and to use such information only for the purposes of performing its obligations or exercising its rights under these Terms.
        </P>

        <H2>9. Limitation of Liability</H2>
        <P>
          To the maximum extent permitted by law, Prodicta's total liability to you for any claims arising out of or relating to these Terms or the Service shall not exceed the greater of (a) the amount you paid to Prodicta in the 12 months preceding the claim, or (b) £100.
        </P>
        <P>
          In no event shall Prodicta be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, or business interruption, even if Prodicta has been advised of the possibility of such damages.
        </P>
        <P>
          Nothing in these Terms limits or excludes liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded by law.
        </P>

        <H2>10. Disclaimers</H2>
        <P>
          The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
        </P>

        <H2>11. Termination</H2>
        <P>
          Either party may terminate these Terms at any time by providing written notice. We may suspend or terminate your access immediately if you breach these Terms, engage in fraudulent or harmful conduct, or if we are required to do so by law.
        </P>
        <P>
          Upon termination, your right to access the Service ceases. We will retain your data for 30 days post-termination after which it will be deleted, unless we are required by law to retain it for longer. You may request an export of your data before termination.
        </P>

        <H2>12. Governing Law and Disputes</H2>
        <P>
          These Terms are governed by the laws of England and Wales. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </P>
        <P>
          Before initiating formal proceedings, both parties agree to attempt to resolve any dispute in good faith through negotiation. Either party may seek urgent injunctive relief without this requirement.
        </P>

        <H2>13. Changes to These Terms</H2>
        <P>
          We may update these Terms from time to time. We will provide at least 14 days' notice of material changes by email or by displaying a notice within the Service. Continued use of the Service after the effective date of changes constitutes acceptance of the revised Terms.
        </P>

        <H2>14. Contact</H2>
        <P>If you have questions about these Terms, please contact us at <a href={`mailto:${EMAIL}`} style={{ color: TEAL }}>{EMAIL}</a>.</P>

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
