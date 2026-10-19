import React from 'react';
import { ExternalLink, MapPin, Navigation, Route } from 'lucide-react';
import { buildDirectionsUrl, getDirectionsLabel } from '../../lib/directions.js';

export function DevBotPlaceCard({ place, userLocation }) {
  if (!place) return null;
  const directionsUrl = buildDirectionsUrl(place.coordinates, userLocation);

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-serif font-bold text-sm text-[#282520] dark:text-[#F9F6F0] truncate">{place.name}</h4>
          <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] mt-1 flex items-start gap-1">
            <MapPin className="w-3 h-3 text-[#C74732] shrink-0 mt-0.5" />
            <span>{place.address}</span>
          </p>
        </div>
        {place.distanceText && (
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 inline-flex items-center gap-1">
            <Route className="w-3 h-3" /> {place.distanceText}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[#E8DEC8]/70 dark:border-[#3A322B]/70 text-[11px]">
        {place.cuisine && <span className="text-stone-600 dark:text-stone-400 mr-auto">{place.cuisine}</span>}
        {place.locationUrl && (
          <a
            href={place.locationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-[#FFF8EE] dark:bg-[#2A2420] text-[#C74732] dark:text-[#E07A5F] border border-[#E8DEC8] dark:border-[#3A322B] font-semibold inline-flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" /> Open Maps <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        )}
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={getDirectionsLabel()}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-semibold inline-flex items-center gap-1"
          >
            <Navigation className="w-3 h-3" /> Route
          </a>
        )}
      </div>
    </div>
  );
}

export default DevBotPlaceCard;
