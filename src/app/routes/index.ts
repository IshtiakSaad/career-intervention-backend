import express from "express";
import { UserRoutes } from "../modules/users/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { MentorRoutes } from "../modules/mentor/mentor.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";
import { ServiceOfferingRoutes } from "../modules/serviceOffering/serviceOffering.routes";
import { AvailabilitySlotRoutes } from "../modules/availabilitySlot/availabilitySlot.routes";
import { SessionRoutes } from "../modules/session/session.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { FeedbackRoutes } from "../modules/feedback/feedback.routes";
import { SpecialtyRoutes } from "../modules/specialty/specialty.routes";
import { MentorSpecialtyRoutes } from "../modules/mentorSpecialty/mentorSpecialty.routes";
import { AiRoutes } from "../modules/ai/ai.routes";

const router = express.Router();


// Mount module routes
router.use("/users", UserRoutes);                           // /api/v1/users
router.use("/auth", AuthRoutes);                            // /api/v1/auth
router.use("/mentors", MentorRoutes);                       // /api/v1/mentors
router.use("/admins", AdminRoutes);                         // /api/v1/admins
router.use("/services", ServiceOfferingRoutes);             // /api/v1/services
router.use("/availability-slots", AvailabilitySlotRoutes);  // /api/v1/availability-slots
router.use("/sessions", SessionRoutes);                     // /api/v1/sessions
router.use("/payments", PaymentRoutes);                     // /api/v1/payments
router.use("/feedbacks", FeedbackRoutes);                   // /api/v1/feedbacks
router.use("/specialties", SpecialtyRoutes);               // /api/v1/specialties
router.use("/mentor-specialties", MentorSpecialtyRoutes);   // /api/v1/mentor-specialties
router.use("/ai", AiRoutes);                                // /api/v1/ai


// Optional root route
router.get("/", (req, res) => {
  res.json({
    message: "API v1 is running",
  });
});

export default router;