/**
 * Only allow same-origin, relative redirect targets. Rejects protocol-relative
 * ("//evil.com"), backslash tricks and absolute URLs so a crafted ?next= cannot
 * send a freshly-authenticated user off-site.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  if (next.includes('\\')) return fallback
  return next
}
