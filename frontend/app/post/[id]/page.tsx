'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { isLoggedIn, getTokenPayload } from '@/lib/auth';

interface Post {
  id: number; title: string; content: string; post_type: string;
  image_url: string; link_url: string; author_username: string;
  created_at: string; vote_count: number; comment_count: number;
}
interface Comment {
  id: number; content: string; author_username: string; created_at: string;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function PostPage() {
  const { id } = useParams();
  const router = useRouter();
  const [post,      setPost]      = useState<Post | null>(null);
  const [comments,  setComments]  = useState<Comment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [newComment,setNewComment]= useState('');
  const [submitting,setSubmitting]= useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [userVote,  setUserVote]  = useState<'up'|'down'|null>(null);
  const [voteAnim,  setVoteAnim]  = useState<'up'|'down'|null>(null);
  const [deletingId,setDeletingId]= useState<number|null>(null);
  const [error,     setError]     = useState('');
  const currentUsername = getTokenPayload()?.username || '';

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const [postRes, commentRes] = await Promise.all([
        api.get(`/api/posts/${id}`),
        api.get(`/api/comments/post/${id}`),
      ]);
      setPost(postRes.data); setVoteCount(postRes.data.vote_count);
      setComments(commentRes.data);
    } catch { setError('Post not found.'); }
    finally { setLoading(false); }
  }

  async function handleVote(type: 'up'|'down') {
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    try {
      await api.post('/api/votes/', { post_id: Number(id), vote_type: type });
      setVoteAnim(type); setTimeout(() => setVoteAnim(null), 300);
      if (userVote === type) { setVoteCount(c => type==='up'?c-1:c+1); setUserVote(null); }
      else { setVoteCount(c => c + (type==='up'?1:-1) + (userVote?(userVote==='up'?-1:1):0)); setUserVote(type); }
    } catch {}
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn()) { window.location.href = '/login'; return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const r = await api.post('/api/comments/', { content: newComment, post_id: Number(id) });
      setComments(p => [...p, r.data]); setNewComment('');
    } catch { setError('Failed to post comment.'); }
    finally { setSubmitting(false); }
  }

  async function deleteComment(cid: number) {
    setDeletingId(cid);
    try { await api.delete(`/api/comments/${cid}`); setComments(p => p.filter(c => c.id !== cid)); }
    catch { alert('Failed to delete comment.'); }
    finally { setDeletingId(null); }
  }

  async function deletePost() {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    try { await api.delete(`/api/posts/${id}`); router.push('/'); }
    catch { alert('Failed to delete post.'); }
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[80, 48, 32].map((h, i) => (
        <div key={i} className="skeleton rounded-2xl" style={{ height: h * 2 }} />
      ))}
    </div>
  );

  if (error || !post) return (
    <div className="text-center py-24 animate-fade-in">
      <div className="text-6xl mb-4 animate-pop-in">😕</div>
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{error || 'Post not found.'}</p>
      <Link href="/" className="text-orange-500 hover:underline text-sm mt-2 block">← Back to home</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Post */}
      <div className="rounded-3xl border overflow-hidden shadow-md"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex">
          {/* Vote */}
          <div className="flex flex-col items-center px-4 py-6 gap-2 select-none shrink-0"
            style={{ backgroundColor: 'var(--bg-secondary)', minWidth: 52 }}>
            <button onClick={() => handleVote('up')}
              className={`text-2xl transition-all hover:scale-125 active:scale-90 ${voteAnim==='up'?'animate-vote-up':''}`}
              style={{ color: userVote==='up'?'#f97316':'var(--text-muted)' }}>▲</button>
            <span className="text-sm font-bold tabular-nums"
              style={{ color: voteCount>0?'#f97316':voteCount<0?'#6366f1':'var(--text-muted)' }}>
              {voteCount}
            </span>
            <button onClick={() => handleVote('down')}
              className={`text-2xl transition-all hover:scale-125 active:scale-90 ${voteAnim==='down'?'animate-vote-down':''}`}
              style={{ color: userVote==='down'?'#6366f1':'var(--text-muted)' }}>▼</button>
          </div>

          {/* Content */}
          <div className="flex-1 p-5 min-w-0">
            <div className="flex items-center gap-2 text-xs mb-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
              <Link href={`/user/${post.author_username}`}
                className="font-semibold hover:text-orange-500 transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                u/{post.author_username}
              </Link>
              <span>·</span><span>{timeAgo(post.created_at)}</span>
            </div>

            <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{post.title}</h1>

            {post.post_type==='text' && post.content && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{post.content}</p>
            )}
            {post.post_type==='image' && post.image_url && (
              <img src={post.image_url} alt={post.title} className="rounded-2xl w-full object-cover mb-3 max-h-[28rem] shadow" />
            )}
            {post.post_type==='link' && post.link_url && (
              <a href={post.link_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all mb-3 block">🔗 {post.link_url}</a>
            )}

            <div className="flex items-center justify-between gap-3 text-xs pt-3 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span>💬 {comments.length} comments</span>
              {currentUsername === post.author_username && (
                <button onClick={deletePost}
                  className="flex items-center gap-1 text-red-400 hover:text-red-600 px-2.5 py-1 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:scale-105 active:scale-95 font-medium">
                  🗑 Delete Post
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment form */}
      <div className="rounded-3xl border p-5 shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {isLoggedIn() ? (
          <form onSubmit={submitComment} className="space-y-3">
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3} className="input-base" style={{ resize: 'none' }} />
            <div className="flex justify-end">
              <button type="submit" disabled={submitting || !newComment.trim()} className="btn-primary px-6 py-2 text-sm">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Posting...
                  </span>
                ) : 'Comment'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            <Link href="/login" className="text-orange-500 hover:underline font-semibold">Log in</Link> to leave a comment.
          </p>
        )}
      </div>

      {/* Comments */}
      <div className="space-y-3 stagger">
        {comments.length === 0 ? (
          <div className="rounded-3xl border p-10 text-center animate-fade-in"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-4xl mb-2 animate-pop-in">💬</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No comments yet — start the conversation!</p>
          </div>
        ) : comments.map((c, i) => (
          <div key={c.id}
            className="rounded-3xl border px-5 py-4 transition-all animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)',
              animationDelay: `${i*50}ms`,
              opacity: deletingId === c.id ? 0.4 : 1,
              transform: deletingId === c.id ? 'scale(0.98)' : 'scale(1)',
            }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Link href={`/user/${c.author_username}`}
                  className="font-semibold hover:text-orange-500 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  u/{c.author_username}
                </Link>
                <span>·</span><span>{timeAgo(c.created_at)}</span>
              </div>
              {currentUsername === c.author_username && (
                <button onClick={() => deleteComment(c.id)} disabled={deletingId === c.id}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40">
                  {deletingId === c.id ? '...' : '🗑 Delete'}
                </button>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}