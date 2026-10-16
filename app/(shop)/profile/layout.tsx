import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import styles from './profile.module.css';
import { User, MapPin, Package } from 'lucide-react';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className={`container ${styles.container}`}>
      <aside className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            <User size={32} color="var(--brand-yellow-dark)" />
          </div>
          <div>
            <p className={styles.hello}>Hello,</p>
            <h2 className={styles.name}>{user.user_metadata?.full_name || 'User'}</h2>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <h3>Account Settings</h3>
            <Link href="/profile/info" className={styles.navLink}>
              <User size={18} /> Profile Information
            </Link>
            <Link href="/profile/addresses" className={styles.navLink}>
              <MapPin size={18} /> Manage Addresses
            </Link>
          </div>

          <div className={styles.navGroup}>
            <h3>My Stuff</h3>
            <Link href="/profile/orders" className={styles.navLink}>
              <Package size={18} /> My Orders
            </Link>
          </div>
        </nav>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
