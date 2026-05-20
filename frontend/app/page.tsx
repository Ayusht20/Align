'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import PostCard, { PostData } from '@/components/PostCard';

export default function HomePage() {
  const [posts,   setPosts]   = useState<PostData[]>([]);
  const [sort,    setSort]    = useState<'new'|'top'>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, [sort]);

  async function fetchPosts() {
    setLoading(true);
    try { const r = await api.get(`/api/posts/?sort=${sort}`); setPosts(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Feed */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <div className="rounded-2xl border px-4 py-2 flex items-center gap-2 mb-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-muted)' }}>SORT</span>
          {(['new','top'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                sort === s ? 'text-white shadow-sm scale-105' : 'hover:scale-105'
              }`}
              style={sort === s
                ? { background: 'linear-gradient(135deg,#f97316,#ec4899)' }
                : { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }
              }>
              {s === 'new' ? '🆕 New' : '🔥 Top'}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border p-4 flex gap-3 animate-fade-in"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${i*80}ms` }}>
                <div className="skeleton w-10 rounded-xl" style={{ height: 80 }} />
                <div className="flex-1 space-y-2.5 py-1">
                  <div className="skeleton h-4 rounded-lg" style={{ width: '70%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '45%' }} />
                  <div className="skeleton h-3 rounded-lg" style={{ width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border p-16 text-center animate-fade-in"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-5xl mb-3 animate-pop-in">📭</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Be the first to share something with the community</p>
            <Link href="/submit" className="btn-primary inline-block px-6">Create Post</Link>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {posts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-72 shrink-0 hidden lg:block space-y-4 sticky top-20">
        {/* Welcome card */}
        <div className="rounded-2xl border overflow-hidden animate-slide-left"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="h-14 bg-gradient-to-r from-orange-400 via-pink-500 to-indigo-500" />
          <div className="p-4">
<img src="/align.png" alt="Align"
  className="w-12 h-12 rounded-2xl -mt-9 mb-3 shadow-lg animate-pop-in bg-blue-50"
  style={{ objectFit: 'cover', objectPosition: 'center top' }} />
            <h2 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Home</h2>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
              Your personal Align feed. Join communities and share your thoughts.
            </p>
            <Link href="/submit" className="btn-primary block text-center mb-2 text-sm">✏️ Create Post</Link>
            <Link href="/communities/create"
              className="btn-secondary block text-center text-sm"
              style={{ display: 'block', textAlign: 'center' }}>
              🏘 Create Community
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}