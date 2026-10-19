import express from 'express';
import { uploadImages } from '../controllers/uploadController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadMultipleImages } from '../middleware/upload.js';

const router = express.Router();

router.post('/', requireAuth, uploadMultipleImages, uploadImages);

export default router;
