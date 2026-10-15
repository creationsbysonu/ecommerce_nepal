-- Register seller atomically: update profile role + create store in one transaction
-- This prevents race conditions where two concurrent requests could both pass the role check

CREATE OR REPLACE FUNCTION public.register_seller(
  p_store_name TEXT,
  p_store_description TEXT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_store_id UUID;
BEGIN
  -- Verify user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Lock the profile row to prevent concurrent modifications
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  -- Check if user is already a seller
  IF v_profile.role = 'seller' THEN
    RAISE EXCEPTION 'User is already registered as a seller';
  END IF;

  -- Update profile role to seller
  UPDATE public.profiles
  SET role = 'seller',
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Create store entry
  INSERT INTO public.stores (seller_id, name, description, is_verified)
  VALUES (v_user_id, p_store_name, p_store_description, false)
  RETURNING id INTO v_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store_id,
    'message', 'Seller registration successful'
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Registration failed: %', SQLERRM;
END;
$$;