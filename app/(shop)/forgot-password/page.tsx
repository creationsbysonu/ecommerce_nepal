'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../login/login.module.css'; // Reusing login styles

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    const supabase = createClient();
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset link sent! Check your email.");
    }
    
    setIsLoading(false);
  };

  return (
    <div className={`container ${styles.container}`}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>Forgot Password</h2>
          <p>Enter your email to reset your password</p>
        </div>
        
        <form onSubmit={handleReset} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div style={{color: '#166534', padding: '12px', background: '#dcfce7', borderRadius: '4px', fontSize: '14px', marginBottom: '16px'}}>{message}</div>}
          
          <Input 
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
          
          <Button type="submit" disabled={isLoading} fullWidth className={styles.loginSubmit}>
            {isLoading ? 'Sending Link...' : 'Send Reset Link'}
          </Button>
        </form>
        
        <div className={styles.footer}>
          <span>Remember your password? </span>
          <Link href="/login" className={styles.link}>Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
