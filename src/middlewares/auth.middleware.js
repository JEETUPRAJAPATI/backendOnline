const { extractToken, verifyToken } = require('../utils/jwt');
const { createErrorResponse } = require('../utils/responseUtils');
const crypto = require('crypto');

const authenticationJWT = (req, res, next) => {
  const token = extractToken(req); // Use the extractToken function
  if (!token) {
    return res.status(401).send(createErrorResponse('Required Auth Token.', null, "REQUIRED_AUTH_TOKEN"));
  }

  try {
    const decoded = verifyToken(token); // Use the verifyToken function
    req.user = decoded; // Attach the decoded user information to the request
    next();
  } catch (error) {
    return res.status(401).send(createErrorResponse('Invalid Auth Token.', null, "INVALID_AUTH_TOKEN"));
  }
};

const authenticationAPIKey = (req, res, next) => {
  const API_KEY_EXPIRATION_TIME = 2 * 60; // 2 minutes in seconds

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).send(createErrorResponse('Required API Key.', null, "REQUIRED_API_KEY"));
  }

  // Decode the API key (Base64 decoding)
  let decodedKey;
  try {
    decodedKey = Buffer.from(apiKey, 'base64').toString('utf8');
  } catch (err) {
    return res.status(400).send(createErrorResponse('Invalid API Key.', null, "INVALID_API_KEY"));
  }

  // The key will be in the format: 'localxlist123:timestamp'
  const [key, timestamp] = decodedKey.split(':');

  // Validate the key
  if (key !== process.env.API_KEY) {
    return res.status(400).send(createErrorResponse('Invalid API Key.', null, "INVALID_API_KEY"));
  }

  // Check if the timestamp is within the allowed time range (e.g., 2 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - timestamp > API_KEY_EXPIRATION_TIME) {
    return res.status(400).send(createErrorResponse('API Key expired.', null, "EXPIRED_API_KEY"));
  }

  next(); // API key is valid, proceed to the next middleware
};

module.exports = {
  authenticationJWT,
  authenticationAPIKey,
};
