# Deploying Mero Pasal to Render

Repo: https://github.com/creationsbysonu/ecommerce_nepal
Frontend + API = this Next.js app on Render. Database + Auth = Supabase Cloud.

## 1. Supabase Cloud (database + auth)

```bash
# a) Create a free project at https://supabase.com/dashboard → New project
#    (pick region ap-southeast-1 Singapore — closest to Nepal)
#    Remember the password you set for the DB.

# b) Login + link + push all migrations (includes relax_order_status_check
#    so wallet checkout works):
npx supabase login
npx supabase link --project-ref <PROJECT_REF>   # ref = the id in your project URL
npx supabase db push

# c) Copy Project Settings → API values:
#    Project URL  → NEXT_PUBLIC_SUPABASE_URL
#    anon key     → NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Supabase Dashboard configuration:

- **Auth → URL Configuration**: set Site URL to `https://<your-app>.onrender.com`
  and add it to Redirect URLs (needed for OTP/magic-link flows).
- **Auth → Email**: free tier sends ~2 emails/hour (fine for testing). For real
  traffic configure custom SMTP (Gmail app password works — same one in notes.txt).

## 2. Render (frontend + API)

```bash
# Nothing to configure in-repo: render.yaml declares the web service
# (build: npm ci && npm run build, start: npm start, free plan).
```

1. https://dashboard.render.com → **New → Web Service** → connect the GitHub repo.
2. Render detects `render.yaml` (Blueprint) — approve it.
3. Fill the env vars (declared as `sync: false`):
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — from notes.txt / Cloudflare dashboard
   - `TURNSTILE_SECRET_KEY` — from notes.txt / Cloudflare dashboard
4. Deploy. First build ~2–5 min. Service URL: `https://<name>.onrender.com`.
5. **Cloudflare Turnstile**: add the `onrender.com` domain to your Turnstile
   site's allowed domains, or the captcha widget will refuse to load.

## 3. Smoke test after first deploy

- [ ] Home page loads (products render; empty DB shows "No products available yet")
- [ ] Sign up with email → OTP arrives → login works
- [ ] Supabase Auth Site URL/Redirects updated (otherwise OTP link 404s)
- [ ] Add to cart → checkout → COD order appears in `/profile/orders`
- [ ] Admin: promote your user to `admin` role in Supabase Table Editor
      (`profiles.role`) → `/admin` loads
- [ ] Seller: register store → add product → appears on homepage

## Known post-deploy work

- 39 pre-existing ESLint errors (build doesn't run lint, so deploys aren't blocked).
- `/api/checkout` trusts client-sent totals — move price/discount validation
  server-side before real payments.
- Render free tier sleeps after 15 min idle (~30 s cold start).
