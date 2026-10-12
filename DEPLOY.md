# Deploying Mero Pasal — everything on Render

Repo: https://github.com/creationsbysonu/ecommerce_nepal

**Architecture** (all four pieces on Render):

| Service            | What it is                          | Serves                |
| ------------------ | ----------------------------------- | ---------------------- |
| `meropasal-db`     | Render Postgres (free)              | schema + data          |
| `mero-pasal-auth`  | GoTrue (`supabase/gotrue`)          | `/auth/v1` (OTP, sessions) |
| `mero-pasal-rest`  | PostgREST                           | `/rest/v1` (RLS queries)   |
| `mero-pasal`       | Next.js app                         | frontend + `/api` routes  |

The app's `NEXT_PUBLIC_SUPABASE_URL` points at its own origin; `next.config.ts`
rewrites `/auth/v1/*` and `/rest/v1/*` to the two sibling services, so no app
code changes are needed. Local dev is untouched (it still uses `supabase start`
on `127.0.0.1:54321`).

## 1. Generate keys (local)

```bash
npm run db:keys        # writes .render-secrets/keys.txt (gitignored, chmod 600)
```

Keep that file open — every `sync: false` field in step 2 comes from it.

## 2. Apply the Render Blueprint

1. https://dashboard.render.com → **New → Blueprint** → connect the GitHub repo.
2. Render reads `render.yaml` and prompts for all secrets. Paste:

| Prompted field | Value |
| --- | --- |
| `GOTRUE_JWT_SECRET` | `JWT_SECRET=` line from keys.txt |
| `PGRST_JWT_SECRET` | **same** `JWT_SECRET=` value |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY=` line from keys.txt |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | from notes.txt / Cloudflare dashboard |
| `GOTRUE_SMTP_*` | see §4 (email provider) — required for login to work |

3. Approve/create: 1 database + 3 web services (all Free plan).

## 3. Create the schema

Wait until `mero-pasal-auth` shows **Deploy succeeded** (it creates the `auth`
schema on first boot), then:

```bash
# Copy External Database URL from: Render Dashboard → meropasal-db → Connections
RENDER_DB_URL="postgres://..." npm run db:render
```

The script waits (up to 5 min) for GoTrue, applies
`supabase/render/00-bootstrap.sql` (roles/grants/`auth.uid()`), then all
`supabase/migrations/*.sql` in order.

## 4. Email (OTP login) — read this

GoTrue sends login codes over SMTP. **Render Free blocks outbound ports
25/465/587**, so the Gmail SMTP in notes.txt will NOT work on the free plan.

Pick one:

- **Free Render + free email provider**: create a free
  [SendGrid](https://www.twilio.com/en-us/sendgrid) or
  [Mailgun](https://www.mailgun.com/) account, verify a sender, and use
  **port 2525** (not blocked):
  - `GOTRUE_SMTP_HOST=smtp.sendgrid.net`, `GOTRUE_SMTP_PORT=2525`,
    `GOTRUE_SMTP_USER=apikey`, `GOTRUE_SMTP_PASS=<sendgrid-key>`
- **Paid Render instance ($7/mo)**: keep Gmail, port 587 works there.

## 5. Post-deploy checklist

- [ ] `https://mero-pasal.onrender.com` loads (empty DB shows "No products available yet")
- [ ] Sign up → OTP email arrives → verify & login works
- [ ] Add to cart → checkout (COD) → order shows in `/profile/orders`
- [ ] Promote your user to `admin` in Render Dashboard → meropasal-db →
      Query editor: `UPDATE profiles SET role='admin' WHERE id='<your-uuid>';`
      → `/admin` loads
- [ ] Seller register → add product → appears on homepage

First request after 15 min idle takes ~60 s (free services spin down; OTP
login may feel slow on the first attempt — that's the auth service waking up).

## Free-tier limits (know these)

- **Free Postgres expires 30 days after creation** (14-day grace to upgrade,
  then data is deleted). Export/upgrade before then: `pg_dump` from Render shell
  or dashboard.
- **750 free instance-hours/month** shared by the 3 services (spun-down
  services don't consume them). Heavy usage may exhaust them; upgrades suspend
  free web services until the next month.
- One free Postgres per workspace; 1 GB storage.## Known issues (pre-existing, not deployment blockers)

- Next.js bakes the `/auth/v1` + `/rest/v1` rewrite targets at **build** time
  (they're literal URLs in `render.yaml`). If you ever rename the services,
  update `NEXT_PUBLIC_SUPABASE_URL`/`GOTRUE_UPSTREAM`/`POSTGREST_UPSTREAM`
  **and trigger a manual deploy** — an env-only change won't rewire rewrites.
- `/api/checkout` trusts client-sent totals — validate server-side before real payments.
- Admin role changes (`/admin/users`) are written via the anon key and blocked
  by the "update own profile" RLS policy — use the SQL statement in §5 instead.
- 39 pre-existing ESLint errors (`npm run lint`); builds don't run lint.
