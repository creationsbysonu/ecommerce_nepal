-- ============================================================
-- Mero Pasal — checkout / gift card / lookup functions
--
-- /api/checkout used to assemble an order from client-supplied prices in a
-- dozen separate REST calls with no transaction: totals were whatever the
-- browser claimed, stock was never decremented, coupon rules were never
-- re-checked, and a failure at step 4 left an order with no payment behind.
--
-- place_order() does the whole thing in one Postgres transaction so that
-- either all of it lands or none of it does, and so that every number is
-- derived from the database rather than from the request body.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_order(
  p_items            jsonb,     -- [{"product_id": uuid, "variant_id": uuid?, "quantity": int}]
  p_address_id       uuid,      -- addresses row belonging to the caller
  p_payment_method   text,      -- 'cod' | 'wallet'
  p_client_reference uuid,      -- de-duplicates retries / double clicks
  p_coupon_code      text,      -- optional
  p_coins_used       integer    -- requested coin spend, capped server-side
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user           uuid := auth.uid();
  v_address        public.addresses%ROWTYPE;
  v_profile        public.profiles%ROWTYPE;
  v_variant        public.product_variants%ROWTYPE;
  v_coupon         public.coupons%ROWTYPE;
  v_coupon_id      uuid;
  v_item           jsonb;
  v_rec            record;
  v_key            text;
  v_prev           jsonb;
  v_lines          jsonb := '{}'::jsonb;   -- variant id -> merged cart line
  v_line_list      jsonb := '[]'::jsonb;
  v_qty            integer;
  v_price          numeric;
  v_product_id     uuid;
  v_variant_id     uuid;
  v_subtotal       numeric := 0;
  v_delivery       numeric;
  v_coupon_disc    numeric := 0;
  v_coin_disc      numeric := 0;
  v_coins_to_use   integer := 0;
  v_max_coins      integer;
  v_total          numeric;
  v_order_id       uuid;
  v_status         text;
  v_earned         integer;
BEGIN
  -- ── Authentication & basic validation ────────────────────────────────────
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order.';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod', 'wallet') THEN
    RAISE EXCEPTION 'Unsupported payment method.';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'A single order may contain at most 100 lines.';
  END IF;

  v_coins_to_use := GREATEST(COALESCE(p_coins_used, 0), 0);

  -- ── Idempotency ──────────────────────────────────────────────────────────
  -- The browser retries with the same reference, so a double click returns
  -- the order that already exists instead of creating a second one.
  IF p_client_reference IS NOT NULL THEN
    SELECT id, status, total_amount, subtotal, delivery_charge,
           discount_amount, coin_discount, coins_used
      INTO v_order_id, v_status, v_total, v_subtotal, v_delivery,
           v_coupon_disc, v_coin_disc, v_coins_to_use
      FROM public.orders
     WHERE client_reference = p_client_reference
       AND customer_id = v_user;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'orderId', v_order_id, 'status', v_status, 'total', v_total,
        'subtotal', v_subtotal, 'deliveryCharge', v_delivery,
        'couponDiscount', v_coupon_disc, 'coinDiscount', v_coin_disc,
        'coinsUsed', v_coins_to_use, 'duplicate', true
      );
    END IF;

    -- SELECT INTO sets every target to NULL when it finds no row, so the
    -- accumulators it clobbered must be restored for the fresh order below.
    v_subtotal    := 0;
    v_coupon_disc := 0;
    v_coin_disc   := 0;
    v_coins_to_use := GREATEST(COALESCE(p_coins_used, 0), 0);
  END IF;

  -- Let protect_profile_writes know the balance changes below are ours.
  PERFORM set_config('meropasal.internal_write', '1', true);

  -- ── Delivery address must belong to the caller ───────────────────────────
  SELECT * INTO v_address
    FROM public.addresses
   WHERE id = p_address_id AND user_id = v_user
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Please choose a valid delivery address.';
  END IF;

  -- ── Serialise concurrent checkouts for this user ─────────────────────────
  -- Taking the profile lock first means two simultaneous orders cannot both
  -- spend the same wallet balance or the same coins.
  SELECT * INTO v_profile
    FROM public.profiles
   WHERE id = v_user
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account could not be loaded.';
  END IF;

  -- ── Resolve cart lines to variants, merging duplicates ───────────────────
  -- Prices are read from product_variants here; the browser's copy is only a
  -- display hint and is never trusted.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item ->> 'product_id', '')::uuid;
    v_variant_id := NULLIF(v_item ->> 'variant_id', '')::uuid;
    v_qty        := NULLIF(v_item ->> 'quantity', '')::integer;

    IF v_product_id IS NULL AND v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Every cart line needs a product.';
    END IF;
    IF v_qty IS NULL OR v_qty < 1 THEN RAISE EXCEPTION 'Quantities must be at least 1.'; END IF;
    IF v_qty > 100 THEN RAISE EXCEPTION 'Maximum quantity per item is 100.'; END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant
        FROM public.product_variants
       WHERE id = v_variant_id
         AND (v_product_id IS NULL OR product_id = v_product_id)
       FOR UPDATE;
    ELSE
      -- The storefront adds the product's first variant to the cart, so use
      -- the same rule (oldest variant) when the client did not name one.
      SELECT * INTO v_variant
        FROM public.product_variants
       WHERE product_id = v_product_id
       ORDER BY created_at ASC, id ASC
       LIMIT 1
       FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One of the products in your cart is no longer available.';
    END IF;

    v_key   := v_variant.id::text;
    v_prev  := v_lines -> v_key;

    IF v_prev IS NULL THEN
      v_lines := v_lines || jsonb_build_object(v_key, jsonb_build_object(
        'product_variant_id', v_variant.id,
        'product_id',         v_variant.product_id,
        'quantity',           v_qty,
        'price_at_time',      v_variant.price
      ));
    ELSE
      v_lines := v_lines || jsonb_build_object(v_key, jsonb_set(
        v_prev, '{quantity}', to_jsonb((v_prev ->> 'quantity')::integer + v_qty)
      ));
    END IF;

    IF (v_lines -> v_key ->> 'quantity')::integer > v_variant.stock THEN
      RAISE EXCEPTION 'Only % left in stock for this item.',
        v_variant.stock;
    END IF;
  END LOOP;

  -- ── Subtotal from the database ───────────────────────────────────────────
  FOR v_rec IN SELECT value FROM jsonb_each(v_lines) LOOP
    v_qty      := (v_rec.value ->> 'quantity')::integer;
    v_price    := (v_rec.value ->> 'price_at_time')::numeric;
    v_subtotal := v_subtotal + (v_qty * v_price);
    v_line_list := v_line_list || jsonb_build_array(v_rec.value);
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  -- Free delivery over Rs. 5000, otherwise a flat Rs. 100.
  v_delivery := CASE WHEN v_subtotal > 5000 THEN 0 ELSE 100 END;

  -- ── Coupon: every rule re-checked here, discount recomputed ──────────────
  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
      FROM public.coupons
     WHERE code = upper(btrim(p_coupon_code))
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'That coupon code is not valid.';
    END IF;
    IF v_coupon.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'That coupon code is not valid.';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'That coupon has expired.';
    END IF;
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'That coupon has been fully redeemed.';
    END IF;
    IF v_subtotal < COALESCE(v_coupon.min_order_amount, 0) THEN
      RAISE EXCEPTION 'This coupon needs a minimum order of Rs. %.',
        v_coupon.min_order_amount;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.coupon_usages
       WHERE coupon_id = v_coupon.id AND user_id = v_user
    ) THEN
      RAISE EXCEPTION 'You have already used this coupon.';
    END IF;

    IF v_coupon.discount_type = 'percentage' THEN
      v_coupon_disc := v_subtotal * v_coupon.discount_value / 100;
      IF v_coupon.max_discount_amount IS NOT NULL THEN
        v_coupon_disc := LEAST(v_coupon_disc, v_coupon.max_discount_amount);
      END IF;
    ELSE
      v_coupon_disc := v_coupon.discount_value;
    END IF;
    -- Never discount more than the goods are worth.
    v_coupon_disc := LEAST(v_coupon_disc, v_subtotal);

    -- v_coupon is only assigned when a code was supplied, so copy the id into
    -- a plain variable before leaving this branch.
    v_coupon_id := v_coupon.id;
  END IF;

  -- ── Coins: at most 20% of the goods value, 4 coins = Re 1 ────────────────
  IF v_coins_to_use > 0 THEN
    v_max_coins  := floor((v_subtotal * 0.20) / 0.25)::integer;
    v_coins_to_use := LEAST(v_coins_to_use, COALESCE(v_profile.coin_balance, 0), v_max_coins);
    v_coin_disc  := v_coins_to_use * 0.25;
  ELSE
    v_coins_to_use := 0;
  END IF;

  v_total := GREATEST(0, v_subtotal + v_delivery - v_coupon_disc - v_coin_disc);

  -- ── Wallet must actually cover the order ─────────────────────────────────
  IF p_payment_method = 'wallet' AND COALESCE(v_profile.wallet_balance, 0) < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance (Rs. % available, Rs. % needed).',
      v_profile.wallet_balance, v_total;
  END IF;

  v_status := CASE WHEN p_payment_method = 'wallet' THEN 'processing' ELSE 'pending' END;

  -- ── Everything below is one commit ───────────────────────────────────────
  INSERT INTO public.orders (
    customer_id, status, total_amount, shipping_address,
    payment_method, subtotal, coupon_id, discount_amount, delivery_charge,
    coins_used, coin_discount, client_reference
  ) VALUES (
    v_user, v_status, v_total,
    jsonb_build_object(
      'full_name',      v_address.full_name,
      'phone_number',   v_address.phone_number,
      'street_address', v_address.street_address,
      'city',           v_address.city,
      'state',          v_address.state,
      'postal_code',    v_address.postal_code
    ),
    p_payment_method, v_subtotal, v_coupon_id, v_coupon_disc, v_delivery,
    v_coins_to_use, v_coin_disc, p_client_reference
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_variant_id, quantity, price_at_time)
  SELECT v_order_id,
         (line.value ->> 'product_variant_id')::uuid,
         (line.value ->> 'quantity')::integer,
         (line.value ->> 'price_at_time')::numeric
    FROM jsonb_array_elements(v_line_list) AS line;

  -- Each variant appears exactly once in v_line_list, so this decrements once.
  UPDATE public.product_variants pv
     SET stock = pv.stock - (line.value ->> 'quantity')::integer
    FROM jsonb_array_elements(v_line_list) AS line
   WHERE pv.id = (line.value ->> 'product_variant_id')::uuid;

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_usages (coupon_id, user_id, order_id, discount_applied)
    VALUES (v_coupon_id, v_user, v_order_id, v_coupon_disc);

    UPDATE public.coupons
       SET used_count = used_count + 1
     WHERE id = v_coupon_id;
  END IF;

  IF p_payment_method = 'wallet' AND v_total > 0 THEN
    UPDATE public.profiles
       SET wallet_balance = COALESCE(wallet_balance, 0) - v_total
     WHERE id = v_user;

    INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id, order_id)
    VALUES (v_user, -v_total, 'debit',
            'Payment for order #' || left(v_order_id::text, 8),
            v_order_id::text, v_order_id);
  END IF;

  IF v_coins_to_use > 0 THEN
    UPDATE public.profiles
       SET coin_balance = coin_balance - v_coins_to_use
     WHERE id = v_user;

    INSERT INTO public.coin_transactions (user_id, coins, type, reason, order_id)
    VALUES (v_user, -v_coins_to_use, 'redeemed',
            'Redeemed on order #' || left(v_order_id::text, 8), v_order_id);
  END IF;

  -- Loyalty: 1 coin per Rs. 100 actually paid.
  v_earned := floor(v_total / 100)::integer;
  IF v_earned > 0 THEN
    UPDATE public.profiles
       SET coin_balance = COALESCE(coin_balance, 0) + v_earned
     WHERE id = v_user;

    INSERT INTO public.coin_transactions (user_id, coins, type, reason, order_id)
    VALUES (v_user, v_earned, 'earned',
            'Earned from order #' || left(v_order_id::text, 8), v_order_id);
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    v_user,
    'Order Placed Successfully',
    'Your order #' || left(v_order_id::text, 8) || ' has been placed and is being processed.',
    'order',
    '/profile/orders'
  );

  RETURN jsonb_build_object(
    'orderId',        v_order_id,
    'status',         v_status,
    'total',          v_total,
    'subtotal',       v_subtotal,
    'deliveryCharge', v_delivery,
    'couponDiscount', v_coupon_disc,
    'coinDiscount',   v_coin_disc,
    'coinsUsed',      v_coins_to_use,
    'coinsEarned',    v_earned,
    'duplicate',      false
  );
