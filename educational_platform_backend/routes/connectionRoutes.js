const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const networkController = require('../controllers/networkController');
const followController = require('../controllers/followController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Connection requests
router.post('/request', connectionController.sendConnectionRequest);
router.put('/:connection_id/accept', connectionController.acceptConnectionRequest);
router.put('/:connection_id/decline', connectionController.declineConnectionRequest);
router.put('/:connection_id/withdraw', connectionController.withdrawConnectionRequest);
router.put('/:connection_id/remove', connectionController.removeConnection);

// Get connection requests
router.get('/pending', connectionController.getPendingRequests);
router.get('/sent', connectionController.getSentRequests);
router.get('/status/:user_id', connectionController.getConnectionStatusWithUser);

// Network management
router.get('/network', connectionController.getUserNetwork);
router.get('/suggestions', connectionController.getNetworkSuggestions);
router.get('/discover', networkController.discoverUsers);
router.get('/mutual/:user_id', networkController.getMutualConnections);
router.get('/stats', connectionController.getConnectionStats);

// Follow (asymmetric)
router.get('/follow/stats', followController.getFollowStats);
router.get('/following', followController.getFollowing);
router.get('/followers', followController.getFollowers);
router.get('/follow/status/:user_id', followController.getFollowStatus);
router.post('/follow/:user_id', followController.followUser);
router.delete('/follow/:user_id', followController.unfollowUser);

// User blocking
router.post('/block', connectionController.blockUser);
router.delete('/block/:user_id', connectionController.unblockUser);
router.get('/blocked', connectionController.getBlockedUsers);

module.exports = router;
