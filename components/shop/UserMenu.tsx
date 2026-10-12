'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Package,
  Tag,
  Coins,
  Star,
  CreditCard,
  MapPin,
  Heart,
  Gift,
  Bell,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  userName: string;
}

const menuItems = [
  { icon: User,       label: 'My Profile',           href: '/profile/info' },
  { icon: Package,    label: 'Orders',                href: '/profile/orders' },
  { icon: Tag,        label: 'Coupons',               href: '/profile/coupons' },
  { icon: Coins,      label: 'Mero Coins',            href: '/profile/coins' },
  { icon: Star,       label: 'Mero Pasal Plus',       href: '/profile/plus' },
  { icon: CreditCard, label: 'Saved Cards & Wallet',  href: '/profile/wallet' },
  { icon: MapPin,     label: 'Saved Addresses',       href: '/profile/addresses' },
  { icon: Heart,      label: 'Wishlist',              href: '/profile/wishlist' },
  { icon: Gift,       label: 'Gift Cards',            href: '/profile/gift-cards' },
  { icon: Bell,       label: 'Notifications',         href: '/profile/notifications' },
];

export function UserMenu({ userName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className={styles.wrapper} ref={ref}>
      {/* Trigger */}
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <User size={20} />
        <span className={styles.name}>{userName}</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownHeading}>Your Account</p>
          </div>

          <div className={styles.menuList}>
            {menuItems.map(({ icon: Icon, label, href }) => (
              <Link
                key={href}
                href={href}
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <Icon size={18} className={styles.menuIcon} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.divider} />

          {/* Logout */}
          <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
            <button type="submit" className={styles.menuItem} role="menuitem">
              <LogOut size={18} className={styles.menuIcon} />
              <span>Logout</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
