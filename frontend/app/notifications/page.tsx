'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Avatar from '@/components/Avatar';

interface Notification {
  id: number;
  type: string;
  message: string;
  link: string | null;
  is_read: string;
  created_at: string;
  actor_username: string;
  actor_avatar: string | null;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const ICONS: Record<string, string> = {
  vote:    '⬆️',
  comment: '💬',
  message: '✉️',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const r = await api.get('/api/notifications/');
      setNotifications(r.data);
      // Mark all read after viewing
      await api.patch('/api/notifications/read-all');
    } catch {}
    finally { setLoading(false); }
  }

  const unread = notifications.filter(n => n.is_read === 'false').length;

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          {unread > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {unread} unread
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border overflow-hidden shadow-md"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i*60}ms` }}>
                <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 rounded-lg" style={{ width: '70%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-14 text-center">
            <div className="text-5xl mb-3 animate-pop-in">🔔</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              You'll be notified when someone votes or comments on your posts
            </p>
          </div>
        ) : (
          <div className="stagger divide-y" style={{ borderColor: 'var(--border)' }}>
            {notifications.map((n, i) => {
              const isUnread = n.is_read === 'false';
              const content = (
                <div className="flex items-start gap-3.5 px-5 py-4 transition-all hover:bg-orange-50 dark:hover:bg-slate-700/30"
                  style={{
                    backgroundColor: isUnread ? 'rgba(249,115,22,0.04)' : 'transparent',
                    animationDelay: `${i*50}ms`,
                  }}>
                  {/* Unread dot */}
                  <div className="relative shrink-0 mt-0.5">
                    <Avatar url={n.actor_avatar} username={n.actor_username} size="sm" />
                    {isUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                        style={{ backgroundColor: '#f97316', borderColor: 'var(--bg-card)' }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${isUnread ? 'font-semibold' : ''}`}
                        style={{ color: 'var(--text-primary)' }}>
                        <span className="mr-1">{ICONS[n.type] || '🔔'}</span>
                        {n.message}
                      </p>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link} style={{ display: 'block' }}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}