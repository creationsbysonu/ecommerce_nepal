import { type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

// Next 16 renamed the `middleware` convention to `proxy`.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on every request except Next internals, the favicon and static
     * images. Session refresh and the API same-origin (CSRF) guard both live
     * in updateSession.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
