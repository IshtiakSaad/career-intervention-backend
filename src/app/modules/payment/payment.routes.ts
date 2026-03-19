import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { PaymentValidation } from "./payment.validation";
import { PaymentController } from "./payment.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

// === Authenticated Routes ===

// Mentee initiates a payment for a booked session
router.post(
  "/initiate",
  authMiddleware("MENTEE"),
  validateRequest(PaymentValidation.initiatePaymentValidationSchema),
  PaymentController.initiatePayment
);

// Get payment status by session ID
router.get(
  "/:sessionId",
  authMiddleware("MENTOR", "MENTEE", "ADMIN"),
  PaymentController.getPayment
);

// === SSLCommerz Callback Routes (Public — called by gateway) ===

// Success redirect (user lands here — DO NOT TRUST)
router.post("/success", PaymentController.handleSuccess);

// Failure redirect
router.post("/fail", PaymentController.handleFail);

// Cancel redirect
router.post("/cancel", PaymentController.handleCancel);

// IPN — Server-to-Server (SOURCE OF TRUTH)
router.post("/ipn", PaymentController.handleIPN);

export const PaymentRoutes = router;
