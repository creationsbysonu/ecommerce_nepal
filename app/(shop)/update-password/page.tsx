'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../login/login.module.css';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
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
          {error && <div className={styles.error}>{error}</div>}
          
          <Input 
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
            minLength={6}
          />
          
          <Button type="submit" disabled={isLoading} fullWidth className={styles.loginSubmit}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
