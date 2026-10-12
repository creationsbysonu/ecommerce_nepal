'use client';

import { Download, Smartphone, Star, Zap } from 'lucide-react';
import Image from 'next/image';

export default function DownloadAppPage() {
  return (
    <div style={{ background: 'linear-gradient(180deg, #f0f4f8 0%, #ffffff 100%)', minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ padding: '60px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
        
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, marginBottom: '24px' }}>
            <Star size={14} fill="currentColor" /> 4.8/5 Rating on App Store
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#0f172a', marginBottom: '20px', lineHeight: 1.1 }}>
            The best way to shop is on the App.
          </h1>
          <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '32px', lineHeight: 1.6 }}>
            Download the Mero Pasal app for faster checkouts, real-time order tracking, and exclusive app-only deals.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={20} /></div>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Lightning fast browsing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={20} /></div>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Save data with offline caching</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button style={{ background: '#000', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer' }}>
               <div style={{ fontSize: '24px' }}>🍎</div>
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: '10px', opacity: 0.8 }}>Download on the</div>
                 <div style={{ fontSize: '16px', fontWeight: 600 }}>App Store</div>
               </div>
            </button>
            <button style={{ background: '#000', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: 'none', cursor: 'pointer' }}>
               <div style={{ fontSize: '24px' }}>▶️</div>
               <div style={{ textAlign: 'left' }}>
                 <div style={{ fontSize: '10px', opacity: 0.8 }}>GET IT ON</div>
                 <div style={{ fontSize: '16px', fontWeight: 600 }}>Google Play</div>
               </div>
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', height: '600px', display: 'flex', justifyContent: 'center' }}>
          {/* A purely CSS/mock representation of a phone since we don't have an image asset */}
          <div style={{ width: '300px', height: '600px', background: 'white', border: '8px solid #0f172a', borderRadius: '40px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
             {/* Notch */}
             <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '25px', background: '#0f172a', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', zIndex: 10 }}></div>
             
             {/* Mock App UI */}
             <div style={{ background: 'var(--brand-yellow)', height: '100px', padding: '40px 20px 20px' }}>
               <div style={{ fontWeight: 800, fontSize: '20px' }}>Mero Pasal</div>
             </div>
             <div style={{ padding: '20px' }}>
               <div style={{ background: '#f1f5f9', height: '40px', borderRadius: '20px', marginBottom: '20px' }}></div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                 <div style={{ background: '#f1f5f9', height: '120px', borderRadius: '12px' }}></div>
                 <div style={{ background: '#f1f5f9', height: '120px', borderRadius: '12px' }}></div>
                 <div style={{ background: '#f1f5f9', height: '120px', borderRadius: '12px' }}></div>
                 <div style={{ background: '#f1f5f9', height: '120px', borderRadius: '12px' }}></div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
