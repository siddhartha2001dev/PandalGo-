import express from 'express';
import {
  createPost,
  getPosts,
  getPostById,
  getMyPosts,
  deletePost,
} from '../controllers/postController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPostSchema } from '../validators/postValidator.js';

const router = express.Router();

router.get('/', getPosts);
router.get('/mine', requireAuth, getMyPosts);
router.get('/:id', getPostById);
router.post('/', requireAuth, validate(createPostSchema), createPost);
router.delete('/:id', requireAuth, deletePost);

export default router;
