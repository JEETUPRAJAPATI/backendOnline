const Joi = require('joi');

const reportFormJoiSchema = Joi.object({
  post_id: Joi.number()
    .required()
    .messages({
      'any.required': 'Post ID is required.',
      'number.base': 'Post ID must be a valid number.',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
  description: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Description cannot exceed 500 characters.',
      'any.required': 'Description is required.',
    }),
});

module.exports = { reportFormJoiSchema };
