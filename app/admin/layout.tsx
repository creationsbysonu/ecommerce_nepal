import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import styles from './admin.module.css';
import { LayoutDashboard, Users, Tags, ShoppingBag, LogOut } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Verify Admin Access
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    // Redirect non-admins to the home page
    redirect('/');
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.logo}>
          Mero Pasal <span style={{color: 'white', fontWeight: 400}}>Admin</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link href="/admin/users" className={styles.navLink}>
            <Users size={20} />
            Users
          </Link>
          <Link href="/admin/categories" className={styles.navLink}>
            <Tags size={20} />
            Categories
          </Link>
          <Link href="/admin/orders" className={styles.navLink}>
            <ShoppingBag size={20} />
            Orders
          </Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
            <span style={{fontWeight: 500}}>Admin: {profile?.full_name}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 500}}>
                <LogOut size={18} /> Logout
              </button>
            </form>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
