'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useEffect, useState } from 'react';
import styles from '../../app/(shop)/shop.module.css';

export function CartIcon() {
  const [mounted, setMounted] = useState(false);
  const itemsCount = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/cart" className={styles.cartBtn} style={{ position: 'relative' }}>
      <ShoppingCart size={20} />
      <span>Cart</span>
      {mounted && itemsCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-8px',
          left: '8px',
          backgroundColor: '#ff6161',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {itemsCount > 99 ? '99+' : itemsCount}
        </span>
      )}
    </Link>
  );
}
