'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Star, Truck, Tag, ShieldCheck, HeadphonesIcon, CheckCircle } from 'lucide-react';

type Subscription = {
  id: string;
  started_at: string;
  expires_at: string | null;
  is_active: boolean;
  plan: 'monthly' | 'yearly';
};

const benefits = [
  { icon: <Truck size={20} color="var(--brand-blue)" />, title: 'Free Delivery', desc: 'Free delivery on all orders, no minimum spend.' },
  { icon: <Tag size={20} color="#10b981" />, title: 'Exclusive Deals', desc: 'Access member-only discounts up to 30% off.' },
  { icon: <Star size={20} color="#f59e0b" />, title: 'Priority Support', desc: 'Dedicated customer support with faster response times.' },
  { icon: <ShieldCheck size={20} color="#8b5cf6" />, title: 'Extended Returns', desc: 'Return window extended to 30 days (vs 7 days standard).' },
  { icon: <HeadphonesIcon size={20} color="#ef4444" />, title: 'Early Access', desc: 'Shop new arrivals and sales before regular members.' },
];

export default function PlusPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('plus_subscriptions').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setSub(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Mero Pasal Plus</h1>
      </div>

      {/* Status */}
      {sub?.is_active ? (
        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderRadius: '12px', padding: '24px', color: 'white', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Star size={28} fill="white" />
            <div>
              <p style={{ fontSize: '18px', fontWeight: 700 }}>Active Member ✓</p>
              <p style={{ fontSize: '13px', opacity: 0.8 }}>
                {sub.expires_at ? `Renews on ${new Date(sub.expires_at).toLocaleDateString()}` : 'Lifetime membership'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)', borderRadius: '12px', padding: '24px', color: 'white', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Star size={28} />
            <span style={{ fontSize: '18px', fontWeight: 700 }}>Not subscribed</span>
          </div>
          <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>Upgrade to Mero Pasal Plus to unlock premium benefits.</p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => alert('Monthly plan checkout coming soon!')}
              style={{ background: 'white', color: '#4f46e5', border: 'none', borderRadius: '8px', padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}
            >
              Rs. 299 / month
            </button>
            <button
              onClick={() => alert('Yearly plan checkout coming soon!')}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}
            >
              Rs. 2499 / year <span style={{ fontSize: '11px', background: '#10b981', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>SAVE 30%</span>
            </button>
          </div>
        </div>
      )}

      {/* Benefits */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Plus Benefits</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {benefits.map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {b.icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{b.title}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{b.desc}</p>
            </div>
            {sub?.is_active && <CheckCircle size={18} color="#10b981" />}
          </div>
        ))}
      </div>
    </div>
  );
}
