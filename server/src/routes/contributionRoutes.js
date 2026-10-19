import express from 'express';
import { submitPujaSuggestion, getMyContributions } from '../controllers/pujaController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submitPujaSchema } from '../validators/pujaValidator.js';

const router = express.Router();

router.post('/', requireAuth, validate(submitPujaSchema), submitPujaSuggestion);
router.get('/mine', requireAuth, getMyContributions);

export default router;
