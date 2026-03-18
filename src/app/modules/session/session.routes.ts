import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { SessionValidation } from './session.validation';
import { SessionController } from './session.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/book',
  authMiddleware('MENTEE'),
  validateRequest(SessionValidation.bookSessionValidationSchema),
  SessionController.bookSession
);

router.get(
  '/my-sessions',
  authMiddleware('MENTOR', 'MENTEE', 'ADMIN'),
  SessionController.getMySessions
);

router.patch(
  '/:id',
  authMiddleware('MENTOR', 'MENTEE', 'ADMIN'),
  validateRequest(SessionValidation.updateSessionValidationSchema),
  SessionController.updateSession
);

router.delete(
  '/:id',
  authMiddleware('ADMIN'),
  SessionController.deleteSession
);

export const SessionRoutes = router;
