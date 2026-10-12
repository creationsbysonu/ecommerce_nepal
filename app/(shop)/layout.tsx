import styles from "./shop.module.css";
import Link from "next/link";
import { Search } from "lucide-react";

import { createClient } from '@/utils/supabase/server';
import { CartIcon } from '@/components/shop/CartIcon';
import { UserMenu } from '@/components/shop/UserMenu';
import { MoreMenu } from '@/components/shop/MoreMenu';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={`container ${styles.headerContainer}`}>
          <div className={styles.logoSection}>
            <Link href="/" className={styles.logo}>
              Mero Pasal
            </Link>
            <Link href="/" className={styles.explorePlus}>
              Explore <span>Plus</span>
            </Link>
          </div>

          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="Search for Products, Brands and More" 
              className={styles.searchInput}
            />
            <button className={styles.searchButton}>
              <Search size={20} color="var(--brand-yellow-dark)" />
            </button>
          </div>

          <nav className={styles.navActions}>
            {user ? (
              <UserMenu
                userName={user.user_metadata?.full_name?.split(' ')[0] || 'Account'}
              />
            ) : (
              <Link href="/login" className={styles.loginBtn}>
                Login
              </Link>
            )}
            
            <MoreMenu />
            
            <CartIcon />
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className="container">
          <p>© {new Date().getFullYear()} Mero Pasal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
