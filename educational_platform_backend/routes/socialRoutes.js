const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const socialController = require('../controllers/socialController');

router.use(authenticate);
router.get('/hashtags', socialController.searchHashtags);

module.exports = router;
