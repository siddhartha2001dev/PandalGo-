import { Puja } from '../models/Puja.js';
import { Post } from '../models/Post.js';
import { getCrowdEstimateForPuja, calculateDistanceMeters } from '../services/crowdService.js';
import { findPossibleDuplicates } from '../services/duplicateDetector.js';
import { resolveLocationCoordinates } from '../services/geocodingService.js';
import { clearPublicCache, getPublicCache, setPublicCache } from '../services/publicCache.js';

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export async function generateUniqueSlug(name) {
  let baseSlug = slugify(name);
  if (!baseSlug) baseSlug = 'pandal';
  let slug = baseSlug;
  let counter = 1;

  while (await Puja.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export async function getPujas(req, res, next) {
  try {
    const { q, locality, category, lat, lng, radius } = req.query;
    const cacheKey = `pujas:${JSON.stringify({ q: q || '', locality: locality || '', category: category || '', lat: lat || '', lng: lng || '', radius: radius || '' })}`;
    const cached = getPublicCache(cacheKey);
    if (cached) return res.json(cached);

    const filter = { status: 'approved' };

    if (locality && locality !== 'all' && locality !== 'All Localities') {
      const loc = locality.trim();
      if (/salt\s*lake/i.test(loc)) {
        filter.$or = [
          { locality: /salt\s*lake/i },
          { address: /salt\s*lake|lake\s*town/i }
        ];
      } else if (/kalyani|suburb/i.test(loc)) {
        filter.$or = [
          { locality: /suburb/i },
          { address: /kalyani|naihati|barrackpore|sodepur|halisahar/i },
          { name: /kalyani/i }
        ];
      } else {
        filter.locality = new RegExp(loc, 'i');
      }
    }

    if (category && category !== 'all' && category !== 'All Categories') {
      filter.category = category;
    }

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: regex }, { address: regex }, { locality: regex }, { description: regex }];
    }

    let pujas;

    // If geolocation search is requested
    if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      const longitude = parseFloat(lng);
      const latitude = parseFloat(lat);
      const maxDist = parseInt(radius || '20000', 10); // 20km default

      pujas = await Puja.find({
        ...filter,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: maxDist,
          },
        },
      }).limit(100);
    } else {
      pujas = await Puja.find(filter).sort({ name: 1 }).limit(100);
    }

    // Attach distance if user coordinates provided
    const userCoords =
      lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))
        ? [parseFloat(lng), parseFloat(lat)]
        : null;

    const results = pujas.map((p) => {
      const plain = p.toObject();
      if (userCoords && p.location?.coordinates) {
        plain.distanceMeters = Math.round(calculateDistanceMeters(userCoords, p.location.coordinates));
      }
      return plain;
    });

    const payload = {
      success: true,
      count: results.length,
      pujas: results,
    };
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    setPublicCache(cacheKey, payload, 30_000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getPujaBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const puja = await Puja.findOne({ slug: slug.toLowerCase() }).populate('createdBy', 'name');

    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Durga Puja pandal not found.',
      });
    }

    // If pandal is not approved, only creator or admin can view it
    if (puja.status !== 'approved') {
      const isCreator = req.user && req.user._id.toString() === puja.createdBy?._id?.toString();
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isCreator && !isAdmin) {
        return res.status(404).json({
          success: false,
          message: 'This pandal submission is currently pending review or has been archived.',
        });
      }
    }

    // Compute deterministic crowd estimate
    const crowdEstimate = await getCrowdEstimateForPuja(puja);

    // Fetch associated recent community posts
    const recentPosts = await Post.find({
      associatedPujaId: puja._id,
      moderationStatus: 'published',
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('authorId', 'name avatar');

    // Fetch nearby approved pujas within 3km for discovery
    let nearby = [];
    if (puja.location?.coordinates?.length === 2) {
      nearby = await Puja.find({
        _id: { $ne: puja._id },
        status: 'approved',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: puja.location.coordinates,
            },
            $maxDistance: 3000,
          },
        },
      })
        .limit(4)
        .select('name slug locality images location category');
    }

    res.json({
      success: true,
      puja,
      crowdEstimate,
      recentPosts,
      nearbyPujas: nearby,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPujaById(req, res, next) {
  try {
    const { id } = req.params;
    const puja = await Puja.findById(id).populate('createdBy', 'name');

    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Durga Puja pandal not found.',
      });
    }

    const crowdEstimate = await getCrowdEstimateForPuja(puja);

    res.json({
      success: true,
      puja,
      crowdEstimate,
    });
  } catch (err) {
    next(err);
  }
}

