'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/context/ThemeContext';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

export default function Navbar() {
  const { theme, toggle }                  = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [unreadMsgs,  setUnreadMsgs]  = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);

  const menuRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('scroll', onScroll);
    document.addEventListener('mousedown', onClickOutside);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClickOutside); };
  }, []);

  // Realtime unread counts
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCounts = async () => {
      try {
        const [msgRes, notifRes] = await Promise.all([
          api.get('/api/messages/unread-count'),
          api.get('/api/notifications/unread-count'),
        ]);
        setUnreadMsgs(msgRes.data.unread);
        setUnreadNotif(notifRes.data.unread);
      } catch {}
    };
    fetchCounts();

    // Realtime push for both messages and notifications
    const channel = supabase
      .channel('navbar-counts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery('');
  }

  function getAvatarStyle(username: string) {
    const gradients = [
      ['#fb923c','#ec4899'], ['#60a5fa','#6366f1'],
      ['#4ade80','#14b8a6'], ['#c084fc','#ec4899'],
    ];
    const [from, to] = gradients[username.charCodeAt(0) % gradients.length];
    return { background: `linear-gradient(135deg, ${from}, ${to})` };
  }

  const Badge = ({ count }: { count: number }) => count === 0 ? null : (
    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white font-bold flex items-center justify-center animate-pop-in"
      style={{ background: '#ef4444', fontSize: 9 }}>
      {count > 9 ? '9+' : count}
    </span>
  );

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
      }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-all group-hover:scale-110 group-hover:rotate-6"
            style={{ background: 'linear-gradient(135deg,#fb923c,#ec4899)' }}>A</div>
          <span className="text-lg font-bold hidden sm:block" style={{ color: 'var(--text-primary)' }}>Align</span>
        </Link>

        {/* Search bar — desktop */}
        <form onSubmit={handleSearch} className="flex-1 max-w-sm hidden md:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Align..."
              className="w-full rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </form>

        {/* Spacer */}
        <div className="flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">

          {/* Mobile search toggle */}
          <button onClick={() => { setSearchOpen(o => !o); setTimeout(() => searchRef.current?.focus(), 50); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 md:hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <button onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
                <circle cx="12" cy="12" r="5" strokeWidth="2"/>
                <path strokeWidth="2" strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
                <path strokeWidth="2" strokeLinecap="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>

          {isAuthenticated && user ? (
            <>
              {/* Notifications bell */}
              <Link href="/notifications"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <Badge count={unreadNotif} />
              </Link>

              {/* Messages */}
              <Link href="/messages"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <Badge count={unreadMsgs} />
              </Link>

              {/* New post */}
              <Link href="/submit"
                className="hidden sm:flex items-center gap-1 text-sm font-semibold px-3.5 py-1.5 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' }}>
                <span className="text-base leading-none">+</span> Post
              </Link>

              {/* Avatar dropdown */}
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-all hover:scale-110 active:scale-95 ${menuOpen ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
                  style={getAvatarStyle(user.username)}>
                  {user.username[0].toUpperCase()}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 w-52 rounded-2xl shadow-2xl border py-2 animate-scale-in z-50 overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="px-4 py-2 mb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>u/{user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Signed in</p>
                    </div>

                    {[
                      { href: `/user/${user.username}`, icon: '👤', label: 'My Profile' },
                      { href: '/notifications',          icon: '🔔', label: 'Notifications', badge: unreadNotif },
                      { href: '/messages',               icon: '💬', label: 'Messages',      badge: unreadMsgs },
                      { href: '/submit',                 icon: '✏️', label: 'New Post',      mobileOnly: true },
                      { href: '/communities/create',     icon: '🏘', label: 'New Community' },
                    ].map(item => (
                      <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 dark:hover:bg-slate-700/50 ${item.mobileOnly ? 'sm:hidden' : ''}`}
                        style={{ color: 'var(--text-primary)' }}>
                        <span className="flex items-center gap-3"><span>{item.icon}</span>{item.label}</span>
                        {item.badge ? (
                          <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                            style={{ background: '#ef4444' }}>{item.badge > 9 ? '9+' : item.badge}</span>
                        ) : null}
                      </Link>
                    ))}

                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
                    <button onClick={() => { setMenuOpen(false); signOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:scale-105"
                style={{ color: 'var(--text-secondary)' }}>Log in</Link>
              <Link href="/signup"
                className="text-sm font-semibold px-4 py-1.5 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile search bar — slides down */}
      {searchOpen && (
        <div className="px-4 pb-3 md:hidden animate-fade-in">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: 'var(--text-muted)' }}>
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Align..."
                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </form>
        </div>
      )}
    </nav>
  );
}