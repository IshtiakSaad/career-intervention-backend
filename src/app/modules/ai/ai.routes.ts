import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { AiValidation } from './ai.validation';
import { AiController } from './ai.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/suggest-mentors',
  // authMiddleware('MENTEE'), // Uncomment if only mentees should use the AI match
  validateRequest(AiValidation.suggestMentorValidationSchema),
  AiController.suggestMentors
);

export const AiRoutes = router;
