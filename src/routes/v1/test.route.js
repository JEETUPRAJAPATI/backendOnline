const express = require('express');
const router = express.Router();

// Health check route
router.get('/ping', (req, res) => {
  return res.status(200).json({ message: 'pong' });
});

// Public health check endpoint
router.get('/health-check', (req, res) => res.status(200).send('OK')); // Public endpoint, no auth needed

module.exports = router;
