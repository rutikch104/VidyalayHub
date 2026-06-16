const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

router.post('/register', upload.registrationOptional, authController.register);
router.get('/registration-status', authController.getRegistrationStatus);
router.post('/signin', authController.signin);
router.get('/me', authenticate, authController.me);
router.post('/logout', authController.logout);

module.exports = router;
