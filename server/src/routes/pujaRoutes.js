import express from 'express';
import {
  getPujas,
  getPujaBySlug,
  getPujaById,
  submitPujaSuggestion,
  getMyContributions,
  getSearchSuggestions,
  geocodeLocationQuery,
} from '../controllers/pujaController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submitPujaSchema } from '../validators/pujaValidator.js';

const router = express.Router();

// Search & Geocoding
router.get('/search-suggestions', getSearchSuggestions);
router.get('/geocode-location', geocodeLocationQuery);

// Public discovery
router.get('/', getPujas);
router.get('/nearby', getPujas); // Handles geo query via lat/lng
router.get('/slug/:slug', optionalAuth, getPujaBySlug);
router.get('/:id', optionalAuth, getPujaById);

export default router;
