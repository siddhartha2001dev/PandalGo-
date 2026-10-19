import React from 'react';
import { ExternalLink, MapPin, Navigation, Route } from 'lucide-react';
import { buildMultiStopDirectionsUrl, getDirectionsLabel } from '../../lib/directions.js';

export function DevBotRouteCard({ routePlan }) {
  if (!routePlan?.stops?.length) return null;
  const routeUrl = buildMultiStopDirectionsUrl(routePlan) || routePlan.googleMapsUrl;

  return (
    <div className="w-full rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h4 className="font-serif font-bold text-sm text-[#282520] dark:text-[#F9F6F0]">Suggested pandal route</h4>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 inline-flex items-center gap-1">
            <Route className="w-3 h-3" /> {routePlan.stops.length} stops · about {routePlan.totalDistanceText}
          </p>
        </div>
        {routeUrl && (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer" title={getDirectionsLabel()} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1">
            <Navigation className="w-3 h-3" /> Open Route <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
      <ol className="space-y-1.5">
        {routePlan.stops.map((stop) => (
          <li key={`${stop.sequence}-${stop.slug || stop.name}`} className="flex items-start gap-2 text-[11px]">
            <span className="w-5 h-5 rounded-full bg-[#C74732] text-white flex items-center justify-center text-[10px] font-bold shrink-0">{stop.sequence}</span>
            <span className="min-w-0 flex-1 text-[#282520] dark:text-[#F9F6F0] font-semibold">
              {stop.name}
              {stop.locality && <span className="block text-[10px] text-stone-500 dark:text-stone-400 font-normal">{stop.locality}</span>}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 shrink-0 inline-flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{stop.distanceFromPreviousText}</span>
          </li>
        ))}
      </ol>
      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2">Order is based on nearest-next-stop distance. The external map app will calculate road conditions and traffic.</p>
    </div>
  );
}

export default DevBotRouteCard;
