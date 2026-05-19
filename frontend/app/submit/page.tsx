'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

interface Community { id: number; name: string; slug: string; }
type PostType = 'text' | 'image' | 'link';

export default function SubmitPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [postType,    setPostType]    = useState<PostType>('text');
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [preview,     setPreview]     = useState('');
  const [form,        setForm]        = useState({ title: '', content: '', link_url: '', community_id: '' });
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [uploadProg,  setUploadProg]  = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    api.get('/api/communities/').then(r => setCommunities(r.data)).catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value }); setError('');
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    if (!allowed.includes(file.type)) { setError('Only JPG, PNG, WEBP or GIF allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim())    { setError('Title is required.'); return; }
    if (!form.community_id)    { setError('Please select a community.'); return; }
    if (postType === 'image' && !imageFile) { setError('Please select an image.'); return; }
    if (postType === 'link' && !form.link_url.trim()) { setError('Please enter a URL.'); return; }

    setLoading(true); setUploadProg(0);
    try {
      let imageUrl = '';
      if (postType === 'image' && imageFile) {
        setUploadProg(30);
        const fd = new FormData(); fd.append('file', imageFile);
        const r = await api.post('/api/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        imageUrl = r.data.url;
        setUploadProg(70);
      }

      const payload: any = { title: form.title, post_type: postType, community_id: Number(form.community_id) };
      if (postType === 'text')  payload.content   = form.content;
      if (postType === 'image') payload.image_url = imageUrl;
      if (postType === 'link')  payload.link_url  = form.link_url;

      setUploadProg(90);
      const r = await api.post('/api/posts/', payload);
      setUploadProg(100);
      router.push(`/post/${r.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create post.');
      setUploadProg(0);
    } finally { setLoading(false); }
  }

  const tabs: PostType[] = ['text', 'image', 'link'];
  const tabIcons = { text: '📝', image: '🖼', link: '🔗' };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Create a Post</h1>

      <div className="rounded-3xl border overflow-hidden shadow-lg"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {/* Type tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setPostType(t)}
              className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all border-b-2 ${
                postType === t ? 'border-orange-500 text-orange-500' : 'border-transparent hover:bg-orange-50 dark:hover:bg-orange-900/10'
              }`}
              style={{ color: postType === t ? '#f97316' : 'var(--text-muted)' }}>
              <span>{tabIcons[t]}</span>
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          {/* Community */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Community</label>
            <select name="community_id" value={form.community_id} onChange={handleChange} className="input-base">
              <option value="">Choose a community...</option>
              {communities.map(c => <option key={c.id} value={c.id}>a/{c.name}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="An interesting title..." maxLength={300} className="input-base" />
            <p className="text-xs text-right mt-1" style={{ color: 'var(--text-muted)' }}>{form.title.length}/300</p>
          </div>

          {/* Dynamic body */}
          {postType === 'text' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Body <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <textarea name="content" value={form.content} onChange={handleChange}
                placeholder="Share your thoughts..." rows={5}
                className="input-base" style={{ resize: 'none' }} />
            </div>
          )}

          {postType === 'image' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Image</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:scale-[1.01] ${
                  preview ? 'border-orange-400' : 'hover:border-orange-400'
                }`}
                style={{ borderColor: preview ? '#f97316' : 'var(--border)' }}
              >
                {preview ? (
                  <img src={preview} alt="preview" className="max-h-52 mx-auto rounded-xl object-cover shadow" />
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Click to upload an image</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPG, PNG, WEBP, GIF · Max 5MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFile} className="hidden" />
              {preview && (
                <button type="button" onClick={() => { setPreview(''); setImageFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-xs text-red-500 mt-2 hover:underline">
                  ✕ Remove image
                </button>
              )}
            </div>
          )}

          {postType === 'link' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>URL</label>
              <input type="url" name="link_url" value={form.link_url} onChange={handleChange}
                placeholder="https://example.com" className="input-base" />
            </div>
          )}

          {/* Upload progress bar */}
          {loading && uploadProg > 0 && (
            <div className="rounded-full overflow-hidden h-1.5" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full bg-gradient-to-r from-orange-400 to-pink-500 transition-all duration-500 rounded-full"
                style={{ width: `${uploadProg}%` }} />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  {postType === 'image' ? 'Uploading...' : 'Posting...'}
                </span>
              ) : 'Post to Align'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}