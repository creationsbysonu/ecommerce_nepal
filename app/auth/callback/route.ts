import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalNode = process.env.NODE_ENV === 'development'
      
      // If this is an email verification, redirect to email-verified page
      if (type === 'signup' || next.includes('email-verified')) {
        const redirectUrl = new URL('/email-verified', origin)
        if (isLocalNode) {
          return NextResponse.redirect(redirectUrl.toString())
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}/email-verified`)
        } else {
          return NextResponse.redirect(redirectUrl.toString())
        }
      }
      
      // Default redirect
      if (isLocalNode) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}