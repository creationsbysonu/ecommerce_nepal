import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a new CSRF token and sets it as a cookie
 */
export async function generateCSRFToken(): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token;
}

/**
 * Validates a CSRF token from the request
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get CSRF token for client-side forms
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = await generateCSRFToken();
  }

  return token;
}

/**
 * Middleware helper to validate CSRF on POST/PUT/DELETE requests
 */
export async function csrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return null;
  }

  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Helper to add CSRF token to form data
 */
export function addCSRFTokenToFormData(formData: FormData): FormData {
  // This is a placeholder - actual token should be added client-side
  // Server-side we can't easily add to FormData without the token
  return formData;
}

/**
 * Client-side helper to get CSRF token and add to requests
 */
export const csrfClient = {
  async getToken(): Promise<string> {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    return data.token;
  },

  async addToRequest(options: RequestInit = {}): Promise<RequestInit> {
    const token = await this.getToken();
    return {
      ...options,
      headers: {
        ...options.headers,
        'x-csrf-token': token,
      },
    };
  },
};

// API route to get CSRF token (create this at app/api/csrf-token/route.ts)
export async function GET() {
  const token = await generateCSRFToken();
  return NextResponse.json({ token });
}