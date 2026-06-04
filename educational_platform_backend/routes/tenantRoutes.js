const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticateSuperAdmin } = require('../middleware/portalGuards');

// Public: approved colleges for student / faculty signup dropdown (no auth)
router.get('/public/approved-colleges', tenantController.listApprovedTenantsPublic);
router.get('/public/by-slug/:slug', tenantController.getTenantBySlugPublic);

// Public: college registration application
router.post('/createtenants', tenantController.createTenant);

// Super-admin only: tenant management
router.use(authenticateSuperAdmin);

router.get('/gettenants/:id', tenantController.getTenantById);
router.get('/getpendingtenants', tenantController.getPendingTenants);
router.put('/vhadmin/:id/status', tenantController.updateTenantStatus);
router.post('/tenant-admins', tenantController.createTenantAdmin);

module.exports = router;
