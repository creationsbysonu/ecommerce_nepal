'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import { CheckCircle } from 'lucide-react';
import styles from '../login/login.module.css';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendMessage(null);
    setResendError(false);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResendError(true);
        setResendMessage(data.error || 'Failed to resend email');
      } else {
        setResendError(false);
        setResendMessage(data.message || 'Verification email sent!');
      }
    } catch {
      setResendError(true);
      setResendMessage('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const validateUsername = (uname: string): string | null => {
    if (uname.length < 3) return 'Username must be at least 3 characters.';
    if (uname.length > 30) return 'Username must be at most 30 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(uname)) return 'Username can only contain letters, numbers, and underscores.';
    return null;
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must contain at least one special character.';
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const usernameError = validateUsername(username);
    if (usernameError) { setError(usernameError); return; }

    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    const pwdError = validatePassword(password);
    if (pwdError) { setError(pwdError); return; }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }

    if (phone && !/^(97|98)\d{8}$/.test(phone)) { setError('Please enter a valid Nepali mobile number (10 digits, starts with 97 or 98).'); return; }

    if (!turnstileToken) { setError('Please complete the security check before continuing.'); return; }

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

    // Check username availability via a narrow SECURITY DEFINER RPC. The
    // profiles table is private under RLS, so it cannot be read directly.
    const { data: usernameAvailable } = await supabase
      .rpc('is_username_available', { p_username: username.toLowerCase() });
    if (usernameAvailable === false) {
      setError('Username is already taken.');
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    // Sign up with email/password - Supabase will send the verification email.
    // full_name / username / phone_number ride along as user metadata and are
    // written to profiles by the handle_new_user() trigger. (A client-side
    // profile UPDATE here would be rejected by RLS: no session exists until the
    // email is confirmed.)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: signUpError, data } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName,
          username: username.toLowerCase(),
          ...(phone ? { phone_number: `+977${phone}` } : {}),
        },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/email-verified`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    if (data.user) {
      // Supabase has sent the verification link; the handle_new_user trigger is
      // the only writer of the profile row at this point.
      setEmailSent(true);
      setMessage('Account created! Please check your email to verify your address.');
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>Sign Up</h2>
          <p>Create your Mero Pasal account</p>
        </div>

        {emailSent ? (
          // Email sent confirmation state
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={48} color="#166534" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Check Your Email</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
              We&apos;ve sent a verification link to <strong>{email}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Click the link in the email to verify your address, then return to log in.
            </p>
            <Link href="/login" style={{ display: 'inline-block' }}>
              <Button fullWidth style={{ background: 'var(--brand-blue)', color: 'white' }}>
                Go to Login
              </Button>
            </Link>
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Didn&apos;t receive the email?
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={handleResendEmail}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              {resendMessage && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: resendError ? 'var(--error)' : '#166534' }}>
                  {resendMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Signup form
          <form onSubmit={handleSignup} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            {message && (
              <div className={styles.errorAlert} style={{ backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
                {message}
              </div>
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              placeholder="e.g. ram_sharma"
              minLength={3}
              maxLength={30}
              autoComplete="username"
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-12px', marginBottom: '12px' }}>
              3-30 characters, letters, numbers, underscores only
            </p>

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Ram Sharma"
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min 8 chars, upper, lower, number, symbol"
              minLength={8}
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              autoComplete="new-password"
            />

            {/* Phone number */}
            <div style={{ marginTop: '4px' }}>
              <label className={styles.inputLabel}>
                Mobile Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <div className={styles.phoneInputWrapper}>
                <span className={styles.phonePrefix}>🇳🇵 +977</span>
                <input
                  className={styles.phoneInput}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                  autoComplete="tel"
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Add your Nepali number for account recovery.
              </p>
            </div>

            {/* Cloudflare Turnstile */}
            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => { resetTurnstile(); setError('Security check failed. Please refresh.'); }}
              onExpire={() => { resetTurnstile(); setError('Security check expired. Please solve it again.'); }}
            />

            <Button type="submit" fullWidth disabled={isLoading || !turnstileToken}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          <span>Already have an account? </span>
          <Link href="/login" className={styles.link}>Login here</Link>
        </div>
      </div>
    </div>
  );
}