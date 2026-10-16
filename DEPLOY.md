# Deploying Mero Pasal — Vercel + Supabase

Repo: https://github.com/creationsbysonu/ecommerce_nepal

**Architecture**

| Piece   | Provider                  | Serves                                  |
| ------- | ------------------------- | --------------------------------------- |
| Frontend + API routes | Vercel (Next.js) | pages, `/api/*` |
| Database, Auth, Storage, PostgREST | Supabase Cloud | data + sessions |
| Bot protection | Cloudflare Turnstile | signup / login challenge |

Vercel auto-deploys on every push to `main`.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Set for **Production, Preview and Development**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | project anon (public) key |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` (no trailing slash) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |

Redeploy after changing any variable — Next.js inlines `NEXT_PUBLIC_*` at build
time.

## 2. Database migrations

Run every file in `supabase/migrations/` **in filename order** in the Supabase
Dashboard → SQL Editor (or `supabase db push` with the CLI linked to the
project). The latest migration,
`20261016000000_auth_privacy_and_signup.sql`, closes a `profiles` data leak and
moves username/phone capture into the signup trigger — make sure it runs.

## 3. Supabase Auth settings (Dashboard → Authentication)

- **Providers → Email:** enabled.
- **Sign In / Providers → Confirm email: ON** (the signup flow expects a
  verification link before the first login).
- **URL Configuration:**
  - Site URL: `https://<your-vercel-domain>`
  - Redirect URLs: `https://<your-vercel-domain>/auth/callback`,
    `https://<your-vercel-domain>/auth/callback/**`,
    `https://<your-vercel-domain>/email-verified`
- **Sessions:** set JWT expiry to `604800` (1 week) so users are not forced to
  log in repeatedly. Consider `secure_password_change = true`.
- **Rate limits:** the defaults are sensible; leave them on.

## 4. Cloudflare Turnstile

In the Turnstile widget settings, add your Vercel domain (and `localhost` /
`127.0.0.1` for development) to the allowed hostnames.

## 5. Post-deploy checklist

- [ ] `https://<your-vercel-domain>` loads.
- [ ] Sign up → "Check your email" screen → verification link → `/email-verified`.
- [ ] Log in with email **and** with a Nepali phone number.
- [ ] Forgot password → reset link → `/update-password` accepts the new password.
- [ ] Add to cart → checkout (COD) → order appears in `/profile/orders`.
- [ ] Promote your user to admin (SQL:
      `UPDATE profiles SET role='admin' WHERE id='<your-uuid>';`) → `/admin` loads.
- [ ] Seller register → add product → appears on the homepage.

## Known limitations

- **Rate limiting** in `utils/rate-limit.ts` is in-memory and therefore
  per-instance on serverless. It blunts bursts but is not a global limit; add an
  edge firewall or Upstash/Redis for production-grade throttling. Supabase Auth
  applies its own limits to sign-in attempts.
- **Order status is global, not per-vendor.** In a multi-seller order, a seller
  currently updates the whole order's status (schema limitation).
- **Product images are arbitrary seller-supplied URLs.** `next.config.ts` allows
  any HTTPS host; scope it to your storage host once uploads are centralised.
- `Dockerfile` / `.dockerignore` are kept for local container builds but the
  project ships on Vercel.
