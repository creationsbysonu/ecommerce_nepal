-- ============================================================
-- Bootstrap for self-hosted Supabase stack on Render Postgres
-- Run ONCE before supabase/migrations/* (scripts/render-db-setup.mjs
-- does this automatically). Idempotent — safe to re-run.
--
-- Provides what Supabase Cloud normally gives you:
--   * roles used by PostgREST JWTs (anon / authenticated / service_role)
--   * grants so PostgREST can read/write public tables
--   * auth.uid() used by every RLS policy in our migrations
-- ============================================================

-- ── Roles ────────────────────────────────────────────────────
DO $$ BEGIN CREATE ROLE anon NOLOGIN;              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PostgREST connects as `postgres`, then SET ROLE to the JWT's role.
-- service_role bypasses RLS (admin/service operations).
GRANT anon, authenticated, service_role TO postgres;

-- ── Grants on public schema ──────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Applies to tables our migrations create AFTER this script runs:
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Applies to any tables that already exist:
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ── auth.uid() — required by every RLS policy in our migrations ──
-- Works with both the legacy request.jwt.claim.* settings and the
-- request.jwt.claims JSON setting that PostgREST provides.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claim.sub', TRUE),
      (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
