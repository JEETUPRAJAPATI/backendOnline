const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const categoriesSubCategoriesController = require('../../controllers/v1/categoriesSubCategories.controller');


router.get('/categories/seo/:country/:city/:subCity', categoriesSubCategoriesController.getCategorySeo);
router.get('/categories/all/:country/:city/:subCity', authenticationAPIKey, categoriesSubCategoriesController.getAllCategorySubCategoryList);
router.get('/categories/postAds', authenticationAPIKey, categoriesSubCategoriesController.getCategoryPostAdsList);
router.get('/categories/ageVerificationModalContent', categoriesSubCategoriesController.getCategoryAgeVerificationModalContent);
router.get('/categories/topSideNavLinks', categoriesSubCategoriesController.getCategoryTopSideNavLinks);
router.get('/categories/sponsers', authenticationAPIKey, categoriesSubCategoriesController.getCategorySponsers);


module.exports = router;
