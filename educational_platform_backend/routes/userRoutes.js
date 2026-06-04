const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateAdminPortal } = require('../middleware/portalGuards');

/**
 * Legacy user CRUD — admin portal only.
 * Do NOT apply authenticateAdminPortal via router.use(): this router is mounted
 * before userAppRoutes on /api/users, and a global guard would block every
 * member-facing route (public-profile, /me, posts, etc.).
 */
const adminOnly = authenticateAdminPortal;

router.post('/createusers', adminOnly, userController.createUser);
router.get('/getallusers', adminOnly, userController.getAllUsers);
router.get('/users/tenant', adminOnly, userController.getUsersByTenant);
router.get('/users/phone/:phone_number', adminOnly, userController.getUserByPhoneNumber);
router.get('/users/first-name/:first_name', adminOnly, userController.getUserByFirstName);
router.get('/users/:id', adminOnly, userController.getUser);
router.put('/updateuser/:id', adminOnly, userController.updateUser);
router.get('/users/email/:email', adminOnly, userController.getUserByEmail);
router.delete('/deleteusers/:id', adminOnly, userController.deleteUser);

module.exports = router;
