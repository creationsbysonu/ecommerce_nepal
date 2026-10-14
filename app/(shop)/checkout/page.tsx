'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Tag, Coins, Wallet, CheckCircle, AlertCircle } from 'lucide-react';

type Address = {
  id: string;
  full_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
};

export default function CheckoutPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const router = useRouter();
  
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const supabase = createClient();

  // User Balances
  const [walletBalance, setWalletBalance] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wallet'>('cod');
  const [useCoins, setUseCoins] = useState(false);

  // One idempotency key per checkout session: a retried or double-clicked
  // submit reuses it, so place_order() returns the original order rather than
  // debiting the wallet or the stock twice.
  const clientReference = useRef(crypto.randomUUID());

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch Addresses
      const { data: addrs } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (addrs && addrs.length > 0) {
        setAddresses(addrs);
        const defaultAddr = addrs.find(a => a.is_default);
        setSelectedAddressId(defaultAddr ? defaultAddr.id : addrs[0].id);
      }

      // Fetch Balances
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, coin_balance')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setWalletBalance(Number(profile.wallet_balance) || 0);
        setCoinBalance(profile.coin_balance || 0);
      }

      setLoading(false);
    };

    loadData();
  }, [items, router, supabase]);

  const applyCoupon = async () => {
    setCouponError(null);
    if (!couponCode.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Coupon
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!coupon) {
      setCouponError('Invalid or expired coupon.');
      return;
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setCouponError('This coupon has expired.');
      return;
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      setCouponError('This coupon is fully redeemed.');
      return;
    }

    if (getTotalPrice() < coupon.min_order_amount) {
      setCouponError(`Minimum order amount for this coupon is Rs. ${coupon.min_order_amount}`);
      return;
    }

    // Check if user already used it
    const { data: usage } = await supabase
      .from('coupon_usages')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (usage) {
      setCouponError('You have already used this coupon.');
      return;
    }

    setAppliedCoupon(coupon);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Calculations
  const basePrice = getTotalPrice();
  const deliveryCharge = getTotalItems() > 0 ? (basePrice > 5000 ? 0 : 100) : 0;
  
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      couponDiscount = basePrice * (appliedCoupon.discount_value / 100);
      if (appliedCoupon.max_discount_amount && couponDiscount > appliedCoupon.max_discount_amount) {
        couponDiscount = appliedCoupon.max_discount_amount;
      }
    } else {
      couponDiscount = appliedCoupon.discount_value;
    }
  }

  // Max 20% of order can be paid with coins
  let coinDiscount = 0;
  let coinsToDeduct = 0;
  if (useCoins && coinBalance > 0) {
    const maxCoinDiscount = basePrice * 0.20; 
    const valuePerCoin = 0.25; // 4 coins = 1 Rs
    const maxCoinsAllowed = Math.floor(maxCoinDiscount / valuePerCoin);
    
    coinsToDeduct = Math.min(coinBalance, maxCoinsAllowed);
    coinDiscount = coinsToDeduct * valuePerCoin;
  }

  const amountPayable = Math.max(0, basePrice + deliveryCharge - couponDiscount - coinDiscount);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;
    
    // Prevent wallet checkout if balance is insufficient
    if (paymentMethod === 'wallet' && walletBalance < amountPayable) {
      alert('Insufficient wallet balance. Please select Cash on Delivery or add funds.');
      return;
    }

    setPlacingOrder(true);

    try {
      // Only the identity of the cart lines is sent — never prices or totals:
      // place_order() recomputes everything from the database (subtotal,
      // delivery, coupon, coins) and returns the authoritative breakdown.
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          addressId: selectedAddressId,
          paymentMethod,
          clientReference: clientReference.current,
          couponCode: appliedCoupon?.code ?? null,
          coinsUsed: useCoins ? coinsToDeduct : 0,
        })
      });

      const data = await res.json();
      if (data.success) {
        clearCart();
        alert('Order placed successfully!');
        router.push('/profile/orders');
      } else {
        alert('Error placing order: ' + data.error);
        setPlacingOrder(false);
      }
    } catch (err) {
      alert('Network error');
      setPlacingOrder(false);
    }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading checkout...</div>;

  return (
    <div className="container" style={{ padding: '32px 16px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Address Selection */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', fontWeight: 600 }}>1. Delivery Address</h2>
          
          {addresses.length === 0 ? (
            <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '4px', textAlign: 'center' }}>
              <p style={{ marginBottom: '16px' }}>You haven&apos;t added a delivery address yet.</p>
              <Link href="/profile/addresses">
                <Button>Add New Address</Button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {addresses.map(addr => (
                <label 
                  key={addr.id} 
                  style={{ 
                    display: 'flex', gap: '16px', padding: '16px', 
                    border: `1px solid ${selectedAddressId === addr.id ? 'var(--brand-blue)' : 'var(--border)'}`, 
                    borderRadius: '4px', cursor: 'pointer',
                    background: selectedAddressId === addr.id ? 'rgba(40, 116, 240, 0.05)' : 'transparent'
                  }}
                >
                  <input 
                    type="radio" name="address" 
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '8px' }}>{addr.full_name} <span style={{ marginLeft: '16px', color: 'var(--text-muted)' }}>{addr.phone_number}</span></p>
                    <p style={{ color: '#212121', lineHeight: 1.5, fontSize: '14px' }}>
                      {addr.street_address}, {addr.city}, {addr.state} - <b>{addr.postal_code}</b>
                    </p>
                  </div>
                </label>
              ))}
              <div style={{ marginTop: '16px' }}>
                 <Link href="/profile/addresses" style={{ color: 'var(--brand-blue)', fontWeight: 600, fontSize: '14px' }}>+ Add a new address</Link>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', fontWeight: 600 }}>2. Order Summary</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '60px', height: '60px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>{item.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Qty: {item.quantity}</p>
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  Rs. {(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Options */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '24px', fontWeight: 600 }}>3. Payment Options</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Wallet Option */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: `1px solid ${paymentMethod === 'wallet' ? 'var(--brand-blue)' : 'var(--border)'}`, borderRadius: '4px', background: paymentMethod === 'wallet' ? 'rgba(40, 116, 240, 0.05)' : 'white', cursor: walletBalance >= amountPayable ? 'pointer' : 'not-allowed', opacity: walletBalance >= amountPayable ? 1 : 0.6 }}>
               <input type="radio" name="payment" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} disabled={walletBalance < amountPayable} />
               <div style={{ flex: 1 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Wallet size={18} color="var(--brand-blue)" />
                   <span style={{ fontWeight: 600 }}>Mero Pasal Wallet</span>
                 </div>
                 <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Balance: Rs. {walletBalance.toLocaleString()}</p>
                 {walletBalance < amountPayable && <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px' }}>Insufficient balance</p>}
               </div>
            </label>

            {/* COD Option */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: `1px solid ${paymentMethod === 'cod' ? 'var(--brand-blue)' : 'var(--border)'}`, borderRadius: '4px', background: paymentMethod === 'cod' ? 'rgba(40, 116, 240, 0.05)' : 'white', cursor: 'pointer' }}>
               <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
               <span style={{ fontWeight: 600 }}>Cash on Delivery (COD)</span>
            </label>
          </div>
        </div>

      </div>

      {/* Right Column (Price Details + Offers) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Offers Section */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#878787', textTransform: 'uppercase', marginBottom: '16px' }}>Offers & Discounts</h3>
          
          {/* Coupon */}
          {!appliedCoupon ? (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter Coupon Code" 
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '4px', textTransform: 'uppercase' }} 
                />
                <Button onClick={applyCoupon} disabled={!couponCode}>Apply</Button>
              </div>
              {couponError && <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '6px' }}>{couponError}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px dashed #10b981', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#166534', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={14}/> {appliedCoupon.code} Applied</p>
                <p style={{ color: '#166534', fontSize: '12px', marginTop: '2px' }}>Saved Rs. {couponDiscount.toLocaleString()}</p>
              </div>
              <button onClick={removeCoupon} style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
            </div>
          )}

          {/* Coins */}
          {coinBalance > 0 && (
            <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={useCoins} onChange={(e) => setUseCoins(e.target.checked)} style={{ marginTop: '4px' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coins size={14} color="#f59e0b" /> Use Mero Coins
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  You have {coinBalance} coins. You can use up to {coinsToDeduct} coins to save Rs. {coinDiscount}.
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Price Summary Sticky */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '4px', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 'calc(var(--header-height) + 24px)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#878787', textTransform: 'uppercase', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>Price Details</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
            <span>Price ({getTotalItems()} items)</span>
            <span>Rs. {basePrice.toLocaleString()}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
            <span>Delivery Charges</span>
            <span style={{ color: 'var(--success)' }}>
              {deliveryCharge === 0 ? 'FREE' : `Rs. ${deliveryCharge}`}
            </span>
          </div>

          {couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px', color: 'var(--success)' }}>
              <span>Coupon Discount</span>
              <span>- Rs. {couponDiscount.toLocaleString()}</span>
            </div>
          )}

          {coinDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px', color: 'var(--success)' }}>
              <span>Coins Discount</span>
              <span>- Rs. {coinDiscount.toLocaleString()}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 600, borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '16px 0', margin: '16px 0' }}>
            <span>Amount Payable</span>
            <span>Rs. {amountPayable.toLocaleString()}</span>
          </div>

          {(couponDiscount > 0 || coinDiscount > 0) && (
             <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
               You will save Rs. {(couponDiscount + coinDiscount).toLocaleString()} on this order
             </p>
          )}
          
          <Button 
            fullWidth 
            size="lg" 
            disabled={!selectedAddressId || placingOrder || (paymentMethod === 'wallet' && walletBalance < amountPayable)}
            onClick={handlePlaceOrder}
            style={{backgroundColor: 'var(--brand-yellow-dark)', color: '#000'}}
          >
            {placingOrder ? 'Processing...' : `Pay Rs. ${amountPayable.toLocaleString()}`}
          </Button>
        </div>

      </div>
    </div>
  );
}
