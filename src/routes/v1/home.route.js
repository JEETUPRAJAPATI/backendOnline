const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const homeController = require('../../controllers/v1/home.controller');

router.get('/home/seo', homeController.getHomeSeo);
router.get('/home/topNotice', homeController.getHomeTopNotice);
router.get('/home/dashboardContent', homeController.getHomeDashboardContent);
router.get('/home/countries', authenticationAPIKey, homeController.getHomeCountries);
router.get('/home/countriesV2', authenticationAPIKey, homeController.getHomeCountriesV2);
router.get('/home/loadMoreCountries', authenticationAPIKey, homeController.loadMoreCountries);
router.get('/home/loadMoreCities', authenticationAPIKey, homeController.loadMoreCities);
router.get('/home/loadMoreSubcities', authenticationAPIKey, homeController.loadMoreSubcities);
router.get('/home/partners', authenticationAPIKey, homeController.getHomePartners);
router.get('/home/sponsers', authenticationAPIKey, homeController.getHomeSponsers);

module.exports = router;
