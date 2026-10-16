import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { authRateLimiter } from '@/utils/rate-limit';

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutRequest = {
  items: CheckoutItem[];
  addressId: string;
  paymentMethod: 'cod' | 'wallet';
  clientReference: string;
  couponCode?: string | null;
  coinsUsed?: number;
};

/** Shape returned by the place_order() RPC (supabase/migrations/…_place_order_and_friends.sql). */
type PlaceOrderResult = {
  orderId: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  couponDiscount: number;
  coinDiscount: number;
  coinsUsed: number;
  coinsEarned: number;
  duplicate: boolean;
};

export async function POST(request: NextRequest) {
  // Rate limiting (best-effort; see utils/rate-limit.ts).
  const rateLimitResponse = await authRateLimiter(request, 'checkout');
  if (rateLimitResponse) return rateLimitResponse;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CheckoutRequest;
    const { items, addressId, paymentMethod, clientReference, couponCode, coinsUsed } = body;

    if (!items || !items.length || !addressId || !paymentMethod || !clientReference) {
      return NextResponse.json({ error: 'Invalid checkout data' }, { status: 400 });
    }

    // The whole checkout runs inside place_order() as a single Postgres
    // transaction: prices come from product_variants (never from the request),
    // stock is decremented under a row lock, the coupon and coin rules are
    // re-checked server-side, the wallet is settled, loyalty coins are credited
    // and the confirmation notification is written — all or nothing.
    //
    // clientReference makes a retried / double-clicked submit idempotent: the
    // same reference returns the order created the first time.
    const { data, error } = await supabase.rpc('place_order', {
      p_items: items.map((item) => ({
        product_id: item.productId,
        variant_id: null,
        quantity: item.quantity,
      })),
      p_address_id: addressId,
      p_payment_method: paymentMethod,
      p_client_reference: clientReference,
      p_coupon_code: couponCode ?? null,
      p_coins_used: coinsUsed ?? 0,
    });

    if (error) {
      // place_order() raises user-facing messages (out of stock, insufficient
      // wallet balance, coupon no longer valid, …) — pass them through.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...(data as PlaceOrderResult) });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
