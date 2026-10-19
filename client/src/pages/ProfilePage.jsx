import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  LogOut,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PostCard } from '../components/posts/PostCard.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contributions'); // 'contributions' | 'posts'

  const { data: contributionsData, isLoading: contribsLoading, refetch: refetchContribs } = useQuery({
    queryKey: ['my-contributions'],
    queryFn: async () => {
      const res = await api.get('/contributions/mine');
      return res.data;
    },
    enabled: Boolean(user),
  });

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['my-posts'],
    queryFn: async () => {
      const res = await api.get('/posts/mine');
      return res.data;
    },
    enabled: Boolean(user),
  });

  const contributions = contributionsData?.contributions || [];
  const posts = postsData?.posts || [];

  if (!user) {
    return (
      <Layout maxWidth="md" centered>
        <ComponentLayout padding="normal" className="text-center space-y-4">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Please Log In</h2>
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 rounded-xl bg-festival-600 text-white font-bold text-xs"
          >
            Sign In
          </Link>
        </ComponentLayout>
      </Layout>
    );
  }

  const handleDeletePost = async (id) => {
    if (window.confirm('Delete this post?')) {
      await api.delete(`/posts/${id}`);
      refetchPosts();
    }
  };

  const statusBadge = (status, reason) => {
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50"
          title={reason || 'Submission rejected'}
        >
          <XCircle className="w-3.5 h-3.5" /> Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
        <Clock className="w-3.5 h-3.5" /> Pending Review
      </span>
    );
  };

  return (
    <Layout maxWidth="5xl" className="space-y-8">
      {/* Profile Header Card */}
      <ComponentLayout padding="relaxed" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white font-serif font-bold text-2xl flex items-center justify-center shadow-lg shadow-[#C74732]/25 border border-white/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">{user.name}</h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F4EBDD] dark:bg-[#2A2420] text-stone-800 dark:text-stone-200 capitalize border border-[#E8DEC8] dark:border-[#3A322B]">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#B58B45]" /> {user.email}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors flex items-center gap-1.5 self-end sm:self-center"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </ComponentLayout>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E8DEC8] dark:border-[#3A322B] pb-2">
        <button
          onClick={() => setActiveTab('contributions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'contributions'
              ? 'bg-[#C74732] text-white shadow-md'
              : 'text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>My Pandal Suggestions ({contributions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'posts'
              ? 'bg-[#C74732] text-white shadow-md'
              : 'text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>My Community Posts ({posts.length})</span>
        </button>
      </div>

      {/* Tab 1: Pandal Suggestions */}
      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Track the verification status of Durga Puja pandals you suggested for public map discovery.
            </p>
            <Link
              to="/add-puja"
              className="text-xs font-bold text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] hover:underline flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Suggest Another
            </Link>
          </div>

          {contribsLoading ? (
            <div className="h-40 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl animate-pulse border border-[#E8DEC8] dark:border-[#3A322B]" />
          ) : contributions.length === 0 ? (
            <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-3xl p-8 border border-[#E8DEC8] dark:border-[#3A322B] text-center space-y-3 transition-colors">
              <p className="text-xs text-stone-600 dark:text-stone-400">You haven't suggested any new pandals yet.</p>
              <Link
                to="/add-puja"
                className="inline-block px-4 py-2 bg-[#C74732] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition-colors"
              >
                Suggest a Pandal
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map((puja) => (
                <div
                  key={puja._id}
                  className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-4 sm:p-5 border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">{puja.name}</h3>
                      {statusBadge(puja.status, puja.rejectionReason)}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C74732]" />
                      {puja.address}, {puja.locality}
                    </p>
                    {puja.status === 'rejected' && puja.rejectionReason && (
                      <p className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg mt-1 font-medium">
                        Reason: {puja.rejectionReason}
                      </p>
                    )}
                  </div>

                  {puja.status === 'approved' && (
                    <Link
                      to={`/puja/${puja.slug}`}
                      className="px-4 py-2 rounded-xl bg-[#F4EBDD] dark:bg-[#2A2420] hover:bg-[#EAE0D0] dark:hover:bg-[#342D28] text-stone-800 dark:text-stone-200 font-bold text-xs flex items-center gap-1 shrink-0 border border-[#E8DEC8] dark:border-[#3A322B] transition-colors"
                    >
                      <span>View Public Pandal</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Community Posts */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Photographs, impressions, and crowd updates you've shared.
            </p>
            <Link
              to="/create-post"
              className="text-xs font-bold text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] hover:underline flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Create New Post
            </Link>
          </div>

          {postsLoading ? (
            <div className="h-40 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl animate-pulse border border-[#E8DEC8] dark:border-[#3A322B]" />
          ) : posts.length === 0 ? (
            <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-3xl p-8 border border-[#E8DEC8] dark:border-[#3A322B] text-center space-y-3 transition-colors">
              <p className="text-xs text-stone-600 dark:text-stone-400">You haven't published any community posts yet.</p>
              <Link
                to="/create-post"
                className="inline-block px-4 py-2 bg-[#C74732] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl transition-colors"
              >
                Share an Experience
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