END;
$$;

-- ============================================================
-- Gift card redemption: the card and the wallet move together, and the card
-- is locked so the same code cannot be redeemed twice concurrently.
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_card   public.gift_cards%ROWTYPE;
  v_amount numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to redeem a gift card.';
  END IF;
  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RAISE EXCEPTION 'Enter a gift card code.';
  END IF;

  PERFORM set_config('meropasal.internal_write', '1', true);

  SELECT * INTO v_card
    FROM public.gift_cards
   WHERE code = upper(btrim(p_code))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That gift card code is not valid.';
  END IF;
  IF v_card.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'That gift card is no longer active.';
  END IF;
  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    RAISE EXCEPTION 'That gift card has expired.';
  END IF;
  IF v_card.redeemed_by IS NOT NULL THEN
    IF v_card.redeemed_by = v_user THEN
      RAISE EXCEPTION 'You have already redeemed this gift card.';
    END IF;
    RAISE EXCEPTION 'That gift card has already been redeemed.';
  END IF;

  v_amount := GREATEST(COALESCE(v_card.remaining_value, 0), 0);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'That gift card has no balance left.';
  END IF;

  UPDATE public.gift_cards
     SET redeemed_by   = v_user,
         remaining_value = 0
   WHERE id = v_card.id;

  UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount
   WHERE id = v_user;

  INSERT INTO public.wallet_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user, v_amount, 'credit', 'Gift card ' || v_card.code, v_card.id::text);

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_user, 'Gift card redeemed',
          'Rs. ' || v_amount::text || ' from ' || v_card.code || ' was added to your wallet.',
          'system', '/profile/wallet');

  RETURN jsonb_build_object(
    'success',    true,
    'amount',     v_amount,
    'newBalance', (SELECT wallet_balance FROM public.profiles WHERE id = v_user)
  );
