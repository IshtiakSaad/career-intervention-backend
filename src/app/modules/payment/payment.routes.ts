import express from "express";
import { validateRequest } from "../../middlewares/validateRequest";
import { PaymentValidation } from "./payment.validation";
import { PaymentController } from "./payment.controller";
import { PayoutController } from "./payout.controller";
import { authMiddleware } from "../../middlewares/authMiddleware";

const router = express.Router();

// ═══════════════════════════════════════════
// SSLCommerz Payment Flow
// ═══════════════════════════════════════════

// Mentee initiates payment for a booked session
router.post(
  "/initiate",
  authMiddleware("MENTEE"),
  validateRequest(PaymentValidation.initiatePaymentValidationSchema),
  PaymentController.initiatePayment
);

// Get payment status by session ID
router.get(
  "/status/:sessionId",
  authMiddleware("MENTOR", "MENTEE", "ADMIN"),
  PaymentController.getPayment
);

// === SSLCommerz Callback Routes (Public — called by gateway) ===
router.post("/success", PaymentController.handleSuccess);
router.post("/fail", PaymentController.handleFail);
router.post("/cancel", PaymentController.handleCancel);
router.post("/ipn", PaymentController.handleIPN);

// ═══════════════════════════════════════════
// Payout Engine (Admin Only)
// ═══════════════════════════════════════════

router.get(
  "/payouts",
  authMiddleware("ADMIN"),
  PayoutController.getAllPayouts
);

router.patch(
  "/payouts/:id/process",
  authMiddleware("ADMIN"),
  validateRequest(PaymentValidation.processPayoutValidationSchema),
  PayoutController.processPayout
);

// ═══════════════════════════════════════════
// Disputes
// ═══════════════════════════════════════════

// Mentee files a dispute
router.post(
  "/disputes",
  authMiddleware("MENTEE"),
  validateRequest(PaymentValidation.fileDisputeValidationSchema),
  PayoutController.fileDispute
);

// Admin views all disputes
router.get(
  "/disputes",
  authMiddleware("ADMIN"),
  PayoutController.getAllDisputes
);

// Admin resolves a dispute
router.patch(
  "/disputes/:id/resolve",
  authMiddleware("ADMIN"),
  validateRequest(PaymentValidation.resolveDisputeValidationSchema),
  PayoutController.resolveDispute
);

export const PaymentRoutes = router;
