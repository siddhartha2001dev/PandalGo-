import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, MessageSquarePlus, Filter, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { api } from '../lib/api.js';
import { PostCard } from '../components/posts/PostCard.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

const LOCALITIES = [
  'All Localities',
  'North Kolkata',
  'Central Kolkata',
  'South Kolkata',
  'Lake Town',
  'Kalyani',
  'Naihati',
  'Barrackpore',
  'Sodepur',
  'Halisahar',
];

const CATEGORIES = [
  'All Categories',
  'Puja Experience',
  'Pandal Photography',
  'Pandal Discovery',
  'Crowd Update',
  'New Pandal Suggestion',
];

export function CommunityFeedPage() {
  const [selectedLocality, setSelectedLocality] = useState('All Localities');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['posts-feed', selectedLocality, selectedCategory, page],
    queryFn: async () => {
      const params = { page, limit: 10 };
      if (selectedLocality !== 'All Localities') params.locality = selectedLocality;
      if (selectedCategory !== 'All Categories') params.category = selectedCategory;

      const res = await api.get('/posts', { params });
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const posts = data?.posts || [];
  const totalPages = data?.totalPages || 1;

  const handleDeletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${id}`);
        refetch();
      } catch (err) {
        alert(err.message || 'Failed to delete post.');
      }
    }
  };

  return (
    <Layout maxWidth="4xl" className="space-y-6">
      {/* Header Banner */}
      <ComponentLayout variant="banner" padding="relaxed" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EBDD] dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-xs font-semibold text-stone-800 dark:text-stone-200">
            <MessageSquare className="w-3.5 h-3.5 text-[#C74732]" />
            <span>Pandal Hopper Experiences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">Community Feed</h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Real stories, authentic photographs, and live crowd updates from fellow festival lovers.
          </p>
        </div>

        <Link
          to="/create-post"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Share Your Story</span>
        </Link>
      </ComponentLayout>

      {/* Filter Bar */}
      <ComponentLayout padding="compact" className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLocality}
            onChange={(e) => {
              setSelectedLocality(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#F4EBDD]/70 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] font-semibold text-stone-800 dark:text-stone-200 focus:outline-none"
          >
            {LOCALITIES.map((loc) => (
              <option key={loc} value={loc} className="dark:bg-[#1E1A17] dark:text-stone-100">
                {loc}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#F4EBDD]/70 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] font-semibold text-stone-800 dark:text-stone-200 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="dark:bg-[#1E1A17] dark:text-stone-100">
                {cat}
              </option>
            ))}
          </select>
        </div>

        <span className="text-stone-500 dark:text-stone-400 font-semibold">
          {data?.total || 0} Total Community Posts
        </span>
      </ComponentLayout>

      {/* Posts Stream */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl h-56 animate-pulse border border-[#E8DEC8] dark:border-[#3A322B]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-3xl p-12 border border-[#E8DEC8] dark:border-[#3A322B] text-center space-y-3 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#F4EBDD] dark:bg-[#2A2420] text-stone-500 flex items-center justify-center mx-auto border border-[#E8DEC8] dark:border-[#3A322B]">
            <Camera className="w-6 h-6 text-[#B58B45]" />
          </div>
          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">No posts in this category yet</h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
            Be the first pandal hopper to share a photograph and observation for this locality!
          </p>
          <Link
            to="/create-post"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-xs shadow-md mt-2 transition-colors"
          >
            Create First Post
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 disabled:opacity-40 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-200 disabled:opacity-40 flex items-center gap-1 transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Layout>
  );
}
