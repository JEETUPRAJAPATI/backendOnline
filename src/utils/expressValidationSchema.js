/* eslint-disable prettier/prettier */
const { body } = require('express-validator');
const axios = require('axios');
const { CAPTCHA_CONFIG } = require('../constants');
const { getTableRecord } = require('../services/common.service');

// Define validation rules as an array
const reportFormExpressSchema = [
  body('post_id').notEmpty().withMessage('Post ID is required.').isNumeric().withMessage('Post ID must be a valid number.'),

  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),

  body('description').notEmpty().withMessage('Description is required.').isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.').trim().escape(),

  // Google Captcha validation
  body('googleCaptcha')
    .isString().withMessage('Captcha verification is required.')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at post report time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),
];

const signupFormExpressSchema = [
  body('username')
    .matches(/^[A-Za-z][A-Za-z0-9]{5,31}$/).withMessage('Username must be 6 - 32 characters long and contain alphanumeric characters only.')
    .notEmpty().withMessage('Username is required.').trim().escape(),

  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),

  body('password')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
    .notEmpty().withMessage('Password is required.'),

  body('confirm_password')
    .trim().escape()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),

  body('googleCaptcha')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at signup time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),

  body('terms')
    .toBoolean()
    .isBoolean().withMessage('You must accept the terms and conditions.')
    .equals("true").withMessage('You must accept the terms and conditions.')

];

const loginFormExpressSchema = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),

  body('password')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
    .notEmpty().withMessage('Password is required.'),

  body('googleCaptcha')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at login time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),

];

const signupVerificationCodeFormExpressSchema = [
  body('confirmation_code').notEmpty().withMessage('Verification code is required.').trim().escape()
];

const forgotVerificationFormExpressSchema = [
  body('username').notEmpty().withMessage('Username is required.').trim().escape(),
];

const forgotPasswordFormExpressSchema = [
  body('username')
    .notEmpty().withMessage('Username / Email is required.')
    .trim()
    .escape()
    .isLength({ min: 3 }).withMessage('Username / Email must be at least 3 characters long.'),
];

const resetPasswordVerificationFormExpressSchema = [
  body('reset_password_code').notEmpty().withMessage('Reset password code is required.').trim().escape(),
  body('new_password')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.')
    .notEmpty().withMessage('New password is required.'),
  body('confirm_new_password')
    .trim().escape()
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Confirm new passwords must match.');
      }
      return true;
    }),

];

const contactFormExpressSchema = [

  body('name')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Name must be at least 6 characters long.')
    .notEmpty().withMessage('Name is required.'),


  body('subject')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Subject must be at least 6 characters long.')
    .notEmpty().withMessage('Subject is required.'),


  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),


  body('phone_number')
    .trim().escape()
    .isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters long.')
    .notEmpty().withMessage('Phone number is required.'),


  body('message')
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters long.')
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters.')
    .trim()
    .escape(),

  body('googleCaptcha')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at new contact time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),
];

const partnerFormExpressSchema = [
  // Name validation
  body('name')
    .isString().withMessage('Name must be a string.')
    .trim()
    .isLength({ min: 6, max: 32 }).withMessage('Name must be between 6 and 32 characters long.')
    .notEmpty().withMessage('Name is required.'),

  // Email validation
  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),

  // URL validation (must start with http:// or https://)
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),

  // HTML URL validation (must be a valid <a> tag with an href attribute starting with http:// or https://)
  body('html_url')
    .isString().withMessage('HTML URL must be a string.')
    .trim()
    .custom((value) => {
      const anchorTagRegex = /^<a\s+href="(https?:\/\/[^\s"]+)"[^>]*>.*<\/a>$/;
      if (!anchorTagRegex.test(value)) {
        throw new Error('HTML URL must be a valid <a> tag with an href attribute starting with http:// or https://.');
      }
      return true;
    })
    .notEmpty().withMessage('HTML URL is required.'),

  // Description validation
  body('description')
    .isString().withMessage('Description must be a string.')
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters.')
    .notEmpty().withMessage('Description is required.'),

  // Answer validation
  body('answer')
    .isString().withMessage('Answer must be a string.')
    .trim()
    .isLength({ min: 6 }).withMessage('Answer must be at least 6 characters long.')
    .notEmpty().withMessage('Answer is required.'),

  // Google Captcha validation
  body('googleCaptcha')
    .isString().withMessage('Captcha verification is required.')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at partner save time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),

];

