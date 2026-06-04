const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Bookmark operations
router.post('/', bookmarkController.createBookmark);
router.get('/', bookmarkController.getUserBookmarks);
router.get('/stats', bookmarkController.getBookmarkStats);
router.get('/type/:type', bookmarkController.getUserBookmarksByType);
router.get('/check', bookmarkController.isBookmarked);
router.delete('/:id', bookmarkController.deleteBookmark);

module.exports = router;
