'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings, Shield, UserX, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      else setLoading(false);
    });
  }, [router, supabase]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(pwd)) errors.push('Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Password must contain at least one special character.');
    return errors;
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setPasswordErrors([]);

    if (password !== confirmPassword) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setPassword('');
      setConfirmPassword('');
    }
    setIsUpdating(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="container" style={{ padding: '40px 16px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings size={28} /> Account Settings
      </h1>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} color="var(--brand-blue)" /> Security
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Update your password to keep your account secure.
        </p>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                // Real-time validation feedback
                setPasswordErrors(validatePassword(e.target.value));
              }}
              required
              placeholder="Min 8 chars, upper, lower, number, symbol"
              minLength={8}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
            />
            {passwordErrors.length > 0 && (
              <div style={{ marginTop: '4px', marginBottom: '8px', fontSize: '12px', color: 'var(--error)' }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {passwordErrors.map((err, i) => (
                    <li key={i} style={{ color: 'var(--error)' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--error)' }}>
                Passwords do not match
              </p>
            )}
          </div>

          {msg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '6px', fontSize: '13px', background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#166534' : '#991b1b' }}>
              {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {msg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdating}
            style={{ background: 'var(--brand-blue)', color: 'white', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: isUpdating ? 'not-allowed' : 'pointer' }}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div style={{ background: '#fffcfc', border: '1px solid #fee2e2', borderRadius: '8px', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c' }}>
          <UserX size={20} /> Danger Zone
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button onClick={() => alert('Account deletion requires contacting support.')} style={{ background: 'white', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          Delete Account
        </button>
      </div>
    </div>
  );
}