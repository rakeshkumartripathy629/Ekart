const rateLimit = require('express-rate-limit');

// Per-user rate limiter (after auth) — stricter per-user limit
exports.rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded, slow down' },
});
