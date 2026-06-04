const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Static paths before /:notification_id routes
router.get('/', notificationController.getUserNotifications);
router.get('/stats', notificationController.getNotificationStats);
router.get('/unread-count', notificationController.getUnreadCount);
router.get('/settings', notificationController.getNotificationSettings);

router.put('/mark-multiple-read', notificationController.markMultipleAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.put('/settings', notificationController.updateNotificationSettings);

router.delete('/delete-multiple', notificationController.deleteMultipleNotifications);

router.post('/bulk-operations', notificationController.bulkNotificationOperations);
router.post('/create', notificationController.createNotification);

router.put('/:notification_id/read', notificationController.markAsRead);
router.delete('/:notification_id', notificationController.deleteNotification);

module.exports = router;
