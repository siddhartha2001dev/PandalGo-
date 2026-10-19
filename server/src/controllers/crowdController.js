import { CrowdObservation } from '../models/CrowdObservation.js';
import { Puja } from '../models/Puja.js';
import { getCrowdEstimateForPuja, calculateDistanceMeters } from '../services/crowdService.js';
import { analyzeImageCrowd } from '../services/crowdVisionService.js';
import { findLatestLocationImage } from '../services/locationImageFinderService.js';
import { getTrafficCongestionForLocation } from '../services/trafficCongestionService.js';
import { env } from '../config/env.js';

export async function submitCrowdReport(req, res, next) {
  try {
    const { pujaId } = req.params;
    const { crowdLevel, estimatedWaitMinutes, coordinates, gpsAccuracy, source, imageReference } = req.body;

    const puja = await Puja.findById(pujaId);
    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Durga Puja pandal not found.',
      });
    }

    if (puja.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Crowd reports can only be submitted for approved Durga Puja pandals.',
      });
    }

    // Geographic verification: 100-metre radius check
    const pandalCoords = puja.location?.coordinates;
    if (!pandalCoords || pandalCoords.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'This pandal does not have valid coordinates registered.',
      });
    }

    const distanceMeters = calculateDistanceMeters(coordinates, pandalCoords);
    const maxRadius = env.CROWD_RADIUS_METERS || 100;

    if (distanceMeters > maxRadius) {
      return res.status(400).json({
        success: false,
        message: `Your observation location is ${Math.round(distanceMeters)}m from the pandal. Observations must be within ${maxRadius}m to be considered relevant to the pandal queue.`,
        distanceMeters: Math.round(distanceMeters),
        maxAllowedRadiusMeters: maxRadius,
      });
    }

    // Check user cooldown (prevent duplicate submissions within e.g. 3 minutes from same user for same pandal)
    const cooldownMinutes = 3;
    const recentFromUser = await CrowdObservation.findOne({
      pujaId,
      reportedBy: req.user._id,
      createdAt: { $gte: new Date(Date.now() - cooldownMinutes * 60 * 1000) },
    });

    if (recentFromUser) {
      return res.status(429).json({
        success: false,
        message: `You already submitted a crowd report for this pandal ${Math.round((Date.now() - recentFromUser.createdAt) / 60000)} minutes ago. Please wait a few moments before updating.`,
      });
    }

    // Save observation
    const observation = await CrowdObservation.create({
      pujaId: puja._id,
      reportedBy: req.user._id,
      observationLocation: {
        type: 'Point',
        coordinates,
      },
      gpsAccuracy: gpsAccuracy || null,
      crowdLevel,
      estimatedWaitMinutes: typeof estimatedWaitMinutes === 'number' ? estimatedWaitMinutes : null,
      imageReference: imageReference || null,
      source: source || 'gps',
    });

    // Recalculate deterministic crowd estimate
    const updatedEstimate = await getCrowdEstimateForPuja(puja);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your crowd observation has been recorded.',
      observationId: observation._id,
      updatedEstimate,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPujaCrowdEstimate(req, res, next) {
  try {
    const { pujaId } = req.params;
    const puja = await Puja.findById(pujaId);

    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Pandal not found.',
      });
    }

    const estimate = await getCrowdEstimateForPuja(puja);

    res.json({
      success: true,
      pujaId,
      estimate,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMapCrowdOverview(req, res, next) {
  try {
    const { ids, locality } = req.query;

    const query = { status: 'approved' };
    if (ids) {
      const idArray = ids.split(',').map((id) => id.trim()).filter(Boolean);
      query._id = { $in: idArray };
    } else if (locality && locality !== 'all') {
      query.locality = new RegExp(`^${locality.trim()}$`, 'i');
    }

    const pujas = await Puja.find(query).limit(50);

    const crowdMap = {};
    for (const puja of pujas) {
      const estimate = await getCrowdEstimateForPuja(puja);
      crowdMap[puja._id] = estimate;
    }

    res.json({
      success: true,
      count: pujas.length,
      crowdMap,
    });
  } catch (err) {
    next(err);
  }
}

export async function autoDetectCrowd(req, res, next) {
  try {
    const { pujaId, imageUrl, coordinates } = req.body;
    const file = req.file;

    if (!file && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file or provide an imageUrl for OpenCV crowd vision detection.',
      });
    }

    let parsedCoords = null;
    if (coordinates) {
      try {
        parsedCoords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
      } catch (e) {}
    }

    // Run OpenCV Computer Vision Analysis
    const result = await analyzeImageCrowd({
      fileBuffer: file ? file.buffer : null,
      imageUrl: imageUrl || null,
      pujaId: pujaId || null,
      reportedBy: req.user ? req.user._id : null,
      autoRecordObservation: Boolean(pujaId),
    });

    res.json({
      success: true,
      message: 'OpenCV Computer Vision crowd analysis completed successfully.',
      analysis: result.visionResult,
      updatedEstimate: result.updatedEstimate,
      observationId: result.createdObservation?._id || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function autoDetectLocationCrowd(req, res, next) {
  try {
    const { pujaId, coordinates, locationName, locality } = req.body;

    let parsedCoords = null;
    if (coordinates) {
      try {
        parsedCoords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
      } catch (e) {}
    }

    // 1. Automatically find the latest image of that location
    const locationImage = await findLatestLocationImage({
      pujaId,
      coordinates: parsedCoords,
      locationName,
      locality,
    });

    if (!locationImage || !locationImage.imageUrl) {
      return res.status(404).json({
        success: false,
        message: 'No recent image could be found for this location.',
      });
    }

    // 2. Fetch Live Traffic Congestion & Road Perimeter Speed
    const targetLat = parsedCoords?.[1] || locationImage.puja?.location?.coordinates?.[1];
    const targetLon = parsedCoords?.[0] || locationImage.puja?.location?.coordinates?.[0];

    const trafficData = await getTrafficCongestionForLocation({
      latitude: targetLat,
      longitude: targetLon,
      locationName: locationName || locationImage.puja?.name,
      locality: locality || locationImage.puja?.locality,
    });

    // 3. Process image with OpenCV computer vision
    let result;
    try {
      result = await analyzeImageCrowd({
        imageUrl: locationImage.imageUrl,
        pujaId: locationImage.puja?._id || pujaId || null,
        reportedBy: req.user ? req.user._id : null,
        autoRecordObservation: Boolean(locationImage.puja?._id || pujaId),
      });
    } catch (initialErr) {
      // If remote image download failed (e.g. rate limit), gracefully try registered pandal photo
      if (locationImage.puja?.images?.[0] && locationImage.imageUrl !== locationImage.puja.images[0]) {
        result = await analyzeImageCrowd({
          imageUrl: locationImage.puja.images[0],
          pujaId: locationImage.puja._id,
          reportedBy: req.user ? req.user._id : null,
          autoRecordObservation: Boolean(locationImage.puja._id),
        });
      } else {
        throw initialErr;
      }
    }

    // 4. Authenticated Sensor Fusion:
    // If vision detected low crowd (e.g. photo is of an idol/murti with no people visible),
    // but the surrounding perimeter road is completely choked with festival traffic:
    const vision = result.visionResult || {};
    let finalCrowdLevel = vision.crowdLevel || 'low';
    let finalWaitMinutes = vision.estimatedWaitMinutes || 10;
    let fusionAlert = null;

    if (trafficData.congestionLevel === 'high' && vision.crowdLevel === 'low') {
      finalCrowdLevel = 'high';
      finalWaitMinutes = Math.max(finalWaitMinutes, 60);
      fusionAlert = 'Traffic & Road Gridlock Alert: Heavy vehicular and pedestrian congestion detected around pandal perimeter. Crowd level upgraded to High!';
    } else if (trafficData.congestionLevel === 'high' && vision.crowdLevel === 'moderate') {
      finalCrowdLevel = 'high';
      finalWaitMinutes = Math.max(finalWaitMinutes, 50);
      fusionAlert = 'Road Congestion Notice: Severe perimeter delay confirms dense queue and visitor surge.';
    } else if (trafficData.congestionLevel === 'moderate' && vision.crowdLevel === 'low') {
      finalCrowdLevel = 'moderate';
      finalWaitMinutes = Math.max(finalWaitMinutes, 25);
      fusionAlert = 'Approach Traffic Notice: Slow road speed indicates moderate queue forming outside pandal.';
    }

    vision.crowdLevel = finalCrowdLevel;
    vision.estimatedWaitMinutes = finalWaitMinutes;
    if (fusionAlert) {
      vision.fusionAlert = fusionAlert;
    }

    // Update recorded observation if created so database matches fused truth
    if (result.createdObservation) {
      result.createdObservation.crowdLevel = finalCrowdLevel;
      result.createdObservation.estimatedWaitMinutes = finalWaitMinutes;
      result.createdObservation.imageAnalysisResult = {
        ...vision,
        trafficCongestion: trafficData,
      };
      await result.createdObservation.save();
      if (locationImage.puja) {
        result.updatedEstimate = await getCrowdEstimateForPuja(locationImage.puja);
      }
    }

    res.json({
      success: true,
      message: `Latest location image retrieved from ${locationImage.source} and verified with real-time road traffic intelligence.`,
      image: {
        url: locationImage.imageUrl,
        title: locationImage.title,
        source: locationImage.source,
        timestamp: locationImage.timestamp,
      },
      traffic: trafficData,
      analysis: vision,
      updatedEstimate: result.updatedEstimate,
      observationId: result.createdObservation?._id || null,
      puja: locationImage.puja || null,
    });
  } catch (err) {
    next(err);
  }
}

