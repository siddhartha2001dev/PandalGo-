import { CrowdObservation } from '../models/CrowdObservation.js';
import { env } from '../config/env.js';

// Haversine formula to compute distance in meters between two [lng, lat] pairs
export function calculateDistanceMeters(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Deterministic crowd estimation engine
 * @param {Object} puja - The approved Puja document
 * @param {Object} options - Override radiusMeters or freshnessMinutes if needed
 */
export async function getCrowdEstimateForPuja(puja, options = {}) {
  const radiusMeters = options.radiusMeters || env.CROWD_RADIUS_METERS || 100;
  const freshnessMinutes = options.freshnessMinutes || env.CROWD_FRESHNESS_MINUTES || 15;

  const pandalCoords = puja.location?.coordinates;
  if (!pandalCoords || pandalCoords.length !== 2) {
    return {
      crowdStatus: 'unknown',
      confidence: 'none',
      observationCount: 0,
      freshnessStatus: 'invalid_location',
      lastUpdated: null,
      estimatedWaitMinutes: null,
      reason: 'Pandal has no valid coordinates registered.',
    };
  }

  const cutoffDate = new Date(Date.now() - freshnessMinutes * 60 * 1000);

  // Query crowd observations near pandal coordinates using MongoDB geospatial $near or bounds
  // We match pujaId and filter by distance & freshness
  const rawObservations = await CrowdObservation.find({
    pujaId: puja._id,
    observationLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: pandalCoords,
        },
        $maxDistance: radiusMeters,
      },
    },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('reportedBy', 'name');

  // Check if any observation exists at all
  if (!rawObservations || rawObservations.length === 0) {
    return {
      crowdStatus: 'unknown',
      confidence: 'none',
      observationCount: 0,
      freshnessStatus: 'no_data',
      lastUpdated: null,
      estimatedWaitMinutes: null,
      reason: 'No crowd observations reported for this pandal yet.',
    };
  }

  // Filter for freshness within the window
  const freshObservations = rawObservations.filter((obs) => obs.createdAt >= cutoffDate);

  if (freshObservations.length === 0) {
    const mostRecent = rawObservations[0];
    return {
      crowdStatus: 'unknown',
      confidence: 'none',
      observationCount: 0,
      freshnessStatus: 'stale',
      lastUpdated: mostRecent.createdAt,
      estimatedWaitMinutes: null,
      reason: `Latest observation was ${Math.round((Date.now() - mostRecent.createdAt.getTime()) / 60000)} minutes ago (exceeds ${freshnessMinutes}m freshness window).`,
    };
  }

  // Deduplicate by user to prevent single-user report stuffing (use their latest report in the window)
  const userLatestMap = new Map();
  for (const obs of freshObservations) {
    const userId = obs.reportedBy?._id?.toString() || obs.reportedBy?.toString();
    if (!userLatestMap.has(userId)) {
      userLatestMap.set(userId, obs);
    }
  }

  const eligibleObservations = Array.from(userLatestMap.values());
  const uniqueContributors = eligibleObservations.length;

  // Count votes
  const counts = { low: 0, moderate: 0, high: 0 };
  let totalWait = 0;
  let waitCount = 0;

  eligibleObservations.forEach((obs) => {
    if (counts[obs.crowdLevel] !== undefined) {
      counts[obs.crowdLevel] += 1;
    }
    if (typeof obs.estimatedWaitMinutes === 'number' && !isNaN(obs.estimatedWaitMinutes)) {
      totalWait += obs.estimatedWaitMinutes;
      waitCount += 1;
    }
  });

  const avgWait = waitCount > 0 ? Math.round(totalWait / waitCount) : null;

  // Evaluate majority status
  const totalVotes = uniqueContributors;
  const lowRatio = counts.low / totalVotes;
  const modRatio = counts.moderate / totalVotes;
  const highRatio = counts.high / totalVotes;

  let crowdStatus = 'unknown';
  let confidence = 'low';

  if (uniqueContributors === 1) {
    crowdStatus = eligibleObservations[0].crowdLevel;
    confidence = 'low';
  } else {
    // Determine if clear consensus exists
    if (lowRatio >= 0.6) {
      crowdStatus = 'low';
      confidence = uniqueContributors >= 3 ? 'high' : 'medium';
    } else if (modRatio >= 0.6) {
      crowdStatus = 'moderate';
      confidence = uniqueContributors >= 3 ? 'high' : 'medium';
    } else if (highRatio >= 0.6) {
      crowdStatus = 'high';
      confidence = uniqueContributors >= 3 ? 'high' : 'medium';
    } else if ((lowRatio > 0 && highRatio > 0 && Math.abs(lowRatio - highRatio) < 0.25) || modRatio === 0.5) {
      // Substantial disagreement -> mixed
      crowdStatus = 'mixed';
      confidence = 'medium';
    } else {
      // Pick highest with medium confidence
      const highest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      crowdStatus = highest[0];
      confidence = 'medium';
    }
  }

  return {
    crowdStatus,
    confidence,
    observationCount: uniqueContributors,
    freshnessStatus: 'fresh',
    lastUpdated: freshObservations[0].createdAt,
    estimatedWaitMinutes: avgWait,
    details: {
      lowCount: counts.low,
      moderateCount: counts.moderate,
      highCount: counts.high,
      eligibleObservations: uniqueContributors,
      freshnessMinutes,
    },
  };
}
