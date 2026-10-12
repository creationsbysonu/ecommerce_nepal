'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../profile.module.css';
import { MapPin, Trash2, Edit2 } from 'lucide-react';

type Address = {
  id: string;
  full_name: string;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
  });

  const fetchAddresses = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });
    
    if (data) setAddresses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If this is the first address, make it default
    const isFirst = addresses.length === 0;

    const { error } = await supabase.from('addresses').insert({
      user_id: user.id,
      ...formData,
      is_default: isFirst,
    });

    if (!error) {
      setIsAdding(false);
      setFormData({
        full_name: '',
        phone_number: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
      });
      fetchAddresses();
    } else {
      alert("Error adding address");
    }
  };

  const deleteAddress = async (id: string) => {
    if(!confirm("Delete this address?")) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (!error) {
      fetchAddresses();
    }
  };

  const setAsDefault = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First unset all defaults
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    // Then set the selected one as default
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    
    fetchAddresses();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>Manage Addresses</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>+ Add A New Address</Button>
        )}
      </div>

      {isAdding && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '4px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brand-blue)', marginBottom: '16px' }}>ADD A NEW ADDRESS</h2>
          <form onSubmit={handleAddSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input label="Full Name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
              <Input label="10-digit Mobile Number" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} required />
            </div>
            <div style={{ marginTop: '16px' }}>
              <Input label="Address (Area and Street)" value={formData.street_address} onChange={e => setFormData({...formData, street_address: e.target.value})} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <Input label="City/District" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required />
              <Input label="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required />
            </div>
            <div style={{ marginTop: '16px', width: '50%' }}>
              <Input label="Postal Code" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} required />
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <Button type="submit">Save Address</Button>
              <button type="button" onClick={() => setIsAdding(false)} style={{ background: 'transparent', border: 'none', fontWeight: 600, cursor: 'pointer', color: 'var(--brand-blue)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading addresses...</p>
      ) : addresses.length === 0 && !isAdding ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No Addresses found in your account!</h3>
          <p>Add a delivery address.</p>
        </div>
      ) : (
        <div>
          {addresses.map(addr => (
            <div key={addr.id} className={styles.addressCard}>
              {addr.is_default && <span className={styles.defaultBadge}>HOME / DEFAULT</span>}
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{addr.full_name}</span>
                    <span style={{ fontWeight: 600 }}>{addr.phone_number}</span>
                  </div>
                  <p style={{ color: '#212121', lineHeight: 1.5 }}>
                    {addr.street_address}, {addr.city}, {addr.state} - <span style={{ fontWeight: 500 }}>{addr.postal_code}</span>
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                  <button onClick={() => deleteAddress(addr.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete">
                    <Trash2 size={18} />
                  </button>
                  {!addr.is_default && (
                    <button onClick={() => setAsDefault(addr.id)} style={{ background: 'transparent', border: 'none', color: 'var(--brand-blue)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
