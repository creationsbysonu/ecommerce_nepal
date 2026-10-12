'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './shop-components.module.css';
import { useCartStore } from '@/store/useCartStore';
import { WishlistButton } from './WishlistButton';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
}

export function ProductCard({ id, title, price, imageUrl }: ProductCardProps) {
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ productId: id, title, price, imageUrl });
  };

  return (
    <Link href={`/product/${id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        {/* Wishlist heart button — top-right corner */}
        <div
          style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
          onClick={(e) => e.preventDefault()}
        >
          <WishlistButton productId={id} size={16} />
        </div>

        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill style={{ objectFit: 'cover' }} />
        ) : (
          <div className={styles.placeholderImage}>No Image</div>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.price}>Rs. {price.toLocaleString()}</p>
        <button onClick={handleAddToCart} className="btn-secondary" style={{ width: '100%', marginTop: '8px' }}>
          Add to Cart
        </button>
      </div>
    </Link>
  );
}
