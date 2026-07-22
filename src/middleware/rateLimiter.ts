import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Rate limiter middleware for write operations to prevent abuse.
 * Allows 60 write requests per 15-minute window per IP in production.
 */
export const writeRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
  },
});

/**
 * Factory for creating custom-configured rate limiters (useful for testing thresholds).
 */
export function createCustomRateLimiter(
  maxRequests: number,
  windowMs: number = 15 * 60 * 1000
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests, please try again later.',
    },
  });
}
