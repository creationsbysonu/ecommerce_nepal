'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from '../login/login.module.css';

export default function EmailVerifiedPage() {
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // The verification happens server-side via /auth/callback
    // This page just shows the success state after redirect
    setVerified(true);
  }, []);

  if (!verified) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox} style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto 24px', color: 'var(--brand-blue)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginBox} style={{ textAlign: 'center', padding: '60px 40px' }}>
        <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={48} color="#166534" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Email Verified!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
          Your email has been successfully verified. You can now log in to your account.
        </p>
        <Link href="/login" style={{ display: 'inline-block' }}>
          <Button fullWidth style={{ background: 'var(--brand-blue)', color: 'white' }}>
            Go to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}