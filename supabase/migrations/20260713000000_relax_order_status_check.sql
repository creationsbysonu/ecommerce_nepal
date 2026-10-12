-- /api/checkout sets status='processing' for wallet payments and the seller
-- dashboard renders a 'processing' state, but the original CHECK constraint
-- only allowed (pending, paid, shipped, delivered, cancelled) — wallet
-- checkout would fail with a constraint violation. Relax it to match the app.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'));
