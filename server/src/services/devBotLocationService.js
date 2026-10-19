/**
 * Location, Geocoding & Distance Utilities for Dev Bot
 */

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

/**
 * Build a direct Google Maps search link even when a place is not yet in the
 * verified PandalGo directory. This is deliberately a search URL (rather than
 * a guessed coordinate) so Maps can resolve spelling variants safely.
 */
export function buildGoogleMapsSearchUrl(query) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return null;
  const searchQuery = /kolkata|calcutta|west bengal|india/i.test(cleanQuery)
    ? cleanQuery
    : `${cleanQuery}, Kolkata, West Bengal, India`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
}

/**
 * Calculates Haversine distance in meters between two [longitude, latitude] points
 * Coordinates format: [longitude, latitude]
 */
export function calculateDistanceMeters(coord1, coord2) {
  if (!Array.isArray(coord1) || !Array.isArray(coord2) || coord1.length < 2 || coord2.length < 2) {
    return null;
  }
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Formats distance in meters to a human readable string (e.g. "350m away" or "2.4 km away")
 */
export function formatDistanceString(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Validates [longitude, latitude] coordinates
 */
export function validateCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return { valid: false, error: 'Coordinates must be an array of [longitude, latitude]' };
  }
  const [lng, lat] = coords;
  if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
    return { valid: false, error: 'Longitude and latitude must be numeric values' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }

  // Flag if coordinates appear inverted (e.g. Latitude ~88 and Longitude ~22 which is impossible for Bengal/India)
  if (lat > 60 && lng < 40) {
    return {
      valid: false,
      error: 'Coordinates appear inverted. Remember GeoJSON expects [longitude, latitude] (e.g., [88.36, 22.57])',
    };
  }

  return { valid: true };
}

/**
 * Approximate geocoder using OpenStreetMap Nominatim with caching
 */
const geocodeCache = new Map();

export async function geocodeLocationQuery(query) {
  if (!query || !query.trim() || query.trim().length < 2) return null;
  const normalized = query.trim().toLowerCase();

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim() + ', West Bengal, India'
    )}&limit=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PandalGoDevBot/1.0 (devbot@pandalgo.local)',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        const result = {
          coordinates: [lon, lat],
          displayName: data[0].display_name,
        };
        geocodeCache.set(normalized, result);
        return result;
      }
    }
  } catch {
    // Non-blocking geocoding failure
  }
  return null;
}
