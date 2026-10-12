'use client';

import { useState } from 'react';
import { BellRing, Mail, Smartphone, Bell, CheckCircle } from 'lucide-react';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    email_orders: true,
    email_promos: false,
    sms_orders: true,
    sms_promos: true,
    push_orders: true,
    push_promos: false,
  });
  
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof prefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a real app, save to Supabase profiles table
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch = ({ label, desc, checked, onChange }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#212121' }}>{label}</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</p>
      </div>
      <button 
        onClick={onChange}
        style={{ width: '44px', height: '24px', background: checked ? 'var(--brand-blue)' : '#cbd5e1', borderRadius: '12px', position: 'relative', cursor: 'pointer', border: 'none', transition: 'background 0.2s' }}
      >
        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: checked ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );

  return (
    <div className="container" style={{ padding: '40px 16px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BellRing size={28} /> Notification Preferences
      </h1>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Email */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><Mail size={20} color="var(--brand-blue)"/> Email Notifications</h3>
          <ToggleSwitch label="Order Updates" desc="Get emails about your order status, shipping, and delivery." checked={prefs.email_orders} onChange={() => toggle('email_orders')} />
          <ToggleSwitch label="Promotions & Offers" desc="Receive emails about discounts, sales, and personalized offers." checked={prefs.email_promos} onChange={() => toggle('email_promos')} />
        </div>

        {/* SMS */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><Smartphone size={20} color="#10b981"/> SMS Notifications</h3>
          <ToggleSwitch label="Delivery Alerts" desc="Get text messages when your order is out for delivery." checked={prefs.sms_orders} onChange={() => toggle('sms_orders')} />
          <ToggleSwitch label="Flash Sales" desc="Be the first to know about time-sensitive deals via SMS." checked={prefs.sms_promos} onChange={() => toggle('sms_promos')} />
        </div>

        {/* Push */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><Bell size={20} color="#f59e0b"/> Push Notifications (App)</h3>
          <ToggleSwitch label="Account Activity" desc="Alerts for logins, security, and account changes." checked={prefs.push_orders} onChange={() => toggle('push_orders')} />
          <ToggleSwitch label="Price Drops" desc="Alerts when items in your Wishlist drop in price." checked={prefs.push_promos} onChange={() => toggle('push_promos')} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button 
            onClick={handleSave}
            style={{ background: 'var(--brand-yellow)', color: '#212121', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer' }}
          >
            Save Preferences
          </button>
          {saved && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 600, fontSize: '14px' }}><CheckCircle size={18} /> Saved!</span>}
        </div>
      </div>
    </div>
  );
}
