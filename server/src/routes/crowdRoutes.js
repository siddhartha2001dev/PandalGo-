import express from 'express';
import {
  submitCrowdReport,
  getPujaCrowdEstimate,
  getMapCrowdOverview,
  autoDetectCrowd,
  autoDetectLocationCrowd,
} from '../controllers/crowdController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { crowdReportSchema } from '../validators/crowdValidator.js';
import { crowdReportLimiter } from '../middleware/rateLimiter.js';
import { uploadSingleImage } from '../middleware/upload.js';

const router = express.Router();

// Map overview
router.get('/map', getMapCrowdOverview);

// AI / OpenCV Crowd Auto-detection (Uploaded Photo or Image URL)
router.post('/auto-detect', optionalAuth, uploadSingleImage, autoDetectCrowd);

// AI / OpenCV Location Auto-Fetch: System finds the latest image of that location automatically!
router.post('/auto-detect-location', optionalAuth, autoDetectLocationCrowd);

// Single pandal crowd estimate and crowd report submission
router.get('/:pujaId/crowd', getPujaCrowdEstimate);
router.post(
  '/:pujaId/crowd-reports',
  requireAuth,
  crowdReportLimiter,
  validate(crowdReportSchema),
  submitCrowdReport
);

export default router;
