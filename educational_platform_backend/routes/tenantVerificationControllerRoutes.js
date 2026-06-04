const express = require('express');
const router = express.Router();
const tenantVerificationController = require('../controllers/tenantVerificationController');

router.post('/tenant-verifications', tenantVerificationController.createVerification);
router.post('/tenant-verifications/verify', tenantVerificationController.verifyLogin);

module.exports = router;