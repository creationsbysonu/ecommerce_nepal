import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import styles from './product-detail.module.css';
import { ProductActions } from '@/components/shop/ProductActions';
import Image from 'next/image';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      stores (name),
      product_variants (image_url, sku, stock)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.imageSection}>
        {product.product_variants?.[0]?.image_url ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
            <Image src={product.product_variants[0].image_url} alt={product.title} fill style={{ objectFit: 'contain' }} />
          </div>
        ) : (
          <div className={styles.placeholderImage}>
            No Image Available
          </div>
        )}
      </div>
      
      <div className={styles.detailsSection}>
        <h1 className={styles.title}>{product.title}</h1>
        
        <div className={styles.priceContainer}>
          <span className={styles.price}>₹{product.base_price.toLocaleString()}</span>
        </div>

        <div className={styles.storeInfo}>
          Sold by: <strong>{product.stores?.name}</strong>
        </div>

        <div className={styles.description}>
          <h3>Product Description</h3>
          <p>{product.description}</p>
        </div>

        <ProductActions 
          product={{
            id: product.id,
            title: product.title,
            price: product.base_price,
            imageUrl: product.product_variants?.[0]?.image_url
          }}
        />
      </div>
    </div>
  );
}
