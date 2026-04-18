import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import LandingPage from './LandingPage'

export const metadata = {
  title: 'PRODICTA \u2014 Hire right. Keep them there.',
  description: 'PRODICTA predicts probation outcomes before you make the offer. AI-powered work simulations that show you how candidates actually perform under pressure. Built for ERA 2025. From £49/month.',
  keywords: ['hiring assessment', 'predict hiring outcomes', 'ERA 2025 compliance', 'pre-employment assessment UK', 'probation prediction', 'work simulation', 'AI hiring tool'],
  alternates: { canonical: 'https://prodicta.co.uk' },
  openGraph: {
    title: 'PRODICTA | Predict Hiring Outcomes Before You Hire',
    description: 'AI work simulations that show you how candidates actually perform. Built for ERA 2025.',
    type: 'website',
    url: 'https://prodicta.co.uk',
    siteName: 'PRODICTA',
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PRODICTA | Predict Hiring Outcomes Before You Hire',
    description: 'AI work simulations that show you how candidates actually perform. Built for ERA 2025.',
  },
}

const FAQ_ITEMS = [
  { q: 'What is the Employment Rights Act 2025 and why does it matter?', a: 'The Employment Rights Act 2025 is new UK legislation that fundamentally changes employer risk. From January 2027, the qualifying period for unfair dismissal claims drops from 2 years to 6 months. The statutory compensation cap is being removed entirely. This means a bad hire can take you to tribunal after just 6 months with no limit on what they can claim. Every hiring decision you make from now on needs to be documented, objective, and defensible. PRODICTA gives you that documentation automatically with every assessment.' },
  { q: 'How much does PRODICTA cost?', a: 'Starter is £49 per month for 10 assessments. Professional is £120 per month for 30 assessments. Unlimited is £159 per month for unlimited assessments. We are currently offering a Founding Member rate of £79 per month with unlimited assessments for the first 3 months, then 20 per month after that, with the price locked for 12 months. All plans include full reports, candidate comparison, benchmarks, onboarding plans, and interview questions. Transparent pricing. No hidden fees. No setup costs.' },
  { q: 'What makes PRODICTA different from personality tests and psychometric assessments?', a: 'Personality tests tell you how someone thinks. PRODICTA tells you how someone works. We do not ask candidates to answer multiple choice questions or rate themselves on a scale. We give them the actual tasks they would face in their first 90 days and measure how they respond under realistic pressure. Every scenario is built from your specific job description, not a generic template. The result is a prediction of how they will actually perform, not a personality label.' },
  { q: 'How long does an assessment take?', a: 'It depends on the role. Rapid Screen is a 5-8 minute single-scenario signal for high-volume screening. Speed-Fit assessments take 15 minutes with 2 scenarios, recommended for most roles. Depth-Fit assessments take 25 minutes with 2 scenarios and a full narrative report. Strategy-Fit assessments take 45 minutes with 2 scenarios plus a Day 1 workspace simulation, best for senior or high stakes hires. PRODICTA recommends the right level based on the role but you can choose. Reports are available within minutes of the candidate finishing.' },
  { q: 'What roles does PRODICTA work for?', a: 'PRODICTA works for any role where you need to know how someone will actually perform. Customer service advisors, care workers, accounts assistants, office managers, sales executives, marketing managers, operations leads, finance directors. The scenarios adapt to the job description. A care worker gets a safeguarding scenario. A receptionist gets a multitasking scenario. A finance director gets a strategic decision scenario. This is not just for senior hires. The hardest roles to get right are often the everyday ones.' },
  { q: 'How does PRODICTA ensure compliance with UK employment law?', a: 'Every PRODICTA assessment is scenario based, objective, and anonymous. No candidate is penalised for spelling, grammar, or writing style in line with the Equality Act 2010. Every score is backed by specific evidence from what the candidate actually wrote. Every report includes a compliance statement documenting the assessment methodology, date, and fairness standards applied. This creates a documented audit trail that can be used as evidence of a fair and objective hiring process.' },
  { q: 'Can candidates use AI to write their answers?', a: 'PRODICTA includes built in response integrity analysis. It detects AI assisted responses, copy paste answers, rushed submissions, and inconsistent quality across scenarios. Every candidate receives an authenticity rating. The scenarios are unique to each job description and timed, so there is nothing to prepare for or look up. If a candidate does use AI, the integrity analysis flags it and you can probe it at interview.' },
  { q: 'How quickly do I get results?', a: 'Reports are generated within minutes of the candidate completing their assessment. There is no waiting for human scorers or manual review. You get the full report including overall score, candidate type, predicted outcomes, strengths, watch outs, onboarding plan, and interview questions as soon as the candidate submits. Most users have a complete hiring insight within 24 hours of sending the assessment.' },
  { q: 'Do we need to train our team to use it?', a: 'No. Paste a job description, answer 3 to 4 quick questions about the role, send to your candidates, and receive a report. There is no software to install, no training required, and no complex setup. Most users create their first assessment within 5 minutes. The reports are designed to be understood by anyone, and include a Simple View option that translates everything into plain, jargon free language for line managers.' },
  { q: 'What happens after January 2027?', a: 'From January 2027, employees gain unfair dismissal protection from their first day of employment. There is no qualifying period and no cap on compensation. This means every hire you make is a legal and financial risk from day one. PRODICTA helps you document fair, evidence based hiring decisions before you make the offer. It also includes a Probation Timeline Tracker with automated review reminders at month 1, 3, and 5 so you never miss a critical checkpoint during the probation period.' },
]

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PRODICTA',
  url: 'https://prodicta.co.uk',
  description: 'AI-powered pre-employment assessment platform that predicts probation outcomes',
  address: { '@type': 'PostalAddress', addressCountry: 'GB' },
}

export default async function Home() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {}
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
      />
      <LandingPage />
    </>
  )
}
