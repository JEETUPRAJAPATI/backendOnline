const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const partnersController = require('../../controllers/v1/partners.controller');
const { validateInputExpress } = require('../../middlewares/validation.middleware');
const { partnerFormExpressSchema } = require('../../utils/expressValidationSchema');

router.get('/partners/seo', partnersController.getPartnerSeo);
router.get('/partners', authenticationAPIKey, partnersController.getPartners);
router.get('/partners/sponsers', authenticationAPIKey, partnersController.getPartnersSponsers);
router.get('/partners/content', partnersController.getPartnersContent);

router.get('/partners/add/seo', partnersController.getPartnerAddSeo);
router.post('/partners/add', authenticationAPIKey, validateInputExpress(partnerFormExpressSchema), partnersController.addPartner);

router.get('/partners/:category/seo', partnersController.getPartnersCategorySeo);
router.get('/partners/:category', authenticationAPIKey, partnersController.getPartnersByCategory);

router.get('/partners/:category/detail/:title/seo', partnersController.getDetailPartnerByCategorySeo);
router.get('/partners/:category/detail/:title', authenticationAPIKey, partnersController.getDetailPartnerByCategory);

router.get('/partners/list/search/seo', partnersController.getSearchPartnersSeo);
router.get('/partners/list/search', authenticationAPIKey, partnersController.getSearchPartners);

module.exports = router;
