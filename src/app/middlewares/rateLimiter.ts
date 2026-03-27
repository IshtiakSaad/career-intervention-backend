import rateLimit from "express-rate-limit";

/**
 * Global API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict Auth Limiter (Brute-force protection)
 * 5 attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Booking Limiter (Bot protection for slots)
 * 3 booking attempts per minute
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: "You are booking too fast, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
