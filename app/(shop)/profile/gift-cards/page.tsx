'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Gift, CheckCircle, AlertCircle } from 'lucide-react';

type GiftCard = {
  id: string;
  code: string;
  value: number;
  remaining_value: number;
  expires_at: string | null;
  is_active: boolean;
};

export default function GiftCardsPage() {
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const supabase = createClient();

  const loadCards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('gift_cards')
      .select('*')
      .or(`purchased_by.eq.${user.id},redeemed_by.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (data) setMyCards(data);
    setLoading(false);
  };

  useEffect(() => {
    // Loader inlined into the effect (setState runs only after awaits resolve).
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('gift_cards')
        .select('*')
        .or(`purchased_by.eq.${user.id},redeemed_by.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (data) setMyCards(data);
      setLoading(false);
    })();
  }, [supabase]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeeming(true);
    setRedeemMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = redeemCode.trim().toUpperCase();
    const { data: card } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (!card) {
      setRedeemMsg({ type: 'error', text: 'Invalid or already used gift card code.' });
    } else if (card.redeemed_by) {
      setRedeemMsg({ type: 'error', text: 'This gift card has already been redeemed.' });
    } else if (card.expires_at && new Date(card.expires_at) < new Date()) {
      setRedeemMsg({ type: 'error', text: 'This gift card has expired.' });
    } else {
      // Mark as redeemed and credit wallet
      await supabase.from('gift_cards').update({ redeemed_by: user.id }).eq('id', card.id);
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: card.value,
        type: 'credit',
        description: `Gift card redeemed (${code})`,
        reference_id: card.id,
      });
      // Update wallet balance
      const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single();
      const newBalance = (Number(profile?.wallet_balance) || 0) + card.value;
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);

      setRedeemMsg({ type: 'success', text: `Rs. ${card.value} added to your wallet!` });
      setRedeemCode('');
      loadCards();
    }
    setRedeeming(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Gift Cards</h1>
      </div>

      {/* Redeem card */}
      <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px', padding: '24px', marginBottom: '28px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Gift size={24} />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Redeem a Gift Card</h2>
        </div>
        <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            placeholder="Enter gift card code"
            required
            style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: 'none', fontSize: '14px', fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 600 }}
          />
          <button
            type="submit"
            disabled={redeeming}
            style={{ background: 'white', color: '#059669', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            {redeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </form>

        {redeemMsg && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}>
            {redeemMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {redeemMsg.text}
          </div>
        )}
      </div>

      {/* My gift cards */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>My Gift Cards</h2>
      {myCards.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: '8px' }}>
          <Gift size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No gift cards yet. Redeem one above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myCards.map((card) => (
            <div key={card.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, letterSpacing: '2px', marginBottom: '4px' }}>{card.code}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {card.expires_at ? `Expires ${new Date(card.expires_at).toLocaleDateString()}` : 'No expiry'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '20px', fontWeight: 800, color: card.is_active && !card.remaining_value ? '#999' : '#059669' }}>
                  Rs. {card.remaining_value.toLocaleString()}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>of Rs. {card.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
