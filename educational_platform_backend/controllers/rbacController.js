const { Op } = require('sequelize');
const db = require('../database/index');

function cleanName(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, '_');
}

function cleanText(s) {
  const t = String(s || '').trim();
  return t === '' ? null : t;
}

exports.getMeAccess = async (req, res) => {
  const role = req.rbac?.role || null;
  return res.status(200).json({
    status: true,
    data: {
      role,
      permissions: Array.from(req.rbac?.permissionKeys || []),
      canAccessAdminPanel: role?.name === 'SUPER_ADMIN',
    },
  });
};

exports.listRoles = async (req, res) => {
  const roles = await db.Role.findAll({
    order: [['name', 'ASC']],
    include: [{ model: db.Permission, as: 'permissions', attributes: ['id', 'resource', 'action', 'key'] }],
  });
  return res.status(200).json({ status: true, data: roles });
};

exports.createRole = async (req, res) => {
  try {
    const name = cleanName(req.body?.name);
    if (!name) return res.status(400).json({ status: false, message: 'name is required.' });
    const row = await db.Role.create({ name, description: cleanText(req.body?.description) });
    return res.status(201).json({ status: true, data: row });
  } catch (err) {
    const code = err.name === 'SequelizeUniqueConstraintError' ? 409 : 500;
    return res.status(code).json({ status: false, message: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const role = await db.Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ status: false, message: 'Role not found.' });
    if (role.name === 'SUPER_ADMIN' && req.body?.name && cleanName(req.body.name) !== 'SUPER_ADMIN') {
      return res.status(400).json({ status: false, message: 'SUPER_ADMIN role name cannot be changed.' });
    }
    const updates = {};
    if (req.body?.name !== undefined) updates.name = cleanName(req.body.name);
    if (req.body?.description !== undefined) updates.description = cleanText(req.body.description);
    await role.update(updates);
    return res.status(200).json({ status: true, data: role });
  } catch (err) {
    const code = err.name === 'SequelizeUniqueConstraintError' ? 409 : 500;
    return res.status(code).json({ status: false, message: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  const role = await db.Role.findByPk(req.params.roleId);
  if (!role) return res.status(404).json({ status: false, message: 'Role not found.' });
  if (role.name === 'SUPER_ADMIN') {
    return res.status(400).json({ status: false, message: 'SUPER_ADMIN role cannot be deleted.' });
  }
  const assignedCount = await db.User.count({ where: { role_id: role.id } });
  if (assignedCount > 0) {
    return res
      .status(409)
      .json({ status: false, message: 'Role is assigned to users. Reassign users before deleting.' });
  }
  await role.destroy();
  return res.status(200).json({ status: true, message: 'Role deleted.' });
};

exports.listPermissions = async (req, res) => {
  const rows = await db.Permission.findAll({ order: [['resource', 'ASC'], ['action', 'ASC']] });
  return res.status(200).json({ status: true, data: rows });
};

exports.createPermission = async (req, res) => {
  try {
    const resource = String(req.body?.resource || '').trim().toLowerCase();
    const action = String(req.body?.action || '').trim().toLowerCase();
    if (!resource || !action) {
      return res.status(400).json({ status: false, message: 'resource and action are required.' });
    }
    const key = `${resource}:${action}`;
    const row = await db.Permission.create({
      resource,
      action,
      key,
      description: cleanText(req.body?.description),
    });
    return res.status(201).json({ status: true, data: row });
  } catch (err) {
    const code = err.name === 'SequelizeUniqueConstraintError' ? 409 : 500;
    return res.status(code).json({ status: false, message: err.message });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const p = await db.Permission.findByPk(req.params.permissionId);
    if (!p) return res.status(404).json({ status: false, message: 'Permission not found.' });
    const resource = req.body?.resource !== undefined ? String(req.body.resource).trim().toLowerCase() : p.resource;
    const action = req.body?.action !== undefined ? String(req.body.action).trim().toLowerCase() : p.action;
    const key = `${resource}:${action}`;
    await p.update({
      resource,
      action,
      key,
      description: req.body?.description !== undefined ? cleanText(req.body.description) : p.description,
    });
    return res.status(200).json({ status: true, data: p });
  } catch (err) {
    const code = err.name === 'SequelizeUniqueConstraintError' ? 409 : 500;
    return res.status(code).json({ status: false, message: err.message });
  }
};

exports.deletePermission = async (req, res) => {
  const p = await db.Permission.findByPk(req.params.permissionId);
  if (!p) return res.status(404).json({ status: false, message: 'Permission not found.' });
  const inUse = await db.RolePermission.count({ where: { permission_id: p.id } });
  if (inUse > 0) {
    return res.status(409).json({ status: false, message: 'Permission assigned to roles.' });
  }
  await p.destroy();
  return res.status(200).json({ status: true, message: 'Permission deleted.' });
};

exports.setRolePermissions = async (req, res) => {
  const role = await db.Role.findByPk(req.params.roleId);
  if (!role) return res.status(404).json({ status: false, message: 'Role not found.' });
  const permissionIds = Array.isArray(req.body?.permission_ids) ? req.body.permission_ids : [];
  const existing = await db.Permission.findAll({ where: { id: { [Op.in]: permissionIds } }, attributes: ['id'] });
  const validIds = existing.map((x) => x.id);
  await db.RolePermission.destroy({ where: { role_id: role.id } });
  if (validIds.length > 0) {
    await db.RolePermission.bulkCreate(validIds.map((pid) => ({ role_id: role.id, permission_id: pid })));
  }
  const refreshed = await db.Role.findByPk(role.id, {
    include: [{ model: db.Permission, as: 'permissions', attributes: ['id', 'resource', 'action', 'key'] }],
  });
  return res.status(200).json({ status: true, data: refreshed });
};

exports.listUsersWithRoles = async (req, res) => {
  const limit = Math.min(500, parseInt(String(req.query.limit), 10) || 100);
  const search = String(req.query.search || '').trim();
  const where = {};
  if (search) {
    const like = `%${search}%`;
    where[Op.or] = [{ first_name: { [Op.iLike]: like } }, { last_name: { [Op.iLike]: like } }, { email: { [Op.iLike]: like } }];
  }
  const rows = await db.User.findAll({
    where,
    attributes: ['id', 'email', 'first_name', 'last_name', 'tenant_id', 'user_type', 'role_id', 'created_at'],
    include: [{ model: db.Role, as: 'roleRef', attributes: ['id', 'name'] }],
    order: [['created_at', 'DESC']],
    limit,
  });
  const users = rows.map((u) => {
    const j = u.toJSON();
    return {
      id: j.id,
      email: j.email,
      name: [j.first_name, j.last_name].filter(Boolean).join(' ') || j.email,
      tenant_id: j.tenant_id,
      user_type: j.user_type,
      role_id: j.role_id || null,
      role_name: j.roleRef?.name || null,
      created_at: j.created_at,
    };
  });
  return res.status(200).json({ status: true, data: { users, total: users.length } });
};

exports.assignRoleToUser = async (req, res) => {
  const user = await db.User.findByPk(req.params.userId);
  if (!user) return res.status(404).json({ status: false, message: 'User not found.' });
  const role = await db.Role.findByPk(req.body?.role_id);
  if (!role) return res.status(404).json({ status: false, message: 'Role not found.' });
  await user.update({ role_id: role.id });
  return res.status(200).json({ status: true, data: { user_id: user.id, role_id: role.id, role_name: role.name } });
};