END;
$$;

-- ============================================================
-- Sellers need customer display names for their order list. The profiles table
-- is no longer world-readable (it exposes email, phone and balances), so this
-- is the supported way to resolve a name for someone else's account.
-- ============================================================
CREATE OR REPLACE FUNCTION public.profile_display_names(p_ids uuid[])
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.full_name
    FROM public.profiles p
   WHERE p.id = ANY(p_ids)
$$;

-- ============================================================
-- /api/auth/phone-login resolves a phone number to the account's e-mail so
-- the client can send an OTP to it. That route runs while signed out, and
-- profiles are private under RLS (own row or admin), so the anonymous REST
-- read it used to do now returns nothing. This narrow function is the
-- supported replacement: it yields the one column the flow has always handed
-- back to the client, and nothing else from the profile.
-- ============================================================
CREATE OR REPLACE FUNCTION public.phone_login_lookup(p_phone text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.email::text
    FROM public.profiles p
   WHERE p.phone_number = p_phone
     AND p.email IS NOT NULL
   LIMIT 1
$$;

-- ── Privileges ──────────────────────────────────────────────────────────────
-- Revoke from PUBLIC first: PUBLIC includes the anon role, which must never be
-- able to place an order or redeem a gift card.
REVOKE ALL ON FUNCTION public.place_order(jsonb, uuid, text, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_gift_card(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_display_names(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phone_login_lookup(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_order(jsonb, uuid, text, uuid, text, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card(text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.profile_display_names(uuid[])
  TO authenticated, service_role;
-- The phone-login route is anonymous by design — resolving the number is how
-- you get to sign in — so anon needs this one lookup. It exposes only the
-- e-mail the route already returned to the client.
GRANT EXECUTE ON FUNCTION public.phone_login_lookup(text)
  TO anon, authenticated, service_role;

-- Pick up the new functions without restarting the PostgREST service.
NOTIFY pgrst, 'reload schema';
