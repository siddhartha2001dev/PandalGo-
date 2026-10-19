import { Puja } from '../models/Puja.js';
import { getCrowdEstimateForPuja } from './crowdService.js';
import { calculateDistanceMeters, formatDistanceString } from './devBotLocationService.js';

const SEARCH_ALIASES = [
  ['chorebagan', 'chorbagan'],
  ['chor bagan', 'chorbagan'],
  ['vhor bgan', 'chorbagan'],
  ['bhor bagan', 'chorbagan'],
  ['bhowanipore', 'bhowanipur'],
  ['bhawanipore', 'bhowanipur'],
  ['calcutta', 'kolkata'],
];

function normalizeSearchText(value) {
  let normalized = String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [from, to] of SEARCH_ALIASES) normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
  return normalized;
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? previous
        : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}

function fuzzyMatchScore(query, puja) {
  const haystack = normalizeSearchText([puja.name, puja.locality, puja.address].filter(Boolean).join(' '));
  const queryTokens = normalizeSearchText(query).split(' ').filter((token) => token.length >= 3);
  if (!queryTokens.length) return 0;
  const haystackTokens = haystack.split(' ');
  return queryTokens.reduce((score, token) => {
    if (haystack.includes(token)) return score + 3;
    const closest = haystackTokens.reduce((best, candidate) => Math.min(best, levenshtein(token, candidate)), Infinity);
    return score + (closest <= Math.max(1, Math.floor(token.length / 4)) ? 1 : 0);
  }, 0);
}

/**
 * Public search for approved Puja records
 */
export async function searchApprovedPujas({ query, locality, category, userCoords = null, limit = 5 }) {
  const filter = { status: 'approved' };

  if (locality && locality !== 'all' && locality !== 'All Localities') {
    filter.locality = new RegExp(locality.trim(), 'i');
  }

  if (category && category !== 'all' && category !== 'All Categories') {
    filter.category = category;
  }

  if (query && query.trim()) {
    const cleanQuery = normalizeSearchText(query.trim());
    const regex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { address: regex },
      { locality: regex },
      { description: regex },
    ];
  }

  let pujas = await Puja.find(filter).sort({ name: 1 }).limit(Math.min(limit, 20)).lean();

  // If no exact match and query was a sentence, extract meaningful terms.
  if (pujas.length === 0 && query && query.includes(' ')) {
    const terms = query
      .replace(/which|what|where|are|the|is|located|in|near|durga|puja|pandals?|show|me|tell|about|find/gi, ' ')
      .split(/\s+/)
      .map((k) => k.trim())
      .filter((k) => k.length >= 3);

    if (terms.length > 0) {
      const termOrs = terms.map((t) => {
        const reg = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return [{ name: reg }, { locality: reg }, { address: reg }];
      }).flat();

      pujas = await Puja.find({
        status: 'approved',
        $or: termOrs,
      }).sort({ name: 1 }).limit(Math.min(limit, 20)).lean();
    }
  }

  // Last-mile typo tolerance for real user queries such as “vhor bgan”.
  // This runs only after indexed/regex searches miss, keeping normal searches fast.
  if (pujas.length === 0 && query) {
    const candidates = await Puja.find({ status: 'approved' })
      .select('name slug address locality category description images location festivalYear timings')
      .limit(1000)
      .lean();
    pujas = candidates
      .map((puja) => ({ puja, score: fuzzyMatchScore(query, puja) }))
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, 20))
      .map(({ puja }) => puja);
  }

  // If user provided reference coordinates, attach distance and sort by proximity
  if (userCoords && Array.isArray(userCoords) && userCoords.length === 2) {
    pujas = pujas.map((p) => {
      const distance = p.location?.coordinates
        ? calculateDistanceMeters(userCoords, p.location.coordinates)
        : null;
      return { ...p, distanceMeters: distance };
    });
    pujas.sort((a, b) => (a.distanceMeters || 9999999) - (b.distanceMeters || 9999999));
  }

  // Enrich with live crowd estimates
  const results = await Promise.all(
    pujas.map(async (p) => {
      let crowdStatus = 'unknown';
      let estimatedWaitMinutes = 0;
      try {
        const est = await getCrowdEstimateForPuja(p);
        crowdStatus = est?.crowdStatus || 'unknown';
        estimatedWaitMinutes = est?.estimatedWaitMinutes || 0;
      } catch {
        // Fallback crowd
      }

      return formatPublicPujaCard(p, crowdStatus, estimatedWaitMinutes);
    })
  );

  return results;
}

