'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Store, AlertCircle, CheckCircle } from 'lucide-react';

export default function StoreSettings() {
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('stores')
          .select('name, description')
          .eq('seller_id', user.id)
          .single();
          
        if (data) {
          setStoreName(data.name);
          setDescription(data.description || '');
        }
      }
      setIsFetching(false);
    }
    loadStore();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('stores')
      .update({
        name: storeName,
        description: description,
      })
      .eq('seller_id', user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Store settings saved successfully!");
      router.refresh();
    }
    setIsLoading(false);
  };

  if (isFetching) return <div style={{padding: '40px', textAlign: 'center'}}>Loading settings...</div>;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Store size={28} />
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Store Settings</h1>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '14px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '14px' }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Store Name</label>
            <input 
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              placeholder="e.g. Nepal Electronics Hub"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '15px' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Store Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell customers about your store..."
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '15px', resize: 'vertical' }} 
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ background: 'var(--brand-blue)', color: 'white', padding: '12px 24px', borderRadius: '8px', fontSize: '15px', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
