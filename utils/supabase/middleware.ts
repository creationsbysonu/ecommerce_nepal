import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Same-origin check used as CSRF protection for state-changing API calls. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  // Non-browser callers (or same-site navigations) may omit Origin. A forged
  // cross-site browser request always carries one, so allowing the missing case
  // is safe and keeps server-to-server calls working.
  if (!origin) return true
  try {
    const originHost = new URL(origin).host
    const host = request.headers.get('host')
    return originHost === host
  } catch {
    return false
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // CSRF: reject cross-site writes to our API routes. (Next.js already verifies
  // Origin for Server Actions; this covers the route handlers.)
  if (path.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Cross-site request blocked.' }, { status: 403 })
    }
  }

  // Require a session for seller and admin areas (role is re-checked in the
  // layouts / server actions).
  const requiresAuth = path.startsWith('/seller') || path.startsWith('/admin')
  if (requiresAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
