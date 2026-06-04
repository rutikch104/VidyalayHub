const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/signin', authController.signin);
router.get('/me', authenticate, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
