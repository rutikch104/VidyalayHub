const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', commentController.addComment);
router.get('/', commentController.getAllComments);
router.get('/:post_id', commentController.getCommentsByPostId);
router.put('/:id', commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

module.exports = router;
