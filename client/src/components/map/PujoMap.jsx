import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Compass, ExternalLink } from 'lucide-react';
import { buildDirectionsUrl, getDirectionsLabel } from '../../lib/directions.js';
import { CrowdBadge } from '../common/CrowdBadge.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  DEFAULT_TILE_URL,
  DEFAULT_ATTRIBUTION,
  MAP_SUBDOMAINS,
  MAP_MAX_ZOOM,
  MAP_DEFAULT_CENTER,
} from '../../config/mapConfig.js';

// Dedicated Map Controller that guarantees tiles render reliably on mobile and desktop
function MapViewController({ selectedPuja, userLocation, searchedLocation, isActiveView, isDrawerOpen }) {
  const map = useMap();

  // Automatically dismiss any active Leaflet popup when mobile navigation drawer opens
  useEffect(() => {
    if (isDrawerOpen && map) {
      map.closePopup();
    }
  }, [isDrawerOpen, map]);

  // Multi-pass size invalidation on mount and whenever tab/view visibility changes
  useEffect(() => {
    const triggerInvalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 60);
    const t2 = setTimeout(triggerInvalidate, 200);
    const t3 = setTimeout(triggerInvalidate, 500);
    const t4 = setTimeout(triggerInvalidate, 1000);

    const handleResize = () => triggerInvalidate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map, isActiveView]);

  // Smooth pan to searched custom location
  useEffect(() => {
    if (searchedLocation?.coordinates) {
      const [lng, lat] = searchedLocation.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1 });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [searchedLocation, map]);

  // Smooth pan to selected pandal
  useEffect(() => {
    if (selectedPuja?.location?.coordinates) {
      const [lng, lat] = selectedPuja.location.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1 });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [selectedPuja, map]);

  // Smooth pan to user location
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1 });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [userLocation, map]);

  return null;
}

