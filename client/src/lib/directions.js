/**
 * Build a native external map route. Coordinates use GeoJSON order: [longitude, latitude].
 * If an origin is supplied, the route starts there; otherwise the map app uses the device's
 * current location when supported.
 */
export function buildDirectionsUrl(coordinates, userLocation = null) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;

  const [lng, lat] = coordinates;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return null;
  const origin = userLocation
    ? [userLocation.lng ?? userLocation.longitude, userLocation.lat ?? userLocation.latitude]
    : null;
  const hasOrigin = origin && origin.every((value) => Number.isFinite(Number(value)));
  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '') && 'ontouchend' in document;

  if (isAppleDevice) {
    const params = new URLSearchParams({ daddr: `${lat},${lng}`, dirflg: 'd' });
    if (hasOrigin) params.set('saddr', `${origin[1]},${origin[0]}`);
    return `https://maps.apple.com/?${params.toString()}`;
  }

  const params = new URLSearchParams({ api: '1', destination: `${lat},${lng}` });
  if (hasOrigin) params.set('origin', `${origin[1]},${origin[0]}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function getDirectionsLabel() {
  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '') && 'ontouchend' in document;
  return isAppleDevice ? 'Route in Apple Maps' : 'Route in Google Maps';
}

export function buildMapLocationUrl(coordinates, name = 'Pandal location') {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return null;
  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '') && 'ontouchend' in document;
  if (isAppleDevice) {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function buildMultiStopDirectionsUrl(routePlan) {
  if (!routePlan?.origin || !Array.isArray(routePlan.stops) || routePlan.stops.length === 0) return null;
  const origin = routePlan.origin;
  const stops = routePlan.stops.filter((stop) => Array.isArray(stop.coordinates) && stop.coordinates.length === 2);
  if (!stops.length) return null;
  const destination = stops[stops.length - 1].coordinates;
  const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent || '') && 'ontouchend' in document;

  if (isAppleDevice) {
    const params = new URLSearchParams({
      saddr: `${origin[1]},${origin[0]}`,
      daddr: `${destination[1]},${destination[0]}`,
      dirflg: 'd',
    });
    return `https://maps.apple.com/?${params.toString()}`;
  }

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
