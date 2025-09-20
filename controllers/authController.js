const authService = require('../services/authService');
const { validate, registerSchema, loginSchema } = require('../utils/validation');
const logger = require('../config/logger');

class AuthController {
  /**
   * Register a new user
   */
  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, phone } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // Register user
      const result = await authService.registerUser({
        username,
        email,
        password,
        firstName,
        lastName,
        phone
      });

      // Log the registration with IP and user agent
      await authService.logAuthEvent({
        userId: result.user.id,
        eventType: 'register',
        success: true,
        ipAddress,
        userAgent,
        metadata: { username, email }
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn
        }
      });
    } catch (error) {
      logger.error('Registration controller error', {
        error: error.message,
        body: req.body,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.loginUser(identifier, password, ipAddress, userAgent);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn
        }
      });
    } catch (error) {
      logger.error('Login controller error', {
        error: error.message,
        identifier: req.body.identifier,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresIn: result.tokens.expiresIn
        }
      });
    } catch (error) {
      logger.error('Token refresh controller error', {
        error: error.message,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      await authService.logoutUser(userId, refreshToken);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout controller error', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await authService.getUserProfile(userId);

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: profile }
      });
    } catch (error) {
      logger.error('Get profile controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile'
      });
    }
  }

  /**
   * Check if username or email exists
   */
  async checkAvailability(req, res) {
    try {
      const { username, email } = req.query;

      if (!username && !email) {
        return res.status(400).json({
          success: false,
          message: 'Username or email parameter is required'
        });
      }

      const { supabaseAdmin } = require('../config/database');
      
      let query = supabaseAdmin.from('users').select('username, email');
      
      if (username && email) {
        query = query.or(`username.eq.${username},email.eq.${email}`);
      } else if (username) {
        query = query.eq('username', username);
      } else {
        query = query.eq('email', email);
      }

      const { data: existingUser } = await query.single();

      const availability = {
        username: username ? !existingUser || existingUser.username !== username : null,
        email: email ? !existingUser || existingUser.email !== email : null
      };

      res.json({
        success: true,
        message: 'Availability checked',
        data: { available: availability }
      });
    } catch (error) {
      // If no user found, both username and email are available
      const { username, email } = req.query;
      
      res.json({
        success: true,
        message: 'Availability checked',
        data: {
          available: {
            username: username ? true : null,
            email: email ? true : null
          }
        }
      });
    }
  }

  /**
   * Validate token (for client-side token verification)
   */
  async validateToken(req, res) {
    try {
      // If we reach here, the token is valid (middleware already verified it)
      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          user: req.user,
          valid: true
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
        data: { valid: false }
      });
    }
  }
}

module.exports = new AuthController();
