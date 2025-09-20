const { supabaseAdmin } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/security');
const { generateTokens } = require('../utils/jwt');
const logger = require('../config/logger');
const crypto = require('crypto');

class AuthService {
  /**
   * Register a new user
   */
  async registerUser(userData) {
    const { username, email, password, firstName, lastName, phone } = userData;

    try {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, username, email')
        .or(`username.eq.${username},email.eq.${email}`)
        .single();

      if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email';
        throw new Error(`User with this ${field} already exists`);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          username,
          email,
          password_hash: passwordHash,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null
        })
        .select('id, username, email, first_name, last_name, phone, created_at')
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      // Log registration event
      await this.logAuthEvent({
        userId: newUser.id,
        eventType: 'register',
        success: true,
        metadata: { username, email }
      });

      // Generate tokens for immediate login
      const tokens = generateTokens(newUser);

      // Store refresh token
      await this.storeRefreshToken(newUser.id, tokens.refreshToken);

      logger.info('User registered successfully', {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
      });

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phone: newUser.phone,
          createdAt: newUser.created_at
        },
        tokens
      };
    } catch (error) {
      logger.error('Registration failed', {
        error: error.message,
        username,
        email
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  async loginUser(identifier, password, ipAddress, userAgent) {
    try {
      // Find user by username or email
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .or(`username.eq.${identifier},email.eq.${identifier}`)
        .single();

      if (error || !user) {
        await this.logAuthEvent({
          eventType: 'failed_login',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: 'User not found',
          metadata: { identifier }
        });
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        await this.logAuthEvent({
          userId: user.id,
          eventType: 'failed_login',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: 'Account locked',
          metadata: { identifier }
        });
        throw new Error('Account is temporarily locked due to too many failed attempts');
      }

      // Check if account is active
      if (!user.is_active) {
        await this.logAuthEvent({
          userId: user.id,
          eventType: 'failed_login',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: 'Account inactive',
          metadata: { identifier }
        });
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
        const lockoutTime = parseInt(process.env.LOCKOUT_TIME) || 15; // minutes

        let updateData = { failed_login_attempts: failedAttempts };

        // Lock account if too many failed attempts
        if (failedAttempts >= maxAttempts) {
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + lockoutTime);
          updateData.locked_until = lockUntil.toISOString();
        }

        await supabaseAdmin
          .from('users')
          .update(updateData)
          .eq('id', user.id);

        await this.logAuthEvent({
          userId: user.id,
          eventType: 'failed_login',
          success: false,
          ipAddress,
          userAgent,
          errorMessage: 'Invalid password',
          metadata: { identifier, failedAttempts }
        });

        throw new Error('Invalid credentials');
      }

      // Reset failed login attempts and update last login
      await supabaseAdmin
        .from('users')
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString()
        })
        .eq('id', user.id);

      // Generate tokens
      const tokens = generateTokens(user);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Log successful login
      await this.logAuthEvent({
        userId: user.id,
        eventType: 'login',
        success: true,
        ipAddress,
        userAgent,
        metadata: { identifier }
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ipAddress
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        tokens
      };
    } catch (error) {
      logger.error('Login failed', {
        error: error.message,
        identifier,
        ipAddress
      });
      throw error;
    }
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      // Decode token to get token ID and expiration
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(refreshToken);
      
      // Hash the token for storage
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .insert({
          user_id: userId,
          token_id: decoded.tokenId,
          token_hash: tokenHash,
          expires_at: new Date(decoded.exp * 1000).toISOString()
        });

      if (error) {
        throw new Error(`Failed to store refresh token: ${error.message}`);
      }
    } catch (error) {
      logger.error('Failed to store refresh token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const { verifyRefreshToken } = require('../utils/jwt');
      
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Hash the token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Check if refresh token exists and is valid
      const { data: storedToken, error } = await supabaseAdmin
        .from('refresh_tokens')
        .select('*')
        .eq('token_id', decoded.tokenId)
        .eq('token_hash', tokenHash)
        .eq('is_revoked', false)
        .single();

      if (error || !storedToken) {
        throw new Error('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date(storedToken.expires_at) < new Date()) {
        throw new Error('Refresh token expired');
      }

      // Get user data
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, email, is_active')
        .eq('id', decoded.userId)
        .single();

      if (userError || !user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Revoke old refresh token and store new one
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('id', storedToken.id);

      await this.storeRefreshToken(user.id, tokens.refreshToken);

      logger.info('Access token refreshed', {
        userId: user.id,
        username: user.username
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        tokens
      };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logoutUser(userId, refreshToken) {
    try {
      if (refreshToken) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(refreshToken);
        
        if (decoded && decoded.tokenId) {
          await supabaseAdmin
            .from('refresh_tokens')
            .update({ is_revoked: true })
            .eq('token_id', decoded.tokenId)
            .eq('user_id', userId);
        }
      }

      // Log logout event
      await this.logAuthEvent({
        userId,
        eventType: 'logout',
        success: true
      });

      logger.info('User logged out', { userId });
    } catch (error) {
      logger.error('Logout failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent({ userId, eventType, success, ipAddress, userAgent, errorMessage, metadata }) {
    try {
      await supabaseAdmin
        .from('auth_logs')
        .insert({
          user_id: userId || null,
          event_type: eventType,
          success,
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          error_message: errorMessage || null,
          metadata: metadata || null
        });
    } catch (error) {
      logger.error('Failed to log auth event', {
        error: error.message,
        eventType,
        userId
      });
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, first_name, last_name, phone, created_at, last_login, email_verified')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        emailVerified: user.email_verified
      };
    } catch (error) {
      logger.error('Failed to get user profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = new AuthService();
