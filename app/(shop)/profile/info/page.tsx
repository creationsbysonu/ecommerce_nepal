'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, Mail, Phone, Shield, CheckCircle } from 'lucide-react';
import styles from '../profile.module.css';

type Profile = {
  full_name: string | null;
  phone_number: string | null;
  role: string;
  avatar_url: string | null;
};

export default function ProfileInfoPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    phone_number: '',
    role: 'customer',
    avatar_url: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone_number, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name ?? '',
          phone_number: data.phone_number ?? '',
          role: data.role ?? 'customer',
          avatar_url: data.avatar_url,
        });
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setErrorMsg('Failed to save profile. Please try again.');
    } else {
      setSuccessMsg('Profile updated successfully!');
      // Also update auth metadata so the sidebar name refreshes
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name },
      });
      setTimeout(() => setSuccessMsg(null), 4000);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#212121' }}>Profile Information</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage your personal details
        </p>
      </div>

      {/* Avatar / Account type row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--brand-yellow-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <User size={36} color="var(--brand-yellow-dark)" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '18px', color: '#212121' }}>
            {profile.full_name || 'No name set'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{email}</p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '6px',
              background: profile.role === 'seller' ? '#eff6ff' : '#f0fdf4',
              color: profile.role === 'seller' ? '#1d4ed8' : '#15803d',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
              textTransform: 'capitalize',
            }}
          >
            <Shield size={11} />
            {profile.role}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={handleSave}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          {/* Full Name */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#444',
                marginBottom: '6px',
              }}
            >
              <User size={14} />
              Full Name
            </label>
            <Input
              type="text"
              value={profile.full_name ?? ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#444',
                marginBottom: '6px',
              }}
            >
              <Phone size={14} />
              Phone Number
            </label>
            <Input
              type="tel"
              value={profile.phone_number ?? ''}
              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
              placeholder="e.g. 98XXXXXXXX"
            />
          </div>
        </div>

        {/* Email — read-only */}
        <div style={{ marginTop: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#444',
              marginBottom: '6px',
            }}
          >
            <Mail size={14} />
            Email Address
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '10px 14px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            <span style={{ flex: 1 }}>{email}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#15803d',
                background: '#dcfce7',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              Verified
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Your email is used for OTP login and cannot be changed here.
          </p>
        </div>

        {/* Account Type — read-only */}
        <div style={{ marginTop: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#444',
              marginBottom: '6px',
            }}
          >
            <Shield size={14} />
            Account Type
          </label>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '10px 14px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            {profile.role}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
            To change your account type, please contact support.
          </p>
        </div>

        {/* Save button */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
