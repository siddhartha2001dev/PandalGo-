import express from 'express';
import {
  getPendingContributions,
  reviewContribution,
  getAdminPujas,
  updatePuja,
  getReportedPosts,
  moderatePost,
  autoImportRealPujasController,
  importSinglePujaController,
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewPujaSchema } from '../validators/pujaValidator.js';

const router = express.Router();

// Enforce authentication AND administrator authorization on all /admin routes
router.use(requireAuth, requireAdmin);

router.get('/contributions', getPendingContributions);
router.patch('/contributions/:id/review', validate(reviewPujaSchema), reviewContribution);

router.get('/pujas', getAdminPujas);
router.patch('/pujas/:id', updatePuja);
router.post('/pujas/auto-import', autoImportRealPujasController);
router.post('/pujas/import-single', importSinglePujaController);

router.get('/posts/reports', getReportedPosts);
router.patch('/posts/:id/moderate', moderatePost);

export default router;
