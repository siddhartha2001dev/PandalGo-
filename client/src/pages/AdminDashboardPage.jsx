import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  Filter,
  ShieldCheck,
  Download,
  Search,
  PlusCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

export function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'pujas' | 'moderation'

  // Reject modal state
  const [rejectingPuja, setRejectingPuja] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit pandal modal state
  const [editingPuja, setEditingPuja] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Auto-import and OpenStreetMap discovery state
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState(null);
  const [osmQuery, setOsmQuery] = useState('');
  const [osmCategory, setOsmCategory] = useState('Theme / Contemporary');
  const [isOsmSearching, setIsOsmSearching] = useState(false);
  const [osmResultMessage, setOsmResultMessage] = useState(null);

  // 1. Fetch pending pandal suggestions with duplicate inspection
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['admin-pending-contributions'],
    queryFn: async () => {
      const res = await api.get('/admin/contributions');
      return res.data;
    },
    enabled: Boolean(isAdmin),
  });

  // 2. Fetch all pandals
  const {
    data: allPujasData,
    isLoading: pujasLoading,
    refetch: refetchAllPujas,
  } = useQuery({
    queryKey: ['admin-all-pujas'],
    queryFn: async () => {
      const res = await api.get('/admin/pujas');
      return res.data;
    },
    enabled: Boolean(isAdmin && activeTab === 'pujas'),
  });

  // 3. Fetch reported/flagged community posts
  const {
    data: reportedPostsData,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['admin-reported-posts'],
    queryFn: async () => {
      const res = await api.get('/admin/posts/reports');
      return res.data;
    },
    enabled: Boolean(isAdmin && activeTab === 'moderation'),
  });

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Access Restricted</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Only designated PandalGo administrators and owners can review pandal submissions and moderate public content.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-festival-600 text-white font-bold text-xs"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const handleApprove = async (pujaId) => {
    try {
      setIsProcessing(true);
      await api.patch(`/admin/contributions/${pujaId}/review`, {
        status: 'approved',
      });
      refetchPending();
    } catch (err) {
      alert(err.message || 'Failed to approve pandal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingPuja) return;

    try {
      setIsProcessing(true);
      await api.patch(`/admin/contributions/${rejectingPuja._id}/review`, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim() || 'Could not verify pandal information.',
      });
      setRejectingPuja(null);
      setRejectionReason('');
      refetchPending();
    } catch (err) {
      alert(err.message || 'Failed to reject pandal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingPuja) return;

    try {
      setIsProcessing(true);
      await api.patch(`/admin/pujas/${editingPuja._id}`, editFormData);
      setEditingPuja(null);
      refetchAllPujas();
      refetchPending();
    } catch (err) {
      alert(err.message || 'Failed to update pandal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModeratePost = async (postId, status) => {
    try {
      await api.patch(`/admin/posts/${postId}/moderate`, { moderationStatus: status });
      refetchReports();
    } catch (err) {
      alert(err.message || 'Failed to moderate post.');
    }
  };

  const handleAutoSyncAll = async () => {
    try {
      setIsAutoSyncing(true);
      setSyncStatusMessage(null);
      const res = await api.post('/admin/pujas/auto-import');
      setSyncStatusMessage({
        type: 'success',
        text: res.data.message || 'Successfully imported verified Durga Pujas onto the map!',
        details: res.data.result,
      });
      refetchAllPujas();
      refetchPending();
    } catch (err) {
      setSyncStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to auto-import pandals.',
      });
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const handleOsmImport = async (e) => {
    e?.preventDefault();
    if (!osmQuery.trim()) return;

    try {
      setIsOsmSearching(true);
      setOsmResultMessage(null);
      const res = await api.post('/admin/pujas/import-single', {
        query: osmQuery.trim(),
        category: osmCategory,
      });
      setOsmResultMessage({
        type: 'success',
        text: res.data.message,
        puja: res.data.puja,
      });
      setOsmQuery('');
      refetchAllPujas();
      refetchPending();
    } catch (err) {
      setOsmResultMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to locate and import pandal.',
      });
    } finally {
      setIsOsmSearching(false);
    }
  };

  const pendingContributions = pendingData?.contributions || [];
  const allPujas = allPujasData?.pujas || [];
  const reportedPosts = reportedPostsData?.posts || [];

  return (
    <Layout maxWidth="6xl" className="space-y-8">
      {/* Header */}
      <ComponentLayout variant="dark" padding="relaxed" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C74732]/25 text-[#E07A5F] text-xs font-semibold border border-[#C74732]/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Owner Administration Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">PandalGo Owner Panel</h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Review community pandal contributions, inspect potential duplicates, and moderate public content.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAutoSyncAll}
            disabled={isAutoSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
            <span>{isAutoSyncing ? 'Synchronizing Pandals...' : 'Synchronize Verified Pandals'}</span>
          </button>

          <Link
            to="/add-puja"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2A2420] hover:bg-[#342D28] text-stone-200 font-semibold text-xs border border-[#3A322B] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#B58B45]" />
            <span>Add Custom Pin</span>
          </Link>
        </div>
      </ComponentLayout>

      {/* Global Sync Status Banner */}
      {syncStatusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 text-xs font-medium animate-in fade-in-50 duration-200 ${
            syncStatusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">{syncStatusMessage.text}</p>
              {syncStatusMessage.details && (
                <p className="mt-0.5 opacity-90">
                  New added: {syncStatusMessage.details.createdCount} • Existing verified:{' '}
                  {syncStatusMessage.details.updatedCount + syncStatusMessage.details.existingCount} • Total in catalog:{' '}
                  {syncStatusMessage.details.totalVerified}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSyncStatusMessage(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E8DEC8] dark:border-[#3A322B] pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-[#C74732] text-white shadow-md'
              : 'text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Submissions ({pendingContributions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pujas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'pujas'
              ? 'bg-[#C74732] text-white shadow-md'
              : 'text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Manage All Pandals</span>
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'moderation'
              ? 'bg-[#C74732] text-white shadow-md'
              : 'text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Flagged Posts ({reportedPosts.length})</span>
        </button>
      </div>

      {/* Tab 1: Pending Submissions */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Review community suggested pandals. Approving a suggestion publishes it immediately to the public discovery map.
          </p>

          {pendingLoading ? (
            <div className="h-48 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl animate-pulse border border-[#E8DEC8] dark:border-[#3A322B]" />
          ) : pendingContributions.length === 0 ? (
            <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-10 border border-[#E8DEC8] dark:border-[#3A322B] text-center space-y-2 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">All caught up!</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">There are no pending pandal suggestions awaiting review.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {pendingContributions.map((contrib) => {
                const duplicateAnalysis = contrib.duplicateAnalysis;
                const hasDuplicates = duplicateAnalysis?.isPossibleDuplicate;

                return (
                  <div
                    key={contrib._id}
                    className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-3xl p-6 border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm space-y-5 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-lg text-stone-900 dark:text-stone-100">{contrib.name}</h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                            {contrib.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          Submitted by <strong>{contrib.createdBy?.name || 'Visitor'}</strong> ({contrib.createdBy?.email})
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRejectingPuja(contrib)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(contrib._id)}
                          disabled={isProcessing}
                          className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve for Public Map
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-700 dark:text-stone-300">
                      <div className="space-y-2">
                        <p>
                          <strong>Address:</strong> {contrib.address}
                        </p>
                        <p>
                          <strong>Locality:</strong> {contrib.locality}
                        </p>
                        <p>
                          <strong>Coordinates:</strong> {contrib.location?.coordinates?.[1]}° N, {contrib.location?.coordinates?.[0]}° E
                        </p>
                        <p>
                          <strong>Timings:</strong> {contrib.timings || 'Open 24 Hours'}
                        </p>
                        {contrib.description && (
                          <p className="text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 p-3 rounded-xl">
                            {contrib.description}
                          </p>
                        )}
                      </div>

                      {/* Photographs */}
                      <div>
                        <span className="font-bold text-stone-500 dark:text-stone-400 block mb-1.5">Submitted Photos:</span>
                        {contrib.images && contrib.images.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {contrib.images.map((img, i) => (
                              <a
                                key={i}
                                href={img}
                                target="_blank"
                                rel="noreferrer"
                                className="h-20 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 block group"
                              >
                                <img
                                  src={img}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-stone-400 dark:text-stone-500 italic">No photographs attached.</p>
                        )}
                      </div>
                    </div>

                    {/* DUPLICATE WARNING INSPECTOR */}
                    {hasDuplicates && (
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 text-xs space-y-2">
                        <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>Potential Duplicate Warning (Inspect before approval):</span>
                        </div>
                        <div className="space-y-1.5">
                          {duplicateAnalysis.possibleDuplicates.map((dup, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-bold text-stone-900 dark:text-stone-100">{dup.puja.name}</span>
                                <span className="text-stone-500 dark:text-stone-400 ml-2">({dup.puja.locality})</span>
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                  Match reasons: {dup.reasons.join(', ')}
                                </div>
                              </div>
                              <span className="font-bold text-xs text-amber-800 dark:text-amber-300 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-md">
                                {dup.similarityScore}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Manage All Pandals */}
      {activeTab === 'pujas' && (
        <div className="space-y-6">
          {/* Real Pandal Automated Geo-Import Box */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  <ShieldCheck className="w-4 h-4 text-festival-600 dark:text-festival-400" />
                  <span>Real Durga Puja Geo-Location & Auto-Sync Engine</span>
                </div>
                <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100">
                  Bulk Populate or Discover Real Pandals onto the Live Map
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-2xl">
                  Automatically synchronize verified Kolkata pandals (North, South, Central, Salt Lake, Behala) with exact GPS coordinates and initial live crowd baseline, or discover any specific pandal via OpenStreetMap.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAutoSyncAll}
                  disabled={isAutoSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-festival-600 hover:from-amber-400 hover:to-festival-500 text-stone-950 font-extrabold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isAutoSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  ) : (
                    <Download className="w-4 h-4 text-stone-950" />
                  )}
                  <span>{isAutoSyncing ? 'Syncing...' : '1-Click Sync 30+ Real Pandals'}</span>
                </button>
              </div>
            </div>

            {/* Instant OSM Location Search & Pin */}
            <form onSubmit={handleOsmImport} className="pt-2 border-t border-amber-200/40 dark:border-amber-900/40 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Type any specific pandal or landmark (e.g. Ballygunge Cultural, Chaltabagan, Maddox)..."
                  value={osmQuery}
                  onChange={(e) => setOsmQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 rounded-xl text-xs border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <select
                value={osmCategory}
                onChange={(e) => setOsmCategory(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-stone-900 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
              >
                <option value="Theme / Contemporary">Theme / Contemporary</option>
                <option value="Traditional / Heritage">Traditional / Heritage</option>
                <option value="Community / Baroari">Community / Baroari</option>
                <option value="Bonedi Bari / Household">Bonedi Bari / Household</option>
                <option value="Club / Local">Club / Local</option>
              </select>

              <button
                type="submit"
                disabled={isOsmSearching || !osmQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-950 font-bold text-xs transition-colors shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isOsmSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                )}
                <span>{isOsmSearching ? 'Locating...' : 'Locate & Pin to Map'}</span>
              </button>
            </form>

            {osmResultMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
                  osmResultMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <span>{osmResultMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setOsmResultMessage(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500 dark:text-stone-400">Edit or manage existing pandal records in the database.</p>
            <span className="text-xs font-bold text-stone-400">Total Pandals: {allPujas.length}</span>
          </div>

          {pujasLoading ? (
            <div className="h-48 bg-white dark:bg-stone-900 rounded-3xl animate-pulse" />
          ) : (
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800 font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Locality</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {allPujas.map((p) => (
                      <tr key={p._id} className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="p-3.5 font-bold text-stone-900 dark:text-stone-100">{p.name}</td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-300">{p.locality}</td>
                        <td className="p-3.5 text-stone-600 dark:text-stone-300">{p.category}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              p.status === 'approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                : p.status === 'pending'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingPuja(p);
                              setEditFormData({
                                name: p.name,
                                address: p.address,
                                locality: p.locality,
                                category: p.category,
                                timings: p.timings || '',
                                description: p.description || '',
                              });
                            }}
                            className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-festival-600 dark:hover:text-festival-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {p.status === 'approved' && (
                            <Link
                              to={`/puja/${p.slug}`}
                              className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-festival-600 dark:hover:text-festival-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg inline-block transition-colors"
                              title="View"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Flagged Community Posts */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <p className="text-xs text-stone-500 dark:text-stone-400">Moderate community posts flagged by visitors or filters.</p>
          {reportsLoading ? (
            <div className="h-48 bg-white dark:bg-stone-900 rounded-3xl animate-pulse" />
          ) : reportedPosts.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 border border-stone-200 dark:border-stone-800 text-center text-xs text-stone-500 dark:text-stone-400">
              No flagged or reported community posts.
            </div>
          ) : (
            <div className="space-y-4">
              {reportedPosts.map((post) => (
                <div key={post._id} className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start justify-between gap-4 transition-colors">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{post.title || 'Untitled Post'}</h4>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">{post.description}</p>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-2 block">
                      Author: {post.authorId?.name} ({post.authorId?.email}) • Reports: {post.reportCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleModeratePost(post._id, 'published')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      Keep Published
                    </button>
                    <button
                      onClick={() => handleModeratePost(post._id, 'hidden')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                    >
                      Hide Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPuja && (
        <Modal
          isOpen={Boolean(rejectingPuja)}
          onClose={() => setRejectingPuja(null)}
          title={`Reject Submission — ${rejectingPuja.name}`}
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            <p className="text-stone-600 dark:text-stone-300">
              Please enter the reason why this pandal suggestion cannot be approved (this will be displayed to the submitter on their profile):
            </p>
            <textarea
              required
              rows={3}
              placeholder="e.g. Duplicate entry of an existing pandal / Location coordinates could not be verified."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingPuja(null)}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Pandal Modal */}
      {editingPuja && (
        <Modal
          isOpen={Boolean(editingPuja)}
          onClose={() => setEditingPuja(null)}
          title={`Edit Pandal — ${editingPuja.name}`}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleEditSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Name</label>
              <input
                type="text"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Locality</label>
                <input
                  type="text"
                  value={editFormData.locality || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, locality: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Category</label>
                <input
                  type="text"
                  value={editFormData.category || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Street Address</label>
              <input
                type="text"
                value={editFormData.address || ''}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPuja(null)}
                className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-festival-600 hover:bg-festival-700 text-white font-bold shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
