'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import styles from './login.module.css';

function LoginForm() {
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
      ? rawNext
      : null;

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  // ── Password Login (email or phone) ──────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!identifier || !password) {
      setError('Please enter both email/phone and password.');
      return;
    }

    if (!turnstileToken) {
      setError('Please complete the security check before continuing.');
      return;
    }

    setIsLoading(true);

    try {
      // The server resolves phone→email, verifies Turnstile and signs in, so
      // the account e-mail never reaches the browser.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, turnstileToken }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Login failed. Please try again.');
        resetTurnstile();
      } else {
        router.push(nextPath ?? '/');
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Login</h2>
          <p>Get access to your Orders, Wishlist and Recommendations</p>
        </div>

        {/* Password Login (Email or Phone) ── */}
        <form onSubmit={handlePasswordLogin} className={styles.form}>
          {error && <div className={styles.errorAlert}>{error}</div>}
          {message && (
            <div className={styles.errorAlert} style={{ backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
              {message}
            </div>
          )}

          <Input
            label="Email or Phone Number"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="Enter your email or Nepali phone number"
            autoComplete="username"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          <TurnstileWidget
            ref={turnstileRef}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => { resetTurnstile(); setError('Security check failed. Please refresh.'); }}
            onExpire={() => { resetTurnstile(); setError('Security check expired. Please solve it again.'); }}
          />
          <Button type="submit" fullWidth disabled={isLoading || !turnstileToken || !identifier || !password}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <Link href="/forgot-password" className={styles.link} style={{ fontSize: '13px' }}>
              Forgot password?
            </Link>
          </div>
        </form>

        <div className={styles.footer}>
          <span>New to Mero Pasal? </span>
          <Link href="/signup" className={styles.link}>Create an account</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}