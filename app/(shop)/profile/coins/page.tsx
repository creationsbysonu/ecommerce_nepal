'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Coins, TrendingUp, ShoppingBag, Info } from 'lucide-react';

type CoinTransaction = {
  id: string;
  coins: number;
  type: 'earned' | 'redeemed' | 'expired';
  reason: string;
  created_at: string;
};

const typeStyle = {
  earned:   { bg: '#dcfce7', color: '#166534', label: '+', icon: <TrendingUp size={14} /> },
  redeemed: { bg: '#fee2e2', color: '#991b1b', label: '-', icon: <ShoppingBag size={14} /> },
  expired:  { bg: '#fef3c7', color: '#92400e', label: '-', icon: <Info size={14} /> },
};

export default function CoinsPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single();
      if (profile) setBalance(profile.coin_balance || 0);

      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (txns) setTransactions(txns);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading coins...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Mero Coins</h1>
      </div>

      {/* Balance */}
      <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '28px', color: 'white', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Coins size={28} />
          <span style={{ fontSize: '16px', opacity: 0.85 }}>Your Mero Coins</span>
        </div>
        <p style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>{balance.toLocaleString()}</p>
        <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>≈ Rs. {(balance * 0.25).toFixed(0)} value</p>
        <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
          💡 Earn 1 coin per Rs. 100 spent. Redeem 4 coins = Rs. 1 off.
        </div>
      </div>

      {/* How to earn */}
      <div style={{ background: '#fffdf5', border: '1px solid var(--brand-yellow-light)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>How to earn more coins</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#444' }}>
          <div style={{ display: 'flex', gap: '8px' }}><span>🛍️</span><span>Shop on Mero Pasal — earn 1 coin per Rs. 100 spent</span></div>
          <div style={{ display: 'flex', gap: '8px' }}><span>⭐</span><span>Write product reviews — earn 5 coins per review</span></div>
          <div style={{ display: 'flex', gap: '8px' }}><span>👥</span><span>Refer a friend — earn 50 coins when they place first order</span></div>
        </div>
      </div>

      {/* History */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Coin History</h2>
      {transactions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: '8px' }}>
          <Coins size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No coin activity yet. Start shopping to earn coins!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.map((t) => {
            const s = typeStyle[t.type];
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '14px' }}>{t.reason}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p style={{ fontWeight: 700, color: s.color }}>{s.label}{Math.abs(t.coins)} coins</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
