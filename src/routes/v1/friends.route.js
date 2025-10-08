const express = require('express');
const router = express.Router();
const { authenticationAPIKey } = require('../../middlewares/auth.middleware');

// Controller
const friendsController = require('../../controllers/v1/friends.controller');

router.get('/friends/seo', friendsController.getFriendsSeo);
router.get('/friends', authenticationAPIKey, friendsController.getFriends);
router.get('/friends/ads', friendsController.getFriendsAdsList);

module.exports = router;
