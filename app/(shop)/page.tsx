import styles from "./page.module.css";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryNav } from "@/components/shop/CategoryNav";
import { FadeIn } from "@/components/ui/FadeIn";

export default async function Home() {
  const supabase = await createClient();
  
  // Fetch active products
  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants(image_url)')
    .eq('is_active', true)
    .limit(10);

  return (
    <>
      <FadeIn delay={0} direction="none">
        <CategoryNav />
      </FadeIn>
      <div className={styles.container}>
        <FadeIn delay={0.1}>
          <div className={`container ${styles.bannerContainer}`}>
            <div className={styles.banner}>
              <h1>Flat 10% Off</h1>
              <p>Exclusive coupon for you! Up to ₹100 Already applied.</p>
              <button className="btn-primary" style={{backgroundColor: '#fff', color: 'var(--brand-blue)'}}>Shop Now</button>
            </div>
          </div>
        </FadeIn>
        
        {/* Flipkart style Promo Grid */}
        <FadeIn delay={0.2}>
          <div className={`container ${styles.promoGrid}`}>
            <div className={styles.promoCard} style={{background: 'linear-gradient(to right, #b02a9b, #e068cc)'}}>
              <h3>GOAT SALE</h3>
              <p>Starts on 4th July</p>
            </div>
            <div className={styles.promoCard} style={{background: 'linear-gradient(to right, #0f172a, #334155)'}}>
              <h3>OPPO K14x 5G</h3>
              <p>From ₹14,999*</p>
            </div>
            <div className={styles.promoCard} style={{background: 'linear-gradient(to right, #000000, #222222)'}}>
              <h3>boAt</h3>
              <p>The next power move</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className={`container ${styles.categories}`}>
            <h2>Still looking for these?</h2>
            {(!products || products.length === 0) ? (
              <p style={{color: 'var(--text-muted)'}}>No products available yet. Check back soon!</p>
            ) : (
              <div className={styles.productGrid}>
                {products.map((product) => (
                  <ProductCard 
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.base_price}
                    imageUrl={product.product_variants?.[0]?.image_url}
                  />
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </>
  );
}
