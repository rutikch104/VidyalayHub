const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { adminPortalScope } = require('../middleware/adminPortal');
const { requirePlatformAdminPortal } = require('../middleware/portalGuards');
const { upload } = require('../middleware/uploadMiddleware');
const adminCompatController = require('../controllers/adminCompatController');
const adminCollegeProfileController = require('../controllers/adminCollegeProfileController');

router.use(authenticate);
router.use(adminPortalScope);

// ── My-college profile management (tenant-scoped, RBAC: any admin portal user) ──
router.get('/my-college', adminCollegeProfileController.getMyCollege);
router.put('/my-college', upload.tenantLogoOptional, adminCollegeProfileController.updateMyCollege);
router.post('/my-college/logo', upload.tenantLogo, adminCollegeProfileController.uploadMyCollegeLogo);
router.delete('/my-college/logo', adminCollegeProfileController.removeMyCollegeLogo);

router.get('/stats', adminCompatController.getAdminStats);
router.get('/colleges', adminCompatController.getColleges);
router.post('/colleges', requirePlatformAdminPortal, adminCompatController.createCollege);
router.get('/colleges/:collegeId', adminCompatController.getCollege);
router.put('/colleges/:collegeId', adminCompatController.updateCollege);
router.delete('/colleges/:collegeId', requirePlatformAdminPortal, adminCompatController.deleteCollege);

router.get('/students', adminCompatController.getStudents);
router.get('/teachers', adminCompatController.getTeachers);
router.get('/alumni', adminCompatController.getAlumni);
router.get('/registrations/:userId', adminCompatController.getRegistrationApplication);
router.post('/users', adminCompatController.createUser);
router.put('/users/:userId/status', adminCompatController.updateUserStatus);

router.get('/notices', adminCompatController.listAdminTenantNotices);
router.post('/notices', adminCompatController.createTenantNotice);
router.put('/notices/:noticeId', adminCompatController.updateTenantNotice);
router.delete('/notices/:noticeId', adminCompatController.archiveTenantNotice);

router.get('/analytics', adminCompatController.getAnalytics);
router.get('/export/:type', adminCompatController.exportData);
router.get('/activity', adminCompatController.getRecentActivity);

module.exports = router;
