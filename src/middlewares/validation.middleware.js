const { sanitizeXSSInput } = require('../utils/generalUtils');
const { validationResult } = require('express-validator');
const { createValidationErrorResponse, createErrorResponse } = require('../utils/responseUtils');
const fs = require('fs');

// Joi validation middleware
const validateInputJoi = (schema) => {
  return (req, res, next) => {
    try {
      // Sanitize all fields in the body dynamically
      const sanitizedBody = {};
      Object.keys(req.body).forEach((field) => {
        sanitizedBody[field] = sanitizeXSSInput(req.body[field]);
      });

      // Validate using Joi schema
      const { error } = schema.validate(sanitizedBody, { abortEarly: false });
      if (error) {
        const validationErrors = error.details.map((err) => err.message);
        return res.status(400).json(createValidationErrorResponse("Input Validation failed.", validationErrors));
      }

      // Proceed to next middleware if validation passes
      next();
    } catch (err) {
      return res.status(500).json(createErrorResponse("Internal Server Error."));
    }
  };
};

// Yup validation middleware
const validateInputYup = (schema) => {
  return async (req, res, next) => {
    try {
      // Sanitize all fields in the body dynamically
      const sanitizedBody = {};
      Object.keys(req.body).forEach((field) => {
        sanitizedBody[field] = sanitizeXSSInput(req.body[field]);
      });

      // Validate using Yup schema
      await schema.validate(sanitizedBody, { abortEarly: false });

      // Proceed to next middleware if validation passes
      next();
    } catch (err) {
      if (err.inner) {
        const validationErrors = err.inner.map((error) => error.message);
        return res.status(400).json(createValidationErrorResponse("Input Validation failed.", validationErrors));

      }
      return res.status(500).json(createErrorResponse("Internal Server Error."));
    }
  };
};

// Express-validator validation middleware
const validateInputExpress = (schema, config = {}) => {
  return async (req, res, next) => {

    const uploadedFiles = req?.files && req.files.length > 0 && req.files.map((file) => file.path) || [];

    try {
      // Apply the validation schema
      await Promise.all(schema.map((validation) => validation.run(req)));

      // Sanitize all fields in the body dynamically
      const sanitizedBody = {};
      Object.keys(req.body).forEach((field) => {
        sanitizedBody[field] = sanitizeXSSInput(req.body[field], config);
      });
      req.body = sanitizedBody;

      // Collect validation errors
      const validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        const validationErrorsMsg = validationErrors.array().map((err) => err.msg);

        // Delete uploaded files
        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach((filePath) => {
            console.log("Deleting:", filePath);

            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Failed to delete file: ${filePath}`, err);
              } else {
                console.log(`File deleted: ${filePath}`);
              }
            });
          });
        }
        return res.status(400).json(createValidationErrorResponse("Input Validation failed.", validationErrorsMsg));
      }

      // Proceed to the next middleware if validation passes
      next();
    } catch (err) {

      // Delete uploaded files
      if (uploadedFiles && uploadedFiles.length > 0) {
        uploadedFiles.forEach((filePath) => {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Failed to delete file: ${filePath}`, err);
            }
          });
        });
      }

      return res.status(500).json(createErrorResponse("Internal Server Error."));
    }
  };
};

module.exports = { validateInputJoi, validateInputYup, validateInputExpress };
