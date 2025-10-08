const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');
const { validateInputExpress } = require('../../middlewares/validation.middleware');
const { signupFormExpressSchema, loginFormExpressSchema, signupVerificationCodeFormExpressSchema, forgotVerificationFormExpressSchema, forgotPasswordFormExpressSchema, resetPasswordVerificationFormExpressSchema } = require('../../utils/expressValidationSchema');

// Controller
const authController = require('../../controllers/v1/auth.controller');

// Endpoints
router.get('/auth/signup/seo', authController.signupSeo);
router.post('/auth/signup', authenticationAPIKey, validateInputExpress(signupFormExpressSchema), authController.signup);

router.get('/auth/login/seo', authController.loginSeo);
router.post('/auth/login', authenticationAPIKey, validateInputExpress(loginFormExpressSchema), authController.login);
router.get('/auth/login/alertMsg', authController.getLoginAlertMsg);
router.post('/auth/login/googleAuth', authenticationAPIKey, authController.googleLoginAuth);

router.post('/auth/signup/sendVerificationCode', authenticationAPIKey, authController.signupSendVerificationCode);
router.get('/auth/signupVerification/seo', authController.signupVerificationSeo);
router.post('/auth/signup/verifyVerificationCode', authenticationAPIKey, validateInputExpress(signupVerificationCodeFormExpressSchema), authController.signupVerifyVerificationCode);

router.get('/auth/forgotVerification/seo', authController.forgotVerificationSeo);
router.post('/auth/forgotVerification/sendVerificationCode', authenticationAPIKey, validateInputExpress(forgotVerificationFormExpressSchema), authController.forgotVerificationSendVerificationCode);

router.get('/auth/forgotPassword/seo', authController.forgotPasswordSeo);
router.post('/auth/forgotPassword/sendResetPasswordVerificationCode', authenticationAPIKey, validateInputExpress(forgotPasswordFormExpressSchema), authController.sendResetPasswordVerificationCode);
router.get('/auth/resetPassword/seo', authController.resetPasswordSeo);
router.post('/auth/resetPassword/resetPasswordWithVerification', authenticationAPIKey, validateInputExpress(resetPasswordVerificationFormExpressSchema), authController.resetPasswordWithVerification);

// Refresh Token
router.post('/auth/refresh-token', authenticationAPIKey, authController.refreshToken);


module.exports = router;
