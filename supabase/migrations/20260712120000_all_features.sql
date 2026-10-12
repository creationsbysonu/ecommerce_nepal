-- ===================================================
-- Wishlist Items
-- ===================================================
CREATE TABLE public.wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wishlist" ON public.wishlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into wishlist" ON public.wishlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from wishlist" ON public.wishlist_items FOR DELETE USING (auth.uid() = user_id);

-- ===================================================
-- Coupons
-- ===================================================
CREATE TABLE public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_discount_amount DECIMAL(10, 2), -- cap for percentage discounts
  max_uses INT DEFAULT NULL,          -- NULL = unlimited
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL = no expiry
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can read active coupons
CREATE POLICY "Authenticated users can view active coupons" ON public.coupons FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Coupon usages (track which user used which coupon on which order)
CREATE TABLE public.coupon_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id) -- one use per user per coupon
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own coupon usages" ON public.coupon_usages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert coupon usages" ON public.coupon_usages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===================================================
-- Notifications
-- ===================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('order', 'promo', 'system', 'coupon')),
  is_read BOOLEAN DEFAULT false,
  link TEXT, -- optional deep link e.g. /profile/orders
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
-- Service role can insert (for system-triggered notifications)
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ===================================================
-- Wallet & Coins (Phase 2 tables — created now so migrations are clean)
-- ===================================================

-- Add wallet_balance and coin_balance to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coin_balance INT DEFAULT 0;

CREATE TABLE public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT NOT NULL,
  reference_id TEXT,    -- e.g. order_id or top-up reference
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

CREATE TABLE public.coin_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coins INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired')),
  reason TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own coin transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert coin transactions" ON public.coin_transactions FOR INSERT WITH CHECK (true);

-- ===================================================
-- Plus Subscriptions
-- ===================================================
CREATE TABLE public.plus_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly'))
);

ALTER TABLE public.plus_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.plus_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ===================================================
-- Gift Cards
-- ===================================================
CREATE TABLE public.gift_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  value DECIMAL(10,2) NOT NULL,
  remaining_value DECIMAL(10,2) NOT NULL,
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view gift cards they own or redeemed" ON public.gift_cards FOR SELECT
  USING (auth.uid() = purchased_by OR auth.uid() = redeemed_by);

-- ===================================================
-- Seed: sample coupons for testing
-- ===================================================
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, is_active)
VALUES
  ('WELCOME10', 'Get 10% off your first order', 'percentage', 10, 500, 200, 1000, true),
  ('FLAT200',   'Flat Rs. 200 off on orders above Rs. 1000', 'fixed', 200, 1000, NULL, 500, true),
  ('SAVE50',    'Rs. 50 off on orders above Rs. 300', 'fixed', 50, 300, NULL, NULL, true);
