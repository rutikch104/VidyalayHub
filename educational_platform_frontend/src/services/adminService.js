// @ts-nocheck
import api from './api';
class AdminService {
    async getAdminStats() {
        const response = await api.get('/admin/stats');
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async getColleges(params) {
        const response = await api.get('/admin/colleges', { params });
        if (response.data.status && response.data.data) {
            return {
                colleges: response.data.data.colleges || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1
            };
        }
        return response.data;
    }
    async getCollege(collegeId) {
        const response = await api.get(`/admin/colleges/${collegeId}`);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async createCollege(data) {
        const response = await api.post('/admin/colleges', data);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async updateCollege(collegeId, data) {
        const response = await api.put(`/admin/colleges/${collegeId}`, data);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async deleteCollege(collegeId) {
        await api.delete(`/admin/colleges/${collegeId}`);
    }
    async getStudents(params) {
        const response = await api.get('/admin/students', { params });
        if (response.data.status && response.data.data) {
            return {
                students: response.data.data.students || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1
            };
        }
        return response.data;
    }
    async getTeachers(params) {
        const response = await api.get('/admin/teachers', { params });
        if (response.data.status && response.data.data) {
            return {
                teachers: response.data.data.teachers || [],
                total: response.data.data.pagination?.total || 0,
                page: response.data.data.pagination?.page || 1,
                totalPages: response.data.data.pagination?.pages || 1
            };
        }
        return response.data;
    }
    async updateUserStatus(userId, status) {
        const response = await api.put(`/admin/users/${userId}/status`, { status });
        if (response.data && response.data.status === false) {
            throw new Error(response.data.message || 'Update failed');
        }
    }
    async createUser(payload) {
        const response = await api.post('/admin/users', payload);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data?.message || 'Failed to create user');
    }
    async getAnalytics(params) {
        const response = await api.get('/admin/analytics', { params });
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async exportData(type, format = 'csv') {
        const response = await api.get(`/admin/export/${type}`, {
            params: { format },
            responseType: 'blob'
        });
        return response.data;
    }
    async getRecentActivity(params) {
        const response = await api.get('/admin/activity', { params });
        if (response.data.status && response.data.data) {
            return response.data.data.activities || [];
        }
        return response.data;
    }
    async listNotices(params) {
        const response = await api.get('/admin/notices', { params });
        if (response.data.status && response.data.data?.notices) {
            return response.data.data.notices;
        }
        return [];
    }
    async createNotice(payload) {
        const response = await api.post('/admin/notices', payload);
        if (response.data.status && response.data.data?.notice) {
            return response.data.data.notice;
        }
        throw new Error(response.data?.message || 'Failed to create notice');
    }
    async updateNotice(noticeId, payload) {
        const response = await api.put(`/admin/notices/${noticeId}`, payload);
        if (response.data.status && response.data.data?.notice) {
            return response.data.data.notice;
        }
        throw new Error(response.data?.message || 'Failed to update notice');
    }
    async archiveNotice(noticeId) {
        const response = await api.delete(`/admin/notices/${noticeId}`);
        if (response.data && response.data.status === false) {
            throw new Error(response.data.message || 'Archive failed');
        }
    }
}
export default new AdminService();
