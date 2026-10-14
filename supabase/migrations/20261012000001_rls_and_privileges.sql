-- ============================================================
-- Mero Pasal — RLS policies, privileges and write guards
--
-- The earlier migrations only created SELECT policies for most tables, which
-- meant every admin and seller write was a silent no-op, while a few
-- permissive policies let any signed-in user rewrite their own role and
-- balances through the public PostgREST proxy.
--
-- This migration replaces the policy set wholesale:
--   * helper functions (SECURITY DEFINER, so policies cannot recurse)
--   * read/write policies for all 18 tables
--   * a trigger that stops users promoting themselves or editing balances
--   * least-privilege EXECUTE on the RPCs added in the next migration
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── Helper functions ────────────────────────────────────────────────────────
-- Every helper is SECURITY DEFINER: policies on profiles call is_admin(), and
-- is_admin() reads profiles. Definer rights make the inner query skip RLS,
-- which is what stops that from recursing.

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_store(p_store_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = p_store_id AND seller_id = auth.uid()
  )
$$;

-- Can the signed-in user see/manage this order because they sell something in
-- it? Walks order_items -> product_variants -> products -> stores without
-- tripping over those tables' own policies.
CREATE OR REPLACE FUNCTION public.sells_order(p_order_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items  oi
    JOIN public.product_variants pv ON pv.id = oi.product_variant_id
    JOIN public.products      p ON p.id  = pv.product_id
    JOIN public.stores        s ON s.id  = p.store_id
    WHERE oi.order_id = p_order_id
      AND s.seller_id = auth.uid()
  )
$$;

-- Is this the caller's own order? Written as a helper (rather than an inline
-- EXISTS against orders) so the intent is obvious and the predicate is stable.
CREATE OR REPLACE FUNCTION public.owns_order(p_order_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND customer_id = auth.uid()
  )
$$;

-- Marks a write as coming from one of our own database routines (place_order,
-- redeem_gift_card, …) so protect_profile_writes lets the money columns move.
-- Deliberately NOT a callable function: exposing it would let a client lift the
-- guard. Each routine sets the flag itself, inside its own transaction.

-- ── profiles ────────────────────────────────────────────────────────────────
-- Reading someone else's profile used to be open to everyone, which exposed
-- email, phone, wallet and coin balances of every user to the anon key.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING     (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Values a signed-in user must never set on their own row. Runs in addition to
-- the UPDATE policy above, and cannot be bypassed by writing through PostgREST.
CREATE OR REPLACE FUNCTION public.protect_profile_writes() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Database routines flag themselves for the duration of the transaction.
  IF current_setting('meropasal.internal_write', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Role: admins assign anything; customers may onboard/offboard as sellers.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.is_admin() THEN
      NULL;
    ELSIF OLD.role IN ('customer', 'seller')
       AND NEW.role IN ('customer', 'seller') THEN
      NULL;
    ELSE
      NEW.role := OLD.role;
    END IF;
  END IF;

  -- Money only ever moves inside place_order() / redeem_gift_card().
  NEW.wallet_balance := OLD.wallet_balance;
  NEW.coin_balance   := OLD.coin_balance;

  -- The email address is owned by the auth service; allow the initial fill
  -- (phone signups have no email yet) but never a later change.
  IF OLD.email IS NOT NULL THEN
    NEW.email := OLD.email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_writes ON public.profiles;
CREATE TRIGGER protect_profile_writes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_writes();

-- ── stores ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stores_select" ON public.stores;
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON public.stores;
DROP POLICY IF EXISTS "stores_insert" ON public.stores;
DROP POLICY IF EXISTS "Sellers can create their store" ON public.stores;
DROP POLICY IF EXISTS "stores_update" ON public.stores;
DROP POLICY IF EXISTS "Sellers can update their store" ON public.stores;
DROP POLICY IF EXISTS "stores_delete" ON public.stores;

CREATE POLICY "stores_select" ON public.stores FOR SELECT USING (true);
CREATE POLICY "stores_insert" ON public.stores FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "stores_update" ON public.stores FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_admin())
  WITH CHECK (auth.uid() = seller_id OR public.is_admin());
CREATE POLICY "stores_delete" ON public.stores FOR DELETE
  USING (auth.uid() = seller_id OR public.is_admin());

-- ── categories ──────────────────────────────────────────────────────────────
-- Admins manage the catalogue; everyone may read it. Without these two
-- policies /admin/categories could never actually save anything.
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "categories_write" ON public.categories;

CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_write"  ON public.categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── products ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "Sellers can insert products to their store" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "Sellers can update their products" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT
  WITH CHECK (public.owns_store(store_id) OR public.is_admin());
CREATE POLICY "products_update" ON public.products FOR UPDATE
  USING     (public.owns_store(store_id) OR public.is_admin())
  WITH CHECK (public.owns_store(store_id) OR public.is_admin());
CREATE POLICY "products_delete" ON public.products FOR DELETE
  USING (public.owns_store(store_id) OR public.is_admin());

-- ── product_variants ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "variants_select" ON public.product_variants;
DROP POLICY IF EXISTS "Variants viewable by everyone" ON public.product_variants;
DROP POLICY IF EXISTS "Sellers can manage variants" ON public.product_variants;
DROP POLICY IF EXISTS "variants_insert" ON public.product_variants;
DROP POLICY IF EXISTS "variants_update" ON public.product_variants;
DROP POLICY IF EXISTS "variants_delete" ON public.product_variants;

CREATE POLICY "variants_select" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "variants_insert" ON public.product_variants FOR INSERT
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.owns_store(p.store_id)
    )
  );
