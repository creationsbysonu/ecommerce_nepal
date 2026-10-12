'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import styles from '../profile.module.css';

type WishlistItem = {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    base_price: number;
    product_variants: { price: number; image_url: string | null }[];
  };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    // Loader inlined into the effect (setState runs only after awaits resolve).
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('wishlist_items')
        .select(`
          id, product_id, created_at,
          products (
            id, title, base_price,
            product_variants ( price, image_url )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setItems(data as unknown as WishlistItem[]);
      setLoading(false);
    })();
  }, [supabase]);

  const removeFromWishlist = async (itemId: string) => {
    await supabase.from('wishlist_items').delete().eq('id', itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleAddToCart = (item: WishlistItem) => {
    const variant = item.products.product_variants?.[0];
    addItem({
      productId: item.products.id,
      title: item.products.title,
      price: variant?.price ?? item.products.base_price,
      imageUrl: variant?.image_url ?? undefined,
    });
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading wishlist...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>My Wishlist</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Heart size={52} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Your wishlist is empty</h3>
          <p style={{ marginBottom: '20px' }}>Save items you love by clicking the ❤️ on any product.</p>
          <Link href="/" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>Browse Products →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {items.map((item) => {
            const variant = item.products.product_variants?.[0];
            const price = variant?.price ?? item.products.base_price;
            const imageUrl = variant?.image_url;

            return (
              <div key={item.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                {/* Remove button */}
                <button
                  onClick={() => removeFromWishlist(item.id)}
                  style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: 'white', border: '1px solid var(--border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Remove from wishlist"
                >
                  <Trash2 size={14} color="var(--error)" />
                </button>

                {/* Product image */}
                <Link href={`/product/${item.products.id}`}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#f8f8f8' }}>
                    {imageUrl ? (
                      <Image src={imageUrl} alt={item.products.title} fill style={{ objectFit: 'cover' }} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={40} color="#ccc" />
                      </div>
                    )}
                  </div>
                </Link>

                <div style={{ padding: '12px' }}>
                  <Link href={`/product/${item.products.id}`}>
                    <h3 style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.products.title}
                    </h3>
                  </Link>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: '#212121', marginBottom: '10px' }}>Rs. {price.toLocaleString()}</p>
                  <button
                    onClick={() => handleAddToCart(item)}
                    style={{ width: '100%', background: 'var(--brand-yellow)', color: '#212121', border: 'none', borderRadius: '4px', padding: '8px', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <ShoppingCart size={14} /> Add to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
