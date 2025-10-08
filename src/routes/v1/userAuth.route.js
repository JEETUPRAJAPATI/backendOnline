const express = require('express');
const router = express.Router();
const { authenticationAPIKey, authenticationJWT } = require('../../middlewares/auth.middleware');
const { validateInputExpress } = require('../../middlewares/validation.middleware');
const { editPostFormExpressSchema, changeProfileFormExpressSchema,
  updateEmailVerificationFormExpressSchema, changePasswordFormExpressSchema,
  addPostFormExpressSchema,
  setProfileUsernameFormExpressSchema,
  deleteAccountFormExpressSchema,
  manualRechargeBalanceFormExpressSchema } = require('../../utils/expressValidationSchema');

// Controller
const userAuthController = require('../../controllers/v1/userAuth.controller');

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createValidationErrorResponse } = require('../../utils/responseUtils');
const { UPLOADED_PATH } = require('../../constants');

const handleMulterErrors = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json(createValidationErrorResponse("File upload failed.", [err.message]));
    } else if (err) {
      return res
        .status(400)
        .json(createValidationErrorResponse("File upload failed.", [err.message]));
    }
    next();
  });
};


// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(global.uploadsBaseDir, '/member_user/images/login');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname); // Keep the original extension
    const uniqueName = `login${timestamp}${extension}`;
    cb(null, uniqueName);
  },
});

// Define file filter for validation
const fileFilter = (req, file, cb) => {
  const validFormats = ['image/jpeg', 'image/png', 'image/jpg'];
  const maxFileSize = 2 * 1024 * 1024; // 2MB size limit

  // Validate file format
  if (!validFormats.includes(file.mimetype)) {
    return cb(new Error('Invalid file format. Please upload JPG or PNG images.'));
  }

  // Validate file size
  if (file.size > maxFileSize) {
    return cb(new Error('File size exceeds the 2MB limit. Please upload a smaller file.'));
  }

  cb(null, true); // Validation passed
};

// Create the Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Enforce file size limit at the Multer level
  },
});

// Post Image Uploads
// Set up multer storage
const postImgsUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(global.uploadsBaseDir, `/${UPLOADED_PATH.POST}`);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      return cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      if (!req.fileIndex) req.fileIndex = 0; // Initialize index if not set

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const uniqueName = `post-${uniqueSuffix}-${req.fileIndex}${ext}`; // Add index to filename
      req.fileIndex++; // Increment index for next file
      cb(null, uniqueName);

    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|webp|jpg|png|gif/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);
    console.log({
      originalname: file.originalname,
      extname: path.extname(file.originalname).toLowerCase(),
      mimetype: file.mimetype,
    });

    if (!extName || !mimeType) {
      return cb(new Error('Only image files are allowed!'));
    }
    return cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB size limit
});

// Function to create a dynamic multer instance
const createMulterUploader = (uploadPath, fileNamePrefix = "file", allowedTypes = /jpeg|jpg|png|gif/) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const fullUploadPath = path.join(global.uploadsBaseDir, `/${uploadPath}`);
        if (!fs.existsSync(fullUploadPath)) {
          fs.mkdirSync(fullUploadPath, { recursive: true });
        }
        cb(null, fullUploadPath);
      },
      filename: (req, file, cb) => {
        if (!req.fileIndex) req.fileIndex = 0; // Initialize index if not set

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const uniqueName = `${fileNamePrefix}-${uniqueSuffix}-${req.fileIndex}${ext}`; // Add index to filename
        req.fileIndex++; // Increment index for next file
        cb(null, uniqueName);

      },
    }),
    fileFilter: (req, file, cb) => {
      const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (!extName || !mimeType) {
        return cb(new Error('Only image files are allowed!'));
      }
      return cb(null, true);
    },
    limits: {
      fileSize: 2 * 1024 * 1024, // Limit file size to 2MB
    },
  });
};

const userManualPaymentScreenshotUpload = createMulterUploader(UPLOADED_PATH.MANUAL_PAYMENT_SCREENSHOT, 'payment-screenshot');


// Endpoints
router.get('/auth/user/dashboard/seo', authenticationAPIKey, userAuthController.dashboardSeo);
router.get('/auth/user/dashboard', authenticationAPIKey, authenticationJWT, userAuthController.dashboard);

