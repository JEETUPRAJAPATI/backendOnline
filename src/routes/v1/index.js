const express = require('express');
const router = express.Router();

const testRoute = require('./test.route');
// My API Route
const homeRoute = require('./home.route');
const categoriesSubCategoriesRoute = require('./categoriesSubCategories.route');
const postListRoute = require('./postList.route');
const postRoute = require('./post.route');

const authRoute = require('./auth.route');
const pagesRoute = require('./pages.route');
const partnersRoute = require('./partners.route');
const friendsRoute = require('./friends.route');
const userAuthRoute = require('./userAuth.route');
const blogsRoute = require('./blogs.route');


// Admin Route
const adminAuthRoute = require('./adminAuth.route');


//::::: Router Declaration :::::
router.use(testRoute);
// My API
router.use(homeRoute);
router.use(categoriesSubCategoriesRoute);
router.use(postListRoute);
router.use(postRoute);
router.use(partnersRoute);
router.use(blogsRoute);
router.use(friendsRoute);

// Authentication Route
router.use(authRoute);
router.use(userAuthRoute);
router.use(adminAuthRoute);

router.use(pagesRoute);


module.exports = router;
