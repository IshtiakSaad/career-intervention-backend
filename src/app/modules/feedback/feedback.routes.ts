import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { FeedbackValidation } from './feedback.validation';
import { FeedbackController } from './feedback.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/',
  authMiddleware('MENTEE'),
  validateRequest(FeedbackValidation.createFeedbackValidationSchema),
  FeedbackController.createFeedback
);

router.get(
  '/mentor/:mentorId',
  FeedbackController.getMentorFeedbacks
);

export const FeedbackRoutes = router;
