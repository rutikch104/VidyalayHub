const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { hydrateRbac, requireSuperAdminRole, requirePermission } = require('../middleware/rbac');
const c = require('../controllers/rbacController');

router.use(authenticate);
router.use(hydrateRbac);

router.get('/me-access', c.getMeAccess);

router.use(requireSuperAdminRole);

router.get('/users', requirePermission('users:read'), c.listUsersWithRoles);
router.put('/users/:userId/role', requirePermission('users:write'), c.assignRoleToUser);

router.get('/roles', requirePermission('roles:read'), c.listRoles);
router.post('/roles', requirePermission('roles:write'), c.createRole);
router.put('/roles/:roleId', requirePermission('roles:write'), c.updateRole);
router.delete('/roles/:roleId', requirePermission('roles:write'), c.deleteRole);
router.put('/roles/:roleId/permissions', requirePermission('roles:write'), c.setRolePermissions);

router.get('/permissions', requirePermission('permissions:read'), c.listPermissions);
router.post('/permissions', requirePermission('permissions:write'), c.createPermission);
router.put('/permissions/:permissionId', requirePermission('permissions:write'), c.updatePermission);
router.delete('/permissions/:permissionId', requirePermission('permissions:write'), c.deletePermission);

module.exports = router;