CREATE POLICY "variants_update" ON public.product_variants FOR UPDATE
  USING (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.owns_store(p.store_id)
    ))
  WITH CHECK (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.owns_store(p.store_id)
    ));
CREATE POLICY "variants_delete" ON public.product_variants FOR DELETE
  USING (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.owns_store(p.store_id)
    ));

-- ── orders ──────────────────────────────────────────────────────────────────
-- Customers read their own, admins read everything, sellers read orders that
-- contain their products. Update was missing entirely, which is why both the
-- admin and seller status dropdowns silently did nothing.
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;

CREATE POLICY "orders_select" ON public.orders FOR SELECT
  USING (
    auth.uid() = customer_id
    OR public.is_admin()
    OR public.sells_order(id)
  );

CREATE POLICY "orders_insert" ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- Customers may cancel their own order while it is still pending; sellers and
-- admins manage fulfilment. USING looks at the row as it is, WITH CHECK at the
-- row as it would become — the customer may keep the status or cancel it, but
-- can never mark their own order paid, shipped or delivered.
CREATE POLICY "orders_update" ON public.orders FOR UPDATE
  USING (
    public.is_admin()
    OR public.sells_order(id)
    OR (auth.uid() = customer_id AND status IN ('pending', 'processing'))
  )
  WITH CHECK (
    public.is_admin()
    OR public.sells_order(id)
    OR (auth.uid() = customer_id AND status IN ('pending', 'processing', 'cancelled'))
  );

-- ── order_items ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete" ON public.order_items;

-- sells_order() is what populates the seller order list and revenue metrics;
-- without it every seller dashboard showed zero.
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT
  USING (
    public.is_admin()
    OR public.owns_order(order_id)
    OR public.sells_order(order_id)
  );

CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT
  WITH CHECK (public.is_admin() OR public.owns_order(order_id));

CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE
  USING (public.is_admin() OR public.sells_order(order_id))
  WITH CHECK (public.is_admin() OR public.sells_order(order_id));

CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE
  USING (public.is_admin() OR public.sells_order(order_id));

-- ── addresses ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "addresses_select" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete" ON public.addresses;
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "addresses_select" ON public.addresses FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "addresses_insert" ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update" ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete" ON public.addresses FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ── wishlist_items ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "wishlist_select" ON public.wishlist_items;
DROP POLICY IF EXISTS "wishlist_insert" ON public.wishlist_items;
DROP POLICY IF EXISTS "wishlist_delete" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can insert into wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can delete from wishlist" ON public.wishlist_items;

