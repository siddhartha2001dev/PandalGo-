import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ChevronRight, CheckCircle2, Clock, Route } from 'lucide-react';
import { CrowdBadge } from '../common/CrowdBadge.jsx';
import { buildDirectionsUrl, getDirectionsLabel } from '../../lib/directions.js';
import { getContextualPujaImage, getPujaInitials } from '../../lib/pujaImages.js';

export function PujaCard({
  puja,
  crowdInfo,
  isSelected = false,
  onSelect,
  onOpenCrowdModal,
  userLocation = null,
}) {
  const initialImage = getContextualPujaImage(puja);
  const [imgSrc, setImgSrc] = useState(initialImage);

  useEffect(() => {
    setImgSrc(getContextualPujaImage(puja));
  }, [puja.images, puja.name]);

  const crowdStatus = crowdInfo?.crowdStatus || 'unknown';
  const waitMinutes = crowdInfo?.estimatedWaitMinutes;
  const directionsUrl = buildDirectionsUrl(puja.location?.coordinates, userLocation);

  const formatDistance = (meters) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m away`;
    return `${(meters / 1000).toFixed(1)} km away`;
  };

  return (
    <article
      onClick={() => onSelect && onSelect(puja)}
      className={`group relative bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
        isSelected
          ? 'border-[#C74732] ring-2 ring-[#C74732]/25 shadow-md'
          : 'border-[#E8DEC8] dark:border-[#3A322B] hover:border-[#B86B4B]/60 dark:hover:border-[#B58B45]/60 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top Media Container */}
      <div className="relative h-44 sm:h-48 w-full bg-[#F4EBDD] dark:bg-[#141210] overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={puja.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgSrc(null)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#702C35] via-[#9D4938] to-[#B58B45] flex flex-col items-center justify-center text-white">
            <span className="text-4xl font-serif font-bold opacity-90">{getPujaInitials(puja.name)}</span>
            <span className="mt-2 text-[10px] uppercase tracking-widest opacity-75">Image pending verification</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FDFBF7]/95 dark:bg-[#1E1A17]/95 backdrop-blur-md text-[#282520] dark:text-[#F9F6F0] border border-[#E8DEC8]/80 dark:border-[#3A322B] shadow-sm">
            {puja.category}
          </span>
          {puja.status === 'approved' && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#B58B45] text-white flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              <span>Verified</span>
            </span>
          )}
        </div>

        {/* Distance Indicator */}
        {puja.distanceMeters && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[11px] font-bold bg-black/70 backdrop-blur-md text-white flex items-center gap-1">
            <Navigation className="w-3 h-3 text-[#D4AF37]" />
            <span>{formatDistance(puja.distanceMeters)}</span>
          </div>
        )}

        {/* Name and Locality Overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-serif font-bold text-base sm:text-lg leading-snug drop-shadow-sm group-hover:text-amber-200 transition-colors">
            {puja.name}
          </h3>
          <p className="text-xs text-stone-200 flex items-center gap-1 mt-0.5 opacity-90">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
            <span className="truncate">{puja.locality}</span>
          </p>
        </div>
      </div>

      {/* Body Section */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 gap-3">
        <div className="flex items-center justify-between gap-2">
          <CrowdBadge status={crowdStatus} waitMinutes={waitMinutes} size="sm" showWait={true} />
          <span className="text-[11px] text-[#686358] dark:text-[#B8AF9F] font-medium">
            {puja.timings ? puja.timings : 'Open 24h'}
          </span>
        </div>

        {puja.description && (
          <p className="text-xs text-[#686358] dark:text-[#B8AF9F] line-clamp-2 leading-relaxed">
            {puja.description}
          </p>
        )}

        {/* Action Controls */}
        <div className="pt-2.5 border-t border-[#E8DEC8]/80 dark:border-[#3A322B] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCrowdModal) onOpenCrowdModal(puja);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-[#C74732] dark:text-[#D4AF37] bg-[#F4EBDD] dark:bg-[#27221E] hover:bg-[#E8DEC8] dark:hover:bg-[#352D26] transition-colors"
          >
            Report Crowd
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={getDirectionsLabel()}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
              >
                <Route className="w-3.5 h-3.5" />
                <span>Route</span>
              </a>
            )}
            <Link
              to={`/puja/${puja.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#282520] dark:text-[#F9F6F0] hover:text-[#C74732] dark:hover:text-[#D4AF37] transition-colors"
            >
              <span>Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
