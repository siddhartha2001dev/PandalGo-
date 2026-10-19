import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again in a few minutes.',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit login/register attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const crowdReportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20, // Rate limit crowd observations
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have submitted several crowd reports recently. Please wait a moment before reporting again.',
  },
});
