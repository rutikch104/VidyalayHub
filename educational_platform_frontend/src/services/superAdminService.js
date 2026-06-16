// @ts-nocheck
import api from './api';
function assertOk(body) {
    if (!body?.status) {
        throw new Error(typeof body?.message === 'string' ? body.message : 'Request failed');
    }
}
class SuperAdminService {
    async getSuperAdminOwners() {
        const response = await api.get('/super-admin-auth/owners');
        assertOk(response.data);
        return response.data.data?.owners || [];
    }
    async createSuperAdminOwner(payload) {
        const response = await api.post('/super-admin-auth/owners', payload);
        assertOk(response.data);
        return response.data.data;
    }
    async getUsers(params) {
        const response = await api.get('/super-admin/users', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            users: d.users || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getSystemMetrics() {
        const response = await api.get('/super-admin/metrics');
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid metrics response');
        return response.data.data;
    }
    async getColleges(params) {
        const response = await api.get('/super-admin/colleges', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        return {
            colleges: d.colleges || [],
            total: d.pagination?.total || 0,
            page: d.pagination?.page || 1,
            totalPages: d.pagination?.pages || 1,
        };
    }
    async getCollege(collegeId) {
        const response = await api.get(`/super-admin/colleges/${collegeId}`);
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('College not found');
        return response.data.data;
    }
    /**
     * Create a college. Pass `logoFile` (File/Blob) to upload the logo as part
     * of the same multipart request; omit it for a plain JSON create.
     */
    async createCollege(data, logoFile) {
        let response;
        if (logoFile) {
            const fd = new FormData();
            Object.entries(data || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null) fd.append(k, String(v));
            });
            fd.append('logo', logoFile);
            response = await api.post('/super-admin/colleges', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            response = await api.post('/super-admin/colleges', data);
        }
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid response');
        return response.data.data;
    }
    async updateCollege(collegeId, data, logoFile) {
        let response;
        if (logoFile) {
            const fd = new FormData();
            Object.entries(data || {}).forEach(([k, v]) => {
                if (v !== undefined && v !== null) fd.append(k, String(v));
            });
            fd.append('logo', logoFile);
            response = await api.put(`/super-admin/colleges/${collegeId}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            response = await api.put(`/super-admin/colleges/${collegeId}`, data);
        }
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid response');
        return response.data.data;
    }
    async uploadCollegeLogo(collegeId, file) {
        const fd = new FormData();
        fd.append('logo', file);
        const response = await api.post(`/super-admin/colleges/${collegeId}/logo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        assertOk(response.data);
        if (!response.data.data) throw new Error('Invalid response');
        return response.data.data;
    }
    async removeCollegeLogo(collegeId) {
        const response = await api.delete(`/super-admin/colleges/${collegeId}/logo`);
        assertOk(response.data);
        return response.data.data;
    }
    async deleteCollege(collegeId) {
        const response = await api.delete(`/super-admin/colleges/${collegeId}`);
        assertOk(response.data);
    }
    async toggleCollegeStatus(collegeId, status) {
        const response = await api.put(`/super-admin/colleges/${collegeId}/status`, { status });
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid response');
        return response.data.data;
    }
    async createCollegePortalAdmin(collegeId, payload) {
        const response = await api.post(`/super-admin/colleges/${collegeId}/portal-admin`, payload);
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid response');
        return response.data.data;
    }
    async updateSubscription(collegeId, plan) {
        const response = await api.put(`/super-admin/colleges/${collegeId}/subscription`, { plan });
        assertOk(response.data);
    }
    async getAnalytics(params) {
        const response = await api.get('/super-admin/analytics', { params });
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid analytics response');
        return response.data.data;
    }
    async getRevenueAnalytics(params) {
        const response = await api.get('/super-admin/revenue', { params });
        assertOk(response.data);
        return response.data.data;
    }
    async getSystemHealth() {
        const response = await api.get('/super-admin/health');
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid health response');
        return response.data.data;
    }
    async getRecentActivities(params) {
        const response = await api.get('/super-admin/activities', { params });
        assertOk(response.data);
        const list = response.data.data?.activities || [];
        return list.map((a) => ({
            id: String(a.id ?? ''),
            message: a.message || 'Activity',
            details: a.details,
            timestamp: a.timestamp || new Date().toISOString(),
        }));
    }
    async exportData(type, format = 'csv') {
        const response = await api.get(`/super-admin/export/${type}`, {
            params: { format },
            responseType: 'blob',
            validateStatus: () => true,
        });
        if (response.status >= 400) {
            let msg = 'Export failed';
            try {
                const text = await response.data.text();
                const j = JSON.parse(text);
                if (typeof j.message === 'string')
                    msg = j.message;
            }
            catch {
                /* ignore */
            }
            throw new Error(msg);
        }
        const ctype = String(response.headers['content-type'] || '');
        if (ctype.includes('application/json')) {
            const text = await response.data.text();
            try {
                const j = JSON.parse(text);
                if (j.status === false && j.message)
                    throw new Error(j.message);
            }
            catch (e) {
                if (e instanceof Error && e.message !== 'Export failed')
                    throw e;
            }
        }
        return response.data;
    }
    async getCollegeStats(collegeId) {
        const response = await api.get(`/super-admin/colleges/${collegeId}/stats`);
        assertOk(response.data);
        return response.data.data;
    }
    async sendNotification(collegeId, message, type = 'info') {
        const response = await api.post(`/super-admin/colleges/${collegeId}/notify`, { message, type });
        assertOk(response.data);
    }
    async getPlatformSettings() {
        const response = await api.get('/super-admin/settings');
        assertOk(response.data);
        return response.data.data;
    }
    async updatePlatformSettings(settings) {
        const response = await api.put('/super-admin/settings', settings);
        assertOk(response.data);
    }
}
export default new SuperAdminService();
