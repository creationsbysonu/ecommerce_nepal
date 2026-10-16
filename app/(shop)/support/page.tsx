'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { HeadphonesIcon, MessageCircle, Mail, Phone, Clock, ChevronDown, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  { q: "How do I track my order?", a: "You can track your order by going to the 'Orders' section in your profile dropdown. Click on any order to see its current status." },
  { q: "What is your return policy?", a: "We offer a 7-day hassle-free return policy for most items. Mero Pasal Plus members get an extended 30-day return window." },
  { q: "How do I use Mero Coins?", a: "You can apply Mero Coins at checkout. 4 Coins equal 1 Rupee discount on your total cart value." },
  { q: "Can I cancel my order?", a: "Orders can be cancelled before they are marked as 'Shipped'. Go to your Orders page to cancel an eligible order." }
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [msgSent, setMsgSent] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [message, setMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
    })();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg('Please sign in to submit a support ticket.');
      return;
    }

    setSubmitting(true);

    // Tickets are stored in support_tickets and visible to the customer (and
    // support staff) under RLS. Only send an order_id when the customer typed a
    // full UUID — the RLS policy requires the order to belong to them, so a
    // partial or wrong id would just be rejected.
    const orderId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderRef.trim())
      ? orderRef.trim()
      : null;
    const extra = orderRef.trim() && !orderId ? `\n\n(Order reference: ${orderRef.trim()})` : '';

    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject,
      order_id: orderId,
      message: message.trim() + extra,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message || 'Could not submit your ticket. Please try again.');
      return;
    }

    setSubject('');
    setOrderRef('');
    setMessage('');
    setMsgSent(true);
    setTimeout(() => setMsgSent(false), 5000);
  };

  return (
    <div className="container" style={{ padding: '40px 16px', maxWidth: '1000px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--brand-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <HeadphonesIcon size={40} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#212121', marginBottom: '12px' }}>24x7 Customer Support</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          We&apos;re here to help you with anything you need. Reach out to us via phone, email, or send us a direct message below.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
          <Phone size={32} color="var(--brand-blue)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Call Us</h3>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#212121', marginBottom: '4px' }}>1660-01-PASAL</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Clock size={14} /> Available 24/7</p>
        </div>
        <div style={{ padding: '24px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
          <Mail size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Email Us</h3>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#212121', marginBottom: '4px' }}>support@meropasal.com</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><Clock size={14} /> Response within 2 hours</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
        {/* Contact Form */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={24} /> Send a Message
          </h2>
          {msgSent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Message Sent!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>We&apos;ll get back to you shortly.</p>
            </div>
          ) : signedIn === null ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Checking your session…
            </div>
          ) : signedIn === false ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <MessageCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Sign in needed</h3>
              <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px' }}>Please sign in so we can attach your ticket to your account and reply to you.</p>
              <Link href="/login?next=/support" style={{ background: 'var(--brand-yellow)', color: '#212121', padding: '12px 24px', borderRadius: '6px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'white' }} required>
                  <option value="">Select a topic</option>
                  <option value="order">Order tracking/issues</option>
                  <option value="return">Returns/Refunds</option>
                  <option value="payment">Payment failure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Order ID (Optional)</label>
                <input type="text" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="e.g. 9b1deb4d..." style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Message</label>
                <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px', resize: 'vertical' }} required></textarea>
              </div>
              {errorMsg && <p style={{ color: 'var(--error)', fontSize: '13px' }}>{errorMsg}</p>}
              <button type="submit" disabled={submitting || !subject || !message.trim()} style={{ background: 'var(--brand-yellow)', color: '#212121', padding: '12px', borderRadius: '6px', fontWeight: 700, fontSize: '15px' }}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>

        {/* FAQs */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '15px', color: '#212121', textAlign: 'left' }}
                >
                  {faq.q}
                  <ChevronDown size={18} style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 16px 16px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
