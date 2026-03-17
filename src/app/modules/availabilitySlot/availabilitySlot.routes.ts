import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { AvailabilitySlotValidation } from './availabilitySlot.validation';
import { AvailabilitySlotController } from './availabilitySlot.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/',
  authMiddleware('MENTOR'),
  validateRequest(AvailabilitySlotValidation.createAvailabilitySlotValidationSchema),
  AvailabilitySlotController.createAvailabilitySlot
);

router.post(
  '/bulk-create',
  authMiddleware('MENTOR'),
  validateRequest(AvailabilitySlotValidation.bulkCreateAvailabilitySlotValidationSchema),
  AvailabilitySlotController.bulkCreateAvailabilitySlots
);

router.get('/', AvailabilitySlotController.getAllAvailabilitySlots);

router.delete(
  '/:id',
  authMiddleware('MENTOR'),
  AvailabilitySlotController.deleteAvailabilitySlot
);

export const AvailabilitySlotRoutes = router;
