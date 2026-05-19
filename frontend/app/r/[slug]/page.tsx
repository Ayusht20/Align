'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';

interface Community {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  post_type: string;
  community_id: number;
  author_username: string;
  created_at: string;
  vote_count: number;
  comment_count: number;
}

export default function CommunityPage() {
  const { slug } = useParams();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [slug]);

  useEffect(() => {
    if (community) fetchPosts();
  }, [community, sort]);

  async function fetchCommunity() {
    try {
      const res = await api.get(`/api/communities/${slug}`);
      setCommunity(res.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPosts() {
    try {
      const res = await api.get(`/api/posts/community/${slug}?sort=${sort}`);
      setPosts(res.data);
    } catch {
      console.error('Failed to fetch posts');
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-3">
      <div className="h-24 bg-gray-200 rounded-xl" />
      <div className="h-16 bg-gray-100 rounded-xl" />
    </div>
  );

  if (notFound) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Community not found.</p>
      <Link href="/" className="text-orange-500 hover:underline text-sm mt-2 block">
        ← Back to home
      </Link>
    </div>
  );

  return (
    <div>
      {/* Community header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">a/{community?.name}</h1>
            {community?.description && (
              <p className="text-sm text-gray-500 mt-1">{community.description}</p>
            )}
          </div>
          <Link
            href={`/submit?community=${community?.id}`}
            className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + Post
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Posts */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 mr-1">Sort:</span>
            {(['new', 'top'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-sm px-3 py-1 rounded-full capitalize transition ${
                  sort === s
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {posts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No posts yet in this community.</p>
              <Link href="/submit" className="mt-2 inline-block text-sm text-orange-500 hover:underline">
                Create the first post →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 hidden md:block">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-2">About this community</h3>
            <p className="text-sm text-gray-500 mb-3">
              {community?.description || 'No description provided.'}
            </p>
            <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              Created {new Date(community?.created_at || '').toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}