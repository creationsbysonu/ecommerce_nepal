'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';

type Transaction = {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
};

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles').select('wallet_balance').eq('id', user.id).single();
      if (profile) setBalance(Number(profile.wallet_balance) || 0);

      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (txns) setTransactions(txns);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading wallet...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Wallet</h1>
      </div>

      {/* Balance Card */}
      <div style={{ background: 'linear-gradient(135deg, #1a56b8 0%, #2874f0 100%)', borderRadius: '12px', padding: '28px', color: 'white', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Wallet size={28} />
          <span style={{ fontSize: '16px', opacity: 0.85 }}>Mero Pasal Wallet</span>
        </div>
        <p style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px' }}>Rs. {balance.toLocaleString()}</p>
        <p style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>Available balance</p>

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
          <button
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => alert('eSewa/Khalti integration coming soon! Contact support to add funds.')}
          >
            <Plus size={16} /> Add Money
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Transaction History</h2>
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <Wallet size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {transactions.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: t.type === 'credit' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.type === 'credit'
                    ? <ArrowDownLeft size={18} color="#166534" />
                    : <ArrowUpRight size={18} color="#991b1b" />}
                </div>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>{t.description}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p style={{ fontWeight: 700, color: t.type === 'credit' ? '#166534' : '#991b1b' }}>
                {t.type === 'credit' ? '+' : '-'}Rs. {Math.abs(t.amount).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
