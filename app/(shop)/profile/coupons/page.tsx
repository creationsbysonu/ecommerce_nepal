'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Tag, Copy, CheckCircle, Clock, Info } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (couponsData) setCoupons(couponsData);

      if (user) {
        const { data: usages } = await supabase
          .from('coupon_usages')
          .select('coupon_id')
          .eq('user_id', user.id);
        if (usages) setUsedIds(new Set(usages.map((u) => u.coupon_id)));
      }

      setLoading(false);
    };
    load();
  }, [supabase]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (coupon: Coupon) =>
    coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}% OFF`
      : `Rs. ${coupon.discount_value} OFF`;

  const isExpired = (expires_at: string | null) =>
    expires_at ? new Date(expires_at) < new Date() : false;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading coupons...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Available Coupons</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Copy a code and apply it at checkout to save money.
        </p>
      </div>

      {coupons.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Tag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No coupons available</h3>
          <p>Check back later for exclusive deals!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {coupons.map((coupon) => {
            const used = usedIds.has(coupon.id);
            const expired = isExpired(coupon.expires_at);
            const exhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
            const unavailable = used || expired || exhausted;

            return (
              <div
                key={coupon.id}
                style={{
                  border: `1px dashed ${unavailable ? '#e0e0e0' : 'var(--brand-yellow-dark)'}`,
                  borderRadius: '8px',
                  padding: '20px',
                  background: unavailable ? '#fafafa' : '#fffdf5',
                  opacity: unavailable ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                {/* Discount badge */}
                <div style={{
                  background: unavailable ? '#e0e0e0' : 'var(--brand-yellow)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  textAlign: 'center',
                  minWidth: '100px',
                  flexShrink: 0,
                }}>
                  <Tag size={20} style={{ marginBottom: '4px' }} />
                  <p style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>{formatDiscount(coupon)}</p>
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', background: '#f0f0f0', padding: '3px 10px', borderRadius: '4px', letterSpacing: '2px' }}>
                      {coupon.code}
                    </span>
                    {used && <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Already Used</span>}
                    {expired && <span style={{ fontSize: '12px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Expired</span>}
                    {exhausted && !expired && <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>Fully Redeemed</span>}
                  </div>
                  <p style={{ fontSize: '14px', color: '#444', marginBottom: '6px' }}>{coupon.description}</p>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {coupon.min_order_amount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={12} /> Min. order Rs. {coupon.min_order_amount.toLocaleString()}
                      </span>
                    )}
                    {coupon.max_discount_amount && (
                      <span>Max discount Rs. {coupon.max_discount_amount}</span>
                    )}
                    {coupon.expires_at && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> Expires {new Date(coupon.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Copy button */}
                <button
                  onClick={() => copyCode(coupon.code)}
                  disabled={unavailable}
                  style={{
                    background: unavailable ? '#e0e0e0' : 'var(--brand-blue)',
                    color: unavailable ? '#999' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: unavailable ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  {copiedCode === coupon.code
                    ? <><CheckCircle size={14} /> Copied!</>
                    : <><Copy size={14} /> Copy</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
