import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

type CheckoutItem = {
  productId: string;
  price: number;
  quantity: number;
};

type CheckoutRequest = {
  items: CheckoutItem[];
  address: Record<string, unknown>;
  totalAmount: number;
  paymentMethod: 'cod' | 'wallet';
  appliedCoupon: { id: string; discount: number } | null;
  coinsUsed: { count: number; discount: number } | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { items, address, totalAmount, paymentMethod, appliedCoupon, coinsUsed } =
      (await request.json()) as CheckoutRequest;

    if (!items || !items.length || !address) {
      return NextResponse.json({ error: 'Invalid checkout data' }, { status: 400 });
    }

    // 1. Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        total_amount: totalAmount,
        shipping_address: address,
        status: paymentMethod === 'wallet' ? 'processing' : 'pending' 
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create order items
    const productIds = items.map((i) => i.productId);
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, product_id, price')
      .in('product_id', productIds);

    const orderItems = items.map((item) => {
      const variant = variants?.find(v => v.product_id === item.productId);
      return {
        order_id: order.id,
        product_variant_id: variant?.id,
        quantity: item.quantity,
        price_at_time: item.price
      };
    }).filter((i) => i.product_variant_id);

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    }

    // 3. Process Wallet Payment
    if (paymentMethod === 'wallet' && totalAmount > 0) {
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      const currentBalance = Number(profile?.wallet_balance) || 0;
      
      if (currentBalance < totalAmount) {
        throw new Error('Insufficient wallet balance');
      }

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -totalAmount,
        type: 'debit',
        description: `Payment for Order #${order.id.slice(0, 8)}`,
        reference_id: order.id
      });

      await supabase.from('profiles').update({ wallet_balance: currentBalance - totalAmount }).eq('id', user.id);
    }

    // 4. Process Coupon Usage
    if (appliedCoupon) {
      await supabase.from('coupon_usages').insert({
        coupon_id: appliedCoupon.id,
        user_id: user.id,
        order_id: order.id,
        discount_applied: appliedCoupon.discount
      });

      // Increment used_count (this requires an RPC or selecting and updating; for simplicity we select and update)
      const { data: couponData } = await supabase.from('coupons').select('used_count').eq('id', appliedCoupon.id).single();
      if (couponData) {
        await supabase.from('coupons').update({ used_count: (couponData.used_count || 0) + 1 }).eq('id', appliedCoupon.id);
      }
    }

    // 5. Process Coins Used
    if (coinsUsed && coinsUsed.count > 0) {
      const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
      const currentCoins = profile?.coin_balance || 0;

      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        coins: -coinsUsed.count,
        type: 'redeemed',
        reason: `Redeemed on Order #${order.id.slice(0, 8)}`,
        order_id: order.id
      });

      await supabase.from('profiles').update({ coin_balance: currentCoins - coinsUsed.count }).eq('id', user.id);
    }

    // 6. Earn new coins (1 coin per Rs. 100 spent)
    const coinsEarned = Math.floor(totalAmount / 100);
    if (coinsEarned > 0) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        coins: coinsEarned,
        type: 'earned',
        reason: `Earned from Order #${order.id.slice(0, 8)}`,
        order_id: order.id
      });

      const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
      await supabase.from('profiles').update({ coin_balance: (profile?.coin_balance || 0) + coinsEarned }).eq('id', user.id);
    }

    // 7. Create Notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Order Placed Successfully',
      message: `Your order #${order.id.slice(0, 8)} has been placed and is being processed.`,
      type: 'order',
      link: '/profile/orders'
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
