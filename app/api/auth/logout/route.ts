import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use the origin from the request headers, fallback to NEXT_PUBLIC_SITE_URL
  const origin = request.headers.get('origin') || 
                 request.headers.get('referer') || 
                 process.env.NEXT_PUBLIC_SITE_URL || 
                 'http://localhost:3000'
  
  try {
    const redirectUrl = new URL('/', origin)
    return NextResponse.redirect(redirectUrl, { status: 302 })
  } catch {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000/', { status: 302 })
  }
}