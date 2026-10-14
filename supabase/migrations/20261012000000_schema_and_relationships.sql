-- ============================================================
-- Mero Pasal — schema & relationship completion
--
-- Fills the gaps left by the earlier migrations:
--   * orders now records HOW the total was arrived at
--   * the support and "request a callback" forms get real tables
--   * notification preferences get somewhere to live
--   * wallet entries gain a real FK to the order they paid for
--   * balances / amounts are constrained non-negative
--   * updated_at is maintained by triggers instead of by hand
--   * indexes for every column the app filters or sorts on
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Orders: the checkout breakdown ───────────────────────────────────────
-- Previously only `total_amount` was stored, so the coupon / coin / delivery
-- maths existed solely in the browser and could not be audited or reversed.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method  TEXT DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_id       UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_used      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_discount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Sent by the client so a retried / double-clicked checkout is idempotent.
  ADD COLUMN IF NOT EXISTS client_reference UUID;

UPDATE public.orders SET payment_method = 'cod' WHERE payment_method IS NULL;
ALTER TABLE public.orders ALTER COLUMN payment_method SET NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'wallet'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_amounts_non_negative;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_amounts_non_negative
  CHECK (
    subtotal        >= 0 AND
    total_amount    >= 0 AND
    delivery_charge >= 0 AND
    discount_amount >= 0 AND
    coin_discount   >= 0 AND
    coins_used      >= 0
  );

-- Makes a retried checkout return the original order instead of duplicating it.
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_reference_key
  ON public.orders (client_reference)
  WHERE client_reference IS NOT NULL;

-- ── 2. Profiles: notification preferences + non-negative balances ───────────
-- Keys mirror the toggles on /preferences.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  NOT NULL DEFAULT '{
    "email_orders": true,
    "email_promos": false,
    "sms_orders": true,
    "sms_promos": true,
    "push_orders": true,
    "push_promos": false
  }'::jsonb;

-- Guards money-printing even if a write path misbehaves (RLS alone does not
-- stop a SECURITY DEFINER routine from producing a negative balance).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_balances_non_negative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_balances_non_negative
  CHECK (wallet_balance >= 0 AND coin_balance >= 0);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- ── 3. Wallet transactions: real relationship to the order they settled ─────
-- `reference_id` stays as a free-form text field for top-ups and other refs.
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- ── 4. Addresses: at most one default per user ──────────────────────────────
-- The UI clears the old default before setting a new one, so this cannot
-- reject a legitimate change; it only rejects two defaults at once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON public.addresses (user_id)
  WHERE is_default;

-- ── 5. Support tickets (the /support form previously persisted nothing) ─────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL CHECK (subject IN ('order', 'return', 'payment', 'other')),
  order_id   UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  message    TEXT NOT NULL CHECK (length(btrim(message)) > 0),
  status     TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Advertising callback requests (the /advertise form) ──────────────────
CREATE TABLE IF NOT EXISTS public.advertise_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_name   TEXT NOT NULL CHECK (length(btrim(brand_name)) > 0),
  phone_number TEXT NOT NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. updated_at maintained by the database ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Re-created on every table that owns an updated_at column.
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.stores;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.support_tickets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 8. New user trigger: also carry the phone number across ─────────────────
-- Signup collects the number after GoTrue has already created the user, but
-- phone login and OTP flows read it from profiles, so keep them in sync.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, phone_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'phone_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. Indexes for everything the app filters, joins or sorts on ────────────
CREATE INDEX IF NOT EXISTS idx_addresses_user_id      ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id     ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items (product_variant_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id      ON public.products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id   ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_active        ON public.products (is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user         ON public.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user           ON public.coin_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user     ON public.coupon_usages (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon   ON public.coupon_usages (coupon_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user          ON public.wishlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user   ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advertise_requests_created ON public.advertise_requests (created_at DESC);

-- Stock can never go negative: place_order() checks availability under a row
-- lock, so this constraint is the backstop rather than the primary guard.
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS stock_non_negative;
ALTER TABLE public.product_variants
  ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);

-- PostgREST caches table listings; tell it to rebuild now that this migration
-- has added tables, columns and indexes.
NOTIFY pgrst, 'reload schema';

-- ── 10. Table privileges ───────────────────────────────────────────────────
-- RLS decides WHICH rows a role may touch; these grants decide WHETHER it may
-- reach the table at all. The Supabase platform only auto-grants on objects it
-- creates itself, so tables born from our own migrations (and every table a
-- later migration adds) get their rights here instead:
--   * anon        — the public storefront reads catalogue data;
--   * authenticated — customers/sellers/admins do their DML (RLS narrows it);
--   * service_role — full access (it bypasses RLS by design).
-- Idempotent: repeating a grant is a no-op.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Covers tables created by migrations that run after this one.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
