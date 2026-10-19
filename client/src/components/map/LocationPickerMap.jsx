import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, AlertCircle, ShieldCheck, Lock, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { DEFAULT_TILE_URL, DEFAULT_ATTRIBUTION, MAP_MAX_ZOOM } from '../../config/mapConfig.js';

const pinIcon = L.divIcon({
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #dc2626;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
    </div>
  `,
  className: 'custom-picker-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function MapClickHandler({ onSelectCoordinates, isAdmin, onDeniedClick }) {
  useMapEvents({
    click(e) {
      if (isAdmin) {
        onSelectCoordinates([e.latlng.lng, e.latlng.lat]);
      } else {
        if (onDeniedClick) onDeniedClick();
      }
    },
  });
  return null;
}

function PanToCoordinates({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    // Invalidate size ensures tiles render properly across all viewport containers
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (coordinates && coordinates.length === 2) {
      map.flyTo([coordinates[1], coordinates[0]], 15, { duration: 1 });
    }
  }, [coordinates, map]);
  return null;
}

export function LocationPickerMap({
  coordinates, // [longitude, latitude]
  onChange,
  onGpsCapture,
  requireGpsOnly = false,
}) {
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [permissionNotice, setPermissionNotice] = useState(null);
  const [isGpsVerified, setIsGpsVerified] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearchLoading, setManualSearchLoading] = useState(false);

  // Can place remote pins if user is an administrator
  const canPlaceRemotePin = isAdmin && !requireGpsOnly;

  // Default to Kolkata center if coordinates not yet picked
  const centerLat = coordinates?.[1] || 22.5726;
  const centerLng = coordinates?.[0] || 88.3639;

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);
    setPermissionNotice(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const newCoords = [lng, lat];
        onChange(newCoords);
        setGpsAccuracy(Math.round(accuracy));
        setIsGpsVerified(true);
        setGpsLoading(false);

        if (onGpsCapture) {
          onGpsCapture({
            coordinates: newCoords,
            accuracy: Math.round(accuracy),
            source: 'gps',
          });
        }
      },
      (error) => {
        setGpsLoading(false);
        let msg = 'Unable to fetch your present location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser settings so your present pandal location can be captured.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable from your device.';
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  const handleManualMapClick = (coords) => {
    if (!canPlaceRemotePin) {
      setPermissionNotice('Normal users can only register pandals at their current physical location via GPS. Only admins can place remote custom pins.');
      return;
    }
    onChange(coords);
    setGpsAccuracy(null);
    setIsGpsVerified(false);
    if (onGpsCapture) {
      onGpsCapture({
        coordinates: coords,
        accuracy: null,
        source: 'manual',
      });
    }
  };

  const handleManualSearch = async () => {
    const query = manualQuery.trim();
    if (!query || !canPlaceRemotePin) return;
    setManualSearchLoading(true);
    setPermissionNotice(null);
    setGpsError(null);
    try {
      const { data } = await api.get('/pujas/geocode-location', { params: { q: query } });
      handleManualMapClick(data.coordinates);
      setManualQuery(data.displayName || query);
    } catch (error) {
      setGpsError(error.message || 'Could not find that location. Try a landmark, locality, or address.');
    } finally {
      setManualSearchLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header & GPS button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-festival-600 dark:text-festival-400" />
          <span>Location Pin</span>
          {isGpsVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" /> Present GPS Verified
            </span>
          )}
        </label>

        <button
          type="button"
          onClick={handleUseGps}
          disabled={gpsLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-festival-600 hover:bg-festival-700 text-white shadow-sm shadow-festival-600/30 transition-all disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
          {gpsLoading ? 'Capturing GPS...' : 'Use My Present Location (GPS)'}
        </button>
      </div>

      {/* Role permission info banner */}
      {canPlaceRemotePin ? (
        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>
            <strong>Admin Custom Location:</strong> You can click anywhere on the map or drag the pin remotely to add any custom puja location.
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">Present Location Only</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Normal users can add new pandals at their <strong>present location only</strong> to ensure high accuracy for crowd tracing. (Only admins can add remote locations).
            </p>
          </div>
        </div>
      )}

      {canPlaceRemotePin && (
        <div
          role="search"
          className="flex flex-col sm:flex-row gap-2"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleManualSearch();
            }
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={manualQuery}
              onChange={(event) => setManualQuery(event.target.value)}
              placeholder="Search a locality, landmark, or address"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-9 pr-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:ring-2 focus:ring-festival-500"
              aria-label="Search for a custom location"
            />
          </div>
          <button
            type="button"
            onClick={handleManualSearch}
            disabled={manualSearchLoading || !manualQuery.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 px-4 py-2.5 text-sm font-bold text-white dark:text-stone-900 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {manualSearchLoading ? 'Searching...' : 'Find location'}
          </button>
        </div>
      )}

      {permissionNotice && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <span>{permissionNotice}</span>
        </div>
      )}

      {gpsError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Leaflet Interactive Map */}
      <div className="isolate relative z-10 h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-sm">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={coordinates ? 15 : 12}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            key={isDark ? 'osm-dark-picker' : 'osm-light-picker'}
            attribution={DEFAULT_ATTRIBUTION}
            url={DEFAULT_TILE_URL}
            maxZoom={MAP_MAX_ZOOM}
          />
          <MapClickHandler
            onSelectCoordinates={handleManualMapClick}
            isAdmin={canPlaceRemotePin}
            onDeniedClick={() => {
              setPermissionNotice('Normal users can only register pandals at their current verified location via GPS. Tap "Use My Present Location" above.');
            }}
          />
          {coordinates && <PanToCoordinates coordinates={coordinates} />}

          {coordinates && (
            <Marker
              position={[coordinates[1], coordinates[0]]}
              icon={pinIcon}
              draggable={canPlaceRemotePin}
              eventHandlers={{
                dragend: (e) => {
                  if (canPlaceRemotePin) {
                    const latlng = e.target.getLatLng();
                    handleManualMapClick([latlng.lng, latlng.lat]);
                  }
                },
              }}
            />
          )}
        </MapContainer>

        <div className="absolute top-2 left-2 z-20 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-semibold text-stone-700 dark:text-stone-300 shadow-sm border border-stone-200 dark:border-stone-700">
          {canPlaceRemotePin
            ? 'Tap or drag anywhere to place remote custom pin'
            : coordinates
            ? 'Present location locked via GPS'
            : 'Tap "Use My Present Location" to set pin'}
        </div>
      </div>

      <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center justify-between gap-2 px-1">
        {coordinates ? (
          <span className="font-mono text-stone-700 dark:text-stone-300">
            Coordinates: {coordinates[1].toFixed(5)}° N, {coordinates[0].toFixed(5)}° E
            {gpsAccuracy && ` (GPS Accuracy: ~${gpsAccuracy}m)`}
          </span>
        ) : (
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            {canPlaceRemotePin
              ? 'Please tap map or use GPS to set the puja location'
              : 'Please click "Use My Present Location (GPS)" to verify your location'}
          </span>
        )}
      </div>
    </div>
  );
}
