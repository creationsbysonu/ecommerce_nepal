import { createClient } from '@/utils/supabase/server';
import { ProductCard } from '@/components/shop/ProductCard';
import { notFound } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();

  // Find category id based on slug
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('slug', params.slug)
    .single();

  if (!category) {
    // If it's a dynamic slug from the homepage that doesn't exist yet, we can either
    // return 404 or just do a generic search on products.
    // To avoid 404s for the demo UI, let's just do a text search if category isn't found.
  }

  // Fetch products
  let query = supabase.from('products').select('*, product_variants(image_url)').eq('is_active', true);
  
  if (category) {
    query = query.eq('category_id', category.id);
  } else {
    // Basic fallback: search in title or description if slug doesn't match an exact category
    query = query.ilike('title', `%${params.slug}%`);
  }

  const { data: products } = await query;

  return (
    <div className="container" style={{ padding: '40px 16px', minHeight: 'calc(100vh - var(--header-height))' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px', textTransform: 'capitalize' }}>
        {category ? category.name : params.slug.replace('-', ' ')}
      </h1>

      {(!products || products.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <LayoutGrid size={64} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>No products found</h2>
          <p>We couldn't find any products in this category right now.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
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
  );
}
