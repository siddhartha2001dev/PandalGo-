import { Puja } from '../models/Puja.js';
import { calculateDistanceMeters } from './crowdService.js';

function normalizeString(str = '') {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Compute simple word Jaccard similarity
function computeTextSimilarity(strA, strB) {
  const wordsA = new Set(normalizeString(strA).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalizeString(strB).split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

export async function findPossibleDuplicates({ name, address, locality, coordinates, excludeId = null }) {
  const query = {};
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // Find all approved or pending pujas in the same locality or within ~1 km
  const candidates = await Puja.find(query).limit(100);

  const duplicates = [];

  for (const candidate of candidates) {
    let score = 0;
    const reasons = [];

    // 1. Name similarity check
    const nameSim = computeTextSimilarity(name, candidate.name);
    if (nameSim >= 0.5) {
      score += nameSim * 50;
      reasons.push(`High name similarity (${Math.round(nameSim * 100)}%)`);
    } else if (nameSim >= 0.3) {
      score += nameSim * 30;
      reasons.push(`Partial name similarity (${Math.round(nameSim * 100)}%)`);
    }

    // 2. Address/locality similarity
    const addressSim = computeTextSimilarity(address, candidate.address);
    if (addressSim >= 0.5) {
      score += 25;
      reasons.push('Similar street address');
    }

    if (
      locality &&
      candidate.locality &&
      normalizeString(locality) === normalizeString(candidate.locality)
    ) {
      score += 15;
      reasons.push('Same locality');
    }

    // 3. Coordinate proximity check (if both have coordinates)
    if (
      coordinates &&
      coordinates.length === 2 &&
      candidate.location?.coordinates?.length === 2
    ) {
      const distance = calculateDistanceMeters(coordinates, candidate.location.coordinates);
      if (distance <= 150) {
        score += 35;
        reasons.push(`Very close location (${Math.round(distance)}m away)`);
      } else if (distance <= 400) {
        score += 15;
        reasons.push(`Nearby location (${Math.round(distance)}m away)`);
      }
    }

    // If overall score indicates probable duplicate
    if (score >= 40) {
      duplicates.push({
        puja: {
          _id: candidate._id,
          name: candidate.name,
          address: candidate.address,
          locality: candidate.locality,
          status: candidate.status,
          coordinates: candidate.location.coordinates,
        },
        similarityScore: Math.min(100, Math.round(score)),
        reasons,
      });
    }
  }

  duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    isPossibleDuplicate: duplicates.length > 0,
    possibleDuplicates: duplicates,
  };
}
