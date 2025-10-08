// Utility function for creating response data
const createResponseData = (success, message, data = null, code = null) => ({
  success,
  message,
  ...(data !== null && { data }), // Only include data if it’s not null
  ...(code !== null && { code }), // Only include code if it’s not null
});

// Utility function for creating a success response
const createSuccessResponse = (message, data = null, code = null) => {
  return createResponseData(true, message, data, code);
};

// Utility function for creating an error response
const createErrorResponse = (message, data = null, code = null) => {
  return createResponseData(false, message, data, code);
};

// Utility function for creating a validation error response
const createValidationErrorResponse = (message, validationErrors) => {
  return createErrorResponse(message, validationErrors, code = "VALIDATION_ERRORS",);
};

// Utility function for creating a not found response
const createNotFoundResponse = (resource) => {
  return createErrorResponse(`${resource} not found`);
};

// Utility function for creating an unauthorized response
const createUnauthorizedResponse = () => {
  return createErrorResponse("Unauthorized access");
};

// Export all utility functions
module.exports = {
  createResponseData,
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createUnauthorizedResponse,
};
