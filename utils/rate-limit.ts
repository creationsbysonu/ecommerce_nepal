import { NextRequest, NextResponse } from 'next/server';

/**
 * Best-effort in-memory rate limiter.
 *
 * IMPORTANT: this Map lives in a single Node process. On a serverless platform
 * (Vercel) requests can be served by different isolates, so the effective limit
 * is per-instance, not global. It still stops naive bursts and is a cheap first
 * line of defence, but for real protection put this behind an edge firewall or
 * a shared store (Upstash Redis / Vercel KV). Supabase Auth applies its own
 * server-side limits to sign-in attempts as well.
 */

interface RateLimitConfig {
  /** Time window in milliseconds. */
  interval: number;
  /** Max requests allowed per window. */
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Drop expired buckets so the Map cannot grow without bound.
function sweep(now: number) {
  if (store.size < 500) return;
  for (const [key, value] of store.entries()) {
    if (value.resetTime < now) store.delete(key);
  }
}

/**
 * Resolve the client IP from platform headers. Vercel sets x-forwarded-for and
 * x-real-ip itself, so they cannot be spoofed by the caller there. Deliberately
 * keyed on IP alone — mixing in a user agent let a caller reset their bucket by
 * rotating it.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  return cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
}

export function createRateLimiter(config: RateLimitConfig) {
  const { interval, maxRequests } = config;

  return async function rateLimit(
    request: NextRequest,
    key = 'global'
  ): Promise<NextResponse | null> {
    const now = Date.now();
    sweep(now);

    const identifier = `${key}:${getClientIp(request)}`;
    const current = store.get(identifier);

    if (!current || current.resetTime <= now) {
      store.set(identifier, { count: 1, resetTime: now + interval });
      return null;
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
          },
        }
      );
    }

    current.count += 1;
    return null;
  };
}

/** 10 requests / minute — for ordinary API routes. */
export const authRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: 10,
});

/** 60 requests / minute — for general API traffic. */
export const apiRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: 60,
});

/** 5 requests / minute — for sensitive endpoints (login, signup, tokens). */
export const strictRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: 5,
});
