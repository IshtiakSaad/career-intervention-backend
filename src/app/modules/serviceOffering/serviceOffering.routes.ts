import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { ServiceOfferingValidation } from './serviceOffering.validation';
import { ServiceOfferingController } from './serviceOffering.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/',
  authMiddleware('MENTOR'),
  validateRequest(ServiceOfferingValidation.createServiceOfferingValidationSchema),
  ServiceOfferingController.createServiceOffering
);

router.get('/', ServiceOfferingController.getAllServiceOfferings);

router.get('/:id', ServiceOfferingController.getSingleServiceOffering);

router.patch(
  '/:id',
  authMiddleware('MENTOR'),
  validateRequest(ServiceOfferingValidation.updateServiceOfferingValidationSchema),
  ServiceOfferingController.updateServiceOffering
);

router.delete(
  '/:id',
  authMiddleware('MENTOR'),
  ServiceOfferingController.deleteServiceOffering
);

export const ServiceOfferingRoutes = router;
