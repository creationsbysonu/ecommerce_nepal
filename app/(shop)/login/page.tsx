'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import { Mail, Phone, Lock } from 'lucide-react';
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

  // Check if identifier is email or phone
  const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  const isPhone = (str: string) => /^(\+977)?(97|98)\d{8}$/.test(str.replace(/\D/g, ''));

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

    // Verify Turnstile
    const verifyRes = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileToken }),
    });
    const verifyData = await verifyRes.json() as { success: boolean; error?: string };
    if (!verifyData.success) {
      setError(verifyData.error ?? 'Security check failed. Please try again.');
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    let emailToUse = identifier.trim().toLowerCase();

    // If identifier is phone, look up email by phone
    if (isPhone(identifier)) {
      const cleanPhone = identifier.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('977') ? `+${cleanPhone}` : `+977${cleanPhone}`;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone_number', fullPhone)
        .maybeSingle();

      if (profileError || !profile) {
        setError('No account found with this phone number.');
        resetTurnstile();
        setIsLoading(false);
        return;
      }
      emailToUse = profile.email;
    }
    // If identifier is not email, assume it's email (not username anymore)
    else if (!isEmail(identifier)) {
      setError('Please enter a valid email or Nepali phone number.');
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (signInError) {
      setError('Invalid email/phone or password.');
      resetTurnstile();
    } else {
      router.push(nextPath ?? '/');
      router.refresh();
    }
    setIsLoading(false);
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