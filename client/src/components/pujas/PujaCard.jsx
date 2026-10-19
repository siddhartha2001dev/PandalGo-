import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ChevronRight, CheckCircle2, Clock, Route } from 'lucide-react';
import { CrowdBadge } from '../common/CrowdBadge.jsx';
import { buildDirectionsUrl, getDirectionsLabel } from '../../lib/directions.js';

const FALLBACK_PANDAL_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bagbazar_Srbojanin_Durga_Puja_2025_01.jpg/800px-Bagbazar_Srbojanin_Durga_Puja_2025_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/2016_Durga_Puja_Kolkata_Shobhabazar_Sarbojonin_Durgotsav_Idol_01.jpg/800px-2016_Durga_Puja_Kolkata_Shobhabazar_Sarbojonin_Durgotsav_Idol_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Chalta_Bagan_Durga_Puja_2019.jpg/800px-Chalta_Bagan_Durga_Puja_2019.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Haridevpur_41_Pally_Durga_Puja_2019.jpg/800px-Haridevpur_41_Pally_Durga_Puja_2019.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Haridevpur_Athletic_Club_Durga_Puja_2019.jpg/800px-Haridevpur_Athletic_Club_Durga_Puja_2019.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/DurgaPuja2018_-_Pandal_of_Ultadanga_Pallyshree_-_Kolkata_2018-10-16_6207.JPG/800px-DurgaPuja2018_-_Pandal_of_Ultadanga_Pallyshree_-_Kolkata_2018-10-16_6207.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/DurgaPuja2018_-_Pandal_of_Jagat_Mukherjee_Park_-_Kolkata_2018-10-16_6221.JPG/800px-DurgaPuja2018_-_Pandal_of_Jagat_Mukherjee_Park_-_Kolkata_2018-10-16_6221.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Pandal_at_Durga_Puja_in_Kolkata_2018_01.jpg/800px-Pandal_at_Durga_Puja_in_Kolkata_2018_01.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Pandal_at_Durga_Puja_in_Kolkata_2018_23.jpg/800px-Pandal_at_Durga_Puja_in_Kolkata_2018_23.jpg',
  'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1633511090164-b43840ea1607?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1601055283742-8b27e81b5553?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
];

function getDeterministicPujaImage(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_PANDAL_IMAGES.length;
  return FALLBACK_PANDAL_IMAGES[index];
}

export function PujaCard({
  puja,
  crowdInfo,
  isSelected = false,
  onSelect,
  onOpenCrowdModal,
  userLocation = null,
}) {
  const initialImage = puja.images?.[0] || getDeterministicPujaImage(puja.name);
  const [imgSrc, setImgSrc] = useState(initialImage);

  useEffect(() => {
    setImgSrc(puja.images?.[0] || getDeterministicPujaImage(puja.name));
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
        <img
          src={imgSrc}
          alt={puja.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => {
            const fallback = getDeterministicPujaImage(puja.name);
            if (imgSrc !== fallback) {
              setImgSrc(fallback);
            }
          }}
        />
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
