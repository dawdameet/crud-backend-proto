const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not configured');
}

/**
 * Generate access token
 * @param {Object} payload - User data to include in token
 * @returns {String} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.id,
      username: payload.username,
      email: payload.email,
      type: 'access'
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'secure-auth-backend',
      audience: 'react-native-app'
    }
  );
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to include in token
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.id,
      username: payload.username,
      tokenId: uuidv4(),
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'secure-auth-backend',
      audience: 'react-native-app'
    }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} Object containing both tokens
 */
const generateTokens = (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_EXPIRES_IN
  };
};

/**
 * Verify access token
 * @param {String} token - JWT access token
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'secure-auth-backend',
      audience: 'react-native-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'secure-auth-backend',
      audience: 'react-native-app'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken
};
