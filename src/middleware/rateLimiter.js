const rateLimit = require('express-rate-limit');

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 review submissions/verifications per hour
  message: {
    message: 'Too many review attempts from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { reviewLimiter };
