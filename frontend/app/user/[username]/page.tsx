'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { isLoggedIn, getTokenPayload } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import PostCard, { PostData } from '@/components/PostCard';

interface Profile {
  id: number; username: string; bio: string | null;
  avatar_url: string | null; created_at: string;
  post_count: number; karma: number; posts: PostData[];
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router         = useRouter();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOwner,  setIsOwner]  = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [editing,    setEditing]    = useState(false);
  const [bio,        setBio]        = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError,   setBioError]   = useState('');

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError,   setAvatarError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    const logged = isLoggedIn();
    setLoggedIn(logged);
    if (logged) {
      const p = getTokenPayload();
      setIsOwner(p?.username === username);
    }
  }, [username]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const r = await api.get(`/api/users/${username}`);
      setProfile(r.data);
      setBio(r.data.bio || '');
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }

  async function saveBio() {
    if (bio.length > 300) { setBioError('Max 300 characters.'); return; }
    setBioLoading(true); setBioError('');
    try {
      await api.patch('/api/users/me/bio', { bio });
      setProfile(p => p ? { ...p, bio } : p);
      setEditing(false);
    } catch { setBioError('Failed to save. Try again.'); }
    finally { setBioLoading(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      setAvatarError('JPG, PNG, WEBP or GIF only.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Max 5MB.'); return; }
    setAvatarLoading(true); setAvatarError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.post('/api/users/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(p => p ? { ...p, avatar_url: r.data.avatar_url } : p);
    } catch { setAvatarError('Upload failed. Try again.'); }
    finally { setAvatarLoading(false); }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="rounded-3xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="skeleton" style={{ height: 128 }} />
        <div className="p-6 space-y-3">
          <div className="skeleton w-24 h-24 rounded-full" style={{ marginTop: -48 }} />
          <div className="skeleton h-6 w-40 rounded-xl" />
          <div className="skeleton h-4 w-64 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="text-center py-28 animate-fade-in">
      <div className="text-6xl mb-4 animate-pop-in">👤</div>
      <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>User not found</p>
      <Link href="/" className="text-orange-500 hover:underline text-sm mt-2 block">← Back to home</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="rounded-3xl border overflow-hidden shadow-md"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Banner */}
        <div style={{
          height: 128,
          background: 'linear-gradient(to right, #fb923c, #ec4899, #6366f1)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + buttons row */}
          <div className="flex items-end justify-between flex-wrap gap-3" style={{ marginTop: -56, marginBottom: 16 }}>
            <div className="relative group">
              <Avatar url={profile?.avatar_url} username={profile?.username || ''} size="xl" />
              {isOwner && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarLoading}
                    className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-white text-xs font-semibold gap-1 opacity-0 group-hover:opacity-100 transition-all"
                    style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                  >
                    {avatarLoading
                      ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><span style={{ fontSize: 20 }}>📷</span><span>Change</span></>}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Message button — logged-in users viewing someone else */}
              {loggedIn && !isOwner && (
                <button
                  onClick={() => router.push(`/messages/${profile?.username}`)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#ec4899)', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width={16} height={16}>
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Message
                </button>
              )}

              {/* Not logged in */}
              {!loggedIn && (
                <Link href="/login"
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Log in to message
                </Link>
              )}

              {/* Edit profile — owner only */}
              {isOwner && !editing && (
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2">
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>

          {avatarError && <p className="text-red-500 text-xs mb-3 animate-fade-in">⚠️ {avatarError}</p>}

          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            u/{profile?.username}
          </h1>

          {/* Stats */}
          <div className="flex gap-6 mb-4">
            {[
              { label: 'Karma',  value: profile?.karma ?? 0,      color: '#f97316' },
              { label: 'Posts',  value: profile?.post_count ?? 0, color: 'var(--text-primary)' },
              { label: 'Joined', value: profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—', color: 'var(--text-primary)' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          {editing ? (
            <div className="space-y-2 animate-fade-in">
              <textarea
                value={bio}
                onChange={e => { setBio(e.target.value); setBioError(''); }}
                placeholder="Tell the community about yourself..."
                maxLength={300} rows={3}
                className="input-base" style={{ resize: 'none' }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{bio.length}/300</span>
                {bioError && <span className="text-xs text-red-500">⚠️ {bioError}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setBio(profile?.bio || ''); }} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
                <button onClick={saveBio} disabled={bioLoading} className="btn-primary flex-1 py-2 text-sm">
                  {bioLoading ? 'Saving...' : '💾 Save Bio'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed"
              style={{ color: profile?.bio ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
              {profile?.bio || (isOwner
                ? '✏️ No bio yet — click Edit Profile to add one.'
                : 'This user has no bio yet.')}
            </p>
          )}
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Posts by u/{profile?.username}
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({profile?.post_count})</span>
        </h2>

        {profile?.posts.length === 0 ? (
          <div className="rounded-3xl border p-12 text-center animate-fade-in"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="text-5xl mb-3 animate-pop-in">📭</div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No posts yet</p>
            {isOwner && (
              <Link href="/submit" className="btn-primary inline-block mt-4 text-sm px-6">Create your first post</Link>
            )}
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {profile?.posts.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}