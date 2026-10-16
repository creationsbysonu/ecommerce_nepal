import { createClient } from '@/utils/supabase/server';
import styles from '../admin.module.css';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/utils/auth-guard';

const ALLOWED_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

export default async function OrdersManagement() {
  const supabase = await createClient();
  
  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });

  async function updateOrderStatus(formData: FormData) {
    'use server';
    const orderId = formData.get('orderId') as string;
    const status = formData.get('status') as string;
    if (!orderId || !ALLOWED_STATUSES.includes(status)) return;

    const { supabase: supabaseServer } = await requireAdmin();
    const { error } = await supabaseServer
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) console.error('updateOrderStatus failed:', error.message);
    revalidatePath('/admin/orders');
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Platform Orders</h1>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status / Action</th>
            </tr>
          </thead>
          <tbody>
            {orders?.length === 0 && (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>No orders found on the platform.</td>
              </tr>
            )}
            {orders?.map(order => (
              <tr key={order.id}>
                <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{order.id.substring(0,8).toUpperCase()}</td>
                <td>
                  <p style={{fontWeight: 600, margin: 0}}>{order.profiles?.full_name}</p>
                </td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td style={{fontWeight: 600}}>Rs. {order.total_amount.toLocaleString()}</td>
                <td>
                  <form action={updateOrderStatus} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <select name="status" defaultValue={order.status} style={{padding: '4px', borderRadius: '4px', border: '1px solid var(--border)'}}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button type="submit" style={{background: 'var(--brand-blue)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
