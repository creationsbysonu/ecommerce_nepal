import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter with sliding window
// For production, consider using Redis or Vercel's KV store
interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig) {
  const { interval, maxRequests } = config;

  return async function rateLimit(
    request: NextRequest,
    key: string = 'global'
  ): Promise<NextResponse | null> {
    const identifier = `${key}:${getClientIdentifier(request)}`;
    const now = Date.now();
    const windowStart = now - interval;

    // Clean up old entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }

    const current = rateLimitStore.get(identifier) || { count: 0, resetTime: now + interval };

    if (current.resetTime < now) {
      // Window expired, reset
      current.count = 1;
      current.resetTime = now + interval;
      rateLimitStore.set(identifier, current);
      return null; // Allow request
    }

    if (current.count >= maxRequests) {
      // Rate limited
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
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

    current.count++;
    rateLimitStore.set(identifier, current);

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (maxRequests - current.count).toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());

    return null; // Allow request
  };
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';

  // Also include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}:${hashString(userAgent)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Pre-configured limiters
export const authRateLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

export const apiRateLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
});

export const strictRateLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute (for sensitive endpoints)
});