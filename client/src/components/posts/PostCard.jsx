import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Camera,
  Trash2,
  Flag,
  Share2,
  CheckCircle2,
  Navigation,
  Compass,
  X,
  Users,
} from 'lucide-react';
import { CrowdBadge } from '../common/CrowdBadge.jsx';
import { Modal } from '../common/Modal.jsx';
import { ComponentLayout } from '../layout/ComponentLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function PostCard({ post, onDelete, onReport }) {
  const { user, isAdmin } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [copied, setCopied] = useState(false);

  const authorName = post.authorId?.name || 'Pandal Hopper';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const isAuthor = user && (user.id === post.authorId?._id || user._id === post.authorId?._id);

  const coords = post.pandalCoordinates || post.coordinates || post.associatedPujaId?.location?.coordinates;
  const hasCoordinates = coords && coords.length === 2;

  const crowdStatus = post.crowdStatus || post.crowdEstimate?.crowdStatus || 'unknown';
  const estimatedWait = post.estimatedWaitMinutes || post.crowdEstimate?.estimatedWaitMinutes;
  const observationCount = post.observationCount || post.crowdEstimate?.observationCount || 0;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `/posts#${post._id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ComponentLayout
      as="article"
      padding="normal"
      className="shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
    >
      {/* Header: Author & Metadata */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#F4EBDD] dark:bg-[#2A2420] text-[#C74732] dark:text-[#E07A5F] font-bold flex items-center justify-center text-sm border border-[#E8DEC8] dark:border-[#3A322B] shrink-0">
            {authorInitial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-tight truncate max-w-full">{authorName}</span>
              {post.category && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#B58B45]/15 text-[#B58B45] dark:text-[#E0C080] border border-[#B58B45]/30">
                  {post.category}
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
              <span>{formatDate(post.createdAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-stone-700 dark:text-stone-300">
                <MapPin className="w-3 h-3 text-[#C74732] shrink-0" /> <span className="break-words">{post.locality}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420] rounded-lg transition-colors"
            title="Share post"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {copied && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>}

          {(isAuthor || isAdmin) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(post._id)}
              className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Title & Description */}
      <div>
        {post.title && <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mb-1">{post.title}</h3>}
        <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">{post.description}</p>
      </div>

      {/* Live Crowd & Location Tracing Card */}
      {(post.associatedPujaId || hasCoordinates || crowdStatus !== 'unknown') && (
        <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/60 dark:bg-[#141210]/60 border border-[#E8DEC8] dark:border-[#3A322B] flex flex-col gap-2.5 text-xs shadow-sm transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {post.associatedPujaId ? (
              <Link
                to={`/puja/${post.associatedPujaId.slug}`}
                className="font-serif font-bold text-sm text-[#C74732] dark:text-[#E07A5F] hover:underline flex items-center gap-1.5"
              >
                <span>🪔 {post.associatedPujaId.name}</span>
              </Link>
            ) : (
              <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C74732]" />
                {post.locality} On-Site Post
              </span>
            )}

            <div className="flex items-center gap-2">
              <CrowdBadge status={crowdStatus} size="sm" showWait={true} estimatedWaitMinutes={estimatedWait} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8DEC8]/80 dark:border-[#3A322B] text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-3">
              {observationCount > 0 ? (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span><strong>{observationCount}</strong> live {observationCount === 1 ? 'report' : 'reports'} (100m)</span>
                </span>
              ) : (
                <span>No crowd reports in last 15 min</span>
              )}
              {estimatedWait && (
                <span className="flex items-center gap-1 text-stone-700 dark:text-stone-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>~{estimatedWait}m queue</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {post.associatedPujaId?.slug && (
                <Link
                  to={`/?puja=${post.associatedPujaId.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-[11px] shadow-sm transition-colors"
                >
                  <Navigation className="w-3 h-3" /> Trace on Map
                </Link>
              )}
              {hasCoordinates && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#EAE0D0] dark:bg-[#2A2420] hover:bg-[#DDD2C0] text-stone-800 dark:text-stone-200 font-semibold text-[11px] border border-[#E8DEC8] dark:border-[#3A322B] transition-colors"
                >
                  <MapPin className="w-3 h-3 text-[#C74732]" /> Directions
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photographs Grid */}
      {post.images && post.images.length > 0 && (
        <div
          className={`grid gap-2 rounded-xl overflow-hidden mt-1 ${
            post.images.length === 1
              ? 'grid-cols-1'
              : post.images.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {post.images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(img)}
              className="relative h-44 sm:h-52 bg-stone-100 dark:bg-stone-800 cursor-pointer overflow-hidden group rounded-xl"
            >
              <img
                src={img}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <Modal
          isOpen={Boolean(selectedImage)}
          onClose={() => setSelectedImage(null)}
          variant="image"
          ariaLabel="Pandal celebration image preview"
        >
          <img
            src={selectedImage}
            alt="Pandal celebration preview"
            className="max-w-full max-h-[82dvh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        </Modal>
      )}
    </ComponentLayout>
  );
}
