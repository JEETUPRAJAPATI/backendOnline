const express = require('express');
const router = express.Router();
const { authenticationAPIKey, authenticationJWT } = require('../../middlewares/auth.middleware');
const { validateInputExpress } = require('../../middlewares/validation.middleware');
const { adminLoginFormExpressSchema,
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
  adminTermsConditionFormExpressSchema,
  adminAboutFormExpressSchema,
  adminHomePageNoticeFormExpressSchema,
  adminAlertMessageFormExpressSchema,
  adminDashboardContentFormExpressSchema,
  adminFeaturedPackagesFormExpressSchema,
  adminExtendedPackagesFormExpressSchema,
  adminSidebarNavLinksFormExpressSchema,
  adminSubCityContentFormExpressSchema,
  adminSubCategoryContentFormExpressSchema,
  adminSiteLinkCategoryFormExpressSchema,
  adminSponsoredLinksFormExpressSchema,
  adminFriendsLinksFormExpressSchema,
  adminManualPaymentMethodFormExpressSchema,
  adminVideoCollectionFormExpressSchema,
  adminMultiPostFormExpressSchema,
  adminSiteSettingsFormExpressSchema,
  adminEmailSMTPFormExpressSchema,
  adminPaymentRequestReasonFormExpressSchema,
  adminGoogleAdsFormExpressSchema,
  adminFooterNavLinksFormExpressSchema,
  adminModulePermissionFormExpressSchema,
  adminBlogCategoryFormExpressSchema,
  adminBlogFormExpressSchema,
  adminMetaDataFormExpressSchema } = require('../../utils/expressValidationSchema');

// Controller
const adminAuthController = require('../../controllers/v1/adminAuth.controller');

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

// Create the Multer instance
const siteImgUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(global.uploadsBaseDir, `/${UPLOADED_PATH.SITE_LINK_IMAGE}`);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const uniqueName = `${file.fieldname}-${timestamp}${extension}`; // Include fieldname in unique filename
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
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

// Admin Profile Image
const adminProfileImgUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(global.uploadsBaseDir, `/${UPLOADED_PATH.ADMIN_PROFILE_IMAGE}`);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const uniqueName = `${file.fieldname}-${timestamp}${extension}`; // Include fieldname in unique filename
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
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

// Function to create a dynamic multer instance
const createVideoMulterUploader = (uploadPath) => {
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
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const uniqueName = `${file.fieldname}-${timestamp}${extension}`;
        cb(null, uniqueName);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = /mp4|mov|avi|wmv|flv|mkv|webm/;
      const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);
      if (!extName || !mimeType) {
        return cb(new Error('Only video files are allowed!'));
      }
      return cb(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    },
  });
};

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

// Create separate upload handlers
const adminAdImgUpload = createMulterUploader(UPLOADED_PATH.ADMIN_AD_IMAGE, "ad");
const sliderAdImgUpload = createMulterUploader(UPLOADED_PATH.ADMIN_SLIDER_AD_IMAGE, "sliderAd");
const postAdImgUpload = createMulterUploader(UPLOADED_PATH.ADMIN_POST_AD_IMAGE, "postAd");
const categoryPostAdImgUpload = createMulterUploader(UPLOADED_PATH.ADMIN_CATEGORY_POST_AD_IMAGE, "categoryPostAd");
const adminMultipostImgsUpload = createMulterUploader(UPLOADED_PATH.ADMIN_POST_IMAGE, "post");
const adminSettingsImgsUpload = createMulterUploader(UPLOADED_PATH.ADMIN_SETTINGS_IMAGE, "settings");
const adminVideoUpload = createVideoMulterUploader(UPLOADED_PATH.ADMIN_VIDEO);
const blogImgUpload = createMulterUploader(UPLOADED_PATH.ADMIN_BLOG_IMAGE, "blog");


// :::::::::::::::::::::::::::::::::: Endpoints ::::::::::::::::::::::::::::::::::

router.get('/admin/login/seo', adminAuthController.loginSeo);
router.post('/admin/login', authenticationAPIKey, validateInputExpress(adminLoginFormExpressSchema), adminAuthController.login);

router.get('/admin/profile', authenticationAPIKey, authenticationJWT, adminAuthController.profile);

