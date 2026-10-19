import { Puja } from '../models/Puja.js';
import { Post } from '../models/Post.js';
import { findPossibleDuplicates } from '../services/duplicateDetector.js';
import { generateUniqueSlug } from './pujaController.js';
import { clearPublicCache } from '../services/publicCache.js';

export async function getPendingContributions(req, res, next) {
  try {
    const pendingPujas = await Puja.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email createdAt');

    // Attach duplicate analysis for owner inspection
    const enriched = await Promise.all(
      pendingPujas.map(async (puja) => {
        const plain = puja.toObject();
        const duplicateCheck = await findPossibleDuplicates({
          name: puja.name,
          address: puja.address,
          locality: puja.locality,
          coordinates: puja.location?.coordinates,
          excludeId: puja._id,
        });
        plain.duplicateAnalysis = duplicateCheck;
        return plain;
      })
    );

    res.json({
      success: true,
      count: enriched.length,
      contributions: enriched,
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewContribution(req, res, next) {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const puja = await Puja.findById(id);
    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Contribution record not found.',
      });
    }

    if (status === 'approved' && !puja.slug) {
      puja.slug = await generateUniqueSlug(puja.name);
    }

    puja.status = status;
    puja.reviewedBy = req.user._id;
    puja.reviewedAt = new Date();
    if (status === 'rejected') {
      puja.rejectionReason = rejectionReason || 'Information could not be verified.';
    } else {
      puja.rejectionReason = '';
    }

    await puja.save();
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');

    res.json({
      success: true,
      message: `Pandal suggestion has been ${status}.`,
      puja,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminPujas(req, res, next) {
  try {
    const { status, q } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (q) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [{ name: regex }, { locality: regex }, { address: regex }];
    }

    const pujas = await Puja.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      count: pujas.length,
      pujas,
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePuja(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, address, locality, category, festivalYear, timings, coordinates, images, status } =
      req.body;

    const puja = await Puja.findById(id);
    if (!puja) {
      return res.status(404).json({
        success: false,
        message: 'Pandal record not found.',
      });
    }

    if (name && name !== puja.name) {
      puja.name = name;
      puja.slug = await generateUniqueSlug(name);
    }

    if (description !== undefined) puja.description = description;
    if (address) puja.address = address;
    if (locality) puja.locality = locality;
    if (category) puja.category = category;
    if (festivalYear) puja.festivalYear = festivalYear;
    if (timings) puja.timings = timings;
    if (images) puja.images = images;
    if (status) puja.status = status;

    if (coordinates && coordinates.length === 2) {
      puja.location = {
        type: 'Point',
        coordinates,
      };
    }

    await puja.save();
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');

    res.json({
      success: true,
      message: 'Pandal details updated successfully.',
      puja,
    });
  } catch (err) {
    next(err);
  }
}

export async function getReportedPosts(req, res, next) {
  try {
    const posts = await Post.find({
      $or: [{ moderationStatus: 'flagged' }, { reportCount: { $gt: 0 } }],
    })
      .sort({ reportCount: -1, createdAt: -1 })
      .populate('authorId', 'name email');

    res.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (err) {
    next(err);
  }
}

export async function moderatePost(req, res, next) {
  try {
    const { id } = req.params;
    const { moderationStatus } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    post.moderationStatus = moderationStatus;
    await post.save();

    res.json({
      success: true,
      message: `Post moderation status updated to '${moderationStatus}'.`,
      post,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Auto-import verified real Kolkata Durga Pujas from open database catalog
 */
export async function autoImportRealPujasController(req, res, next) {
  try {
    const { autoImportVerifiedPujas } = await import('../services/pujaDiscoveryService.js');
    const result = await autoImportVerifiedPujas({ adminUserId: req.user._id });
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');

    res.json({
      success: true,
      message: `Successfully synchronized ${result.createdCount} new pandals and verified ${result.updatedCount + result.existingCount} existing locations.`,
      result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Search & import a specific single pandal or location via OpenStreetMap geocoding
 */
export async function importSinglePujaController(req, res, next) {
  try {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const { searchAndImportFromOSM } = await import('../services/pujaDiscoveryService.js');
    const result = await searchAndImportFromOSM({
      query,
      adminUserId: req.user._id,
      category,
    });
    clearPublicCache('pujas:');
    clearPublicCache('puja-suggestions:');

    res.json({
      success: true,
      message: `Successfully located "${result.puja.name}" and pinned to the live map!`,
      puja: result.puja,
      crowdAnalysis: result.crowdAnalysis,
    });
  } catch (err) {
    next(err);
  }
}

