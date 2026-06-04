const express = require('express');
const router = express.Router();
const collegeAdminController = require('../controllers/collegeAdminController');
const { authenticateAdminPortal } = require('../middleware/portalGuards');

/** Legacy college-admin API — requires authenticated admin portal access. */
router.use(authenticateAdminPortal);

router.post('/college-admin/create', collegeAdminController.createCollegeAdmin);
router.get('/college-admin/:id', collegeAdminController.getCollegeAdmin);
router.put('/college-admin/update/:id', collegeAdminController.updateCollegeAdmin);
router.delete('/college-admin/delete/:id', collegeAdminController.deleteCollegeAdmin);
router.get('/college-admin/by-college/:college_id', collegeAdminController.getCollegeAdminsByCollege);
router.get('/college-admin/dashboard/:college_id', collegeAdminController.getCollegeDashboard);

module.exports = router;
