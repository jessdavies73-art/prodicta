import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug, readingTime } from '@/lib/blog-posts'
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

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  const url = `https://prodicta.co.uk/blog/${post.slug}`
  return {
    title: post.title,
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url,
      type: 'article',
      publishedTime: post.date,
      siteName: 'PRODICTA',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.metaDescription,
    },
  }
}

export default function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const url = `https://prodicta.co.uk/blog/${post.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'PRODICTA' },
    publisher: {
      '@type': 'Organization',
      name: 'PRODICTA',
      url: 'https://prodicta.co.uk',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const minutes = readingTime(post)

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: F, color: TX }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header style={{ background: NAVY, padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <ProdictaLogo textColor="#ffffff" size={32} />
        </Link>
        <nav style={{ display: 'flex', gap: 18 }}>
          <Link href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Home</Link>
          <Link href="/blog" style={{ fontSize: 13, color: TEAL, textDecoration: 'none', fontWeight: 700 }}>Blog</Link>
          <Link href="/demo" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Demo</Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Sign in</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 0' }}>
        <Link href="/blog" style={{ fontSize: 12.5, fontWeight: 700, color: TEALD, textDecoration: 'none' }}>← All posts</Link>

        <article style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: TX3, fontWeight: 600, marginBottom: 14 }}>
            {post.dateLabel} &middot; {minutes} min read
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: NAVY, margin: '0 0 26px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            {post.title}
          </h1>

          <div style={{ fontSize: 16, color: TX, lineHeight: 1.75 }}>
            {post.body.map((block, i) => {
              if (block.type === 'h2') {
                return <h2 key={i} style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: '36px 0 14px', letterSpacing: '-0.3px' }}>{block.text}</h2>
              }
              if (block.type === 'h3') {
                return <h3 key={i} style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: '26px 0 10px' }}>{block.text}</h3>
              }
              return <p key={i} style={{ margin: '0 0 16px', color: TX2 }}>{block.text}</p>
            })}
          </div>
        </article>
      </main>

      <section style={{ background: TEAL, marginTop: 64, padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: NAVY, margin: '0 0 12px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
            See PRODICTA in action
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(15,33,55,0.78)', lineHeight: 1.65, margin: '0 0 26px', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            Predict probation outcomes before you make the offer. Generate a documented, ERA 2025 ready hiring decision in minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/demo"
              style={{
                background: NAVY, color: '#fff', padding: '13px 26px', borderRadius: 10,
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}
            >
              Try the demo
            </Link>
            <Link
              href="/login"
              style={{
                background: '#fff', color: NAVY, padding: '13px 26px', borderRadius: 10,
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                border: `1.5px solid ${NAVY}`,
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ padding: '32px 24px 40px', textAlign: 'center' }}>
        <p style={{ fontFamily: F, fontSize: 12.5, color: '#6b7280', margin: 0 }}>
          © 2026 PRODICTA. All rights reserved.
        </p>
        <p style={{ fontFamily: F, fontSize: 11, color: TX3, margin: '4px 0 0' }}>
          Powered by AIAURA Group Ltd
        </p>
      </footer>
    </div>
  )
}
