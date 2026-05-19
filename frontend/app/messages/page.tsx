'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Avatar from '@/components/Avatar';

interface Conversation {
  username: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_mine: boolean;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [newChat,       setNewChat]       = useState('');
  const [newChatError,  setNewChatError]  = useState('');
  const [searching,     setSearching]     = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    fetchInbox();
    // Refresh inbox every 10s to catch new conversations
    const interval = setInterval(fetchInbox, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchInbox() {
    try {
      const r = await api.get('/api/messages/inbox');
      setConversations(r.data);
    } catch {}
    finally { setLoading(false); }
  }

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    const u = newChat.trim().replace(/^u\//, '');
    if (!u) return;
    setSearching(true);
    setNewChatError('');
    try {
      await api.get(`/api/users/${u}`);
      router.push(`/messages/${u}`);
    } catch {
      setNewChatError(`User "${u}" not found. Check the username and try again.`);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Messages</h1>

      {/* New chat search */}
      <form onSubmit={startChat} className="mb-4">
        <div className="flex gap-2">
          <input
            value={newChat}
            onChange={e => { setNewChat(e.target.value); setNewChatError(''); }}
            placeholder="Message someone — enter their username..."
            className="input-base flex-1"
          />
          <button type="submit" disabled={searching || !newChat.trim()} className="btn-primary px-5 shrink-0">
            {searching ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
            ) : 'Chat'}
          </button>
        </div>
        {newChatError && (
          <p className="text-red-500 text-xs mt-1.5 animate-fade-in">⚠️ {newChatError}</p>
        )}
      </form>

      {/* Conversations */}
      <div className="rounded-3xl border overflow-hidden shadow-md"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i*60}ms` }}>
                <div className="skeleton w-12 h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 rounded-lg" style={{ width: '40%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '65%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-14 text-center">
            <div className="text-5xl mb-3 animate-pop-in">💬</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No messages yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Start a conversation by entering a username above,<br/>or visit someone's profile and click <strong>Message</strong>
            </p>
          </div>
        ) : (
          <div className="stagger divide-y" style={{ borderColor: 'var(--border)' }}>
            {conversations.map((c, i) => (
              <Link key={c.username} href={`/messages/${c.username}`}
                className="flex items-center gap-3.5 px-5 py-4 transition-all hover:bg-orange-50 dark:hover:bg-slate-700/30 group"
                style={{ animationDelay: `${i*55}ms`, display: 'flex' }}>

                {/* Avatar with unread badge */}
                <div className="relative shrink-0">
                  <Avatar url={c.avatar_url} username={c.username} size="md" />
                  {c.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pop-in"
                      style={{ background: '#ef4444', fontSize: 10 }}>
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold"
                      style={{ color: c.unread_count > 0 ? '#f97316' : 'var(--text-primary)' }}>
                      u/{c.username}
                    </span>
                    <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(c.last_message_time)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${c.unread_count > 0 ? 'font-medium' : ''}`}
                    style={{ color: c.unread_count > 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {c.is_mine ? 'You: ' : `${c.username}: `}{c.last_message}
                  </p>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ color: 'var(--text-muted)' }}>
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Helpful tip */}
      {!loading && (
        <p className="text-xs text-center mt-4 animate-fade-in" style={{ color: 'var(--text-muted)' }}>
          Tip: Visit any user's profile and click <strong>Message</strong> to start a chat
        </p>
      )}
    </div>
  );
}