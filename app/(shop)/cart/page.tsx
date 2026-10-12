'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/Button';
import styles from './cart.module.css';

export default function CartPage() {
  // Hydration-safe mounted flag: false during SSR, true on the client.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const router = useRouter();
  
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  if (!mounted) return <div style={{padding: '40px', textAlign: 'center'}}>Loading cart...</div>;

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const deliveryCharge = totalItems > 0 ? (totalPrice > 5000 ? 0 : 100) : 0;
  const finalTotal = totalPrice + deliveryCharge;

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.cartSection}>
        <div className={styles.header}>
          <h2>Shopping Cart ({totalItems} Items)</h2>
        </div>
        
        {items.length === 0 ? (
          <div className={styles.emptyCart}>
            <ShoppingCart size={48} color="var(--text-muted)" />
            <h3>Your cart is empty</h3>
            <p>Looks like you haven&apos;t added anything to your cart yet.</p>
            <Link href="/">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.cartList}>
            {items.map((item) => (
              <div key={item.productId} className={styles.cartItem}>
                <div className={styles.itemImage}>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.title} fill style={{objectFit: 'cover'}} />
                  ) : (
                    <div style={{width: '100%', height: '100%', background: '#eee'}} />
                  )}
                </div>
                
                <div className={styles.itemDetails}>
                  <Link href={`/product/${item.productId}`}>
                    <h3>{item.title}</h3>
                  </Link>
                  <p className={styles.price}>Rs. {item.price.toLocaleString()}</p>
                </div>
                
                <div className={styles.itemActions}>
                  <div className={styles.quantityControl}>
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}>
                      <Minus size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <button onClick={() => removeItem(item.productId)} className={styles.removeBtn}>
                    <Trash2 size={18} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.summarySection}>
        <h3>Price Details</h3>
        <div className={styles.summaryRow}>
          <span>Price ({totalItems} items)</span>
          <span>Rs. {totalPrice.toLocaleString()}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Delivery Charges</span>
          <span style={{ color: deliveryCharge === 0 ? 'var(--success)' : 'inherit' }}>
            {deliveryCharge === 0 ? 'FREE' : `Rs. ${deliveryCharge}`}
          </span>
        </div>
        
        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
          <span>Total Amount</span>
          <span>Rs. {finalTotal.toLocaleString()}</span>
        </div>
        
        <p className={styles.savingsMsg}>
          {totalPrice > 5000 ? 'You are saving Delivery Charges on this order!' : `Add Rs. ${(5000 - totalPrice).toLocaleString()} more for FREE delivery.`}
        </p>
        
        <Button 
          disabled={items.length === 0} 
          fullWidth 
          size="lg" 
          onClick={() => router.push('/checkout')}
          style={{marginTop: '16px', backgroundColor: 'var(--brand-yellow-dark)', color: '#000'}}
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}
