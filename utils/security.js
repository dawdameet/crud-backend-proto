const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} True if password matches
 */
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error comparing password');
  }
};

/**
 * Generate secure random string
 * @param {Number} length - Length of random string
 * @returns {String} Random string
 */
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Sanitize input to prevent XSS and injection attacks
 * @param {String} input - Input string to sanitize
 * @returns {String} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check password strength
 * @param {String} password - Password to check
 * @returns {Object} Password strength analysis
 */
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    isStrong: score >= 4,
    score,
    checks,
    feedback: getPasswordFeedback(checks)
  };
};

/**
 * Get password feedback based on checks
 * @param {Object} checks - Password check results
 * @returns {Array} Array of feedback messages
 */
const getPasswordFeedback = (checks) => {
  const feedback = [];
  
  if (!checks.length) feedback.push('Password must be at least 8 characters long');
  if (!checks.lowercase) feedback.push('Password must contain at least one lowercase letter');
  if (!checks.uppercase) feedback.push('Password must contain at least one uppercase letter');
  if (!checks.number) feedback.push('Password must contain at least one number');
  if (!checks.special) feedback.push('Password must contain at least one special character');
  
  return feedback;
};

/**
 * Generate a secure session ID
 * @returns {String} Secure session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  hashPassword,
  comparePassword,
  generateSecureRandom,
  sanitizeInput,
  isValidEmail,
  checkPasswordStrength,
  generateSessionId
};
