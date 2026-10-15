import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const path = request.nextUrl.pathname;

  // Protect seller routes
  if (path.startsWith('/seller') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Protect admin routes
  if (path.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Set request context for audit logging (IP, user agent)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             request.headers.get('cf-connecting-ip') ||
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Set request context for audit logging functions
  supabaseResponse.headers.set('x-request-ip', ip);
  supabaseResponse.headers.set('x-request-user-agent', request.headers.get('user-agent') || '');

  // Log successful login (only on auth callback)
  if (path === '/auth/callback' && user) {
    try {
      await supabase.rpc('log_successful_login', { p_user_id: user.id });
    } catch {
      // Ignore logging errors
    }
  }

  // Log failed login attempts on login page with error
  if (path === '/login' && request.method === 'POST') {
    // This will be handled by the login API
  }

  return supabaseResponse
}