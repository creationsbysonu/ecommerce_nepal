import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import styles from '../profile.module.css';
import { Package } from 'lucide-react';

type OrderRow = {
  id: string;
  status: string;
  total_amount: number | string;
  created_at: string;
  shipping_address: { full_name?: string; city?: string } | null;
  order_items?: { id: string }[] | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(id)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>My Orders</h1>
      
      {!orders || orders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No Orders Found</h3>
          <p>You haven&apos;t placed any orders yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order: OrderRow) => (
            <div key={order.id} className={styles.addressCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: 600, marginRight: '16px' }}>Order ID: {order.id.substring(0,8).toUpperCase()}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--brand-blue)', textTransform: 'uppercase' }}>
                  {order.status}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>Total: Rs. {order.total_amount.toLocaleString()}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {order.order_items?.length} Items
                  </p>
                </div>
                <div style={{ fontSize: '13px', color: '#212121', textAlign: 'right' }}>
                  <p style={{ fontWeight: 600 }}>Delivery Address:</p>
                  <p>{order.shipping_address?.full_name}</p>
                  <p>{order.shipping_address?.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
