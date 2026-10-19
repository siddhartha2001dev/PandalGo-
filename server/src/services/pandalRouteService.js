import { calculateDistanceMeters, formatDistanceString } from './devBotLocationService.js';

function coordinatesFor(puja) {
  const coordinates = puja?.coordinates || puja?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates.map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

/**
 * Creates a practical pandal-hopping order using a nearest-next-stop heuristic.
 * This is intentionally transparent: the route is based on straight-line distance,
 * while the external map app supplies the final road/traffic-aware directions.
 */
export function buildPandalRoutePlan({ userCoords, pujas, maxStops = 8 }) {
  if (!Array.isArray(userCoords) || userCoords.length !== 2 || !Array.isArray(pujas)) return null;
  const origin = userCoords.map(Number);
  if (!origin.every(Number.isFinite)) return null;

  const remaining = pujas
    .map((puja) => ({ puja, coordinates: coordinatesFor(puja) }))
    .filter((item) => item.coordinates)
    .slice(0, Math.min(maxStops, 10));

  const stops = [];
  let current = origin;
  let totalDistanceMeters = 0;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((item, index) => {
      const distance = calculateDistanceMeters(current, item.coordinates);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const next = remaining.splice(bestIndex, 1)[0];
    totalDistanceMeters += bestDistance;
    stops.push({
      sequence: stops.length + 1,
      name: next.puja.name,
      slug: next.puja.slug,
      locality: next.puja.locality,
      address: next.puja.address,
      coordinates: next.coordinates,
      distanceFromPreviousMeters: bestDistance,
      distanceFromPreviousText: formatDistanceString(bestDistance),
      locationUrl: `https://www.google.com/maps/search/?api=1&query=${next.coordinates[1]},${next.coordinates[0]}`,
    });
    current = next.coordinates;
  }

  if (stops.length === 0) return null;

  return {
    origin,
    stops,
    totalDistanceMeters,
    totalDistanceText: formatDistanceString(totalDistanceMeters),
    googleMapsUrl: buildGoogleRouteUrl(origin, stops),
    method: 'nearest-next-stop',
  };
}

function buildGoogleRouteUrl(origin, stops) {
  const destination = stops[stops.length - 1].coordinates;
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin[1]},${origin[0]}`,
    destination: `${destination[1]},${destination[0]}`,
    travelmode: 'driving',
  });
  if (stops.length > 1) {
    params.set('waypoints', stops.slice(0, -1).map((stop) => `${stop.coordinates[1]},${stop.coordinates[0]}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