// Notifications
router.get('/admin/notifications/seo', adminAuthController.notificationsSeo);
router.get('/admin/notices', authenticationAPIKey, authenticationJWT, adminAuthController.notices);
router.get('/admin/notice/detail', authenticationAPIKey, authenticationJWT, adminAuthController.noticeDetail);
router.get('/admin/notifications', authenticationAPIKey, authenticationJWT, adminAuthController.notifications);
router.post('/admin/notification/add', authenticationAPIKey, authenticationJWT, validateInputExpress(adminAddNotificationFormExpressSchema), adminAuthController.notificationAdd);

// router.post('/admin/read/notification', authenticationAPIKey, authenticationJWT, userAuthController.readNotification);

router.get('/admin/linkRequests/seo', adminAuthController.linkRequestsSeo);
router.get('/admin/linkRequests', authenticationAPIKey, authenticationJWT, adminAuthController.linkRequests);
router.get('/admin/linkRequest/detail', authenticationAPIKey, authenticationJWT, adminAuthController.linkRequestDetail);
router.get('/admin/siteLinkCategories', authenticationAPIKey, authenticationJWT, adminAuthController.siteLinkCategories);
router.get('/admin/siteLinksAdded', authenticationAPIKey, authenticationJWT, adminAuthController.siteLinksAdded);
router.post('/admin/siteLink/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(siteImgUpload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])),
  validateInputExpress(adminAddSiteLinkFormExpressSchema),
  adminAuthController.addSiteLink);
router.get('/admin/siteLink/edit/:id', authenticationAPIKey, authenticationJWT, adminAuthController.siteLinkEdit);


router.get('/admin/messages/seo', adminAuthController.messagesSeo);
router.get('/admin/messages', authenticationAPIKey, authenticationJWT, adminAuthController.messages);
router.get('/admin/message/detail', authenticationAPIKey, authenticationJWT, adminAuthController.messageDetail);
router.post(
  '/admin/message/reply',
  authenticationAPIKey,
  authenticationJWT,
  validateInputExpress(adminReplyMessageFormExpressSchema),
  adminAuthController.sendReplyToMessage
);

router.get('/admin/dashboard/seo', adminAuthController.dashboardSeo);
router.get('/admin/dashboard', authenticationAPIKey, authenticationJWT, adminAuthController.dashboard);

router.get('/admin/users/seo', adminAuthController.usersSeo);
router.get('/admin/users', authenticationAPIKey, authenticationJWT, adminAuthController.users);
router.get('/admin/user/detail', authenticationAPIKey, authenticationJWT, adminAuthController.userDetail);
router.get('/admin/user/posts', authenticationAPIKey, authenticationJWT, adminAuthController.userAllPost);

router.post('/admin/perform-action', authenticationAPIKey, authenticationJWT, adminAuthController.performAction);

// Admin Profiles
router.get('/admin/profiles/seo', adminAuthController.profilesSeo);
router.get('/admin/profiles/all', authenticationAPIKey, authenticationJWT, adminAuthController.allProfile);
router.get('/admin/profile/detail', authenticationAPIKey, authenticationJWT, adminAuthController.profileDetail);
router.post(
  '/admin/profile/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(adminProfileImgUpload.single('profilePic')),
  validateInputExpress(adminProfileFormExpressSchema),
  adminAuthController.profileSave
);

// Post
router.get('/admin/posts/seo', adminAuthController.postsSeo);
router.get('/admin/posts', authenticationAPIKey, authenticationJWT, adminAuthController.posts);
router.get('/admin/post/detail', authenticationAPIKey, authenticationJWT, adminAuthController.postDetail);

