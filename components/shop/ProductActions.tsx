'use client';

import { useCartStore } from '@/store/useCartStore';
import { Button } from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProductActionsProps {
  product: {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const addItem = useCartStore(state => state.addItem);
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem({ 
      productId: product.id, 
      title: product.title, 
      price: product.price, 
      imageUrl: product.imageUrl 
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
      <Button 
        size="lg" 
        onClick={handleAddToCart}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: added ? '#10b981' : 'var(--brand-yellow)', color: '#212121' }}
      >
        <ShoppingCart size={20} />
        {added ? 'Added to Cart' : 'Add to Cart'}
      </Button>
      <Button 
        variant="secondary" 
        size="lg" 
        onClick={handleBuyNow}
        style={{ flex: 1 }}
      >
        Buy Now
      </Button>
    </div>
  );
}
