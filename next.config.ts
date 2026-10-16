import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Turnstile renders its challenge from challenges.cloudflare.com and injects a
// blob: worker/script; Next.js injects inline bootstrap scripts. `unsafe-eval`
// is only needed by the dev toolchain, so it is omitted from production.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "blob:",
  "https://challenges.cloudflare.com",
  "https://*.cloudflare.com",
];
if (isDev) scriptSrc.push("'unsafe-eval'");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Product images are arbitrary seller-supplied URLs, so https: is required.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.cloudflare.com https://*.google-analytics.com https://www.google-analytics.com",
  "frame-src https://challenges.cloudflare.com https://*.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    cpus: 1,
  },
  images: {
    // Sellers paste arbitrary product image URLs, so any HTTPS host is allowed.
    // Prefer scoping this to your storage host once uploads move to Supabase.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
