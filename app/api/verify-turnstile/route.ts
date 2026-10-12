import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/verify-turnstile
 * Body: { token: string }
 * Returns: { success: boolean, error?: string }
 *
 * Validates a Cloudflare Turnstile token server-side using the siteverify endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing Turnstile token' },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Cloudflare Turnstile siteverify endpoint
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    // Optionally include the visitor's IP (helps with analytics)
    const ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('x-forwarded-for');
    if (ip) formData.append('remoteip', ip);

    const cfResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );

    if (!cfResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to contact Cloudflare' },
        { status: 502 }
      );
    }

    const outcome = await cfResponse.json() as { success: boolean; 'error-codes'?: string[] };

    if (!outcome.success) {
      return NextResponse.json(
        { success: false, error: outcome['error-codes']?.join(', ') ?? 'Verification failed' },
        { status: 403 }
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
