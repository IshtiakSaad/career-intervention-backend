import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { MentorSpecialtyValidation } from './mentorSpecialty.validation';
import { MentorSpecialtyController } from './mentorSpecialty.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/',
  authMiddleware('MENTOR'),
  validateRequest(MentorSpecialtyValidation.createMentorSpecialtyValidationSchema),
  MentorSpecialtyController.assignSpecialty
);

router.delete(
  '/:specialtyId',
  authMiddleware('MENTOR'),
  MentorSpecialtyController.removeSpecialty
);

export const MentorSpecialtyRoutes = router;
