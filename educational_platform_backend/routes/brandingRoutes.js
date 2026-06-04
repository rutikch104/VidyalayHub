const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const brandingController = require('../controllers/brandingController');

router.use(authenticate);
router.get('/institution', brandingController.getInstitutionBranding);

module.exports = router;
