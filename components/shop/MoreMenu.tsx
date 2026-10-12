'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BellRing,
  Store,
  HeadphonesIcon,
  TrendingUp,
  Download,
  Settings,
  ChevronDown,
} from 'lucide-react';
import styles from './MoreMenu.module.css';

const menuItems = [
  { icon: BellRing,      label: 'Notification Preferences', href: '/preferences' },
  { icon: Store,         label: 'Sell on Mero Pasal',       href: '/seller' },
  { icon: HeadphonesIcon,label: '24x7 Customer Care',       href: '/support' },
  { icon: TrendingUp,    label: 'Advertise',                href: '/advertise' },
  { icon: Download,      label: 'Download App',             href: '/download-app' },
  { icon: Settings,      label: 'Settings',                 href: '/settings' },
];

export function MoreMenu() {
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
        onMouseEnter={() => setOpen(true)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={styles.name}>More</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div 
          className={styles.dropdown} 
          role="menu"
          onMouseLeave={() => setOpen(false)}
        >
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
        </div>
      )}
    </div>
  );
}
