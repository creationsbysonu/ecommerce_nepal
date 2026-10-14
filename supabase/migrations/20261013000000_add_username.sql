-- Add username column to profiles for username/password login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- Update RLS policy to allow username lookups during login
-- The existing profiles_select policy allows users to read their own profile
-- We need a policy for the login flow to look up email by username
CREATE POLICY "profiles_username_lookup" ON public.profiles
  FOR SELECT USING (true);