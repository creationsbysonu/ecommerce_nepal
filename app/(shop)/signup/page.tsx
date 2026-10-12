'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import TurnstileWidget from '@/components/ui/TurnstileWidget';
import styles from '../login/login.module.css';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(''); // digits only, without +977
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const router = useRouter();

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!turnstileToken) {
      setError('Please complete the security check before continuing.');
      return;
    }

    // Validate phone if provided
    if (phone && !/^(97|98)\d{8}$/.test(phone)) {
      setError('Please enter a valid Nepali mobile number (10 digits, starts with 97 or 98).');
      return;
    }

    setIsLoading(true);

    // Server-side Turnstile verification
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
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName,
          // phone stored in metadata — the profile trigger will capture email,
          // we save phone separately after OTP verification
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      resetTurnstile();
    } else {
      setMessage('OTP sent! Please check your email for the 6-digit verification code.');
      setStep(2);
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError, data } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setIsLoading(false);
      return;
    }

    // After OTP verified, save phone + email to profile
    if (data.user) {
      const updates: Record<string, string> = {
        email,           // capture email in profiles table
        full_name: fullName,
      };
      if (phone) {
        updates.phone_number = `+977${phone}`;
      }
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id);
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h2>Sign Up</h2>
          <p>Join Mero Pasal to unlock all features</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}

            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Ram Sharma"
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />

            {/* Phone number — required for phone-based login later */}
            <div style={{ marginTop: '4px' }}>
              <label className={styles.inputLabel}>
                Mobile Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional — needed for phone login)</span>
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
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Add your Nepali number to enable phone-based login.
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
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            {error && <div className={styles.errorAlert}>{error}</div>}
            {message && (
              <div className={styles.errorAlert} style={{ backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
                {message}
              </div>
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
              {isLoading ? 'Verifying...' : 'Verify & Create Account'}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => { setStep(1); resetTurnstile(); }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', fontWeight: 500 }}
              >
                ← Back to details
              </button>
            </div>
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
