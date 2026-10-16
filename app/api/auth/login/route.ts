import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { strictRateLimiter, getClientIp } from '@/utils/rate-limit';
import { verifyTurnstileToken } from '@/utils/turnstile';

/**
 * POST /api/auth/login
 * Body: { identifier: string, password: string, turnstileToken: string }
 *
 * Server-side login so the account's e-mail is never exposed to the browser:
 *  - a phone number is resolved to the e-mail with the phone_login_lookup RPC
 *    (profiles is private under RLS),
 *  - the Turnstile token is verified here,
 *  - signInWithPassword runs on the server and writes the auth cookies.
 *
 * The response never reveals whether an identifier exists.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPALI_NUMBER_REGEX = /^(?:\+?977)?(?:97|98)\d{8}$/;

const GENERIC_ERROR = 'Invalid email/phone or password.';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await strictRateLimiter(request, 'login');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { identifier, password, turnstileToken } = (await request.json()) as {
      identifier?: string;
      password?: string;
      turnstileToken?: string;
    };

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both email/phone and password.' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const turnstile = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstile.ok) {
      return NextResponse.json(
        { success: false, error: turnstile.error },
        { status: turnstile.status }
      );
    }

    const supabase = await createClient();
    const cleaned = identifier.trim().toLowerCase();

    let email: string;

    if (NEPALI_NUMBER_REGEX.test(cleaned.replace(/[\s-]/g, ''))) {
      const digits = cleaned.replace(/\D/g, '');
      const fullPhone = digits.startsWith('977') ? `+${digits}` : `+977${digits}`;

      const { data, error } = await supabase.rpc('phone_login_lookup', {
        p_phone: fullPhone,
      });

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: GENERIC_ERROR },
          { status: 401 }
        );
      }
      email = data;
    } else if (EMAIL_REGEX.test(cleaned)) {
      email = cleaned;
    } else {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email or Nepali phone number.' },
        { status: 400 }
      );
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Surface the one actionable case; everything else stays generic so the
      // response cannot be used to enumerate accounts.
      if (
        signInError.code === 'email_not_confirmed' ||
        /confirm/i.test(signInError.message)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please verify your email before logging in. Check your inbox for the link.',
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: GENERIC_ERROR },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
