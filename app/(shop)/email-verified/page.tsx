import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from '../login/login.module.css';

// The verification itself happens server-side in /auth/callback; this page is
// the terminal success screen, so there is no async state to manage.
export default function EmailVerifiedPage() {
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
