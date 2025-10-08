const mysql = require('mysql2');
require('dotenv').config();
const { DB_CONFIG } = require("../constants/index");

const APP_ENV = process.env.NODE_ENV || "development";
const db = mysql.createPool(DB_CONFIG[APP_ENV]);

// Manage connection logging and error handling
db.getConnection((err, connection) => {
  if (err) {
    let errorMessage = `MySQL connection error: ${err.message}`;
    
    // Handle specific MySQL error codes
    switch (err.code) {
      case 'PROTOCOL_CONNECTION_LOST':
        errorMessage = 'Database connection was closed.';
        break;
      case 'ER_CON_COUNT_ERROR':
        errorMessage = 'Database has too many connections.';
        break;
      case 'ECONNREFUSED':
        errorMessage = 'Database connection was refused.';
        break;
      case 'ETIMEDOUT':
        errorMessage = 'Database connection timed out.';
        break;
      case 'ENOTFOUND':
        errorMessage = 'Database host not found.';
        break;
      default:
        errorMessage = `MySQL error: ${err.message}`;
    }

    // Log and throw error with the custom message
    logger.error(errorMessage);
    // Ensure the connection is released even if there's an error
    if (connection) connection.release();
  } else {
    logger.success('Database connection established.');
    // Release the connection back to the pool
    connection.release();
  }
});

// Reduced frequency health check for remote connections
setInterval(() => {
  db.getConnection((err, connection) => {
    if (err) {
      if (err.code !== 'ETIMEDOUT') { // Don't log every timeout
        logger.error('MySQL connection is not healthy:', err.message);
      }
    } else {
      logger.debug('MySQL connection is healthy.');
      connection.release();
    }
  });
}, 300000); // Check the connection health every 5 minutes (reduced frequency)
db.getConnection((err, connection) => {
  if (err) {
    let errorMessage = `MySQL connection error: ${err.message}`;
    
    // Handle specific MySQL error codes
    switch (err.code) {
      case 'PROTOCOL_CONNECTION_LOST':
        errorMessage = 'Database connection was closed.';
        break;
      case 'ER_CON_COUNT_ERROR':
        errorMessage = 'Database has too many connections.';
        break;
      case 'ECONNREFUSED':
        errorMessage = 'Database connection was refused.';
        break;
      default:
        errorMessage = `MySQL error: ${err.message}`;
    }

    // Log and throw error with the custom message
    logger.error(errorMessage);
    // Ensure the connection is released even if there’s an error
    if (connection) connection.release();
  } else {
    logger.success('Database connection established.');
    // Release the connection back to the pool
    connection.release();
  }
});

// Optional: You can also check the connection status periodically or at certain intervals
setInterval(() => {
  db.getConnection((err, connection) => {
    if (err) {
      logger.error('MySQL connection is not healthy:', err.message);
    } else {
      logger.debug('MySQL connection is healthy.');
      connection.release();
    }
  });
}, 60000); // Check the connection health every 60 seconds

module.exports = db;
