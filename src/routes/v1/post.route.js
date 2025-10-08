const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');
const { validateInputJoi, validateInputYup, validateInputExpress  } = require('../../middlewares/validation.middleware');
const { reportFormJoiSchema } = require('../../utils/joiValidationSchema');
const { reportFormYupSchema } = require('../../utils/yupValidationSchema');
const { reportFormExpressSchema } = require('../../utils/expressValidationSchema');

// Controller
const postController = require('../../controllers/v1/post.controller');


router.get('/post/seo/:country/:city/:subCity/:category/:subCategory/:postId',  postController.getPostSeo);
router.get('/post/get/:country/:city/:subCity/:category/:subCategory/:postId', authenticationAPIKey, postController.getPostDetail);
router.get('/post/ads', postController.getPostDetailAds);

router.post(
    '/post/report', 
    authenticationAPIKey,               // First middleware for authentication
    // validateInputJoi(reportFormJoiSchema),    // Joi validation middleware
    // validateInputYup(reportFormYupSchema),    // Yup validation middleware
    validateInputExpress(reportFormExpressSchema), // Express validation middleware
    postController.addPostReport       // Final controller to handle the request
  );


module.exports = router;
