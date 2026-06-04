const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

// REST-style aliases (must be before /:userId and /:message_id)
router.get('/conversations', messageController.getConversations);
router.post('/', messageController.sendDirectMessage);

// Thread management
router.post('/threads/direct', messageController.getOrCreateDirectThread);
router.post('/threads/group', messageController.createGroupThread);
router.get('/threads', messageController.getUserThreads);

// Message operations
router.get('/threads/:thread_id/messages', messageController.getThreadMessages);
router.post('/threads/:thread_id/messages', upload.message, messageController.sendMessage);
router.put('/threads/:thread_id/read', messageController.markAsRead);

// Group management
router.post('/threads/:thread_id/participants', messageController.addParticipant);
router.delete('/threads/:thread_id/participants/:user_id', messageController.removeParticipant);

router.get('/unread-count', messageController.getUnreadCount);

// Conversation with another user by id (UUID) — after all static /threads… paths
router.get('/:userId', messageController.getConversationWithUser);

// Single message delete — matches frontend DELETE /api/messages/:messageId
router.delete('/:message_id', messageController.deleteMessage);

module.exports = router;
