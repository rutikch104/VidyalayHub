const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireSuperAdminAccess } = require('../middleware/superAdminAccess');
const c = require('../controllers/superAdminCompatController');

router.use(authenticate);
router.use(requireSuperAdminAccess);

router.get('/metrics', c.getSystemMetrics);
router.get('/users', c.listAllUsers);

router.get('/colleges', c.getColleges);
router.post('/colleges', c.createCollege);
router.get('/colleges/:collegeId/stats', c.getCollegeStats);
router.put('/colleges/:collegeId/status', c.toggleCollegeStatus);
router.put('/colleges/:collegeId/subscription', c.updateSubscription);
router.post('/colleges/:collegeId/notify', c.sendNotification);
router.post('/colleges/:collegeId/portal-admin', c.createCollegePortalAdmin);
router.get('/colleges/:collegeId', c.getCollege);
router.put('/colleges/:collegeId', c.updateCollege);
router.delete('/colleges/:collegeId', c.deleteCollege);

router.get('/analytics', c.getAnalytics);
router.get('/revenue', c.getRevenueAnalytics);
router.get('/health', c.getSystemHealth);
router.get('/activities', c.getActivities);
router.get('/export/:type', c.exportData);
router.get('/settings', c.getSettings);
router.put('/settings', c.updateSettings);

module.exports = router;
