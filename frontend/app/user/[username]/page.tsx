'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { isLoggedIn, getTokenPayload } from '@/lib/auth';
import Avatar from '@/components/Avatar';

interface Message {
  id: number;
  content: string;
  sender_username: string;
  receiver_username: string;
  created_at: string;
  is_mine: boolean;
}

interface OtherUser {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  id: number;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateLabel(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function ChatPage() {
  const { username }  = useParams<{ username: string }>();
  const router        = useRouter();
  const payload       = getTokenPayload();
  const currentUser   = payload?.username || '';
  const currentUserId = payload?.sub || '';

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  // Start as true — never flash "not found" before data loads
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [connected, setConnected] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Guard: redirect to login if not authenticated
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    // Guard: prevent messaging yourself
// Safely prevent messaging yourself if both values are valid
    if (username && currentUser && username === currentUser) {
      router.push('/messages');
      return;
    }
    loadData();

    return () => {
      if (channelRef.current) {
        try {
          // Cleanup supabase channel if it exists
          channelRef.current.unsubscribe?.();
        } catch {}
      }
    };
  }, [username]);

  async function loadData() {
    setLoading(true);
    setNotFound(false);
    try {
      // Fetch user profile and conversation in parallel
      const [userRes, msgRes] = await Promise.all([
        api.get(`/api/users/${username}`),
        api.get(`/api/messages/conversation/${username}`),
      ]);
      setOtherUser(userRes.data);
      setMessages(msgRes.data);

      // Try to set up realtime if supabase is available
      setupRealtime(userRes.data.id);
    } catch (err: any) {
      // Only show not found if it's actually a 404
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        // For auth errors or network issues, retry once after a short delay
        setTimeout(async () => {
          try {
            const [userRes, msgRes] = await Promise.all([
              api.get(`/api/users/${username}`),
              api.get(`/api/messages/conversation/${username}`),
            ]);
            setOtherUser(userRes.data);
            setMessages(msgRes.data);
            setupRealtime(userRes.data.id);
          } catch {
            setNotFound(true);
          }
        }, 800);
      }
    } finally {
      setLoading(false);
    }
  }

  function setupRealtime(otherUserId: number) {
    // Gracefully skip if supabase env vars not set yet
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setConnected(false);
      return;
    }
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      const myId = parseInt(currentUserId);
      const channel = supabase
        .channel(`chat:${Math.min(myId, otherUserId)}-${Math.max(myId, otherUserId)}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${otherUserId}`,
        }, (payload: any) => {
          const row = payload.new;
          if (row.receiver_id !== myId) return;
          setMessages(prev => {
            if (prev.some(m => m.id === row.id)) return prev;
            return [...prev, {
              id: row.id,
              content: row.content,
              sender_username: username,
              receiver_username: currentUser,
              created_at: row.created_at,
              is_mine: false,
            }];
          });
        })
        .subscribe((status: string) => {
          setConnected(status === 'SUBSCRIBED');
        });
      channelRef.current = channel;
    } catch {
      // Supabase not available — silent fallback, chat still works
      setConnected(false);
    }
  }

  // Auto scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      content,
      sender_username: currentUser,
      receiver_username: username,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      const r = await api.post('/api/messages/', { receiver_username: username, content });
      setMessages(prev => prev.map(m => m.id === tempId ? r.data : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // Build rendered list with date separators
  const rendered: Array<{ type: 'date'; label: string } | { type: 'msg'; msg: Message }> = [];
  let lastDate = '';
  for (const msg of messages) {
    const label = getDateLabel(msg.created_at);
    if (label !== lastDate) { rendered.push({ type: 'date', label }); lastDate = label; }
    rendered.push({ type: 'msg', msg });
  }

  // ── Loading state ──
  if (loading) return (
    <div className="max-w-2xl mx-auto animate-fade-in" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="h-full flex flex-col rounded-3xl border overflow-hidden shadow-lg"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton h-3 w-20 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {[40, 60, 35, 70, 50].map((w, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <div className="skeleton rounded-2xl" style={{ width: `${w}%`, height: 44 }} />
            </div>
          ))}
        </div>
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="skeleton h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  );

  // ── Not found ──
  if (notFound) return (
    <div className="text-center py-24 animate-fade-in">
      <div className="text-6xl mb-4 animate-pop-in">👤</div>
      <p className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
        User &quot;{username}&quot; not found
      </p>
      <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        Make sure the username is correct and they have an Align account.
      </p>
      <Link href="/messages"
        className="btn-primary inline-block px-6 text-sm">
        ← Back to messages
      </Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto animate-fade-in" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="h-full flex flex-col rounded-3xl border overflow-hidden shadow-lg"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* ── Header ── */}
        <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <Link href="/messages"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 shrink-0"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>

          <Link href={`/user/${otherUser?.username}`}
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar url={otherUser?.avatar_url} username={otherUser?.username || ''} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                u/{otherUser?.username}
              </p>
              {otherUser?.bio && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{otherUser.bio}</p>
              )}
            </div>
          </Link>

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full transition-colors"
              style={{
                backgroundColor: connected ? '#4ade80' : 'var(--text-muted)',
                boxShadow: connected ? '0 0 6px #4ade80' : 'none',
              }} />
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              {connected ? 'Live' : 'Connected'}
            </span>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
          style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {rendered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
              <Avatar url={otherUser?.avatar_url} username={otherUser?.username || ''} size="lg" className="mb-4" />
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                u/{otherUser?.username}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Say hello! This is the start of your conversation.
              </p>
            </div>
          ) : rendered.map((item, i) => {
            if (item.type === 'date') return (
              <div key={`d-${i}`} className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
                <span className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {item.label}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              </div>
            );

            const { msg } = item;
            const isMine  = msg.is_mine;

            return (
              <div key={msg.id}
                className={`flex items-end gap-2 animate-fade-in ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <Avatar url={otherUser?.avatar_url} username={username} size="xs" className="mb-1 shrink-0" />
                )}
                <div className="max-w-[72%] group">
                  <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm"
                    style={isMine ? {
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      color: 'white',
                      borderBottomRightRadius: 4,
                    } : {
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                      borderBottomLeftRadius: 4,
                    }}>
                    {msg.content}
                  </div>
                  <p className={`text-xs mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'text-right' : ''}`}
                    style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
                {isMine && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}>
                    {currentUser[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              maxLength={1000}
              className="flex-1 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                resize: 'none',
                maxHeight: 120,
              }}
            />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-40 shadow-md shrink-0"
              style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}>
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              )}
            </button>
          </form>
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
            {input.length}/1000 · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}