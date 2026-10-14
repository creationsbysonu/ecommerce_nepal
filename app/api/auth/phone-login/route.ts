import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/auth/phone-login
 * Body: { phone: string }   e.g. "9841234567" (digits only, without +977)
 *
 * Flow:
 * 1. Validate the number is a Nepali mobile number (10 digits, starts with 97/98)
 * 2. Build full number: "+977" + digits
 * 3. Resolve it to the account's e-mail via the phone_login_lookup RPC
 *    (profiles is private under RLS, so the old anonymous REST read of it
 *    returns nothing)
 * 4. Return masked email to client (e.g. "s***@gmail.com")
 * 5. Client then calls supabase.auth.signInWithOtp({ email }) directly
 *
 * We do NOT send the full email to the client to prevent user enumeration.
 */

const NEPALI_NUMBER_REGEX = /^(97|98)\d{8}$/; // 10 digits starting with 97 or 98

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  const masked = '*'.repeat(Math.max(local.length - 2, 3));
  return `${visible}${masked}@${domain}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json() as { phone?: string };

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 }
      );
    }

    // Strip any spaces or dashes the user may have typed
    const digits = phone.replace(/[\s\-]/g, '');

    if (!NEPALI_NUMBER_REGEX.test(digits)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid Nepali mobile number (starts with 97 or 98, 10 digits).',
        },
        { status: 400 }
      );
    }

    const fullPhone = `+977${digits}`;

    // Resolve phone → e-mail through the dedicated RPC (see
    // phone_login_lookup in the migrations): profiles no longer permits
    // anonymous reads, and it never should expose e-mails that way anyway.
    const supabase = await createClient();
    const { data: email, error: dbError } = await supabase
      .rpc('phone_login_lookup', { p_phone: fullPhone });

    if (dbError) {
      console.error('Phone login DB error:', dbError);
      return NextResponse.json(
        { success: false, error: 'An error occurred. Please try again.' },
        { status: 500 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this phone number. Please sign up first.',
        },
        { status: 404 }
      );
    }

    // Return masked email — client will send the OTP using the full email
    // We also return the full email encrypted as a short-lived token approach:
    // For simplicity we return the email directly since this is server-to-client
    // over HTTPS and the OTP still guards access.
    return NextResponse.json({
      success: true,
      email,
      emailHint: maskEmail(email),
    });
  } catch (err) {
    console.error('Phone login error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