/**
 * Finds approved Pujas near given [longitude, latitude] coordinates
 */
export async function findNearbyPujas({ lng, lat, maxDistanceMeters = 5000, limit = 5 }) {
  if (isNaN(lng) || isNaN(lat)) {
    return { error: 'Valid numeric [longitude, latitude] coordinates are required for nearby search.' };
  }

  const userCoords = [Number(lng), Number(lat)];

  const nearbyPujas = await Puja.find({
    status: 'approved',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: userCoords,
        },
        $maxDistance: Math.min(maxDistanceMeters, 25000), // Max 25km radius
      },
    },
  })
    .limit(Math.min(limit, 10))
    .lean();

  const enriched = await Promise.all(
    nearbyPujas.map(async (p) => {
      let crowdStatus = 'unknown';
      let estimatedWaitMinutes = 0;
      try {
        const est = await getCrowdEstimateForPuja(p);
        crowdStatus = est?.crowdStatus || 'unknown';
        estimatedWaitMinutes = est?.estimatedWaitMinutes || 0;
      } catch {
        // Non-blocking
      }

      const distance = p.location?.coordinates
        ? calculateDistanceMeters(userCoords, p.location.coordinates)
        : null;

      return {
        ...formatPublicPujaCard(p, crowdStatus, estimatedWaitMinutes),
        distance: formatDistanceString(distance),
        distanceKm: distance != null ? (distance / 1000).toFixed(1) : null,
        distanceMeters: distance,
        distanceText: formatDistanceString(distance),
      };
    })
  );

  return enriched;
}

/**
 * Get detailed information for a specific Puja by name or slug
 */
export async function getPujaDetails({ slugOrName }) {
  if (!slugOrName || !slugOrName.trim()) return null;

  const clean = slugOrName.trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  let puja = await Puja.findOne({
    status: 'approved',
    $or: [{ slug }, { name: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  }).lean();

  if (!puja) {
    // Try broader search
    puja = await Puja.findOne({
      status: 'approved',
      name: new RegExp(clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    }).lean();
  }

  if (!puja) return null;

  let crowdEstimate = null;
  try {
    crowdEstimate = await getCrowdEstimateForPuja(puja);
  } catch {
    // Fallback
  }

  return {
    ...formatPublicPujaCard(
      puja,
      crowdEstimate?.crowdStatus || 'unknown',
      crowdEstimate?.estimatedWaitMinutes || 0
    ),
    fullDescription: puja.description || '',
    nearestMetro: puja.nearestMetro || null,
    timings: puja.timings || 'Open 24 Hours during Puja days',
    festivalYear: puja.festivalYear || 2026,
    images: puja.images || [],
    recentObservationCount: crowdEstimate?.recentObservationCount || 0,
    crowdFreshnessMinutes: crowdEstimate?.freshnessMinutes || null,
  };
}

/**
 * Formats a clean, secure, compact Puja card representation
 */
function formatPublicPujaCard(puja, crowdStatus = 'unknown', estimatedWaitMinutes = 0) {
  const [lng, lat] = puja.location?.coordinates || [null, null];
  const directionsUrl =
    lng != null && lat != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;
  const locationUrl =
    lng != null && lat != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : null;

  return {
    _id: puja._id,
    name: puja.name,
    slug: puja.slug,
    locality: puja.locality,
    address: puja.address,
    category: puja.category,
    image: puja.images?.[0] || null,
    description: puja.description ? puja.description.slice(0, 160) + (puja.description.length > 160 ? '...' : '') : '',
    coordinates: puja.location?.coordinates || null,
    crowdStatus,
    estimatedWaitMinutes,
    viewDetailsUrl: `/puja/${puja.slug}`,
    mapUrl: `/?puja=${puja.slug}`,
    locationUrl,
    directionsUrl,
  };
}
