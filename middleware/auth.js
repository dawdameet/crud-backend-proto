const { verifyAccessToken } = require('../utils/jwt');
const { supabaseAdmin } = require('../config/database');
const logger = require('../config/logger');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists and is active
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      logger.warn('Token verification failed - user not found', {
        userId: decoded.userId,
        error: error?.message
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    if (!user.is_active) {
      logger.warn('Token verification failed - user inactive', {
        userId: decoded.userId
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      req.user = null;
    } else {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