const addPostFormExpressSchema = [
  body('title')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),

  body('country_id')
    .trim()
    .notEmpty().withMessage('Country is required.'),

  body('city_id')
    .trim()
    .notEmpty().withMessage('City is required.'),

  body('subcity_id')
    .trim()
    .notEmpty().withMessage('SubCity is required.'),

  body('category_id')
    .trim()
    .notEmpty().withMessage('Category is required.'),

  body('subcategory_id')
    .trim()
    .notEmpty().withMessage('Sub Category is required.'),


  body('location').trim().escape().isLength({ min: 3 }).withMessage('Location must be at least 3 characters long.').notEmpty().withMessage('Location is required.'),

  body('email').trim().escape().isEmail().withMessage('Please provide a valid email address.').custom((value) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = value.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
    }
    return true;
  }).normalizeEmail().notEmpty().withMessage('Email is required.'),

  // body('phone')
  //   .optional({ nullable: true }) // Allow field to be empty, null, or not provided at all
  //   .custom(value => {
  //     // If the value is not provided, skip validation
  //     if (value === undefined || value === null || value.trim() === '') {
  //       return true; // Allow it to be blank
  //     }
  //     // If the value is provided, continue with validation
  //     if (value.length < 10) {
  //       throw new Error('Phone number must be at least 10 characters long.');
  //     }
  //     if (!/^\d+$/.test(value)) {
  //       throw new Error('Phone number must be numeric.');
  //     }
  //     return true; // Indicate validation passed
  //   }),

  body('description').trim().notEmpty().withMessage('Description is required.'),

  body('sex').trim().notEmpty().withMessage('Please select sex type field.'),
  body('age').trim().notEmpty().withMessage('Please select age.'),
  body('sexual_orientation').trim().notEmpty().withMessage('Please select Sexual Orientation.'),

  body('googleCaptcha')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at post save time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),

];

