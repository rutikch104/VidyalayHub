const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

router.get('/featured', eventController.getFeatured);
router.get('/upcoming', eventController.getUpcoming);
router.get('/trending', eventController.getTrending);
router.get('/search', eventController.searchEvents);
router.get('/categories', eventController.getCategories);
router.get('/types', eventController.getTypes);
router.get('/user/registered', eventController.getUserRegistered);
router.get('/user/organized', eventController.getUserOrganized);

router.post('/', upload.attachment, eventController.createEvent);
router.get('/', eventController.listEvents);

router.get('/:id/registrations', eventController.getEventRegistrations);
router.put('/:id/registrations/:registrationId', eventController.updateRegistrationStatus);
router.get('/:id/analytics', eventController.getEventAnalytics);
router.post('/:id/calendar', eventController.notImplemented);
router.post('/:id/share', eventController.notImplemented);
router.post('/:id/reminders', eventController.notImplemented);

router.post('/:id/register', eventController.registerForEvent);
router.delete('/:id/register', eventController.unregisterFromEvent);

router.get('/:id', eventController.getEventById);
router.put('/:id', upload.attachment, eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
