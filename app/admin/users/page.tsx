import { createClient } from '@/utils/supabase/server';
import styles from '../admin.module.css';
import { revalidatePath } from 'next/cache';

export default async function UsersManagement() {
  const supabase = await createClient();
  
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Server action to promote user (if needed in future)
  async function updateUserRole(formData: FormData) {
    'use server';
    const userId = formData.get('userId') as string;
    const newRole = formData.get('role') as string;
    const supabaseServer = await createClient();
    await supabaseServer.from('profiles').update({ role: newRole }).eq('id', userId);
    revalidatePath('/admin/users');
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>User Management</h1>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(user => (
              <tr key={user.id}>
                <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{user.id.substring(0,8)}...</td>
                <td style={{fontWeight: 500}}>{user.full_name || 'No Name'}</td>
                <td>
                  <span className={`${styles.badge} ${styles[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <form action={updateUserRole} style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                    <input type="hidden" name="userId" value={user.id} />
                    <select name="role" defaultValue={user.role} style={{padding: '4px', borderRadius: '4px', border: '1px solid var(--border)'}}>
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" style={{background: 'var(--brand-blue)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
