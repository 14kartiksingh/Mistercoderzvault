const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../../controllers/authController');
const requireAuth = require('../../middleware/requireAuth');

// Configure rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again later.'
  }
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
