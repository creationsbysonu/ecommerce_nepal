'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { asRows } from '@/utils/supabase/rows';
import { Package, Truck, CheckCircle, Search } from 'lucide-react';
import Image from 'next/image';

type SellerOrder = {
  status: string;
  shipping_address: {
    full_name?: string;
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    phone_number?: string;
  } | null;
  customer_id: string;
  profiles?: { full_name: string };
};

type SellerOrderItem = {
  id: string;
  order_id: string;
  quantity: number;
  price_at_time: number;
  created_at: string;
  orders: SellerOrder;
  product_variants: {
    sku: string;
    image_url: string | null;
    products: { title: string };
  };
};

export default function SellerOrders() {
  const [items, setItems] = useState<SellerOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login?next=/seller/dashboard/orders');
          return;
        }

        const { data: store } = await supabase.from('stores').select('id').eq('seller_id', user.id).maybeSingle();
        if (!store) return;

        // This is a complex join. Supabase can do it if properly constructed:
        // order_items -> orders
        // order_items -> product_variants -> products
        
        const { data } = await supabase
          .from('order_items')
          .select(`
            id, order_id, quantity, price_at_time, created_at,
            orders (status, shipping_address, customer_id),
            product_variants!inner (
              sku, image_url,
              products!inner (title, store_id)
            )
          `)
          .eq('product_variants.products.store_id', store.id)
          .order('created_at', { ascending: false });

        if (data) {
          // supabase-js types every embed as an array (it can't see our schema),
          // but PostgREST returns this many-to-one embed as an object — cast to
          // the real runtime shape rather than to the inferred one.
          const rows = asRows<SellerOrderItem>(data);

          // Customer names via profile_display_names(): profiles is no longer
          // world-readable (it exposes email, phone and balances), so this
          // SECURITY DEFINER function is the supported way to resolve a name
          // for someone else's account.
          const customerIds = [
            ...new Set(
              rows
                .map((i) => i.orders?.customer_id)
                .filter((id): id is string => typeof id === 'string')
            ),
          ];
          const profilesDict: Record<string, string> = {};

          if (customerIds.length > 0) {
            const { data: names } = await supabase.rpc('profile_display_names', {
              p_ids: customerIds,
            });
            names?.forEach((n: { id: string; full_name: string | null }) => {
              profilesDict[n.id] = n.full_name || 'Unknown Customer';
            });
          }

          const formatted = rows.map((item) => ({
            ...item,
            orders: {
              ...item.orders,
              profiles: { full_name: profilesDict[item.orders?.customer_id ?? ''] || 'Unknown Customer' }
            }
          }));

          setItems(formatted);
        }
      } catch (err) {
        console.error('Failed to load seller orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supabase, router]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Note: In a real multi-vendor app, status is per order_item, not per order,
    // but our MVP schema has status on the `orders` table.
    // We will update the global order status for now.

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert(`Could not update order status: ${error.message}`);
      return;
    }

    setItems(items.map(item => 
      item.order_id === orderId 
        ? { ...item, orders: { ...item.orders, status: newStatus } }
        : item
    ));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'processing': return { bg: '#eff6ff', text: '#1d4ed8' };
      case 'shipped': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'delivered': return { bg: '#dcfce7', text: '#166534' };
      case 'cancelled': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading orders...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Order Management</h1>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search orders..." style={{ padding: '10px 12px 10px 36px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', width: '250px' }} />
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ background: 'white', padding: '60px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No orders yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>When customers buy your products, they will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.map(item => {
            const statusStyle = getStatusColor(item.orders?.status);
            const img = item.product_variants?.image_url;

            return (
              <div key={item.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Placed</p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>Rs. {(item.quantity * item.price_at_time).toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</p>
                      <p style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>#{item.order_id.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div>
                    <span style={{ background: statusStyle.bg, color: statusStyle.text, padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, textTransform: 'capitalize' }}>
                      {item.orders?.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', display: 'flex', gap: '20px' }}>
                  <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                    {img ? <Image src={img} alt="" fill style={{ objectFit: 'cover' }} /> : <Package size={24} style={{ position: 'absolute', top: 28, left: 28, color: '#94a3b8' }} />}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{item.product_variants?.products?.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>SKU: {item.product_variants?.sku}</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Qty: {item.quantity} x Rs. {item.price_at_time.toLocaleString()}</p>
                  </div>

                  {/* Shipping Info */}
                  <div style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Ship To</h4>
                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{item.orders?.shipping_address?.full_name}</p>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      {item.orders?.shipping_address?.street_address}<br/>
                      {item.orders?.shipping_address?.city}, {item.orders?.shipping_address?.state} {item.orders?.shipping_address?.postal_code}<br/>
                      {item.orders?.shipping_address?.phone_number}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                    {item.orders?.status === 'pending' || item.orders?.status === 'processing' ? (
                      <button onClick={() => updateOrderStatus(item.order_id, 'shipped')} style={{ background: 'var(--brand-blue)', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Truck size={16} /> Mark Shipped
                      </button>
                    ) : null}
                    
                    {item.orders?.status === 'shipped' ? (
                      <button onClick={() => updateOrderStatus(item.order_id, 'delivered')} style={{ background: '#10b981', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Mark Delivered
                      </button>
                    ) : null}

                    {(item.orders?.status !== 'cancelled' && item.orders?.status !== 'delivered') && (
                      <button onClick={() => { if(confirm('Cancel this order?')) updateOrderStatus(item.order_id, 'cancelled') }} style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
