const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const blogsController = require('../../controllers/v1/blogs.controller');

router.get('/blogs/seo', blogsController.getBlogSeo);
router.get('/blogs', authenticationAPIKey, blogsController.getBlogs);

router.get('/blog/categories', authenticationAPIKey, blogsController.getBlogCategories);
router.get('/blog/:slug/seo', blogsController.getBlogDetailSeo);
router.get('/blog/:slug', authenticationAPIKey, blogsController.getBlogDetail);

module.exports = router;
