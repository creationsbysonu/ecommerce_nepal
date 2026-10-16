/**
 * Shared Cloudflare Turnstile server-side verification.
 *
 * Used by /api/verify-turnstile and by the server-side login route so a token
 * is validated in exactly one place.
 */

export type TurnstileResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileResult> {
  if (!token) {
    return { ok: false, error: 'Missing Turnstile token', status: 400 };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return { ok: false, error: 'Server misconfiguration', status: 500 };
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (remoteIp) formData.append('remoteip', remoteIp);

  let outcome: { success: boolean; 'error-codes'?: string[] };
  try {
    const cfResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );

    if (!cfResponse.ok) {
      return { ok: false, error: 'Failed to contact Cloudflare', status: 502 };
    }

    outcome = (await cfResponse.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return { ok: false, error: 'Unexpected server error', status: 500 };
  }

  if (!outcome.success) {
    return {
      ok: false,
      error: outcome['error-codes']?.join(', ') ?? 'Verification failed',
      status: 403,
    };
  }

  return { ok: true };
}
