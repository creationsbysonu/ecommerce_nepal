import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { strictRateLimiter } from '@/utils/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await strictRateLimiter(request, 'resend-verification');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/email-verified`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Verification email sent!' })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Unable to resend the email right now.' }, { status: 500 })
  }
}