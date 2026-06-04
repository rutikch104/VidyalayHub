const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const communityController = require('../controllers/communityController');

router.use(authenticate);

router.get('/featured', communityController.getFeatured);
router.get('/search', communityController.searchCommunities);
router.get('/categories', communityController.getCategories);
router.get('/user', communityController.getUserCommunities);
router.get('/feed/posts', communityController.getMyCommunitiesFeed);

router.get('/', communityController.listCommunities);
router.post('/', communityController.createCommunity);

router.get('/:communityId', communityController.getCommunity);
router.put('/:communityId', communityController.updateCommunity);
router.delete('/:communityId', communityController.deleteCommunity);

router.post('/:communityId/join', communityController.joinCommunity);
router.delete('/:communityId/join', communityController.leaveCommunity);

router.get('/:communityId/members', communityController.getMembers);
router.delete('/:communityId/members/:userId', communityController.removeMember);
router.put('/:communityId/members/:userId', communityController.updateMemberRole);

router.get('/:communityId/posts', communityController.getPosts);
router.post('/:communityId/posts', upload.post, communityController.createPost);
router.get('/:communityId/posts/:postId', communityController.getPost);
router.put('/:communityId/posts/:postId', upload.post, communityController.updatePost);
router.delete('/:communityId/posts/:postId', communityController.deletePost);
router.post('/:communityId/posts/:postId/like', communityController.togglePostLike);

router.get('/:communityId/posts/:postId/comments', communityController.getPostComments);
router.post('/:communityId/posts/:postId/comments', communityController.createPostComment);
router.delete(
  '/:communityId/posts/:postId/comments/:commentId',
  communityController.deletePostComment,
);

router.post('/:communityId/avatar', upload.avatar, communityController.uploadCommunityAvatar);
router.post('/:communityId/cover', upload.cover, communityController.uploadCommunityCover);

module.exports = router;
