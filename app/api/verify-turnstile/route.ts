import { NextRequest, NextResponse } from 'next/server';
import { strictRateLimiter } from '@/utils/rate-limit';
import { verifyTurnstileToken } from '@/utils/turnstile';

/**
 * POST /api/verify-turnstile
 * Body: { token: string }
 * Returns: { success: boolean, error?: string }
 *
 * Validates a Cloudflare Turnstile token server-side using the siteverify
 * endpoint. Kept for the signup flow; the login route verifies the token
 * itself so the client never has to round-trip twice.
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await strictRateLimiter(request, 'verify-turnstile');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { token } = (await request.json()) as { token?: string };

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    const result = await verifyTurnstileToken(token, ip);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
