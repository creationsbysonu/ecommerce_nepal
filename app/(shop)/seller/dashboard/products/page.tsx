'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { asRows } from '@/utils/supabase/rows';
import Link from 'next/link';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import Image from 'next/image';

type SellerProductRow = {
  id: string;
  title: string;
  base_price: number;
  is_active: boolean;
  created_at: string;
  categories: { name: string } | null;
  product_variants: { id: string; stock: number; image_url: string | null; sku: string }[] | null;
};

export default function SellerProducts() {
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Loader inlined into the effect (setState runs only after awaits resolve).
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user.id).single();
      if (!store) return;

      const { data } = await supabase
        .from('products')
        .select(`
          id, title, base_price, is_active, created_at,
          categories (name),
          product_variants (id, stock, image_url, sku)
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (data) setProducts(asRows<SellerProductRow>(data));
      setLoading(false);
    })();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert(`Could not delete product: ${error.message}`);
      return;
    }
    setProducts(products.filter(p => p.id !== id));
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (error) {
      alert(`Could not update product: ${error.message}`);
      return;
    }
    setProducts(products.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p));
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading products...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Products</h1>
        <Link href="/seller/dashboard/products/new" style={{ background: 'var(--brand-blue)', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <Plus size={18} /> Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div style={{ background: 'white', padding: '60px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No products yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Add your first product to start selling.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Product</th>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Price</th>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Stock</th>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600, fontSize: '13px', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const variant = product.product_variants?.[0];
                const stock = variant?.stock || 0;
                const img = variant?.image_url;

                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                        {img ? <Image src={img} alt="" fill style={{ objectFit: 'cover' }} /> : <Package size={20} style={{ position: 'absolute', top: 10, left: 10, color: '#94a3b8' }} />}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{product.title}</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{product.categories?.name || 'Uncategorized'}</td>
                    <td style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Rs. {product.base_price.toLocaleString()}</td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: stock > 0 ? '#dcfce7' : '#fee2e2', color: stock > 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
                        {stock} in stock
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button 
                        onClick={() => toggleActive(product.id, product.is_active)}
                        style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: product.is_active ? '#dbeafe' : '#f1f5f9', color: product.is_active ? '#1e40af' : '#64748b' }}
                      >
                        {product.is_active ? 'Active' : 'Draft'}
                      </button>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Edit size={18} /></button>
                        <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
