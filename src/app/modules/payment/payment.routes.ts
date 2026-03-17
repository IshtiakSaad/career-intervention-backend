import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { PaymentValidation } from './payment.validation';
import { PaymentController } from './payment.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/initiate',
  authMiddleware('MENTEE'),
  validateRequest(PaymentValidation.createPaymentValidationSchema),
  PaymentController.initiatePayment
);

router.get(
  '/:sessionId',
  authMiddleware('MENTOR', 'MENTEE', 'ADMIN'),
  PaymentController.getPayment
);

export const PaymentRoutes = router;
