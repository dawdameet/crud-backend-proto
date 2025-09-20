const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { validate, registerSchema, loginSchema } = require('../utils/validation');

// Public routes (with rate limiting)
router.post('/register', 
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post('/login', 
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post('/refresh-token', 
  authLimiter,
  authController.refreshToken
);

router.get('/check-availability', 
  authController.checkAvailability
);

// Protected routes (require authentication)
router.post('/logout', 
  authenticateToken,
  authController.logout
);

router.get('/profile', 
  authenticateToken,
  authController.getProfile
);

router.get('/validate-token', 
  authenticateToken,
  authController.validateToken
);

module.exports = router;
