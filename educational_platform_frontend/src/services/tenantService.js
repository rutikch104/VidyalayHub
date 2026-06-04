// @ts-nocheck
import api from './api';

function unwrap(response) {
  const b = response.data;
  if (b && typeof b === 'object' && 'status' in b && b.data !== undefined) {
    return b.data;
  }
  return b;
}

const tenantService = {
  /** Approved colleges for signup dropdown (public). */
  async getApprovedColleges() {
    const response = await api.get('/tenants/public/approved-colleges');
    const data = unwrap(response);
    return data.colleges || [];
  },

  /** Institution branding + id by slug (public). */
  async getTenantBySlug(slug) {
    const s = String(slug || '').trim().toLowerCase();
    const response = await api.get(`/tenants/public/by-slug/${encodeURIComponent(s)}`);
    const data = unwrap(response);
    return data;
  },

  /** College self-registration (creates pending tenant; no auth). */
  async submitCollegeApplication(payload) {
    const response = await api.post('/tenants/createtenants', payload);
    const body = response.data;
    if (body && body.status === false) {
      const err = new Error(body.message || 'Request failed');
      err.response = response;
      throw err;
    }
    return body;
  },
};

export default tenantService;
