import rateLimit from "express-rate-limit";

/**
 * Global API Rate Limiter
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
 * Refresh Token Limiter (Session-based traffic, higher tolerance)
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // allow bursts
  message: {
    success: false,
    message: "Too many token refresh requests, slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Booking Limiter (Bot protection)
 */
export const bookingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // 3 is too aggressive in real UX
  message: {
    success: false,
    message: "You are booking too fast, please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});