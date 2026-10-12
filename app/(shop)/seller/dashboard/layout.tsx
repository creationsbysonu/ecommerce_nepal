'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'seller') {
        router.push('/');
        return;
      }

      const { data: store } = await supabase.from('stores').select('name').eq('seller_id', user.id).single();
      if (store) {
        setStoreName(store.name);
      }
      
      setLoading(false);
    };
    checkAccess();
  }, [router, supabase]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  const links = [
    { href: '/seller/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/seller/dashboard/products', label: 'Products', icon: Package },
    { href: '/seller/dashboard/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/seller/dashboard/settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - var(--header-height))', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: 'white', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>Seller Central</p>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeName}</h2>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {links.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/seller/dashboard');
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.href} 
                href={link.href}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                  borderRadius: '8px', color: isActive ? 'var(--brand-blue)' : '#475569', 
                  background: isActive ? '#eff6ff' : 'transparent',
                  fontWeight: isActive ? 700 : 500, transition: 'all 0.2s', textDecoration: 'none'
                }}
              >
                <Icon size={20} /> {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', width: '100%', borderRadius: '8px', color: '#ef4444', background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
              <LogOut size={20} /> Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
