'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface WishlistButtonProps {
  productId: string;
  size?: number;
}

export function WishlistButton({ productId, size = 20 }: WishlistButtonProps) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const checkSaved = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .maybeSingle();
    setSaved(!!data);
  }, [productId, supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        checkSaved(user.id);
      }
    });
  }, [supabase, checkSaved]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      router.push('/login');
      return;
    }

    setLoading(true);
    if (saved) {
      await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      setSaved(false);
    } else {
      await supabase
        .from('wishlist_items')
        .insert({ user_id: userId, product_id: productId });
      setSaved(true);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '50%',
        width: size + 16,
        height: size + 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <Heart
        size={size}
        fill={saved ? '#ef4444' : 'none'}
        color={saved ? '#ef4444' : '#878787'}
      />
    </button>
  );
}