export async function submitPujaSuggestion(req, res, next) {
  try {
    const {
      name,
      description,
      address,
      locality,
      category,
      festivalYear,
      timings,
      coordinates,
      images,
      locationSource,
      reportedGpsAccuracy,
    } = req.body;

    const isAdmin = req.user.role === 'admin';
    const isGps = locationSource === 'gps';

    // Normal users can only register pandals at their present on-site location via GPS
    if (!isAdmin && !isGps) {
      return res.status(403).json({
        success: false,
        message:
          'Normal users can only register new pandals at their current verified location using GPS. Only administrators can add custom remote locations.',
      });
    }

    // Check for possible duplicates
    const duplicateCheck = await findPossibleDuplicates({
      name,
      address,
      locality,
      coordinates,
    });

    const slug = await generateUniqueSlug(name);

    // If submitted by admin OR with verified GPS present location, activate live on map immediately!
    const status = isAdmin || isGps ? 'approved' : 'pending';

    const newPuja = await Puja.create({
      name,
      slug,
      description,
      address,
      locality,
      category,
      festivalYear: festivalYear || new Date().getFullYear(),
      timings,
      location: {
        type: 'Point',
        coordinates,
      },
      images: images || [],
      status,
      createdBy: req.user._id,
      reviewedBy: isAdmin ? req.user._id : null,
      reviewedAt: isAdmin || isGps ? new Date() : null,
    });
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');

    res.status(201).json({
      success: true,
      message:
        status === 'approved'
          ? 'Pandal successfully registered and activated live on the map! Hoppers can now trace its location and view live crowd details.'
          : 'Thank you! Your pandal suggestion has been submitted for review.',
      puja: newPuja,
      isLive: status === 'approved',
      possibleDuplicates: duplicateCheck.possibleDuplicates,
      hasPossibleDuplicates: duplicateCheck.isPossibleDuplicate,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyContributions(req, res, next) {
  try {
    const contributions = await Puja.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: contributions.length,
      contributions,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSearchSuggestions(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, pujas: [], localities: [] });
    }

    const queryStr = q.trim();
    const cacheKey = `puja-suggestions:${queryStr.toLowerCase()}`;
    const cached = getPublicCache(cacheKey);
    if (cached) return res.json(cached);
    const regex = new RegExp(queryStr, 'i');

    // 1. Search matching approved pandals
    const matchedPujas = await Puja.find({
      status: 'approved',
      $or: [{ name: regex }, { locality: regex }, { address: regex }],
    })
      .select('name slug locality address location images')
      .limit(6);

    // Attach current crowd estimates
    const pujasWithCrowd = await Promise.all(
      matchedPujas.map(async (puja) => {
        const estimate = await getCrowdEstimateForPuja(puja);
        return {
          _id: puja._id,
          name: puja.name,
          slug: puja.slug,
          locality: puja.locality,
          address: puja.address,
          coordinates: puja.location?.coordinates,
          image: puja.images?.[0] || null,
          crowdEstimate: estimate,
        };
      })
    );

    // 2. Search matching standard localities
    const allLocalities = [
      'North Kolkata',
      'Central Kolkata',
      'South Kolkata',
      'Lake Town',
      'Kalyani',
      'Naihati',
      'Barrackpore',
      'Sodepur',
      'Halisahar',
      'Bagbazar',
      'Shyambazar',
      'Gariahat',
      'Ballygunge',
      'Salt Lake',
      'Behala',
      'Jadavpur',
      'Dum Dum',
      'Howrah',
      'Bhowanipore',
    ];
    const matchedLocalities = allLocalities.filter((loc) =>
      loc.toLowerCase().includes(queryStr.toLowerCase())
    );

    const payload = {
      success: true,
      query: queryStr,
      pujas: pujasWithCrowd,
      localities: matchedLocalities,
    };
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    setPublicCache(cacheKey, payload, 30_000);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function geocodeLocationQuery(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const queryStr = q.trim();
    const resolved = await resolveLocationCoordinates(queryStr);

    if (!resolved || !resolved.coordinates || resolved.coordinates.length !== 2) {
      return res.status(404).json({
        success: false,
        message: `Could not find geographic coordinates for "${queryStr}". Try searching a locality, landmark, or pandal name.`,
      });
    }

    const [lng, lat] = resolved.coordinates;

    // Find pandals within 3km of this searched location
    let nearbyPujas = await Puja.find({
      status: 'approved',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 3000,
        },
      },
    }).limit(6);

    // If none found within 3km, expand search to 15km
    if (nearbyPujas.length === 0) {
      nearbyPujas = await Puja.find({
        status: 'approved',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: 15000,
          },
        },
      }).limit(4);
    }

    const nearbyWithCrowd = await Promise.all(
      nearbyPujas.map(async (p) => {
        const est = await getCrowdEstimateForPuja(p);
        return {
          _id: p._id,
          name: p.name,
          slug: p.slug,
          locality: p.locality,
          coordinates: p.location.coordinates,
          crowdEstimate: est,
        };
      })
    );

    res.json({
      success: true,
      locationName: resolved.locationName || queryStr,
      displayName: resolved.displayName || queryStr,
      coordinates: [lng, lat],
      nearbyPujas: nearbyWithCrowd,
    });
  } catch (err) {
    next(err);
  }
}
