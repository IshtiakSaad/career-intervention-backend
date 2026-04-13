import express from 'express';
import { validateRequest } from '../../middlewares/validateRequest';
import { SpecialtyValidation } from './specialty.validation';
import { SpecialtyController } from './specialty.controller';
import { authMiddleware } from '../../middlewares/authMiddleware';

const router = express.Router();

router.post(
  '/',
  authMiddleware('ADMIN'),
  validateRequest(SpecialtyValidation.createSpecialtyValidationSchema),
  SpecialtyController.createSpecialty
);

router.get('/', SpecialtyController.getAllSpecialties);

router.delete(
  '/:id',
  authMiddleware('ADMIN'),
  SpecialtyController.deleteSpecialty
);

router.patch(
  '/:id',
  authMiddleware('ADMIN'),
  validateRequest(SpecialtyValidation.updateSpecialtyValidationSchema),
  SpecialtyController.updateSpecialty
);

export const SpecialtyRoutes = router;
