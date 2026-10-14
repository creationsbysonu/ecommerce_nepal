'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import { Mail, Phone, Lock, User } from 'lucide-react';
import styles from './login.module.css';

type LoginMethod = 'email' | 'phone' | 'password';

function LoginForm() {
  const [method, setMethod] = useState<LoginMethod>('password');
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
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

  const switchMethod = (m: LoginMethod) => {
    setMethod(m);
    setStep(1);
    setError(null);
    setMessage(null);
    setOtp('');
    setPassword('');
    setIdentifier('');
    resetTurnstile();
  };

  // Check if identifier is email or username
  const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  // ── Password Login (email or username) ──────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!identifier || !password) {
      setError('Please enter both email/username and password.');
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    let emailToUse = identifier.trim().toLowerCase();

    // If identifier is not an email, look up email by username
    if (!isEmail(identifier)) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier.toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        setError('Invalid username or password.');
        setIsLoading(false);
        return;
      }
      emailToUse = profile.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });

    if (signInError) {
      setError('Invalid email/username or password.');
    } else {
      router.push(nextPath ?? '/');
      router.refresh();
    }
    setIsLoading(false);
  };

  // ── Step 1: Email OTP ──────────────────────────────────────────────────────
  const handleEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!turnstileToken) {
      setError('Please complete the security check before continuing.');
      return;
    }
    setIsLoading(true);

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
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: identifier.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });

    if (signInError) {
      setError(signInError.message);
      resetTurnstile();
    } else {
      setMessage('OTP sent! Check your email for the 6-digit code.');
      setResolvedEmail(identifier.trim().toLowerCase());
      setStep(2);
    }
    setIsLoading(false);
  };

  // ── Step 1: Phone OTP ──────────────────────────────────────────────────────
  const handlePhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!turnstileToken) {
      setError('Please complete the security check before continuing.');
      return;
    }
    setIsLoading(true);

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

    const phoneRes = await fetch('/api/auth/phone-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const phoneData = await phoneRes.json() as {
      success: boolean;
      email?: string;
      emailHint?: string;
      error?: string;
    };

    if (!phoneData.success || !phoneData.email) {
      setError(phoneData.error ?? 'Could not find an account with this number.');
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: phoneData.email,
      options: { shouldCreateUser: false },
    });

    if (signInError) {
      setError(signInError.message);
      resetTurnstile();
    } else {
      setResolvedEmail(phoneData.email);
      setEmailHint(phoneData.emailHint ?? '');
      setMessage(`OTP sent to ${phoneData.emailHint}. Check your email for the 6-digit code.`);
      setStep(2);
    }
    setIsLoading(false);
  };

  // ── Step 2: OTP Verification ───────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: resolvedEmail,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setIsLoading(false);
      return;
    }

    router.push(nextPath ?? '/');
    router.refresh();
  };

  const goBack = () => {
    setStep(1);
    setOtp('');
    setError(null);
    setMessage(null);
    resetTurnstile();
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Login</h2>
          <p>Get access to your Orders, Wishlist and Recommendations</p>
        </div>

        {/* Tab switcher — only show on step 1 */}
        {step === 1 && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${method === 'password' ? styles.tabActive : ''}`}
              onClick={() => switchMethod('password')}
            >
              <Lock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Password
            </button>
            <button
              type="button"
              className={`${styles.tab} ${method === 'email' ? styles.tabActive : ''}`}
              onClick={() => switchMethod('email')}
            >
              <Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Email OTP
            </button>
            <button
              type="button"
              className={`${styles.tab} ${method === 'phone' ? styles.tabActive : ''}`}
              onClick={() => switchMethod('phone')}
            >
              <Phone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Phone (+977)
            </button>
          </div>
        )}

        {/* ── Step 1: Password (Email/Username) ── */}
        {step === 1 && method === 'password' && (
          <form onSubmit={handlePasswordLogin} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            <Input
              label="Email or Username"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="Enter your email or username"
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
            <Button type="submit" fullWidth disabled={isLoading || !identifier || !password}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link href="/forgot-password" className={styles.link} style={{ fontSize: '13px' }}>
                Forgot password?
              </Link>
            </div>
          </form>
        )}

        {/* ── Step 1: Email OTP ── */}
        {step === 1 && method === 'email' && (
          <form onSubmit={handleEmailOtp} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            <Input
              label="Email Address"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="Enter your registered email"
              autoComplete="email"
            />
            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => { resetTurnstile(); setError('Security check failed. Please refresh.'); }}
              onExpire={() => { resetTurnstile(); setError('Security check expired. Please solve it again.'); }}
            />
            <Button type="submit" fullWidth disabled={isLoading || !turnstileToken}>
              {isLoading ? 'Sending OTP...' : 'Request OTP'}
            </Button>
          </form>
        )}

        {/* ── Step 1: Phone OTP ── */}
        {step === 1 && method === 'phone' && (
          <form onSubmit={handlePhoneOtp} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}

            <label className={styles.inputLabel}>Nepali Mobile Number</label>
            <div className={styles.phoneInputWrapper}>
              <span className={styles.phonePrefix}>🇳🇵 +977</span>
              <input
                className={styles.phoneInput}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                placeholder="98XXXXXXXX"
                maxLength={10}
                pattern="^(97|98)\d{8}$"
                title="Enter a valid Nepali mobile number starting with 97 or 98"
                autoComplete="tel"
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: '16px' }}>
              OTP will be sent to the email registered with this number.
            </p>

            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => { resetTurnstile(); setError('Security check failed. Please refresh.'); }}
              onExpire={() => { resetTurnstile(); setError('Security check expired. Please solve it again.'); }}
            />
            <Button type="submit" fullWidth disabled={isLoading || !turnstileToken || phone.length < 10}>
              {isLoading ? 'Looking up account...' : 'Send OTP'}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            {message && (
              <div className={styles.errorAlert} style={{ backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
                {message}
              </div>
            )}
            {emailHint && (
              <p className={styles.maskedEmailHint}>
                OTP sent to <strong>{emailHint}</strong>
              </p>
            )}
            <Input
              label="6-Digit OTP"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="Enter OTP"
              maxLength={6}
            />
            <Button type="submit" fullWidth disabled={isLoading || otp.length < 6}>
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </Button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button type="button" onClick={goBack} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontWeight: 500 }}>
                ← Back
              </button>
            </div>
          </form>
        )}

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