CREATE POLICY "wishlist_select" ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "wishlist_insert" ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_delete" ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- ── coupons ─────────────────────────────────────────────────────────────────
-- Checkout re-validates the coupon inside place_order(); `used_count` is
-- incremented there too, which the old app-side UPDATE could never do (no
-- UPDATE policy existed).
DROP POLICY IF EXISTS "coupons_select" ON public.coupons;
DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "coupons_write" ON public.coupons;

CREATE POLICY "coupons_select" ON public.coupons FOR SELECT
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND is_active));
CREATE POLICY "coupons_write" ON public.coupons FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── coupon_usages ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "coupon_usages_select" ON public.coupon_usages;
DROP POLICY IF EXISTS "coupon_usages_insert" ON public.coupon_usages;
DROP POLICY IF EXISTS "Users can view their own coupon usages" ON public.coupon_usages;
DROP POLICY IF EXISTS "Users can insert coupon usages" ON public.coupon_usages;

CREATE POLICY "coupon_usages_select" ON public.coupon_usages FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "coupon_usages_insert" ON public.coupon_usages FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coupon_usages_delete" ON public.coupon_usages FOR DELETE
  USING (public.is_admin());

-- ── notifications ───────────────────────────────────────────────────────────
-- The old INSERT policy was `WITH CHECK (true)`, so any signed-in user could
-- file notifications against anyone else's account.
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ── wallet_transactions / coin_transactions ─────────────────────────────────
DROP POLICY IF EXISTS "wallet_tx_select" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_insert" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Service role can insert wallet transactions" ON public.wallet_transactions;

CREATE POLICY "wallet_tx_select" ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "wallet_tx_insert" ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "coin_tx_select" ON public.coin_transactions;
DROP POLICY IF EXISTS "coin_tx_insert" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can view their own coin transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Service role can insert coin transactions" ON public.coin_transactions;

CREATE POLICY "coin_tx_select" ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "coin_tx_insert" ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ── plus_subscriptions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "plus_select" ON public.plus_subscriptions;
DROP POLICY IF EXISTS "plus_write" ON public.plus_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.plus_subscriptions;

CREATE POLICY "plus_select" ON public.plus_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "plus_insert" ON public.plus_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plus_update" ON public.plus_subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ── gift_cards ──────────────────────────────────────────────────────────────
-- Only the owner may see a card, and nobody may edit one directly: redemption
-- happens inside redeem_gift_card(), which also moves the wallet balance.
DROP POLICY IF EXISTS "gift_cards_select" ON public.gift_cards;
DROP POLICY IF EXISTS "gift_cards_insert" ON public.gift_cards;
DROP POLICY IF EXISTS "gift_cards_update" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can view gift cards they own or redeemed" ON public.gift_cards;

CREATE POLICY "gift_cards_select" ON public.gift_cards FOR SELECT
  USING (
    public.is_admin()
    OR auth.uid() = purchased_by
    OR auth.uid() = redeemed_by
  );
CREATE POLICY "gift_cards_insert" ON public.gift_cards FOR INSERT
  WITH CHECK (public.is_admin());
CREATE POLICY "gift_cards_update" ON public.gift_cards FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── support_tickets ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "support_tickets_select" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete" ON public.support_tickets;

CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (order_id IS NULL OR public.owns_order(order_id))
  );
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "support_tickets_delete" ON public.support_tickets FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- ── advertise_requests ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "advertise_requests_select" ON public.advertise_requests;
DROP POLICY IF EXISTS "advertise_requests_insert" ON public.advertise_requests;

CREATE POLICY "advertise_requests_select" ON public.advertise_requests
  FOR SELECT USING (public.is_admin());
CREATE POLICY "advertise_requests_insert" ON public.advertise_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ── RLS on the tables added by the previous migration ───────────────────────
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertise_requests ENABLE ROW LEVEL SECURITY;

-- PostgREST caches table listings; tell it to rebuild now that this migration
-- has changed them. If PostgREST is not running yet it builds a fresh cache
-- when it boots, so this is safe either way.
NOTIFY pgrst, 'reload schema';
