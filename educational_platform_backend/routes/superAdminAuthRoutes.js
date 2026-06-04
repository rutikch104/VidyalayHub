const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireSuperAdminAccess } = require('../middleware/superAdminAccess');
const c = require('../controllers/superAdminAuthController');

router.post('/login', c.login);
router.get('/me', authenticate, c.me);
router.get('/owners', authenticate, requireSuperAdminAccess, c.listOwners);
router.post('/owners', authenticate, requireSuperAdminAccess, c.createOwner);

module.exports = router;
