'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { useAuth } from '@/app/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value }); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Both fields are required.'); return; }
    setLoading(true);
    try {
      // refreshAuth passed as onSuccess — Navbar updates instantly
      await login(form.email, form.password, refreshAuth);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="rounded-3xl border overflow-hidden shadow-2xl"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div style={{ height: 6, background: 'linear-gradient(to right, #fb923c, #ec4899, #6366f1)' }} />

          <div className="p-8">
            <div className="flex justify-center mb-6">
              <img src="/align.png" alt="Align"
                className="w-14 h-14 rounded-2xl object-cover shadow-lg animate-pop-in" />
            </div>

            <h1 className="text-2xl font-bold text-center mb-1" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              Log in to your Align account
            </p>

            {error && (
              <div className="mb-4 border text-sm rounded-xl px-4 py-3 animate-fade-in"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="Your password" className="input-base" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Logging in...
                  </span>
                ) : 'Log in'}
              </button>
            </form>

            <p className="text-center text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-orange-500 hover:underline font-semibold">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}