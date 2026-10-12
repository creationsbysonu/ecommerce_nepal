import { createClient } from '@/utils/supabase/server';
import styles from '../admin.module.css';
import { revalidatePath } from 'next/cache';

export default async function CategoryManagement() {
  const supabase = await createClient();
  
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: false });

  async function addCategory(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const supabaseServer = await createClient();
    await supabaseServer.from('categories').insert({ name, slug });
    revalidatePath('/admin/categories');
  }

  async function deleteCategory(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const supabaseServer = await createClient();
    await supabaseServer.from('categories').delete().eq('id', id);
    revalidatePath('/admin/categories');
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
        <h1 className={styles.pageTitle} style={{marginBottom: 0}}>Categories</h1>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', alignItems: 'start'}}>
        
        {/* Add Category Form */}
        <div style={{background: 'white', padding: '24px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)'}}>
          <h2 style={{fontSize: '16px', fontWeight: 600, marginBottom: '16px'}}>Add New Category</h2>
          <form action={addCategory} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div>
              <label style={{display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#4a5568'}}>Category Name</label>
              <input 
                name="name" 
                required 
                placeholder="e.g. Electronics" 
                style={{width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px'}}
              />
            </div>
            <button type="submit" style={{background: 'var(--brand-yellow-dark)', color: '#000', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 600, cursor: 'pointer'}}>
              Create Category
            </button>
          </form>
        </div>

        {/* Categories Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Date Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>No categories found</td>
                </tr>
              )}
              {categories?.map(cat => (
                <tr key={cat.id}>
                  <td style={{fontWeight: 600}}>{cat.name}</td>
                  <td style={{color: 'var(--text-muted)'}}>{cat.slug}</td>
                  <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                  <td>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={cat.id} />
                      <button type="submit" style={{background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 500}}>Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}
