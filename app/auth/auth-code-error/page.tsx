import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Shown when the auth callback cannot exchange the one-time code — e.g. an
// expired or already-used verification / recovery link.
export default function AuthCodeErrorPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--background, #f8fafc)' }}>
      <div style={{ background: 'white', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', padding: '48px 40px', maxWidth: '440px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertCircle size={48} color="#b91c1c" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          Link expired or invalid
        </h2>
        <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: '32px' }}>
          This verification link is no longer valid. It may have already been used
          or it has expired. Request a new one from the sign-up page, or log in if
          you have already verified your email.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup">
            <Button variant="secondary">Back to Sign Up</Button>
          </Link>
          <Link href="/login">
            <Button style={{ background: 'var(--brand-blue)', color: 'white' }}>
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
