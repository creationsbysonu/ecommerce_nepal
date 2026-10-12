'use client';

import { Store, TrendingUp, ShieldCheck, Banknote, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SellOnMeroPasal() {
  const router = useRouter();

  return (
    <div style={{ background: 'white' }}>
      {/* Hero Section */}
      <div style={{ background: '#f8fafc', padding: '80px 20px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px', color: '#0f172a' }}>
          Sell online to 5 Million+ customers
        </h1>
        <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto 32px', color: 'var(--text-muted)' }}>
          Start your ecommerce journey with Mero Pasal. Zero registration fee. Get access to nationwide delivery, secured payments, and 24x7 seller support.
        </p>
        <button 
          onClick={() => router.push('/seller/register')}
          style={{ background: 'var(--brand-yellow)', color: '#0f172a', padding: '16px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
        >
          Start Selling Now <ArrowRight size={18} />
        </button>
      </div>

      <div className="container" style={{ padding: '80px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Why sell on Mero Pasal?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', marginBottom: '60px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: '#eff6ff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--brand-blue)' }}>
              <TrendingUp size={40} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Growth</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Tap into a massive customer base across Nepal. Expand your local shop to a nationwide business overnight.</p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#166534' }}>
              <Banknote size={40} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Lowest Fees</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Enjoy the lowest commission rates in the industry. Get your payments settled directly to your bank account within 3 days.</p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#d97706' }}>
              <ShieldCheck size={40} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Secure & Easy</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.6 }}>Our intuitive seller dashboard makes managing products and orders a breeze. Enjoy protection against fraudulent orders.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
