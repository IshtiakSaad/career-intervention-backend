import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { SessionValidation } from './session.validation';
import { SessionController } from './session.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { bookingRateLimiter } from '../../middlewares/rateLimiter';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// SESSION ROUTES
// ═══════════════════════════════════════════════════════════════

router.post(
  '/book',
  authMiddleware('MENTEE'),
  bookingRateLimiter,
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

// ═══════════════════════════════════════════════════════════════
// ACTION PLAN ROUTES
// ═══════════════════════════════════════════════════════════════

router.post(
  '/action-plans',
  authMiddleware('MENTOR'),
  validateRequest(SessionValidation.createActionPlanValidationSchema),
  SessionController.createActionPlan
);

router.get(
  '/action-plans/mine',
  authMiddleware('MENTOR', 'MENTEE'),
  SessionController.getMyActionPlans
);

router.get(
  '/action-plans/session/:sessionId',
  authMiddleware('MENTOR', 'MENTEE', 'ADMIN'),
  SessionController.getActionPlanBySession
);

router.patch(
  '/action-plans/:id',
  authMiddleware('MENTOR'),
  validateRequest(SessionValidation.updateActionPlanValidationSchema),
  SessionController.updateActionPlan
);

router.patch(
  '/action-plans/:id/submit',
  authMiddleware('MENTOR'),
  SessionController.submitActionPlan
);

export const SessionRoutes = router;
