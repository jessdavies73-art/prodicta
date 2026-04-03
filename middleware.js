import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password', '/how-it-works', '/pricing', '/terms', '/privacy', '/assess', '/api/assess', '/sample-report', '/api/cron', '/demo', '/api/billing/webhook']

function isPublic(pathname) {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Let public routes through immediately — no Supabase call needed
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Guard: if env vars are missing (e.g. misconfigured deployment) fail open
  // rather than crashing the entire middleware with INVOCATION_FAILED
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase env vars missing — middleware failing open')
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // getUser() is safe for middleware — uses the JWT, no DB call
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // API routes: return 401 rather than redirecting
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Subscription gate: users whose app_metadata.subscription_status is 'pending'
    // must complete payment before accessing the platform.
    // app_metadata is admin-only (users cannot set it themselves).
    // Exempt: /setup-payment itself, and /api/billing/* and /api/auth/* routes.
    const subStatus = user.app_metadata?.subscription_status
    if (subStatus === 'pending') {
      const isSetupPayment = pathname === '/setup-payment'
      const isBillingRoute = pathname.startsWith('/api/billing')
      const isAuthRoute    = pathname.startsWith('/api/auth')
      if (!isSetupPayment && !isBillingRoute && !isAuthRoute) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Subscription required' }, { status: 402 })
        }
        return NextResponse.redirect(new URL('/setup-payment', request.url))
      }
    }

    return response
  } catch (err) {
    // Never let middleware crash the entire request — log and fail open
    console.error('Middleware error:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, icon.png, logo.png (static assets)
     * - Any file with an extension (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
