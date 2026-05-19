'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Avatar from '@/components/Avatar';
import PostCard, { PostData } from '@/components/PostCard';

interface SearchResults {
  posts?: PostData[];
  communities?: { id: number; name: string; slug: string; description: string }[];
  users?: { id: number; username: string; bio: string | null; avatar_url: string | null }[];
}

type Tab = 'all' | 'posts' | 'communities' | 'users';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const initialQ     = searchParams.get('q') || '';

  const [query,   setQuery]   = useState(initialQ);
  const [tab,     setTab]     = useState<Tab>('all');
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await api.get(`/api/search/?q=${encodeURIComponent(q.trim())}`);
      setResults(r.data);
    } catch { setResults({}); }
    finally { setLoading(false); }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    doSearch(query);
  }

  const totalResults =
    (results.posts?.length || 0) +
    (results.communities?.length || 0) +
    (results.users?.length || 0);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all',         label: 'All',         count: totalResults },
    { key: 'posts',       label: 'Posts',       count: results.posts?.length || 0 },
    { key: 'communities', label: 'Communities', count: results.communities?.length || 0 },
    { key: 'users',       label: 'People',      count: results.users?.length || 0 },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search posts, communities, people..."
              className="input-base pl-11"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary px-6 shrink-0">Search</button>
        </div>
      </form>

      {/* Tabs */}
      {searched && (
        <div className="flex gap-1 mb-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all"
              style={tab === t.key ? {
                background: 'linear-gradient(135deg,#f97316,#ec4899)',
                color: 'white',
              } : { color: 'var(--text-secondary)' }}>
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border p-4 animate-fade-in"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${i*60}ms` }}>
              <div className="skeleton h-4 w-2/3 rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && searched && totalResults === 0 && (
        <div className="rounded-3xl border p-14 text-center animate-fade-in"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-5xl mb-3 animate-pop-in">🔍</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No results for "{initialQ}"</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Try different keywords or check spelling</p>
        </div>
      )}

      {/* Empty state before searching */}
      {!searched && !loading && (
        <div className="rounded-3xl border p-14 text-center animate-fade-in"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="text-5xl mb-3 animate-pop-in">🔍</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Search Align</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Find posts, communities and people</p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && totalResults > 0 && (
        <div className="space-y-6">

          {/* Posts */}
          {(tab === 'all' || tab === 'posts') && results.posts && results.posts.length > 0 && (
            <div className="animate-fade-in">
              {tab === 'all' && (
                <h2 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Posts</h2>
              )}
              <div className="space-y-3 stagger">
                {results.posts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)}
              </div>
            </div>
          )}

          {/* Communities */}
          {(tab === 'all' || tab === 'communities') && results.communities && results.communities.length > 0 && (
            <div className="animate-fade-in">
              {tab === 'all' && (
                <h2 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Communities</h2>
              )}
              <div className="space-y-2 stagger">
                {results.communities.map((c, i) => (
                  <Link key={c.id} href={`/r/${c.slug}`}
                    className="flex items-center gap-3.5 p-4 rounded-2xl border card-hover animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${i*55}ms` }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>a/{c.name}</p>
                      {c.description && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {(tab === 'all' || tab === 'users') && results.users && results.users.length > 0 && (
            <div className="animate-fade-in">
              {tab === 'all' && (
                <h2 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>People</h2>
              )}
              <div className="space-y-2 stagger">
                {results.users.map((u, i) => (
                  <Link key={u.id} href={`/user/${u.username}`}
                    className="flex items-center gap-3.5 p-4 rounded-2xl border card-hover animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${i*55}ms` }}>
                    <Avatar url={u.avatar_url} username={u.username} size="md" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>u/{u.username}</p>
                      {u.bio && (
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{u.bio}</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="skeleton h-12 rounded-2xl mb-6" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border p-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="skeleton h-4 w-2/3 rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}