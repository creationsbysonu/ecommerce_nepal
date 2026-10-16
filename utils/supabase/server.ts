import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            // Pass options through unchanged. Supabase sets the correct
            // maxAge/expiry/sameSite for the session and PKCE cookies; forcing
            // our own values here used to fight the refresh-token lifecycle.
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // `set` throws when called from a Server Component render. The
            // proxy (middleware) refreshes the session on the next request, so
            // this is safe to ignore.
          }
        },
      },
    }
  )
}
