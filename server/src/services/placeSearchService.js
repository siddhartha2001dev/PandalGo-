import { calculateDistanceMeters, formatDistanceString } from './devBotLocationService.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function formatPlace(element, userCoords) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const distanceMeters = userCoords ? calculateDistanceMeters(userCoords, [lng, lat]) : null;
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'] || tags['addr:city']]
    .filter(Boolean)
    .join(', ');

  return {
    id: `${element.type}-${element.id}`,
    name: tags.name || tags['name:en'] || 'Unnamed place',
    category: tags.amenity || 'place',
    cuisine: tags.cuisine || null,
    address: address || tags['addr:full'] || 'Kolkata, West Bengal',
    coordinates: [lng, lat],
    distanceMeters,
    distanceText: formatDistanceString(distanceMeters),
    openingHours: tags.opening_hours || null,
    website: tags.website || tags['contact:website'] || null,
    locationUrl: mapsUrl(lat, lng),
  };
}

export async function searchNearbyPlaces({ userCoords, amenity = 'restaurant', radiusMeters = 5000, limit = 10 }) {
  if (!Array.isArray(userCoords) || userCoords.length !== 2) return [];
  const [lng, lat] = userCoords;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return [];

  const safeRadius = Math.min(Math.max(Number(radiusMeters) || 5000, 500), 10000);
  const query = `[out:json][timeout:8];(nwr["amenity"="${amenity}"](around:${safeRadius},${lat},${lng}););out center tags;`;

  try {
    const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'PandalGoDevBot/1.0' },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.elements || [])
      .map((element) => formatPlace(element, userCoords))
      .filter(Boolean)
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
      .slice(0, Math.min(limit, 20));
  } catch {
    return [];
  }
}
