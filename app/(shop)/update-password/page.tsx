'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../login/login.module.css';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is trying to access this page without a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Only redirect if there's no hash in the URL either (hash means they just clicked the link)
        if (!window.location.hash) {
          router.push('/login');
        }
      }
    };
    checkSession();
  }, [supabase, router]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(pwd)) errors.push('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(pwd)) errors.push('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(pwd)) errors.push('Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Password must contain at least one special character.');
    return errors;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordErrors([]);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      setPasswordErrors(pwdErrors);
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>Set New Password</h2>
          <p>Please enter your new password</p>
        </div>

        <form onSubmit={handleUpdate} className={styles.form}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          <Input
            label="New Password"
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
            autoComplete="new-password"
          />

          {passwordErrors.length > 0 && (
            <div style={{ marginTop: '-12px', marginBottom: '12px', fontSize: '12px', color: 'var(--error)' }}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {passwordErrors.map((err, i) => (
                  <li key={i} style={{ color: 'var(--error)' }}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your password"
            autoComplete="new-password"
          />

          {password && confirmPassword && password !== confirmPassword && (
            <p style={{ marginTop: '-12px', marginBottom: '12px', fontSize: '12px', color: 'var(--error)' }}>
              Passwords do not match
            </p>
          )}

          <Button type="submit" disabled={isLoading} fullWidth className={styles.loginSubmit}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}