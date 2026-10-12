'use client';

import { TrendingUp, Users, Target, BarChart, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AdvertisePage() {
  return (
    <div style={{ background: 'white' }}>
      {/* Hero Section */}
      <div style={{ background: '#0f172a', color: 'white', padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-1px' }}>Grow your business with <span style={{ color: 'var(--brand-yellow)' }}>Mero Pasal Ads</span></h1>
        <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto 32px', color: '#cbd5e1' }}>
          Get your products in front of millions of active shoppers in Nepal. Only pay when someone clicks on your ad.
        </p>
        <button style={{ background: 'var(--brand-yellow)', color: '#0f172a', padding: '16px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
          Start Advertising Now <ArrowRight size={18} />
        </button>
      </div>

      <div className="container" style={{ padding: '60px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700 }}>Why advertise with us?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px', marginBottom: '60px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#eff6ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--brand-blue)' }}>
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Massive Reach</h3>
            <p style={{ color: 'var(--text-muted)' }}>Tap into a user base of over 5 million monthly active shoppers looking for products like yours.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#fef3c7', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#d97706' }}>
              <Target size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Targeted Delivery</h3>
            <p style={{ color: 'var(--text-muted)' }}>Our advanced algorithms show your ads to customers who are most likely to buy your products.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#f0fdf4', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#166534' }}>
              <BarChart size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Measurable ROI</h3>
            <p style={{ color: 'var(--text-muted)' }}>Track clicks, views, and actual sales generated from your ads in real-time through the seller dashboard.</p>
          </div>
        </div>

        {/* Form Section */}
        <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '16px', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>Request a callback</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', textAlign: 'center' }}>Leave your details and our ad experts will get in touch with you.</p>
          
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => { e.preventDefault(); alert("Request submitted! We'll call you soon."); }}>
            <input type="text" placeholder="Your Name / Brand Name" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }} required />
            <input type="tel" placeholder="Phone Number" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }} required />
            <input type="email" placeholder="Email Address" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px' }} required />
            <button type="submit" style={{ background: 'var(--brand-blue)', color: 'white', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
