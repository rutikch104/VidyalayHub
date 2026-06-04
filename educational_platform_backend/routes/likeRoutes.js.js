const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const likeController = require('../controllers/likeController');

router.use(authenticate);

router.post('/', likeController.addLike);
router.get('/', likeController.getAllLikes);
router.get('/:post_id', likeController.getLikesByPostId);
router.delete('/', likeController.removeLike);

module.exports = router;
