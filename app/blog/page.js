import Link from 'next/link'
import { getAllPosts, excerpt } from '@/lib/blog-posts'
import ProdictaLogo from '@/components/ProdictaLogo'

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEALD = '#00897B'
const TEALLT = '#e6f7f4'
const BG = '#f7f9fb'
const CARD = '#ffffff'
const BD = '#e4e9f0'
const TX = '#1a202c'
const TX2 = '#4a5568'
const TX3 = '#94a1b3'
const F = "'Outfit', system-ui, sans-serif"

export const metadata = {
  title: 'PRODICTA Blog: Hiring, ERA 2025, and Scenario Assessment',
  description: 'Insights on UK hiring, the Employment Rights Act 2025, scenario-based assessment, and how to predict probation outcomes.',
  alternates: { canonical: 'https://prodicta.co.uk/blog' },
  openGraph: {
    title: 'PRODICTA Blog',
    description: 'Insights on UK hiring, the Employment Rights Act 2025, and scenario-based assessment.',
    url: 'https://prodicta.co.uk/blog',
    type: 'website',
  },
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <header style={{ background: NAVY, padding: '18px clamp(16px, 3vw, 32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <ProdictaLogo textColor="#ffffff" size={32} />
        </Link>
        <nav style={{ display: 'flex', gap: 18 }}>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Home</Link>
          <Link href="/blog" style={{ fontSize: 13, color: TEAL, textDecoration: 'none', fontWeight: 700 }}>Blog</Link>
          <Link href="/demo" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Demo</Link>
          <Link href="/roadmap" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>What's Coming</Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Sign in</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '64px 24px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: TEALLT, color: TEALD, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 18 }}>
            PRODICTA Blog
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800, color: NAVY, margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            Insights on hiring, ERA 2025, and scenario assessment
          </h1>
          <p style={{ fontSize: 16, color: TX2, lineHeight: 1.65, margin: 0, maxWidth: 640 }}>
            Practical guidance for UK employers and recruitment agencies preparing for the Employment Rights Act 2025 and a more evidence-based way to hire.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {posts.map(post => (
            <article
              key={post.slug}
              style={{
                background: CARD, border: `1px solid ${BD}`, borderRadius: 14,
                padding: '28px 30px',
              }}
            >
              <div style={{ fontSize: 12, color: TX3, fontWeight: 600, marginBottom: 8 }}>{post.dateLabel}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                <Link href={`/blog/${post.slug}`} style={{ color: NAVY, textDecoration: 'none' }}>
                  {post.title}
                </Link>
              </h2>
              <p style={{ fontSize: 14.5, color: TX2, lineHeight: 1.7, margin: '0 0 14px' }}>
                {excerpt(post, 50)}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                style={{ fontSize: 13.5, fontWeight: 700, color: TEALD, textDecoration: 'none' }}
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
