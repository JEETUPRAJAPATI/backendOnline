const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');
const { validateInputExpress } = require('../../middlewares/validation.middleware');
const { contactFormExpressSchema } = require('../../utils/expressValidationSchema');

// Controller
const pagesController = require('../../controllers/v1/pages.controller');

// Endpoints
router.get('/page/contact/seo', pagesController.contactSeo);
router.post('/page/contact', authenticationAPIKey, validateInputExpress(contactFormExpressSchema), pagesController.contact);

router.get('/page/about/seo', pagesController.aboutSeo);
router.get('/page/about', pagesController.about);

router.get('/page/terms/seo', pagesController.termsSeo);
router.get('/page/terms', pagesController.terms);

router.get('/page/settings', pagesController.commonSettings);

router.get('/page/categories-sitemap', pagesController.categoriesSitemap);
router.get('/page/posts-sitemap', pagesController.postsSitemap);
router.get('/page/partners-sitemap', pagesController.partnersSitemap);

module.exports = router;
