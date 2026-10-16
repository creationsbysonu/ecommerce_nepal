'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Store, AlertCircle } from 'lucide-react';

export default function SellerRegistration() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/seller/register');
        return;
      }

      // Check if user is already a seller
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'seller') {
        router.push('/seller/dashboard');
        return;
      }

      setLoading(false);
    };
    checkStatus();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Use atomic RPC to register seller (prevents race conditions)
      const { error } = await supabase.rpc('register_seller', {
        p_store_name: storeName,
        p_store_description: storeDesc,
      });

      if (error) throw error;

      // Success - redirect to dashboard
      alert("Registration successful! Welcome to the Seller Portal.");
      window.location.href = '/seller/dashboard';

    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'An error occurred during registration.';
      setError(message);
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--brand-blue)' }}>
            <Store size={32} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Create your Store</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Join thousands of sellers on Mero Pasal</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Store Name *</label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Kathmandu Electronics"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '15px' }} 
              required
              minLength={3}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Store Description (Optional)</label>
            <textarea 
              value={storeDesc}
              onChange={(e) => setStoreDesc(e.target.value)}
              placeholder="What kind of products do you sell?"
              rows={4}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '15px', resize: 'vertical' }} 
            />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '14px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting}
            style={{ background: 'var(--brand-blue)', color: 'white', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: '8px' }}
          >
            {submitting ? 'Creating Store...' : 'Register as Seller'}
          </button>
        </form>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
          By registering, you agree to our Seller Terms & Conditions.
        </p>
      </div>
    </div>
  );
}
