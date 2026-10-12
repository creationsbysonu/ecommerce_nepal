-- Add phone_number field to the profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
