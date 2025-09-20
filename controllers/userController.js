const authService = require('../services/authService');
const { hashPassword, comparePassword } = require('../utils/security');
const { validate, changePasswordSchema, updateProfileSchema } = require('../utils/validation');
const { supabaseAdmin } = require('../config/database');
const logger = require('../config/logger');

class UserController {
  /**
   * Get user profile
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
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phone } = req.body;

      const updateData = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (phone !== undefined) updateData.phone = phone || null;

      const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, username, email, first_name, last_name, phone, created_at, updated_at')
        .single();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      logger.info('Profile updated successfully', {
        userId,
        updatedFields: Object.keys(updateData)
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at
          }
        }
      });
    } catch (error) {
      logger.error('Update profile controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update profile'
      });
    }
  }

  /**
   * Change user password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get current user data
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await comparePassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        // Log failed password change attempt
        await authService.logAuthEvent({
          userId,
          eventType: 'password_change',
          success: false,
          errorMessage: 'Invalid current password',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Revoke all existing refresh tokens for security
      await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId);

      // Log successful password change
      await authService.logAuthEvent({
        userId,
        eventType: 'password_change',
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('Password changed successfully', { userId });

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again with your new password.'
      });
    } catch (error) {
      logger.error('Change password controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to change password'
      });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      // Get current user data
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('password_hash, username, email')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Log account deletion
      await authService.logAuthEvent({
        userId,
        eventType: 'account_deletion',
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: { username: user.username, email: user.email }
      });

      // Delete user (cascade will handle related records)
      const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete account: ${deleteError.message}`);
      }

      logger.info('Account deleted successfully', {
        userId,
        username: user.username,
        email: user.email
      });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete account controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete account'
      });
    }
  }

  /**
   * Get user's authentication logs
   */
  async getAuthLogs(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data: logs, error } = await supabaseAdmin
        .from('auth_logs')
        .select('event_type, success, ip_address, user_agent, error_message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch auth logs: ${error.message}`);
      }

      res.json({
        success: true,
        message: 'Authentication logs retrieved successfully',
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: logs.length
          }
        }
      });
    } catch (error) {
      logger.error('Get auth logs controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve authentication logs'
      });
    }
  }

  /**
   * Get active sessions (refresh tokens)
   */
  async getActiveSessions(req, res) {
    try {
      const userId = req.user.id;

      const { data: sessions, error } = await supabaseAdmin
        .from('refresh_tokens')
        .select('id, created_at, expires_at')
        .eq('user_id', userId)
        .eq('is_revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      res.json({
        success: true,
        message: 'Active sessions retrieved successfully',
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            createdAt: session.created_at,
            expiresAt: session.expires_at
          }))
        }
      });
    } catch (error) {
      logger.error('Get active sessions controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active sessions'
      });
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(req, res) {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      const { error } = await supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to revoke session: ${error.message}`);
      }

      logger.info('Session revoked successfully', {
        userId,
        sessionId
      });

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error) {
      logger.error('Revoke session controller error', {
        error: error.message,
        userId: req.user?.id,
        sessionId: req.params?.sessionId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to revoke session'
      });
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;
      const { currentTokenId } = req.body; // Optional: keep current session active

      let query = supabaseAdmin
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId);

      if (currentTokenId) {
        query = query.neq('token_id', currentTokenId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to revoke sessions: ${error.message}`);
      }

      logger.info('All sessions revoked successfully', {
        userId,
        keepCurrent: !!currentTokenId
      });

      res.json({
        success: true,
        message: 'All sessions revoked successfully'
      });
    } catch (error) {
      logger.error('Revoke all sessions controller error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to revoke sessions'
      });
    }
  }
}

module.exports = new UserController();
