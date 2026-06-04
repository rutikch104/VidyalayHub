const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Job posting management
router.post('/', upload.attachment, jobController.createJob);
router.get('/', jobController.getJobs);
router.get('/trending', jobController.getTrendingJobs);
router.get('/categories', jobController.getJobCategories);
router.get('/popular-skills', jobController.getPopularJobSkills);
router.get('/stats', jobController.getJobStats);
// Must be before /:id so "applications" is not captured as an id
router.get('/applications/my', jobController.getUserApplications);

router.get('/:id', jobController.getJob);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

// Job applications
router.post('/:id/apply', upload.resume, jobController.applyForJob);
router.get('/:id/applications', jobController.getJobApplications);
router.put('/:id/applications/:application_id/status', jobController.updateApplicationStatus);

module.exports = router;
