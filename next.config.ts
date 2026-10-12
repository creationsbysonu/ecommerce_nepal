import type { NextConfig } from "next";

// Self-hosted Supabase stack lives in sibling Render services.
// supabase-js is pointed at this app's own origin (NEXT_PUBLIC_SUPABASE_URL),
// so we proxy its two API prefixes to GoTrue / PostgREST upstreams.
// Local dev is unaffected: there NEXT_PUBLIC_SUPABASE_URL is 127.0.0.1:54321
// (supabase start), so these paths never hit this app.
const gotrue = process.env.GOTRUE_UPSTREAM ?? "https://mero-pasal-auth.onrender.com";
const rest = process.env.POSTGREST_UPSTREAM ?? "https://mero-pasal-rest.onrender.com";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/auth/v1/:path*", destination: `${gotrue}/:path*` },
      { source: "/rest/v1/:path*", destination: `${rest}/:path*` },
    ];
  },
};

export default nextConfig;
