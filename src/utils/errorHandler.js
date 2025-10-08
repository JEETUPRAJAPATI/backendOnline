const { HTTP_STATUS, MESSAGES } = require('../constants');
const { createErrorResponse } = require('./responseUtils'); // Import your response utility

const errorHandler = (err, req, res, next) => {
  // Log the error stack for debugging
  logger.custom(err.stack, 'red', ['bold']);

  // Set the appropriate HTTP status code
  const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Create an error response
  const response = createErrorResponse(
    err.message || MESSAGES.INTERNAL_SERVER_ERROR,
    err.details || null  // Include error details if provided
  );

  // Send the response with the correct status code
  return res.status(statusCode).json(response);
};

module.exports = errorHandler;