// Country
router.get('/admin/countries/seo', adminAuthController.countriesSeo);
router.get('/admin/countries/all', authenticationAPIKey, authenticationJWT, adminAuthController.countries);
router.get('/admin/country/detail', authenticationAPIKey, authenticationJWT, adminAuthController.countryDetail);
router.post('/admin/country/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminCountryFormExpressSchema), adminAuthController.countrySave);

// City
router.get('/admin/cities/seo', adminAuthController.citiesSeo);
router.get('/admin/cities/all', authenticationAPIKey, authenticationJWT, adminAuthController.cities);
router.get('/admin/city/detail', authenticationAPIKey, authenticationJWT, adminAuthController.cityDetail);
router.post('/admin/city/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminCityFormExpressSchema), adminAuthController.citySave);

// Sub City
router.get('/admin/sub-cities/seo', adminAuthController.subCitiesSeo);
router.get('/admin/sub-cities/all', authenticationAPIKey, authenticationJWT, adminAuthController.subCities);
router.get('/admin/sub-city/detail', authenticationAPIKey, authenticationJWT, adminAuthController.subCityDetail);
router.post('/admin/sub-city/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSubCityFormExpressSchema), adminAuthController.subCitySave);

// Category
router.get('/admin/categories/seo', adminAuthController.categoriesSeo);
router.get('/admin/categories/all', authenticationAPIKey, authenticationJWT, adminAuthController.categories);
router.get('/admin/category/detail', authenticationAPIKey, authenticationJWT, adminAuthController.categoryDetail);
router.post('/admin/category/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminCategoryFormExpressSchema), adminAuthController.categorySave);

// Sub Category
router.get('/admin/sub-categories/seo', adminAuthController.subCategoriesSeo);
router.get('/admin/sub-categories/all', authenticationAPIKey, authenticationJWT, adminAuthController.subCategories);
router.get('/admin/sub-category/detail', authenticationAPIKey, authenticationJWT, adminAuthController.subCategoryDetail);
router.post('/admin/sub-category/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSubCategoryFormExpressSchema), adminAuthController.subCategorySave);

// Ad Manager
router.get('/admin/ads/seo', adminAuthController.adsSeo);
router.get('/admin/ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.ads);
router.get('/admin/ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.adDetail);
router.post(
  '/admin/ad/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(adminAdImgUpload.single('adBannerImg')),
  validateInputExpress(adminAdManagerFormExpressSchema),
  adminAuthController.adSave
);

// Slider Ads
router.get('/admin/slider-ads/seo', adminAuthController.sliderAdsSeo);
router.get('/admin/slider-ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.sliderAds);
router.get('/admin/slider-ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.sliderAdsDetail);
router.post(
  '/admin/slider-ad/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(sliderAdImgUpload.single('adBannerImg')),
  validateInputExpress(adminSliderAdsFormExpressSchema),
  adminAuthController.sliderAdsSave);

// Post Ads
router.get('/admin/post-ads/seo', adminAuthController.postAdsSeo);
router.get('/admin/post-ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.postAds);
router.get('/admin/post-ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.postAdsDetail);
router.post('/admin/post-ad/save', authenticationAPIKey, authenticationJWT,
  handleMulterErrors(postAdImgUpload.single('adBannerImg')),
  validateInputExpress(adminPostAdsFormExpressSchema),
  adminAuthController.postAdsSave);

// New Post Ads
router.get('/admin/new-post-ads/seo', adminAuthController.newPostAdsSeo);
router.get('/admin/new-post-ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.newPostAds);
router.get('/admin/new-post-ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.newPostAdsDetail);
router.post('/admin/new-post-ad/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminNewPostAdsFormExpressSchema), adminAuthController.newPostAdsSave);

// Category-Post Ads
router.get('/admin/category-post-ads/seo', adminAuthController.categoryOrPostAdsSeo);
router.get('/admin/category-post-ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.categoryOrPostAds);
router.get('/admin/category-post-ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.categoryOrPostAdsDetail);
router.post('/admin/category-post-ad/save', authenticationAPIKey, authenticationJWT,
  handleMulterErrors(categoryPostAdImgUpload.single('adBannerImg')),
  validateInputExpress(adminCategoryPostAdsFormExpressSchema),
  adminAuthController.categoryOrPostAdsSave);

// Google Ads
router.get('/admin/google-ads/seo', adminAuthController.googleAdsSeo);
router.get('/admin/google-ads/all', authenticationAPIKey, authenticationJWT, adminAuthController.googleAds);
router.get('/admin/google-ad/detail', authenticationAPIKey, authenticationJWT, adminAuthController.googleAdsDetail);
router.post('/admin/google-ad/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminGoogleAdsFormExpressSchema), adminAuthController.googleAdsSave);


// Multi Post
router.get('/admin/multi-posts/seo', adminAuthController.multiPostsSeo);
router.get('/admin/multi-posts/all', authenticationAPIKey, authenticationJWT, adminAuthController.multiPosts);
router.get('/admin/multi-post/detail', authenticationAPIKey, authenticationJWT, adminAuthController.multiPostDetail);
router.post('/admin/multi-post/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(adminMultipostImgsUpload.array('images', 10)), // Handle up to 10 images
  validateInputExpress(adminMultiPostFormExpressSchema),
  adminAuthController.multiPostSave);

// Terms Condition
router.get('/admin/terms/seo', adminAuthController.termsSeo);
router.get('/admin/terms/all', authenticationAPIKey, authenticationJWT, adminAuthController.terms);
router.get('/admin/terms/detail', authenticationAPIKey, authenticationJWT, adminAuthController.termsDetail);
router.post('/admin/terms/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminTermsConditionFormExpressSchema), adminAuthController.termsSave);

// About
router.get('/admin/about/seo', adminAuthController.aboutSeo);
router.get('/admin/about/all', authenticationAPIKey, authenticationJWT, adminAuthController.aboutList);
router.get('/admin/about/detail', authenticationAPIKey, authenticationJWT, adminAuthController.aboutDetail);
router.post('/admin/about/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminAboutFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.aboutSave);

// Home Page Notice
router.get('/admin/home-page-notice/seo', adminAuthController.homePageNoticeSeo);
router.get('/admin/home-page-notice/all', authenticationAPIKey, authenticationJWT, adminAuthController.homePageNotices);
router.get('/admin/home-page-notice/detail', authenticationAPIKey, authenticationJWT, adminAuthController.homePageNoticeDetail);
router.post('/admin/home-page-notice/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminHomePageNoticeFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.homePageNoticeSave);

// Alert Message
router.get('/admin/alert-message/seo', adminAuthController.alertMessageSeo);
router.get('/admin/alert-message/all', authenticationAPIKey, authenticationJWT, adminAuthController.alertMessages);
router.get('/admin/alert-message/detail', authenticationAPIKey, authenticationJWT, adminAuthController.alertMessageDetail);
router.post('/admin/alert-message/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminAlertMessageFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.alertMessageSave);

// Dashboard Content
router.get('/admin/dashboard-content/seo', adminAuthController.dashboardContentSeo);
router.get('/admin/dashboard-content/detail', authenticationAPIKey, authenticationJWT, adminAuthController.dashboardContentDetail);
router.post('/admin/dashboard-content/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminDashboardContentFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.dashboardContentSave);

// Post Reports
router.get('/admin/post-reports/seo', adminAuthController.postReportSeo);
router.get('/admin/post-reports/all', authenticationAPIKey, authenticationJWT, adminAuthController.postReports);
router.get('/admin/post-report/detail', authenticationAPIKey, authenticationJWT, adminAuthController.postReportDetail);

// Featured Packages
router.get('/admin/featured-packages/seo', adminAuthController.featuredPackagesSeo);
router.get('/admin/featured-packages/all', authenticationAPIKey, authenticationJWT, adminAuthController.featuredPackages);
router.get('/admin/featured-package/detail', authenticationAPIKey, authenticationJWT, adminAuthController.featuredPackageDetail);
router.post('/admin/featured-package/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminFeaturedPackagesFormExpressSchema), adminAuthController.featuredPackageSave);

// Extended Packages
router.get('/admin/extended-packages/seo', adminAuthController.extendedPackagesSeo);
router.get('/admin/extended-packages/all', authenticationAPIKey, authenticationJWT, adminAuthController.extendedPackages);
router.get('/admin/extended-package/detail', authenticationAPIKey, authenticationJWT, adminAuthController.extendedPackageDetail);
router.post('/admin/extended-package/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminExtendedPackagesFormExpressSchema), adminAuthController.extendedPackageSave);

// Sidebar Nav Links
router.get('/admin/nav-links/seo', adminAuthController.navLinkSeo);
router.get('/admin/nav-links/all', authenticationAPIKey, authenticationJWT, adminAuthController.navLinks);
router.get('/admin/nav-link/detail', authenticationAPIKey, authenticationJWT, adminAuthController.navLinkDetail);
router.post('/admin/nav-link/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSidebarNavLinksFormExpressSchema), adminAuthController.navLinkSave);

// Footer Nav Links
router.get('/admin/footer-links/seo', adminAuthController.footerLinkSeo);
router.get('/admin/footer-links/all', authenticationAPIKey, authenticationJWT, adminAuthController.footerLinks);
router.get('/admin/footer-link/detail', authenticationAPIKey, authenticationJWT, adminAuthController.footerLinkDetail);
router.post('/admin/footer-link/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminFooterNavLinksFormExpressSchema), adminAuthController.footerLinkSave);


// SubCity Content
router.get('/admin/subcity-content/seo', adminAuthController.subCityContentSeo);
router.get('/admin/subcity-content/all', authenticationAPIKey, authenticationJWT, adminAuthController.subCityContents);
router.get('/admin/subcity-content/detail', authenticationAPIKey, authenticationJWT, adminAuthController.subCityContentDetail);
router.post('/admin/subcity-content/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSubCityContentFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.subCityContentSave);

// SubCategory Content
router.get('/admin/subcategory-content/seo', adminAuthController.subCategoryContentSeo);
router.get('/admin/subcategory-content/all', authenticationAPIKey, authenticationJWT, adminAuthController.subCategoryContents);
router.get('/admin/subcategory-content/detail', authenticationAPIKey, authenticationJWT, adminAuthController.subCategoryContentDetail);
router.post('/admin/subcategory-content/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSubCategoryContentFormExpressSchema, config = {
  EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
}), adminAuthController.subCategoryContentSave);


// SiteLink Category
router.get('/admin/site-link-categories/seo', adminAuthController.siteLinkCategorySeo);
router.get('/admin/site-link-categories/all', authenticationAPIKey, authenticationJWT, adminAuthController.siteLinkCategories);
router.get('/admin/site-link-category/detail', authenticationAPIKey, authenticationJWT, adminAuthController.siteLinkCategoryDetail);
router.post('/admin/site-link-category/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSiteLinkCategoryFormExpressSchema), adminAuthController.siteLinkCategorySave);


// Sponsored Links
router.get('/admin/sponsored-links/seo', adminAuthController.sponseredLinkSeo);
router.get('/admin/sponsored-links/all', authenticationAPIKey, authenticationJWT, adminAuthController.sponseredLinks);
router.get('/admin/sponsored-link/detail', authenticationAPIKey, authenticationJWT, adminAuthController.sponseredLinkDetail);
router.post('/admin/sponsored-link/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminSponsoredLinksFormExpressSchema), adminAuthController.sponseredLinkSave);

// Friends Links
router.get('/admin/friend-links/seo', adminAuthController.friendLinkSeo);
router.get('/admin/friend-links/all', authenticationAPIKey, authenticationJWT, adminAuthController.friendLinks);
router.get('/admin/friend-link/detail', authenticationAPIKey, authenticationJWT, adminAuthController.friendLinkDetail);
router.post('/admin/friend-link/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminFriendsLinksFormExpressSchema), adminAuthController.friendLinkSave);

// Settings

// Site Settings
router.get('/admin/site-settings/seo', adminAuthController.siteSettingsSeo);
router.get('/admin/site-settings/detail', authenticationAPIKey, authenticationJWT, adminAuthController.siteSettingsDetail);
router.post('/admin/site-settings/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(adminSettingsImgsUpload.fields([
    { name: 'faviconImage', maxCount: 1 },
    { name: 'headerImage', maxCount: 1 },
    { name: 'footerImage', maxCount: 1 },
  ])),
  validateInputExpress(adminSiteSettingsFormExpressSchema),
  adminAuthController.siteSettingsSave);

// Email SMTP Settings
router.get('/admin/email-smtp-settings/seo', adminAuthController.smtpSeo);
router.get('/admin/email-smtp-settings/detail', authenticationAPIKey, authenticationJWT, adminAuthController.smtpDetail);
router.post('/admin/email-smtp-settings/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminEmailSMTPFormExpressSchema), adminAuthController.smtpSave);

// Manual Payment Method
router.get('/admin/manual-payment-method/seo', adminAuthController.maunalPaymentMethodSeo);
router.get('/admin/manual-payment-method/all', authenticationAPIKey, authenticationJWT, adminAuthController.maunalPaymentMethods);
router.get('/admin/manual-payment-method/detail', authenticationAPIKey, authenticationJWT, adminAuthController.maunalPaymentMethodDetail);
router.post('/admin/manual-payment-method/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminManualPaymentMethodFormExpressSchema), adminAuthController.maunalPaymentMethodSave);

// Manual Payment Request
router.get('/admin/manual-payment-request/seo', adminAuthController.maunalPaymentRequestSeo);
router.get('/admin/manual-payment-request/all', authenticationAPIKey, authenticationJWT, adminAuthController.maunalPaymentRequests);
router.get('/admin/manual-payment-request/detail', authenticationAPIKey, authenticationJWT, adminAuthController.maunalPaymentRequestDetail);
router.post('/admin/manual-payment-request/savePaymentRequestReason', authenticationAPIKey, authenticationJWT, validateInputExpress(adminPaymentRequestReasonFormExpressSchema), adminAuthController.savePaymentRequestReason);


// Video Collection
router.get('/admin/video-collection/seo', adminAuthController.videoUploadSeo);
router.get('/admin/video-collection/all', authenticationAPIKey, authenticationJWT, adminAuthController.videoUploads);
router.get('/admin/video-collection/detail', authenticationAPIKey, authenticationJWT, adminAuthController.videoUploadDetail);
router.post(
  '/admin/video-collection/save',
  authenticationAPIKey,
  authenticationJWT,
  // handleMulterErrors(adminVideoUpload.single('video')),
  validateInputExpress(adminVideoCollectionFormExpressSchema),
  adminAuthController.videoUploadSave);


// Module Permissions
router.get('/admin/modules/seo', adminAuthController.moduleSeo);
router.get('/admin/modules/permission/all', authenticationAPIKey, authenticationJWT, adminAuthController.modulePermissions);
router.get('/admin/modules/all', authenticationAPIKey, authenticationJWT, adminAuthController.allModules);
router.get('/admin/module/permission/detail', authenticationAPIKey, authenticationJWT, adminAuthController.modulePermissionsDetail);
router.post('/admin/module/savePermission', authenticationAPIKey, authenticationJWT, validateInputExpress(adminModulePermissionFormExpressSchema), adminAuthController.saveModulePermission);

// ====== Blog ======
// Category
router.get('/admin/blog-categories/seo', adminAuthController.blogCategoriesSeo);
router.get('/admin/blog-categories/all', authenticationAPIKey, authenticationJWT, adminAuthController.blogCategories);
router.get('/admin/blog-category/detail', authenticationAPIKey, authenticationJWT, adminAuthController.blogCategoryDetail);
router.post('/admin/blog-category/save', authenticationAPIKey, authenticationJWT, validateInputExpress(adminBlogCategoryFormExpressSchema), adminAuthController.blogCategorySave);

router.get('/admin/blogs/seo', adminAuthController.blogsSeo);
router.get('/admin/blogs/all', authenticationAPIKey, authenticationJWT, adminAuthController.blogs);
router.get('/admin/blog/detail', authenticationAPIKey, authenticationJWT, adminAuthController.blogDetail);
router.post('/admin/blog/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(blogImgUpload.single('image')),
  validateInputExpress(adminBlogFormExpressSchema),
  adminAuthController.saveBlog);

// ====== Meta Data ======
router.get('/admin/meta-data/seo', adminAuthController.metaDataSeo);
router.get('/admin/meta-data/all', authenticationAPIKey, authenticationJWT, adminAuthController.metaDatas);
router.get('/admin/meta-data/detail', authenticationAPIKey, authenticationJWT, adminAuthController.metaDataDetail);
router.post('/admin/meta-data/save',
  authenticationAPIKey,
  authenticationJWT,
  handleMulterErrors(blogImgUpload.single('image')),
  validateInputExpress(adminMetaDataFormExpressSchema, config = {
    EDITOR_ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'style'],
    XSS_OPTIONS: {
      whiteList: {
        h1: ["style", "title", "class"],
        a: ["href", "title", "target", "rel"],
      },
    }
  },),
  adminAuthController.saveMetaData);

module.exports = router;
