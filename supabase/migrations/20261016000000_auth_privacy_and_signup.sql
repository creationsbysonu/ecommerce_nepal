-- ============================================================
-- Mero Pasal — auth privacy + signup hardening
--
-- 1. The `profiles_username_lookup` policy (added in
--    20261013000000_add_username.sql) re-opened the ENTIRE profiles table to
--    anonymous reads, undoing the privacy work in 20261012000001. RLS policies
--    are OR-ed, so `USING (true)` exposed every user's email, phone number,
--    wallet_balance and coin_balance to anyone holding the anon key. Drop it.
--    Username/phone lookups now go through narrow SECURITY DEFINER RPCs that
--    return exactly one boolean (or one column) and nothing else.
--
-- 2. Capture `username` in the handle_new_user trigger so an account's
--    username survives the email-confirmation flow (previously it was written
--    by a client-side UPDATE that runs before a session exists and was
--    therefore silently rejected by RLS).
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Close the profiles leak ──────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_username_lookup" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Re-assert the intended policy: your own row (plus admins).
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- ── 2. Carry username through signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, phone_number, username)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'phone_number',
    NULLIF(lower(new.raw_user_meta_data->>'username'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
    username     = COALESCE(EXCLUDED.username, public.profiles.username);
  RETURN new;
END;
$$;

-- ── 3. Public username-availability check ───────────────────────────────────
-- Usernames are public identifiers, so it is safe to tell the caller whether
-- one is taken. Email is deliberately NOT exposed: confirming whether an
-- address is registered would enable account enumeration.
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(NULLIF(btrim(p_username), ''))
  )
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text)
  TO anon, authenticated, service_role;

-- ── 4. Lock down the seller-registration RPC ────────────────────────────────
-- Created without explicit grants, so it defaulted to PUBLIC (which includes
-- anon). It checks auth.uid() internally, but grant it to authenticated only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'register_seller'
  ) THEN
    REVOKE ALL ON FUNCTION public.register_seller(text, text) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.register_seller(text, text)
      TO authenticated, service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
