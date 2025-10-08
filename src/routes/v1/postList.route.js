const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const postListController = require('../../controllers/v1/postList.controller');


router.get('/posts/seo', postListController.getPostSeo);
router.get('/posts/alertMsg', postListController.getPostAlertMsg);
router.get('/posts/all', authenticationAPIKey, postListController.getPostList);
router.get('/posts/leftSideFilters', authenticationAPIKey, postListController.getPostLeftSideFilters);
router.get('/posts/ads', postListController.getPostTypeAdsList);
router.get('/posts/leftAds', postListController.getPostLeftAds);
router.get('/posts/rightAds', postListController.getPostRightAds);
router.get('/posts/subCategoryContent', postListController.getPostSubCategoryContent);
router.get('/posts/subCategoriesByCategory', postListController.getSubCategories);
router.get('/posts/updatePostAdsClickCount/:postId', authenticationAPIKey, postListController.updatePostAdsClickCount);


module.exports = router;
