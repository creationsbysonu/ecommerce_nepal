'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DollarSign, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboard() {
  const [metrics, setMetrics] = useState({ revenue: 0, products: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMetrics = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user.id).single();
      if (!store) return;

      // Count Products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id);

      // Count Orders & Revenue
      // We need to find order_items that belong to this store's products
      // Due to the complex relation (order_items -> product_variants -> products -> store), 
      // we'll fetch products first to get IDs, then query variants, then query order_items
      
      const { data: products } = await supabase.from('products').select('id').eq('store_id', store.id);
      const productIds = products?.map(p => p.id) || [];
      
      let revenue = 0;
      let orderCount = 0;

      if (productIds.length > 0) {
        const { data: variants } = await supabase.from('product_variants').select('id').in('product_id', productIds);
        const variantIds = variants?.map(v => v.id) || [];
        
        if (variantIds.length > 0) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('quantity, price_at_time, order_id')
            .in('product_variant_id', variantIds);
            
          if (orderItems) {
            revenue = orderItems.reduce((acc, item) => acc + (item.quantity * item.price_at_time), 0);
            const uniqueOrders = new Set(orderItems.map(item => item.order_id));
            orderCount = uniqueOrders.size;
          }
        }
      }

      setMetrics({ revenue, products: productCount || 0, orders: orderCount });
      setLoading(false);
    };

    fetchMetrics();
  }, [supabase]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading metrics...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Welcome back. Here&apos;s what&apos;s happening with your store today.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Revenue */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Revenue</p>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>Rs. {metrics.revenue.toLocaleString()}</h3>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
            <TrendingUp size={16} /> +12% from last month
          </div>
        </div>

        {/* Orders */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Total Orders</p>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{metrics.orders}</h3>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
              <ShoppingBag size={24} />
            </div>
          </div>
          <Link href="/seller/dashboard/orders" style={{ fontSize: '13px', color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }}>View orders →</Link>
        </div>

        {/* Products */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Active Products</p>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{metrics.products}</h3>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fef3c7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Package size={24} />
            </div>
          </div>
          <Link href="/seller/dashboard/products" style={{ fontSize: '13px', color: 'var(--brand-blue)', fontWeight: 600, textDecoration: 'none' }}>Manage products →</Link>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/seller/dashboard/products/new" style={{ background: 'var(--brand-blue)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
            + Add New Product
          </Link>
        </div>
      </div>
    </div>
  );
}
