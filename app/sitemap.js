import { getAllPosts } from '@/lib/blog-posts'

const SITE = 'https://prodicta.co.uk'

export default function sitemap() {
  const now = new Date()

  const staticRoutes = [
    { path: '',               changeFrequency: 'weekly',  priority: 1.0 },
    { path: '/blog',          changeFrequency: 'weekly',  priority: 0.8 },
    { path: '/demo',          changeFrequency: 'weekly',  priority: 0.8 },
    { path: '/how-it-works',  changeFrequency: 'monthly', priority: 0.7 },
    { path: '/science',       changeFrequency: 'monthly', priority: 0.7 },
    { path: '/audit',         changeFrequency: 'monthly', priority: 0.7 },
    { path: '/roadmap',       changeFrequency: 'monthly', priority: 0.6 },
    { path: '/login',         changeFrequency: 'monthly', priority: 0.5 },
    { path: '/terms',         changeFrequency: 'yearly',  priority: 0.3 },
    { path: '/privacy',       changeFrequency: 'yearly',  priority: 0.3 },
  ].map(r => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const blogRoutes = getAllPosts().map(p => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: p.date ? new Date(p.date) : now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogRoutes]
}
