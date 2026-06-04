const express = require('express');
const router = express.Router();
const mainAdminController = require('../controllers/mainAdminController');
const { authenticateSuperAdmin } = require('../middleware/portalGuards');

router.use(authenticateSuperAdmin);

router.get('/colleges', mainAdminController.getAllColleges);
router.patch('/college/:tenant_id/approve', mainAdminController.approveCollege);
router.patch('/college/:tenant_id/reject', mainAdminController.rejectCollege);
router.get('/notifications', mainAdminController.getPendingColleges);
router.get('/college/:tenant_id/users', mainAdminController.getCollegeUsers);
router.patch('/college/:tenant_id/status', mainAdminController.toggleCollegeStatus);
router.post('/create-tenant', mainAdminController.createTenant);
router.get('/college/:tenant_id', mainAdminController.getCollegeDetails);

module.exports = router;
