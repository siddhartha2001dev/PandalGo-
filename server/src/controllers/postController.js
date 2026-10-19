import { Post } from '../models/Post.js';
import { Puja } from '../models/Puja.js';
import { getCrowdEstimateForPuja } from '../services/crowdService.js';
import { clearPublicCache } from '../services/publicCache.js';

export async function createPost(req, res, next) {
  try {
    const {
      title,
      description,
      locality,
      images,
      associatedPujaId,
      coordinates,
      locationSource,
      reportedGpsAccuracy,
      category,
    } = req.body;

    let locationData = undefined;
    if (coordinates && coordinates.length === 2) {
      locationData = {
        type: 'Point',
        coordinates,
      };
    }

    // Verify associated pandal exists if specified
    if (associatedPujaId) {
      const exists = await Puja.exists({ _id: associatedPujaId });
      if (!exists) {
        return res.status(400).json({
          success: false,
          message: 'The associated Durga Puja pandal was not found.',
        });
      }
    }

    const post = await Post.create({
      authorId: req.user._id,
      title: title || '',
      description,
      locality,
      images: images || [],
      location: locationData,
      locationSource: locationSource || null,
      reportedGpsAccuracy: reportedGpsAccuracy || null,
      associatedPujaId: associatedPujaId || null,
      category: category || 'Puja Experience',
      moderationStatus: 'published',
    });

    const populated = await Post.findById(post._id)
      .populate('authorId', 'name avatar')
      .populate('associatedPujaId', 'name slug locality status');

    clearPublicCache('puja-suggestions:');

    res.status(201).json({
      success: true,
      message: 'Your Puja post has been published to the community feed!',
      post: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPosts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const { locality, category, pujaId } = req.query;

    const query = { moderationStatus: 'published' };

    if (locality && locality !== 'all') {
      query.locality = new RegExp(`^${locality.trim()}$`, 'i');
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (pujaId) {
      query.associatedPujaId = pujaId;
    }

    const total = await Post.countDocuments(query);
    const rawPosts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name avatar')
      .populate('associatedPujaId', 'name slug locality status location');

    // Attach verified crowd estimate only for posts with associated approved pujas
    // Cached map to avoid duplicate calculations in the same batch
    const pujaCrowdCache = new Map();

    const posts = await Promise.all(
      rawPosts.map(async (p) => {
        const plain = p.toObject();

        // Privacy protection: strip raw author email and exact coordinates from public response
        delete plain.reportedGpsAccuracy;
        if (plain.locationSource === 'gps') {
          // Keep general location flag without exposing raw personal coordinates
          plain.hasGpsLocation = true;
        }

        // Attach verified crowd estimate and traceable location if associated with an approved pandal
        if (plain.associatedPujaId && plain.associatedPujaId.status === 'approved') {
          const pujaKey = plain.associatedPujaId._id.toString();
          if (!pujaCrowdCache.has(pujaKey)) {
            const estimate = await getCrowdEstimateForPuja(plain.associatedPujaId);
            pujaCrowdCache.set(pujaKey, estimate);
          }
          const crowd = pujaCrowdCache.get(pujaKey);
          if (crowd) {
            plain.crowdEstimate = crowd;
            plain.crowdStatus = crowd.crowdStatus;
            plain.crowdConfidence = crowd.confidence;
            plain.estimatedWaitMinutes = crowd.estimatedWaitMinutes;
            plain.observationCount = crowd.observationCount;
            plain.lastUpdated = crowd.lastUpdated;
          }
          if (plain.associatedPujaId.location?.coordinates) {
            plain.pandalCoordinates = plain.associatedPujaId.location.coordinates;
          }
        }

        if (plain.location?.coordinates) {
          plain.coordinates = plain.location.coordinates;
        }

        return plain;
      })
    );

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPostById(req, res, next) {
  try {
    const { id } = req.params;
    const post = await Post.findOne({ _id: id, moderationStatus: 'published' })
      .populate('authorId', 'name avatar')
      .populate('associatedPujaId', 'name slug locality status');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Community post not found.',
      });
    }

    res.json({
      success: true,
      post,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyPosts(req, res, next) {
  try {
    const posts = await Post.find({ authorId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('associatedPujaId', 'name slug locality');

    res.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const isAuthor = post.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post.',
      });
    }

    await Post.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Post deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}
