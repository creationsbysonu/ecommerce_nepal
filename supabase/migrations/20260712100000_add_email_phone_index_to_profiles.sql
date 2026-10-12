-- Add email column to profiles so phone-based login can look up the user's email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Add a unique index on phone_number to prevent duplicate phone registrations
-- and make phone lookups fast
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON public.profiles (phone_number)
  WHERE phone_number IS NOT NULL;

-- Update the handle_new_user trigger to also capture email from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
