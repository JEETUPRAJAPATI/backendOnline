const yup = require('yup');

const reportFormYupSchema = yup.object({
  post_id: yup
    .number('Post ID must be a valid number.') // Enforce numeric type
    .typeError('Post ID must be a valid number.') // Handle type mismatch
    .required('Post ID is required.'), // Prioritize required message

  email: yup
    .string() // Default type for email
    .email('Please provide a valid email address.') // Check format
    .required('Email is required.'), // Prioritize required message

  description: yup
    .string() // Enforce string type
    .max(500, 'Description cannot exceed 500 characters.') // Length check
    .required('Description is required.') // Prioritize required message
});

const reportFormYupSchema1 = yup.object({
  post_id: yup
    .number('Post ID must be a valid number.')
    .required('Post ID is required.'), // Required should always be first
  email: yup
    .string('Email must be a valid string.')
    .email('Please provide a valid email address.')
    .required('Email is required.'),
  description: yup
    .string('Description must be a string.')
    .max(500, 'Description cannot exceed 500 characters.')
    .required('Description is required.')
});


module.exports = { reportFormYupSchema };
