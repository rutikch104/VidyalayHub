// @ts-nocheck
import api from './api';
import { resolveMediaUrl } from './postService';
import { setSelfProfileCache } from '@/lib/selfIdentityCache';

/** Resolve relative /media and /uploads paths to full API URLs for profile images */
export function normalizeProfileMedia(data) {
    if (!data || typeof data !== 'object')
        return data;
    const avatar_url = data.avatar_url
        ? resolveMediaUrl(data.avatar_url) || data.avatar_url
        : data.avatar_url;
    const cover_image_url = data.cover_image_url
        ? resolveMediaUrl(data.cover_image_url) || data.cover_image_url
        : data.cover_image_url;
    return { ...data, avatar_url, cover_image_url };
}

// User Service
const userService = {
    // Get current user profile
    getCurrentUser: async () => {
        const response = await api.get('/users/me');
        const body = response.data;
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        return normalizeProfileMedia(body);
    },
    // Get current user profile with detailed information
    getCurrentUserProfile: async () => {
        const response = await api.get('/users/profile', {
            params: { _: Date.now() },
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to load profile');
        }
        const data = body?.status && body.data != null ? body.data : body;
        if (!data || data.id == null || data.id === '') {
            throw new Error('Invalid profile response');
        }
        const normalized = normalizeProfileMedia(data);
        setSelfProfileCache(normalized);
        return normalized;
    },
    /** Home right sidebar: posts, connections, likes, location */
    getMeSidebarSummary: async () => {
        const response = await api.get('/users/me/sidebar-summary');
        const body = response.data;
        if (body?.status && body.data)
            return body.data;
        return { posts_count: 0, connections_count: 0, likes_received: 0, location: null };
    },
    getPublicProfile: async (userId) => {
        const response = await api.get(`/users/${userId}/public-profile`);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to load profile');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        return normalizeProfileMedia(body);
    },
    // Legacy: raw Sequelize user shape (prefer getPublicProfile for UI)
    getUserProfile: async (userId) => {
        const response = await api.get(`/users/${userId}`);
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    },
    getUserSettings: async () => {
        const response = await api.get('/users/settings');
        const body = response.data;
        if (body?.status === false) {
            throw new Error(typeof body.message === 'string' ? body.message : 'Failed to load settings');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        throw new Error('Invalid settings response');
    },
    updateUserSettings: async (payload) => {
        const response = await api.put('/users/settings', payload);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(typeof body.message === 'string' ? body.message : 'Failed to update settings');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        throw new Error('Invalid settings update response');
    },
    changePassword: async (current_password, new_password) => {
        const response = await api.post('/users/password/change', { current_password, new_password });
        const body = response.data;
        if (body?.status === false) {
            throw new Error(typeof body.message === 'string' ? body.message : 'Failed to change password');
        }
    },
    exportUserData: async () => {
        const response = await api.get('/users/export-data');
        const body = response.data;
        if (body?.status === false) {
            throw new Error(typeof body.message === 'string' ? body.message : 'Export failed');
        }
        if (body?.status && body.data !== undefined) {
            return body.data;
        }
        throw new Error('Invalid export response');
    },
    deleteAccount: async (password) => {
        const response = await api.post('/users/account/close', { password });
        const body = response.data;
        if (body?.status === false) {
            throw new Error(typeof body.message === 'string' ? body.message : 'Failed to close account');
        }
    },
    updateProfile: async (profileData) => {
        const response = await api.put('/users/profile', profileData);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to update profile');
        }
        if (body?.status && body.data) {
            return body.data;
        }
        throw new Error('Invalid profile update response');
    },
    updateOnboardingProfile: async (payload) => {
        const response = await api.put('/users/profile/onboarding', payload);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to update profile');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        throw new Error('Invalid onboarding update response');
    },
    updateProfileAbout: async (payload) => {
        const response = await api.put('/users/profile/about', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update about');
        if (body?.status && body.data)
            return body.data;
        throw new Error('Invalid about response');
    },
    addProfileExperience: async (payload) => {
        const response = await api.post('/users/profile/experience', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add experience');
        return body.data;
    },
    updateProfileExperience: async (id, payload) => {
        const response = await api.put(`/users/profile/experience/${id}`, payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update experience');
        return body.data;
    },
    deleteProfileExperience: async (id) => {
        const response = await api.delete(`/users/profile/experience/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete experience');
        return body.data;
    },
    addProfileEducation: async (payload) => {
        const response = await api.post('/users/profile/education', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add education');
        return body.data;
    },
    updateProfileEducation: async (id, payload) => {
        const response = await api.put(`/users/profile/education/${id}`, payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update education');
        return body.data;
    },
    deleteProfileEducation: async (id) => {
        const response = await api.delete(`/users/profile/education/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete education');
        return body.data;
    },
    addProfileAchievement: async (payload) => {
        const response = await api.post('/users/profile/achievements', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add achievement');
        return body.data;
    },
    updateProfileAchievement: async (id, payload) => {
        const response = await api.put(`/users/profile/achievements/${id}`, payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update achievement');
        return body.data;
    },
    deleteProfileAchievement: async (id) => {
        const response = await api.delete(`/users/profile/achievements/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete achievement');
        return body.data;
    },
    addProfileSkill: async (payload) => {
        const response = await api.post('/users/profile/skills', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add skill');
        return body.data;
    },
    updateProfileSkill: async (id, payload) => {
        const response = await api.put(`/users/profile/skills/${id}`, payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update skill');
        return body.data;
    },
    deleteProfileSkill: async (id) => {
        const response = await api.delete(`/users/profile/skills/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete skill');
        return body.data;
    },
    addProfilePublication: async (payload) => {
        const response = await api.post('/users/profile/publications', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add publication');
        return body;
    },
    updateProfilePublication: async (id, payload) => {
        const response = await api.put(`/users/profile/publications/${id}`, payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update publication');
        return body;
    },
    deleteProfilePublication: async (id) => {
        const response = await api.delete(`/users/profile/publications/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete publication');
        return body;
    },
    updateProfileTeachingInfo: async (payload) => {
        const response = await api.put('/users/profile/teaching-info', payload);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update teaching info');
        return body.data;
    },
    uploadAvatar: async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.post('/users/profile/avatar', formData);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Upload failed');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        throw new Error('Invalid avatar upload response');
    },
    uploadCover: async (file) => {
        const formData = new FormData();
        formData.append('cover', file);
        const response = await api.post('/users/profile/cover', formData);
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Upload failed');
        }
        if (body?.status && body.data) {
            return normalizeProfileMedia(body.data);
        }
        throw new Error('Invalid cover upload response');
    },
    /** No GET /users on the JWT router — use search, admin APIs, or network. */
    getUsers: async (_params) => ({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
    }),
    // Search users
    searchUsers: async (query, params) => {
        const response = await api.get('/users/search', {
            params: { q: query, ...params }
        });
        const body = response.data;
        if (body?.status && body.data) {
            const d = body.data;
            const p = d.pagination || {};
            return {
                users: d.users || [],
                total: p.total ?? 0,
                page: p.page ?? 1,
                limit: p.limit ?? 20,
                total_pages: p.pages ?? 1,
            };
        }
        return {
            users: [],
            total: 0,
            page: 1,
            limit: 20,
            total_pages: 1,
        };
    },
    getUsersByRole: async (_role, _params) => ({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
    }),
    getUsersByTenant: async (_tenantId, _params) => ({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
    }),
    // Add education entry
    addEducation: async (educationData) => {
        const response = await api.post('/users/education', educationData);
        return response.data;
    },
    // Update education entry
    updateEducation: async (id, educationData) => {
        const response = await api.put(`/users/education/${id}`, educationData);
        return response.data;
    },
    // Delete education entry
    deleteEducation: async (id) => {
        await api.delete(`/users/education/${id}`);
    },
    // Add experience entry
    addExperience: async (experienceData) => {
        const response = await api.post('/users/experience', experienceData);
        return response.data;
    },
    // Update experience entry
    updateExperience: async (id, experienceData) => {
        const response = await api.put(`/users/experience/${id}`, experienceData);
        return response.data;
    },
    // Delete experience entry
    deleteExperience: async (id) => {
        await api.delete(`/users/experience/${id}`);
    },
    // Add achievement
    addAchievement: async (achievementData) => {
        const response = await api.post('/users/achievements', achievementData);
        return response.data;
    },
    // Update achievement
    updateAchievement: async (id, achievementData) => {
        const response = await api.put(`/users/achievements/${id}`, achievementData);
        return response.data;
    },
    // Delete achievement
    deleteAchievement: async (id) => {
        await api.delete(`/users/achievements/${id}`);
    },
    // Add project
    addProject: async (projectData) => {
        const response = await api.post('/users/projects', projectData);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to add project');
        return body.project || body.data;
    },
    // Update project
    updateProject: async (id, projectData) => {
        const response = await api.put(`/users/projects/${id}`, projectData);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to update project');
        return body.project || body.data;
    },
    // Delete project
    deleteProject: async (id) => {
        const response = await api.delete(`/users/projects/${id}`);
        const body = response.data;
        if (body?.status === false)
            throw new Error(body.message || 'Failed to delete project');
        return body;
    },
    getCurrentUserStats: async () => {
        const response = await api.get('/users/stats');
        const body = response.data;
        if (body?.status && body.data)
            return body.data;
        return body;
    },
    // Get user's posts
    getUserPosts: async (userId, params) => {
        const response = await api.get(`/users/${encodeURIComponent(String(userId))}/posts`, { params });
        if (response.data?.status === false) {
            throw new Error(response.data.message || 'Failed to load posts');
        }
        const data = response.data?.status && response.data.data
            ? response.data.data
            : response.data;
        const posts = Array.isArray(data?.posts) ? data.posts : [];
        return {
            posts,
            pagination: data?.pagination || {
                total: posts.length,
                page: 1,
                pages: 1,
            },
        };
    },
    // Get user's projects
    getUserProjects: async (userId) => {
        const response = await api.get(`/users/${userId}/projects`);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get user's publications (research papers, articles)
    getUserPublications: async (userId) => {
        const response = await api.get(`/users/${userId}/publications`);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get user statistics
    getUserConnections: async (userId, params = {}) => {
        const response = await api.get(`/users/${userId}/connections`, { params });
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to load connections');
        }
        if (body?.status && body.data) {
            return body.data;
        }
        return { connections: [], total: 0 };
    },
    getUserStats: async (userId) => {
        const response = await api.get(`/users/${userId}/stats`);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Follow/Unfollow user
    toggleFollow: async (userId) => {
        const response = await api.post(`/users/${userId}/follow`);
        return response.data;
    },
    // Get followers
    getFollowers: async (userId, params) => {
        const response = await api.get(`/users/${userId}/followers`, { params });
        return response.data;
    },
    // Get following
    getFollowing: async (userId, params) => {
        const response = await api.get(`/users/${userId}/following`, { params });
        return response.data;
    },
    blockUser: async (userId) => {
        await api.post('/connections/block', { user_id: userId });
    },
    unblockUser: async (userId) => {
        await api.delete(`/connections/block/${userId}`);
    },
    getBlockedUsers: async () => {
        const response = await api.get('/connections/blocked', { params: { page: 1, limit: 100 } });
        const body = response.data;
        if (!body?.status || !body.data?.blocked_users)
            return [];
        return body.data.blocked_users.map((u) => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
            role: u.user_type || 'student',
            user_type: u.user_type,
            avatar_url: u.profile_picture || undefined,
            created_at: u.created_at || '',
            updated_at: u.updated_at || '',
        }));
    },
    // Report user
    reportUser: async (userId, reason) => {
        await api.post(`/users/${userId}/report`, { reason });
    },
    // Update user role (admin only)
    updateUserRole: async (userId, role) => {
        const response = await api.put(`/users/${userId}/role`, { role });
        return response.data;
    },
    // Deactivate user (admin only)
    deactivateUser: async (userId) => {
        await api.put(`/users/${userId}/deactivate`);
    },
    // Activate user (admin only)
    activateUser: async (userId) => {
        await api.put(`/users/${userId}/activate`);
    },
    // Delete user (admin only)
    deleteUser: async (userId) => {
        await api.delete(`/users/${userId}`);
    },
    // Get user activity
    getUserActivity: async (userId, params) => {
        const response = await api.get(`/users/${userId}/activity`, { params });
        return response.data;
    },
    // Get user analytics
    getUserAnalytics: async (userId) => {
        const response = await api.get(`/users/${userId}/analytics`);
        return response.data;
    }
};
export default userService;
