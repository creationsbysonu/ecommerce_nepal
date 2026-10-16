-- Add username column to profiles for username/password login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- NOTE: an earlier version of this migration added a
-- `CREATE POLICY "profiles_username_lookup" ... USING (true)` here to let the
-- login flow read other users' rows. Because RLS policies are OR-ed that
-- exposed every profile (email, phone, wallet, …) to the anon key, defeating
-- 20261012000001_rls_and_privileges.sql. Username/phone lookups now go through
-- narrow SECURITY DEFINER RPCs (see 20261016000000_auth_privacy_and_signup.sql),
-- so no permissive policy is created.