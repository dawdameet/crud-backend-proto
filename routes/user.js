const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validate, changePasswordSchema, updateProfileSchema } = require('../utils/validation');

// All user routes require authentication
router.use(authenticateToken);

// Profile management
router.get('/profile', 
  userController.getProfile
);

router.put('/profile', 
  validate(updateProfileSchema),
  userController.updateProfile
);

router.put('/change-password', 
  validate(changePasswordSchema),
  userController.changePassword
);

router.delete('/account', 
  userController.deleteAccount
);

// Session management
router.get('/sessions', 
  userController.getActiveSessions
);

router.delete('/sessions/:sessionId', 
  userController.revokeSession
);

router.delete('/sessions', 
  userController.revokeAllSessions
);

// Security logs
router.get('/auth-logs', 
  userController.getAuthLogs
);

module.exports = router;