// Profile
router.get('/auth/user/profile/seo', authenticationAPIKey, userAuthController.profileSeo);
router.get('/auth/user/profile', authenticationAPIKey, authenticationJWT, userAuthController.profile);
router.get('/auth/user/changeProfile/seo', authenticationAPIKey, userAuthController.changeProfileSeo);
router.post(
  '/auth/user/changeProfile',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(upload.single('profilePic')),
  validateInputExpress(changeProfileFormExpressSchema),
  userAuthController.changeProfile
);
router.post(
  '/auth/user/changeProfile/verifyEmailUpdateVerificationCode',
  authenticationAPIKey,
  validateInputExpress(updateEmailVerificationFormExpressSchema),
  authenticationJWT,
  userAuthController.verifyEmailUpdateVerificationCode
);
router.get('/auth/user/changePassword/seo', authenticationAPIKey, userAuthController.changePasswordSeo);
router.post('/auth/user/changeProfile/updatePassword',
  authenticationAPIKey,
  authenticationJWT,
  validateInputExpress(changePasswordFormExpressSchema),
  userAuthController.changePassword);

router.post(
  '/auth/user/setUsername',
  authenticationAPIKey,
  authenticationJWT,
  validateInputExpress(setProfileUsernameFormExpressSchema),
  userAuthController.setUsername
);

router.get('/auth/user/delete-account/seo', authenticationAPIKey, userAuthController.deleteAccountSeo);
router.post('/auth/user/delete-account',
  authenticationAPIKey,
  validateInputExpress(deleteAccountFormExpressSchema),
  authenticationJWT,
  userAuthController.deleteAccount);


// Notifications
router.get('/auth/user/notifications', authenticationAPIKey, authenticationJWT, userAuthController.notifications);
router.post('/auth/user/read/notification', authenticationAPIKey, authenticationJWT, userAuthController.readNotification);


// Posts
router.get('/auth/user/post/all/seo', authenticationAPIKey, userAuthController.postListSeo);
router.get('/auth/user/post/all', authenticationAPIKey, authenticationJWT, userAuthController.postList);
router.get('/auth/user/post/view/:id/seo', authenticationAPIKey, userAuthController.postViewSeo);
router.get('/auth/user/post/view/:id', authenticationAPIKey, authenticationJWT, userAuthController.postView);
router.get('/auth/user/post/edit/:id/seo', authenticationAPIKey, userAuthController.postEditSeo);
router.get('/auth/user/post/edit/:id', authenticationAPIKey, authenticationJWT, userAuthController.postEdit);
router.post('/auth/user/post/update', authenticationAPIKey, validateInputExpress(editPostFormExpressSchema), authenticationJWT, userAuthController.postEditUpdate);
router.post('/auth/user/post/delete', authenticationAPIKey, authenticationJWT, userAuthController.postDelete);
router.get('/auth/user/post/add/seo', authenticationAPIKey, userAuthController.postAddSeo);
router.get('/auth/user/post/add/fetchCountries', authenticationJWT, userAuthController.postAddFetchCountries);
router.get('/auth/user/post/add/fetchCities/:countryId', authenticationJWT, userAuthController.postAddFetchCities);
router.get('/auth/user/post/add/fetchSubCities/:countryId/:cityId', authenticationJWT, userAuthController.postAddFetchSubCities);
router.get('/auth/user/post/add/fetchCategories', authenticationJWT, userAuthController.postAddFetchCategories);
router.get('/auth/user/post/add/fetchSubCategories/:categoryId', authenticationJWT, userAuthController.postAddFetchSubCategories);
router.get('/auth/user/post/add/getOtherData', authenticationJWT, userAuthController.postAddGetOtherData);
router.post('/auth/user/post/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(postImgsUpload.array('images', 10)), // Handle up to 10 images
  validateInputExpress(addPostFormExpressSchema),
  userAuthController.postAddSave);


// Recharge
router.get('/auth/user/balance/recharge/seo', authenticationAPIKey, userAuthController.balanceRechargeSeo);
router.get('/auth/user/balance/recharge', authenticationAPIKey, authenticationJWT, userAuthController.balanceRecharge);
router.get('/auth/user/balance/manualPaymentDetail', authenticationAPIKey, authenticationJWT, userAuthController.manualPaymentDetail);

router.post('/auth/user/balance/saveManualRechargeBalance',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(userManualPaymentScreenshotUpload.single('ssAttachmentImg')),
  validateInputExpress(manualRechargeBalanceFormExpressSchema),
  userAuthController.saveManualRechargeBalance);


router.get('/auth/user/balance/histories/seo', authenticationAPIKey, userAuthController.balanceHistoriesSeo);
router.get('/auth/user/balance/histories', authenticationAPIKey, authenticationJWT, userAuthController.balanceHistories);
router.get('/auth/user/invoice/histories', authenticationAPIKey, authenticationJWT, userAuthController.invoiceHistories);

module.exports = router;
