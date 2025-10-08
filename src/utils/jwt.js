// backend/src/utils/jwt.js

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../constants');

const APP_ENV = process.env.NODE_ENV || 'development';
const { JWT_SECRET, JWT_REFRESH_SECRET } = JWT_CONFIG['development'] || {};
/**
 * Extract token from the request's Authorization header.
 * @param {Object} req - The request object.
 * @returns {string|null} - The extracted token or null if not found.
 */
const extractToken = (req) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]; // Return the token part
  }
  return null; // No token found
};

/**
 * Generate a new JWT token.
 * @param {Object} dataObj - The object containing key and value.
 * @returns {string} - The generated token.
 */
const generateAccessToken = (dataObj) => {
  return jwt.sign(dataObj, JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (dataObj) => {
  return jwt.sign(dataObj, JWT_REFRESH_SECRET, { expiresIn: '1h' }); // 1 hours validity
};

/**
 * Verify a given JWT token.
 * @param {string} token - The token to verify.
 * @returns {Object} - The decoded token if valid.
 * @throws {Error} - If token is invalid or expired.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Refresh a JWT token using a refresh token.
 * @param {string} token - The refresh token to verify and generate a new access token.
 * @returns {string} - The new access token.
 * @throws {Error} - If refresh token is invalid.
 */
const refreshAccessToken = (token) => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  const { id } = decoded;
  if (!id) {
    throw new Error('Invalid token payload.');
  }
  // Remove iat and exp properties
  const { iat, exp, ...payload } = decoded;
  return generateAccessToken(payload); // decode should object here
};

module.exports = { extractToken, generateAccessToken, generateRefreshToken, verifyToken, refreshAccessToken };
