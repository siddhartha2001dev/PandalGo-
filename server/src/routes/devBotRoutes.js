import { Router } from 'express';
import multer from 'multer';
import {
  chat,
  getConversation,
  deleteConversation,
  createImportJobPreview,
  getImportJob,
  updateImportJobRow,
  confirmImport,
  retryFailedRows,
} from '../controllers/devBotController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  devBotChatSchema,
  devBotUpdateRowSchema,
  devBotImportConfirmSchema,
} from '../validators/devBotValidator.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('csv') || file.mimetype.includes('text') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and text files are supported for pandal bulk import.'));
    }
  },
});

const router = Router();

// ==========================================
// Public / Visitor Discovery Routes
// ==========================================
router.post('/chat', optionalAuth, validate(devBotChatSchema), chat);
router.get('/conversations/:id', optionalAuth, getConversation);
router.delete('/conversations/:id', optionalAuth, deleteConversation);

// ==========================================
// Admin-Only Pandal Import & Management Routes
// ==========================================
router.post(
  '/imports/preview',
  requireAuth,
  requireAdmin,
  upload.single('file'),
  createImportJobPreview
);
router.get('/imports/:jobId', requireAuth, requireAdmin, getImportJob);
router.patch(
  '/imports/:jobId/rows',
  requireAuth,
  requireAdmin,
  validate(devBotUpdateRowSchema),
  updateImportJobRow
);
router.post(
  '/imports/:jobId/confirm',
  requireAuth,
  requireAdmin,
  validate(devBotImportConfirmSchema),
  confirmImport
);
router.post('/imports/:jobId/retry', requireAuth, requireAdmin, retryFailedRows);

export default router;
