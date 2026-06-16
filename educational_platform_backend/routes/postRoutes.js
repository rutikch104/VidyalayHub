const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Post CRUD operations
router.post('/', upload.post, postController.createPost);
router.get('/', postController.getPosts);
router.get('/trending-hashtags', postController.getTrendingHashtags);

// Post interactions (before /:id to avoid route ambiguity)
router.get('/:id/likes', postController.getPostLikes);
router.get('/:id/reposts', postController.getPostReposts);
router.post('/:id/like', postController.toggleLike);
router.post('/:id/repost', postController.toggleRepost);
router.post('/:id/comment', postController.addComment);
router.post('/:id/comments', postController.addComment);
router.get('/:id/comments', postController.getComments);
router.put('/:id/comments/:commentId', postController.updateComment);
router.post('/:id/comments/:commentId/like', postController.toggleCommentLike);
router.delete('/:id/comments/:commentId', postController.deleteComment);

router.get('/:id', postController.getPost);
router.put('/:id', upload.post, postController.updatePost);
router.delete('/:id', postController.deletePost);

module.exports = router;