const editPostFormExpressSchema = [
  body('id').trim().escape().notEmpty().withMessage('Post Id is required.'),

  body('title')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),

  body('location').trim().escape().isLength({ min: 3 }).withMessage('Location must be at least 3 characters long.').notEmpty().withMessage('Location is required.'),

  body('email').trim().escape().isEmail().withMessage('Please provide a valid email address.').custom((value) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = value.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
    }
    return true;
  }).normalizeEmail().notEmpty().withMessage('Email is required.'),

  body('phone').trim().escape().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters long.').notEmpty().withMessage('Phone number is required.'),

  body('description').trim().notEmpty().withMessage('Description is required.'),

  body('googleCaptcha')
    .notEmpty().withMessage('Captcha verification is required.')
    .custom(async (value, { req }) => {
      const secretKey = CAPTCHA_CONFIG["SECRET_KEY"]; // Replace with your actual secret key
      const remoteIp = req.ip; // Assuming you're using Express, this will get the client's IP address

      // Make a request to the Google reCAPTCHA siteverify API with remoteip included
      const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${value}&remoteip=${remoteIp}`);
      console.info(`Captcha verification at edit post update time. Response : ${JSON.stringify(response.data)}`)
      if (!response.data.success) {
        throw new Error('Captcha verification failed.');
      }

      return true;
    }),

];

const changeProfileFormExpressSchema = [
  body('email').trim().escape().isEmail().withMessage('Please provide a valid email address.').custom((value) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = value.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
    }
    return true;
  }).normalizeEmail().notEmpty().withMessage('Email is required.'),
];

const setProfileUsernameFormExpressSchema = [
  body('username')
    .matches(/^[A-Za-z][A-Za-z0-9]{5,31}$/).withMessage('Username must be 6 - 32 characters long and contain alphanumeric characters only.')
    .notEmpty().withMessage('Username is required.').trim().escape(),
];

const updateEmailVerificationFormExpressSchema = [
  body('new_email').trim().escape().isEmail().withMessage('Please provide a valid email address.').custom((value) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = value.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
    }
    return true;
  }).normalizeEmail().notEmpty().withMessage('Email is required.'),

  body('verification_code')
    .trim()
    .notEmpty().withMessage('Verification code is required.'),
];


const changePasswordFormExpressSchema = [
  body('old_password')
    .trim()
    .custom(async (value, { req }) => {

      // Fetch user ID from request (assumes authentication middleware adds user info)
      const userId = req.user?.id || 0;

      // Fetch the password from the database
      const userData = await getTableRecord(
        `SELECT password FROM member WHERE id = ?;`,
        [userId],
        true
      );

      if (!userData) {
        throw new Error('User not found.');
      }

      const hasSetPassword = userData.password && userData.password.trim() !== '';

      // If user has set a password, require old_password
      if (hasSetPassword && (!value || value.length < 6)) {
        throw new Error('Old password is required and must be at least 6 characters long.');
      }

      return true; // Validation passed
    }),

  body('new_password')
    .trim()
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.'),
];


const deleteAccountFormExpressSchema = [
  body('action')
    .trim()
    .notEmpty().withMessage('Action is required.'),
];

const manualRechargeBalanceFormExpressSchema = [
  body('manual_method_id')
    .trim().escape()
    .notEmpty().withMessage('Payment method is required.'),
  body('payment_amount').trim().escape().notEmpty().withMessage('Amount is required.').isNumeric().withMessage('Amount must be a valid number.'),
];

// Admin Panel
const adminLoginFormExpressSchema = [
  body('username')
    .trim().escape()
    .notEmpty().withMessage('Email is required.'),

  body('password')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
    .notEmpty().withMessage('Password is required.'),

];

const adminAddNotificationFormExpressSchema = [
  body('title')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),

  body('description').trim().notEmpty().withMessage('Description is required.'),

];

const adminAddSiteLinkFormExpressSchema = [
  body('title')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),

  body('category')
    .trim()
    .notEmpty().withMessage('Country is required.'),

  body('description').trim(),

  body('rating').trim(),

  // URL validation (must start with http:// or https://)
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),

];

const adminReplyMessageFormExpressSchema = [
  body('id')
    .trim()
    .notEmpty().withMessage('Message id is required.'),
  body('email').trim().escape().isEmail().withMessage('Please provide a valid email address.').normalizeEmail().notEmpty().withMessage('Email is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
];

const adminProfileFormExpressSchema = [

  body('id')
    .trim().escape(),

  body('name')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Name must be at least 6 characters long.')
    .notEmpty().withMessage('Name is required.'),

  body('username')
    .matches(/^[A-Za-z][A-Za-z0-9]{5,31}$/).withMessage('Username must be 6 - 32 characters long and contain alphanumeric characters only.')
    .notEmpty().withMessage('Username is required.').trim().escape(),

  body('email')
    .isEmail().withMessage('Please provide a valid email address.')
    .custom((value) => {
      const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
      const emailDomain = value.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
      }
      return true;
    })
    .normalizeEmail()
    .notEmpty().withMessage('Email is required.'),

  body('address').notEmpty().withMessage('Address is required.').trim().escape(),
  body('role').notEmpty().withMessage('Role is required.').trim().escape(),
  body('gender').notEmpty().withMessage('Gender is required.').trim().escape(),
  body('country').notEmpty().withMessage('Country is required.').trim().escape(),
  body('phone').notEmpty().withMessage('Phone is required.').trim().escape(),

  body('password')
    .if(body('id').isEmpty()) // Only validate password if id is empty
    .notEmpty().withMessage('Password is required.')
    .trim().escape()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),


  body('old_password')
    .if(body('id').notEmpty())  // Only validate if id is not empty
    .custom((value, { req }) => {
      if (req.body.password && req.body.password.trim() !== '') {
        if (!value || value.trim() === '') {
          throw new Error('Old Password is required.');
        }
        if (value.length < 6) {
          throw new Error('Old Password must be at least 6 characters long.');
        }
      }
      return true; // If conditions are not met, allow value
    })
    .trim().escape(),

];

const adminCountryFormExpressSchema = [
  body('country')
    .trim().escape()
    .notEmpty().withMessage('Country is required.')
    .isLength({ min: 2 }).withMessage('Country name must be at least 2 characters long.'),
];

const adminCityFormExpressSchema = [
  body('countryId')
    .trim().escape()
    .notEmpty().withMessage('Country ID is required.'),

  body('city')
    .trim().escape()
    .notEmpty().withMessage('City is required.')
    .isLength({ min: 2 }).withMessage('City name must be at least 2 characters long.'),
];

// Sub City Form
const adminSubCityFormExpressSchema = [
  body('countryId').trim().escape().notEmpty().withMessage('Country ID is required.'),
  body('cityId').trim().escape().notEmpty().withMessage('City ID is required.'),
  body('subCity').trim().escape().notEmpty().withMessage('Sub City is required.'),
];

// Category Form
const adminCategoryFormExpressSchema = [
  body('category').trim().escape().notEmpty().withMessage('Category is required.'),
];

// Sub Category Form
const adminSubCategoryFormExpressSchema = [
  body('categoryId').trim().escape().notEmpty().withMessage('Category ID is required.'),
  body('subCategory').trim().escape().notEmpty().withMessage('Sub Category is required.'),
];

// Ad Manager Form
const adminAdManagerFormExpressSchema = [
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
];

// Slider Ads Form
const adminSliderAdsFormExpressSchema = [
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
  body('type').trim().escape().notEmpty().withMessage('Type is required.'),
];

// Post Ads Form
const adminPostAdsFormExpressSchema = [
  body('target_url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
];

// New Post Ads Form
const adminNewPostAdsFormExpressSchema = [
  body('title').trim().escape().notEmpty().withMessage('Title is required.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
  body('status').trim().escape().notEmpty().withMessage('Status is required.'),
  body('target_blank').trim().escape().notEmpty().withMessage('Target Blank is required.'),
  body('position').trim().escape().notEmpty().withMessage('Position is required.'),
];

// Google Ads Form
const adminGoogleAdsFormExpressSchema = [
  body('ad_type').trim().escape().notEmpty().withMessage('Ad type is required.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
  // body('status').trim().escape().notEmpty().withMessage('Status is required.'),
];

// Category-Post Ads Form
const adminCategoryPostAdsFormExpressSchema = [
  // body('title').trim().escape().notEmpty().withMessage('Title is required.'),
  body('target_url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
  // body('status').trim().escape().notEmpty().withMessage('Status is required.'),
  // body('target_blank').trim().escape().notEmpty().withMessage('Target Blank is required.'),
  body('ads_type').trim().escape().notEmpty().withMessage('Ads Type is required.'),
];

const adminMultiPostFormExpressSchema = [
  body('title')
    .trim()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),

  body('countryId')
    .trim()
    .notEmpty().withMessage('Country is required.'),

  body('cityId')
    .trim()
    .notEmpty().withMessage('City is required.'),

  body('subCityId')
    .trim()
    .notEmpty().withMessage('SubCity is required.'),

  body('categoryId')
    .trim()
    .notEmpty().withMessage('Category is required.'),

  body('subCategoryId')
    .trim()
    .notEmpty().withMessage('Sub Category is required.'),


  // body('location').trim().escape().isLength({ min: 3 }).withMessage('Location must be at least 3 characters long.').notEmpty().withMessage('Location is required.'),

  body('email').trim().escape().isEmail().withMessage('Please provide a valid email address.').custom((value) => {
    const allowedDomains = ['gmail.com', 'yahoo.com', 'live.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = value.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error('Only Gmail, Yahoo, Live, Outlook, Hotmail, and iCloud emails are allowed.');
    }
    return true;
  }).normalizeEmail().notEmpty().withMessage('Email is required.'),

  // body('phone')
  //   .optional({ nullable: true }) // Allow field to be empty, null, or not provided at all
  //   .custom(value => {
  //     // If the value is not provided, skip validation
  //     if (value === undefined || value === null || value.trim() === '') {
  //       return true; // Allow it to be blank
  //     }
  //     // If the value is provided, continue with validation
  //     if (value.length < 10) {
  //       throw new Error('Phone number must be at least 10 characters long.');
  //     }
  //     if (!/^\d+$/.test(value)) {
  //       throw new Error('Phone number must be numeric.');
  //     }
  //     return true; // Indicate validation passed
  //   }),

  body('description').trim().notEmpty().withMessage('Description is required.'),

  body('sex').trim().notEmpty().withMessage('Please select sex type field.'),
  body('age').trim().notEmpty().withMessage('Please select age.'),
  body('sexualOrientation').trim().notEmpty().withMessage('Please select Sexual Orientation.'),

];

// Terms Condition Form
const adminTermsConditionFormExpressSchema = [
  body('terms').trim().escape().notEmpty().withMessage('Terms are required.'),
];

// About Form
const adminAboutFormExpressSchema = [
  body('title').trim().escape().notEmpty().withMessage('Title is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
];

// Home Page Notice Form
const adminHomePageNoticeFormExpressSchema = [
  body('description').trim().notEmpty().withMessage('Description is required.'),
];

// Alert Message Form
const adminAlertMessageFormExpressSchema = [
  body('message').trim().notEmpty().withMessage('Message is required.'),
  body('visible_status').trim().notEmpty().withMessage('Visible Status is required.'),
  body('p_type').trim().notEmpty().withMessage('Page Type is required.'),
];

// Dashboard Content Form
const adminDashboardContentFormExpressSchema = [
  body('content').trim().notEmpty().withMessage('Content is required.'),
];

// Featured Packages Form
const adminFeaturedPackagesFormExpressSchema = [
  body('days').trim().escape().notEmpty().withMessage('Days are required.'),
  body('amount').trim().escape().notEmpty().withMessage('Amount is required.'),
];

// Extended Packages Form
const adminExtendedPackagesFormExpressSchema = [
  body('days').trim().escape().notEmpty().withMessage('Days are required.'),
  body('amount').trim().escape().notEmpty().withMessage('Amount is required.'),
];

// Sidebar Nav Links Form
const adminSidebarNavLinksFormExpressSchema = [
  body('text').trim().escape().notEmpty().withMessage('Text is required.'),
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
];

// Footer Nav Links Form
const adminFooterNavLinksFormExpressSchema = [
  body('text').trim().escape().notEmpty().withMessage('Text is required.'),
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),
];

// SubCity Content Form
const adminSubCityContentFormExpressSchema = [
  body('countryId').trim().escape().notEmpty().withMessage('Country ID is required.'),
  body('cityId').trim().escape().notEmpty().withMessage('City ID is required.'),
  body('subCityId').trim().escape().notEmpty().withMessage('Sub City ID is required.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
];

// SubCategory Content Form
const adminSubCategoryContentFormExpressSchema = [
  body('countryId').trim().escape().notEmpty().withMessage('Country ID is required.'),
  body('cityId').trim().escape().notEmpty().withMessage('City ID is required.'),
  body('subCityId').trim().escape().notEmpty().withMessage('Sub City ID is required.'),
  body('categoryId').trim().escape().notEmpty().withMessage('Category ID is required.'),
  body('subCategoryId').trim().escape().notEmpty().withMessage('Sub Category ID is required.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
];

// SiteLink Category Form
const adminSiteLinkCategoryFormExpressSchema = [
  body('category').trim().escape().notEmpty().withMessage('Category is required.'),
  body('content').trim().notEmpty().withMessage('Content is required.'),
];

// Sponsored Links Form
const adminSponsoredLinksFormExpressSchema = [
  body('text').trim().escape().notEmpty().withMessage('Text is required.'),
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'), body('title').trim().escape().notEmpty().withMessage('Title is required.'),
  body('sort_order').trim().escape().notEmpty().withMessage('Sort Order is required.'),
];

// Friends Links Form
const adminFriendsLinksFormExpressSchema = [
  body('text').trim().escape().notEmpty().withMessage('Text is required.'),
  body('url')
    .isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'), body('title').trim().escape().notEmpty().withMessage('Title is required.'),
  body('sort_order').trim().escape().notEmpty().withMessage('Sort Order is required.'),
];

// Settings Form
const adminSiteSettingsFormExpressSchema = [
  // body('site_name').trim().escape().notEmpty().withMessage('Site Name is required.'),
];

// Email SMTP Form
const adminEmailSMTPFormExpressSchema = [
  body('protocol').trim().escape().notEmpty().withMessage('Protocol is required.'),
  body('smtp_host').trim().escape().notEmpty().withMessage('SMTP Host is required.'),
  body('smtp_user').trim().escape().notEmpty().withMessage('SMTP User is required.'),
  body('smtp_pass').trim().escape().notEmpty().withMessage('SMTP Password is required.'),
  body('email_from').trim().escape().notEmpty().withMessage('Email From is required.'),
];

// Manual Payment Method Form
const adminManualPaymentMethodFormExpressSchema = [
  body('method_name').trim().escape().notEmpty().withMessage('Method Name is required.'),
  body('method_type').trim().escape().notEmpty().withMessage('Method Type is required.'),
  body('method_details').trim().escape().notEmpty().withMessage('Method Details are required.'),
];

const adminPaymentRequestReasonFormExpressSchema = [
  body('id').trim().escape().notEmpty().withMessage('Payment request id is required.'),
  body('pstatus').trim().escape().notEmpty().withMessage('Payment status is required.'),
  body('description').trim().escape(),
];

// Video Collection Form
const adminVideoCollectionFormExpressSchema = [
  body('title').trim().escape().notEmpty().withMessage('Video title is required.'),
  body('video').isString().withMessage('URL must be a string.')
    .trim()
    .matches(/^https?:\/\/[^\s$.?#].[^\s]*$/).withMessage('URL must start with http:// or https:// and be a valid URL.')
    .notEmpty().withMessage('URL is required.'),

  body('upload_for').trim().escape().notEmpty().withMessage('Upload For is required.'),
];

// Blogs
// Category Form
const adminBlogCategoryFormExpressSchema = [
  body('category').trim().escape().notEmpty().withMessage('Category is required.'),
];
// Blog Form
const adminBlogFormExpressSchema = [
  body('category_id').trim().escape().notEmpty().withMessage('Category is required.'),
  body('title')
    .trim().escape()
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long.')
    .notEmpty().withMessage('Title is required.'),
  body('content').trim()
    .isLength({ min: 3 }).withMessage('Content must be at least 3 characters long.')
    .notEmpty().withMessage('Content is required.'),
  body('excerpt').trim().escape()
    .isLength({ min: 3 }).withMessage('Excerpt must be at least 3 characters long.')
    .notEmpty().withMessage('Excerpt is required.'),
  body('status').trim().escape().notEmpty().withMessage('Status is required.'),
];

// Meta Data Form
const adminMetaDataFormExpressSchema = [
  body('page_type').trim().notEmpty().withMessage('Page selection is required.'),
  body('page_heading')
    .trim().isLength({ min: 3 }).withMessage('Heading must be at least 3 characters long.')
    .notEmpty().withMessage('Heading is required.'),
  body('title')
    .trim().isLength({ min: 3 }).withMessage('title must be at least 3 characters long.')
    .notEmpty().withMessage('title is required.'),
  body('description').trim()
    .isLength({ min: 3 }).withMessage('description must be at least 3 characters long.')
    .notEmpty().withMessage('description is required.'),
  body('keywords').trim().escape()
    .isLength({ min: 3 }).withMessage('keywords must be at least 3 characters long.')
    .notEmpty().withMessage('keywords are required.'),
];

// Modules
const adminModulePermissionFormExpressSchema = [
  body('id')
    .optional() // since it's not required
    .trim()
    .escape(),

  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required.'),

  body('user_id')
    .trim()
    .notEmpty()
    .withMessage('User selection is required.'),

  body('action_id')
    .trim()
    .notEmpty()
    .withMessage('Module action selection is required.'),
];



module.exports = {
  reportFormExpressSchema,
  signupFormExpressSchema,
  loginFormExpressSchema,
  signupVerificationCodeFormExpressSchema,
  forgotVerificationFormExpressSchema,
  forgotPasswordFormExpressSchema,
  resetPasswordVerificationFormExpressSchema,
  contactFormExpressSchema,
  partnerFormExpressSchema,
  addPostFormExpressSchema,
  editPostFormExpressSchema,
  changeProfileFormExpressSchema,
  setProfileUsernameFormExpressSchema,
  updateEmailVerificationFormExpressSchema,
  changePasswordFormExpressSchema,
  deleteAccountFormExpressSchema,
  manualRechargeBalanceFormExpressSchema,
  // Admin Panel
  adminLoginFormExpressSchema,
  adminAddNotificationFormExpressSchema,
  adminAddSiteLinkFormExpressSchema,
  adminReplyMessageFormExpressSchema,
  adminProfileFormExpressSchema,
  adminCountryFormExpressSchema,
  adminCityFormExpressSchema,
  adminSubCityFormExpressSchema,
  adminCategoryFormExpressSchema,
  adminSubCategoryFormExpressSchema,
  adminAdManagerFormExpressSchema,
  adminSliderAdsFormExpressSchema,
  adminPostAdsFormExpressSchema,
  adminNewPostAdsFormExpressSchema,
  adminCategoryPostAdsFormExpressSchema,
  adminGoogleAdsFormExpressSchema,
  adminMultiPostFormExpressSchema,
  adminTermsConditionFormExpressSchema,
  adminAboutFormExpressSchema,
  adminHomePageNoticeFormExpressSchema,
  adminAlertMessageFormExpressSchema,
  adminDashboardContentFormExpressSchema,
  adminFeaturedPackagesFormExpressSchema,
  adminExtendedPackagesFormExpressSchema,
  adminSidebarNavLinksFormExpressSchema,
  adminFooterNavLinksFormExpressSchema,
  adminSubCityContentFormExpressSchema,
  adminSubCategoryContentFormExpressSchema,
  adminSiteLinkCategoryFormExpressSchema,
  adminSponsoredLinksFormExpressSchema,
  adminFriendsLinksFormExpressSchema,
  adminSiteSettingsFormExpressSchema,
  adminEmailSMTPFormExpressSchema,
  adminManualPaymentMethodFormExpressSchema,
  adminPaymentRequestReasonFormExpressSchema,
  adminVideoCollectionFormExpressSchema,
  adminBlogCategoryFormExpressSchema,
  adminBlogFormExpressSchema,
  adminMetaDataFormExpressSchema,
  adminModulePermissionFormExpressSchema

};
