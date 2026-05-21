'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export interface PostData {
  id: number; title: string; content?: string; image_url?: string;
  post_type: string; community_id: number; author_username: string;
  created_at: string; vote_count: number; comment_count: number;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function PostCard({ post, index = 0 }: { post: PostData; index?: number }) {
  const [count,    setCount]    = useState(post.vote_count);
  const [userVote, setUserVote] = useState<'up'|'down'|null>(null);
  const [anim,     setAnim]     = useState<'up'|'down'|null>(null);

  useEffect(() => {
    // Subscribe to realtime vote changes for this post
    const channel = supabase
      .channel(`votes-post-${post.id}`)
      .on('postgres_changes', {
        event: '*',              // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'votes',
        filter: `post_id=eq.${post.id}`,
      }, async () => {
        // Refetch the post to get accurate vote count
        // We don't compute locally because multiple users could vote simultaneously
        try {
          const r = await api.get(`/api/posts/${post.id}`);
          setCount(r.data.vote_count);
        } catch {}
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [post.id]);

  async function vote(type: 'up'|'down') {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    try {
      await api.post('/api/votes/', { post_id: post.id, vote_type: type });
      setAnim(type); setTimeout(() => setAnim(null), 300);
      // Optimistic update — realtime will confirm with accurate count
      if (userVote === type) {
        setCount(c => type === 'up' ? c-1 : c+1); setUserVote(null);
      } else {
        const delta = type === 'up' ? 1 : -1;
        const undo  = userVote ? (userVote === 'up' ? -1 : 1) : 0;
        setCount(c => c + delta + undo); setUserVote(type);
      }
    } catch { console.error('vote failed'); }
  }

  return (
    <div
      className="card-hover rounded-2xl border overflow-hidden animate-fade-in"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${index * 55}ms` }}
    >
      <div className="flex">
        {/* Vote column */}
        <div className="flex flex-col items-center px-3 py-4 gap-1.5 select-none shrink-0"
          style={{ backgroundColor: 'var(--bg-secondary)', minWidth: 48 }}>
          <button onClick={() => vote('up')}
            className={`text-lg transition-all hover:scale-125 active:scale-95 ${anim === 'up' ? 'animate-vote-up' : ''}`}
            style={{ color: userVote === 'up' ? '#f97316' : 'var(--text-muted)' }}>▲</button>
          <span className="text-xs font-bold tabular-nums transition-all duration-300"
            style={{ color: count > 0 ? '#f97316' : count < 0 ? '#6366f1' : 'var(--text-muted)' }}>
            {count}
          </span>
          <button onClick={() => vote('down')}
            className={`text-lg transition-all hover:scale-125 active:scale-95 ${anim === 'down' ? 'animate-vote-down' : ''}`}
            style={{ color: userVote === 'down' ? '#6366f1' : 'var(--text-muted)' }}>▼</button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center gap-1.5 text-xs mb-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
            <Link href={`/user/${post.author_username}`}
              className="font-semibold hover:text-orange-500 transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              u/{post.author_username}
            </Link>
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
            {post.post_type !== 'text' && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ml-1 ${
                post.post_type === 'image'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>{post.post_type}</span>
            )}
          </div>

          <Link href={`/post/${post.id}`}>
            <h2 className="text-sm font-semibold leading-snug mb-2 hover:text-orange-500 transition-colors"
              style={{ color: 'var(--text-primary)' }}>
              {post.title}
            </h2>
          </Link>

          {post.post_type === 'image' && post.image_url && (
            <Link href={`/post/${post.id}`}>
              <img src={post.image_url} alt={post.title}
                className="rounded-xl max-h-60 w-full object-cover mb-2 hover:opacity-95 transition-opacity" />
            </Link>
          )}

          {post.post_type === 'text' && post.content && (
            <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
              {post.content}
            </p>
          )}

          <Link href={`/post/${post.id}`}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all hover:bg-orange-50 dark:hover:bg-orange-900/10 hover:text-orange-500"
            style={{ color: 'var(--text-muted)' }}>
            💬 {post.comment_count} comments
          </Link>
        </div>
      </div>
    </div>
  );
}