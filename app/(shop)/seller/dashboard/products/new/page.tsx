'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Upload, Package } from 'lucide-react';
import Link from 'next/link';

export default function NewProduct() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
    // Generate random SKU
    setSku('SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user.id).single();
      if (!store) throw new Error("Store not found");

      // 1. Create Product
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .insert({
          store_id: store.id,
          title,
          description,
          category_id: categoryId || null,
          base_price: parseFloat(price),
          is_active: true
        })
        .select()
        .single();
      
      if (prodErr) throw prodErr;

      // 2. Create Default Variant
      const { error: varErr } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          sku,
          price: parseFloat(price),
          stock: parseInt(stock),
          image_url: imageUrl || null
        });

      if (varErr) throw varErr;

      router.push('/seller/dashboard/products');
      
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/seller/dashboard/products" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Basic Information</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Product Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} placeholder="e.g. Goldstar Shoes" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', resize: 'vertical' }} placeholder="Describe your product..." />
            </div>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Pricing & Inventory</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Price (Rs.) *</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Stock Quantity *</label>
                <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required min="0" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>SKU (Stock Keeping Unit)</label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: 'monospace' }} />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Organization</h2>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Product Image</h2>
            
            <div style={{ width: '100%', paddingTop: '100%', position: 'relative', background: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--border)', marginBottom: '16px' }}>
              {imageUrl ? (
                 <img src={imageUrl} alt="Preview" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
              ) : (
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                   <Package size={32} style={{ marginBottom: '8px' }} />
                   <span style={{ fontSize: '12px' }}>No image</span>
                 </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Image URL</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }} placeholder="https://..." />
            </div>
          </div>
          
          <button type="submit" disabled={loading} style={{ background: 'var(--brand-yellow)', color: '#212121', padding: '14px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : 'Publish Product'}
          </button>
        </div>

      </form>
    </div>
  );
}
