import { createClient } from '@/utils/supabase/server';
import styles from './admin.module.css';
import { Users, ShoppingBag, DollarSign, Store } from 'lucide-react';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch basic stats
  const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: sellersCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  
  // Calculate total revenue from paid or delivered orders
  const { data: revenueData } = await supabase.from('orders').select('total_amount');
  const totalRevenue = revenueData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard Overview</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><DollarSign size={24} /></div>
          <div className={styles.statInfo}>
            <p>Total Revenue (All Time)</p>
            <h3>Rs. {totalRevenue.toLocaleString()}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}><ShoppingBag size={24} /></div>
          <div className={styles.statInfo}>
            <p>Total Orders</p>
            <h3>{ordersCount}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706'}}><Store size={24} /></div>
          <div className={styles.statInfo}>
            <p>Registered Sellers</p>
            <h3>{sellersCount}</h3>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6'}}><Users size={24} /></div>
          <div className={styles.statInfo}>
            <p>Total Users</p>
            <h3>{usersCount}</h3>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div style={{padding: '24px', borderBottom: '1px solid var(--border)'}}>
          <h2 style={{fontSize: '16px', fontWeight: 600}}>Recent Platform Orders</h2>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer ID</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* We can map real orders here later, for now we will leave it empty if zero */}
            <tr>
              <td colSpan={5} style={{textAlign: 'center', padding: '32px', color: 'var(--text-muted)'}}>
                Navigate to the Orders tab to manage all orders.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
