const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Main feed endpoints
router.get('/home', feedController.getHomeFeed);
router.get('/trending-topics', feedController.getTrendingTopics);
router.get('/sidebar/notices', feedController.getSidebarNotices);
router.get('/tenant-notices', feedController.getTenantNotices);
router.get('/recommendations', feedController.getFeedRecommendations);

module.exports = router;
