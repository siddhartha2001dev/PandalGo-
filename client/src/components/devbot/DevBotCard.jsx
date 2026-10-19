import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, ExternalLink, ChevronRight, Map as MapIcon, Route } from 'lucide-react';
import { CrowdBadge } from '../common/CrowdBadge.jsx';
import { buildDirectionsUrl, buildMapLocationUrl, getDirectionsLabel } from '../../lib/directions.js';
import { getContextualPujaImage, getPujaInitials } from '../../lib/pujaImages.js';

export function DevBotCard(props) {
  const puja = props.puja || props.pandal;
  if (!puja) return null;

  const handleShowOnMapClick = (e) => {
    if (props.onShowOnMap) {
      e.preventDefault();
      props.onShowOnMap(puja);
    } else if (props.onSelectPuja) {
      props.onSelectPuja(puja);
    }
  };

  const handleViewDetailsClick = (e) => {
    if (props.onViewDetails) {
      e.preventDefault();
      props.onViewDetails(puja);
    }
  };

  // Derive coordinates
  let coords = puja.coordinates || puja.location?.coordinates || null;
  let lat = null;
  let lng = null;
  if (Array.isArray(coords) && coords.length === 2) {
    [lng, lat] = coords;
  }

  const directionsUrl =
    puja.directionsUrl || buildDirectionsUrl([lng, lat], props.userLocation || props.userCoords);
  const locationUrl = puja.locationUrl || buildMapLocationUrl([lng, lat], puja.name);

  const distanceDisplay = puja.distanceText || puja.distance || (puja.distanceMeters ? `${Math.round(puja.distanceMeters)} m` : null);
  const detailsPath = puja.viewDetailsUrl || `/puja/${puja.slug || puja._id}`;
  const mapPath = puja.mapUrl || (lat && lng ? `/?pandal=${puja.slug || puja._id}&lat=${lat}&lng=${lng}` : `/?pandal=${puja.slug || puja._id}`);

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] overflow-hidden shadow-sm hover:shadow-md transition-all my-2 group">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Thumbnail */}
        {getContextualPujaImage({ images: puja.image ? [puja.image] : puja.images }) ? (
          <div className="sm:w-32 h-28 sm:h-auto shrink-0 relative overflow-hidden bg-stone-200 dark:bg-stone-800">
            <img
              src={getContextualPujaImage({ images: puja.image ? [puja.image] : puja.images })}
              alt={puja.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {puja.category && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                {puja.category.split('/')[0].trim()}
              </span>
            )}
          </div>
        ) : (
          <div className="sm:w-32 h-20 sm:h-auto shrink-0 bg-gradient-to-br from-[#702C35] via-[#9D4938] to-[#B58B45] text-white flex items-center justify-center">
            <span className="text-xl font-serif font-bold">{getPujaInitials(puja.name)}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <h4 className="font-serif font-bold text-xs sm:text-sm text-[#282520] dark:text-[#F9F6F0] leading-tight line-clamp-1">
                {puja.name}
              </h4>
              {puja.crowdStatus && (
                <CrowdBadge
                  status={puja.crowdStatus}
                  size="sm"
                  showWait={Boolean(puja.estimatedWaitMinutes)}
                  estimatedWaitMinutes={puja.estimatedWaitMinutes}
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#686358] dark:text-[#B8AF9F] mt-1">
              <MapPin className="w-3 h-3 text-[#C74732] shrink-0" />
              <span className="truncate">{puja.locality || puja.address}</span>
              {distanceDisplay && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 inline-flex items-center gap-0.5">
                    <Route className="w-2.5 h-2.5" />
                    {distanceDisplay}
                  </span>
                </>
              )}
            </div>

            {puja.description && (
              <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] mt-1.5 line-clamp-2 leading-relaxed">
                {puja.description}
              </p>
            )}
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-[#E8DEC8]/60 dark:border-[#3A322B]/60 text-[11px]">
            <Link
              to={detailsPath}
              onClick={handleViewDetailsClick}
              className="px-2.5 py-1 rounded-lg bg-[#C74732] hover:bg-[#A83522] text-white font-bold transition-colors inline-flex items-center gap-1 shadow-xs active:scale-95"
            >
              <span>View Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>

            {locationUrl && (
              <a
                href={locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-[#FFF8EE] dark:bg-[#2A2420] hover:bg-[#F4EBDD] dark:hover:bg-[#342D26] text-[#C74732] dark:text-[#E07A5F] font-semibold border border-[#E8DEC8] dark:border-[#3A322B] transition-colors inline-flex items-center gap-1 active:scale-95"
                title="Open exact pandal location in an external map"
              >
                <MapPin className="w-3 h-3" />
                <span>Open Maps</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}

            <Link
              to={mapPath}
              onClick={handleShowOnMapClick}
              className="px-2.5 py-1 rounded-lg bg-[#F4EBDD] dark:bg-[#25201C] hover:bg-[#E8DEC8] dark:hover:bg-[#2F2720] text-[#282520] dark:text-[#F9F6F0] font-semibold border border-[#E8DEC8] dark:border-[#3A322B] transition-colors inline-flex items-center gap-1 active:scale-95"
            >
              <MapIcon className="w-3 h-3 text-[#C74732]" />
              <span>Show on Map</span>
            </Link>

            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors inline-flex items-center gap-1 font-semibold active:scale-95"
                title={getDirectionsLabel()}
              >
                <Navigation className="w-3 h-3" />
                <span>Get Directions</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevBotCard;
