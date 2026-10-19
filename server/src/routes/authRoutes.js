import express from 'express';
import { register, login, logout, refresh, me, listSessions, revokeSession, revokeAllSessions } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/authValidator.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.get('/sessions', requireAuth, listSessions);
router.delete('/sessions/:id', requireAuth, revokeSession);
router.delete('/sessions', requireAuth, revokeAllSessions);

export default router;