// Generate crisp, professional SVG Map Markers (No emojis, production vector design)
function createPandalIcon(puja, isSelected = false, crowdStatus = 'unknown') {
  const statusColors = {
    low: '#10B981',       // Emerald
    moderate: '#F59E0B',  // Amber
    high: '#EF4444',      // Rose / Red
    mixed: '#6366F1',     // Indigo
    unknown: '#94A3B8',   // Slate
  };

  const crowdDotColor = statusColors[crowdStatus] || statusColors.unknown;
  const pinFill = isSelected ? '#7F1D1D' : '#991B1B';
  const scale = isSelected ? 1.2 : 1.0;
  const zIndex = isSelected ? 1000 : 10;

  const html = `
    <div style="transform: scale(${scale}); transform-origin: bottom center; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: ${zIndex};" class="relative cursor-pointer select-none">
      ${isSelected ? `
        <div style="
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 10px;
          background: rgba(153, 27, 27, 0.35);
          border-radius: 50%;
          filter: blur(2px);
        "></div>
      ` : ''}
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <!-- Pin Base Body -->
        <path d="M17 0C7.61 0 0 7.61 0 17C0 26.68 14.86 40.54 15.5 41.13C15.91 41.52 16.45 41.74 17 41.74C17.55 41.74 18.09 41.52 18.5 41.13C19.14 40.54 34 26.68 34 17C34 7.61 26.39 0 17 0Z" fill="${pinFill}" stroke="#FFFFFF" stroke-width="2"/>
        
        <!-- Inner Core Circle -->
        <circle cx="17" cy="17" r="10" fill="#FFFFFF"/>
        
        <!-- Pandal Arch Glyph -->
        <path d="M13 22V16.5C13 14.29 14.79 12.5 17 12.5C19.21 12.5 21 14.29 21 16.5V22" stroke="${pinFill}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="17" cy="10" r="1.5" fill="${pinFill}"/>

        <!-- Live Crowd Status Dot -->
        <circle cx="27" cy="7" r="5" fill="${crowdDotColor}" stroke="#FFFFFF" stroke-width="1.8"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'pandal-pin-icon',
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  });
}

function createUserLocationIcon() {
  const html = `
    <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        width: 22px;
        height: 22px;
        background: rgba(37, 99, 235, 0.25);
        border-radius: 50%;
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 14px;
        height: 14px;
        background: #2563EB;
        border: 2.5px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'user-pin-icon',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createSearchedLocationIcon() {
  const html = `
    <div style="filter: drop-shadow(0 3px 6px rgba(217, 119, 6, 0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16C0 25.11 13.99 38.16 14.59 38.71C14.98 39.08 15.48 39.28 16 39.28C16.52 39.28 17.02 39.08 17.41 38.71C18.01 38.16 32 25.11 32 16C32 7.16 24.84 0 16 0Z" fill="#D97706" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
        <circle cx="16" cy="16" r="3" fill="#D97706"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'search-pin-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

function SearchedLocationMarker({ searchedLocation, onScanSearchedLocation }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && searchedLocation?.coordinates) {
      const timer = setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchedLocation]);

  if (!searchedLocation?.coordinates) return null;

  return (
    <Marker
      ref={markerRef}
      position={[searchedLocation.coordinates[1], searchedLocation.coordinates[0]]}
      icon={createSearchedLocationIcon()}
    >
      <Popup minWidth={220} maxWidth={280}>
        <div className="p-2.5 max-w-[240px] space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Searched Location
          </span>
          <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-tight">
            {searchedLocation.locationName || 'Searched Point'}
          </h4>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
            {searchedLocation.displayName}
          </p>
          {onScanSearchedLocation && (
            <button
              onClick={() => onScanSearchedLocation(searchedLocation)}
              className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors flex items-center justify-center gap-1 mt-1"
            >
              <span>Check Live Crowd Here</span>
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export function PujoMap({
  pujas = [],
  selectedPuja = null,
  onSelectPuja,
  userLocation = null,
  searchedLocation = null,
  onScanSearchedLocation = null,
  crowdMap = {},
  isActiveView = true,
  isDrawerOpen = false,
}) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);

  // ResizeObserver guarantees map tiles resize if parent element container bounds change on mobile
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B] bg-[#F4EBDD] dark:bg-[#141210] shadow-sm isolate z-10"
      style={{ minHeight: '420px', height: '100%', touchAction: 'pan-x pan-y' }}
    >
      <MapContainer
        center={MAP_DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ width: '100%', height: '100%', minHeight: '420px' }}
      >
        <TileLayer
          key={isDark ? 'osm-dark' : 'osm-light'}
          attribution={DEFAULT_ATTRIBUTION}
          url={DEFAULT_TILE_URL}
          subdomains={MAP_SUBDOMAINS}
          maxZoom={MAP_MAX_ZOOM}
        />

        <MapViewController
          selectedPuja={selectedPuja}
          userLocation={userLocation}
          searchedLocation={searchedLocation}
          isActiveView={isActiveView}
          isDrawerOpen={isDrawerOpen}
        />

        {/* User GPS location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="p-1 font-semibold text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>Your Location</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Searched Location Pin with Auto-Open Popup */}
        <SearchedLocationMarker
          searchedLocation={searchedLocation}
          onScanSearchedLocation={onScanSearchedLocation}
        />

        {/* Pandal markers */}
        {pujas.map((puja) => {
          if (!puja.location?.coordinates || puja.location.coordinates.length !== 2) return null;
          const [lng, lat] = puja.location.coordinates;
          const isSelected = selectedPuja?._id === puja._id;
          const crowdInfo = crowdMap[puja._id];
          const crowdStatus = crowdInfo?.crowdStatus || 'unknown';

          return (
            <Marker
              key={puja._id}
              position={[lat, lng]}
              icon={createPandalIcon(puja, isSelected, crowdStatus)}
              eventHandlers={{
                click: () => {
                  if (isDrawerOpen) return;
                  if (onSelectPuja) onSelectPuja(puja);
                },
              }}
            >
              <Popup className="custom-leaflet-popup" minWidth={240} maxWidth={280}>
                <div className="p-2.5 w-[240px] sm:w-[260px] max-w-[280px] space-y-1.5">
                  {puja.images?.[0] && (
                    <img
                      src={puja.images[0]}
                      alt={puja.name}
                      className="w-full h-24 object-cover rounded-lg mb-1"
                      loading="lazy"
                    />
                  )}
                  <h3 className="font-bold text-xs text-stone-900 dark:text-stone-100 leading-tight">
                    {puja.name}
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-festival-600" />
                    <span className="truncate">{puja.locality}</span>
                  </p>
                  <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800 min-w-0">
                    <div className="min-w-0 flex-1">
                      <CrowdBadge
                        status={crowdStatus}
                        size="sm"
                        compact={true}
                        showWait={true}
                        waitMinutes={crowdInfo?.estimatedWaitMinutes}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {buildDirectionsUrl(puja.location?.coordinates, userLocation) && (
                        <a
                          href={buildDirectionsUrl(puja.location.coordinates, userLocation)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          title={getDirectionsLabel()}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline px-1 py-0.5 inline-flex items-center gap-1"
                        >
                          <Navigation className="w-3 h-3" /> Route
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectPuja && onSelectPuja(puja)}
                        className="text-xs font-bold text-festival-700 dark:text-festival-400 hover:underline px-1 py-0.5"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Clean, Non-intrusive Map Legend (Bengal Festive Style) */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#FDFBF7]/95 dark:bg-[#1E1A17]/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm text-[11px] font-medium flex items-center gap-3 text-[#686358] dark:text-[#B8AF9F]">
        <span className="font-bold text-[#282520] dark:text-[#F9F6F0]">Crowd:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Med
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> High
        </span>
      </div>
    </div>
  );
}
