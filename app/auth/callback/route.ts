import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { safeNextPath } from '@/utils/safe-redirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const type = searchParams.get('type')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Email verification lands on the dedicated confirmation screen.
      if (type === 'signup' || next.includes('email-verified')) {
        return NextResponse.redirect(new URL('/email-verified', baseUrl))
      }
      return NextResponse.redirect(new URL(next, baseUrl))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', baseUrl))
}
