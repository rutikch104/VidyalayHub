import api from './api';

function assertOk(body) {
  if (!body?.status) throw new Error(body?.message || 'Request failed');
}

class RbacService {
  async getMeAccess() {
    const res = await api.get('/rbac/me-access');
    assertOk(res.data);
    return res.data.data;
  }

  async getUsers(params) {
    const res = await api.get('/rbac/users', { params });
    assertOk(res.data);
    return res.data.data;
  }

  async assignRole(userId, roleId) {
    const res = await api.put(`/rbac/users/${userId}/role`, { role_id: roleId });
    assertOk(res.data);
    return res.data.data;
  }

  async getRoles() {
    const res = await api.get('/rbac/roles');
    assertOk(res.data);
    return res.data.data || [];
  }

  async createRole(payload) {
    const res = await api.post('/rbac/roles', payload);
    assertOk(res.data);
    return res.data.data;
  }

  async updateRole(roleId, payload) {
    const res = await api.put(`/rbac/roles/${roleId}`, payload);
    assertOk(res.data);
    return res.data.data;
  }

  async deleteRole(roleId) {
    const res = await api.delete(`/rbac/roles/${roleId}`);
    assertOk(res.data);
  }

  async setRolePermissions(roleId, permissionIds) {
    const res = await api.put(`/rbac/roles/${roleId}/permissions`, { permission_ids: permissionIds });
    assertOk(res.data);
    return res.data.data;
  }

  async getPermissions() {
    const res = await api.get('/rbac/permissions');
    assertOk(res.data);
    return res.data.data || [];
  }

  async createPermission(payload) {
    const res = await api.post('/rbac/permissions', payload);
    assertOk(res.data);
    return res.data.data;
  }
}

export default new RbacService();
