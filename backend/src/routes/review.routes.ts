import { Router } from 'express';
import {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview
} from '../controllers/review.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { createReviewSchema, updateReviewSchema } from '../validations/review.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getAllReviews);
router.get('/:id', getReviewById);
router.post('/', requireRoles([Role.ADMIN, Role.MANAGER]), validateRequest(createReviewSchema), createReview);
router.put('/:id', validateRequest(updateReviewSchema), updateReview); // Employee can put to acknowledge, Admin/Manager can update draft content
router.delete('/:id', requireRoles([Role.ADMIN, Role.MANAGER]), deleteReview);

export default router;
