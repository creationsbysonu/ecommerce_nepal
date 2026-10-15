import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use the origin from the request headers for proper redirect on Render
  const origin = request.headers.get('origin') || 
                 request.headers.get('referer') || 
                 'https://mero-pasal-pw0b.onrender.com'
  
  try {
    const redirectUrl = new URL('/', origin)
    return NextResponse.redirect(redirectUrl, { status: 302 })
  } catch {
    return NextResponse.redirect('https://mero-pasal-pw0b.onrender.com/', { status: 302 })
  }
}
