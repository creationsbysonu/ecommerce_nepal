'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bell, Package, Tag, Megaphone, Info, CheckCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system' | 'coupon';
  is_read: boolean;
  link: string | null;
  created_at: string;
};

const typeIcon = {
  order:  <Package size={18} color="var(--brand-blue)" />,
  promo:  <Megaphone size={18} color="var(--brand-yellow-dark)" />,
  coupon: <Tag size={18} color="#10b981" />,
  system: <Info size={18} color="#6b7280" />,
};

const typeBg = {
  order:  '#eff6ff',
  promo:  '#fffdf5',
  coupon: '#f0fdf4',
  system: '#f9fafb',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading notifications...</div>;

  return (
    <div>
      <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Notifications</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-blue)', fontWeight: 600, fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Bell size={52} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No notifications yet</h3>
          <p>We'll notify you about orders, offers, and important updates.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id); }}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '16px',
                borderRadius: '8px',
                background: n.is_read ? 'white' : typeBg[n.type],
                border: `1px solid ${n.is_read ? 'var(--border)' : '#e0e0e0'}`,
                cursor: 'pointer',
                transition: 'background 0.2s',
                position: 'relative',
              }}
            >
              {/* Unread dot */}
              {!n.is_read && (
                <div style={{ position: 'absolute', top: '16px', right: '48px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-blue)' }} />
              )}

              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {typeIcon[n.type]}
              </div>

              <div style={{ flex: 1 }}>
                {n.link ? (
                  <Link href={n.link} style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '14px', color: '#212121' }}>{n.title}</Link>
                ) : (
                  <p style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '14px', color: '#212121' }}>{n.title}</p>
                )}
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</p>
                <p style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>{formatTime(n.created_at)}</p>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', flexShrink: 0, alignSelf: 'center' }}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
