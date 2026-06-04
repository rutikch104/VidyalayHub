// @ts-nocheck
import api from './api';
function assertOk(body) {
    if (!body?.status) {
        throw new Error(typeof body.message === 'string' ? body.message : 'Request failed');
    }
}
class ConnectionService {
    async sendConnectionRequest(receiverId, message) {
        const response = await api.post('/connections/request', {
            receiver_id: receiverId,
            message: message || undefined,
        });
        assertOk(response.data);
        const d = response.data.data;
        if (!d) {
            return { status: 'pending', connection_id: null };
        }
        return {
            ...d,
            connection_id: d.connection_id ?? d.id ?? null,
            status: d.status || 'pending',
        };
    }
    async acceptConnectionRequest(connectionId) {
        const response = await api.put(`/connections/${connectionId}/accept`);
        assertOk(response.data);
        const d = response.data.data;
        return d ?? { id: connectionId, status: 'accepted' };
    }
    async declineConnectionRequest(connectionId, reason) {
        const response = await api.put(`/connections/${connectionId}/decline`, {
            reason,
        });
        assertOk(response.data);
    }
    async withdrawConnectionRequest(connectionId) {
        const response = await api.put(`/connections/${connectionId}/withdraw`);
        assertOk(response.data);
    }
    async removeConnection(connectionId) {
        const response = await api.put(`/connections/${connectionId}/remove`);
        assertOk(response.data);
    }
    async getPendingRequests(params) {
        const response = await api.get('/connections/pending', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            connections: d.requests || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getSentRequests(params) {
        const response = await api.get('/connections/sent', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            connections: d.requests || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getUserNetwork(params) {
        const response = await api.get('/connections/network', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            users: d.connections || d.users || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getNetworkSuggestions(params) {
        const response = await api.get('/connections/suggestions', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            users: d.suggestions || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getConnectionStats() {
        const response = await api.get('/connections/stats');
        assertOk(response.data);
        if (!response.data.data)
            throw new Error('Invalid response');
        return response.data.data;
    }
    /** Resolves connect button state on another user's profile */
    async checkConnectionStatus(otherUserId) {
        const response = await api.get(`/connections/status/${otherUserId}`);
        assertOk(response.data);
        const d = response.data.data;
        if (!d || typeof d.status !== 'string')
            throw new Error('Invalid response');
        const raw = d.status;
        const status = raw === 'connected' || raw === 'pending' || raw === 'none' ? raw : 'none';
        return {
            status,
            connection_id: d.connection_id ?? null,
            direction: d.direction,
        };
    }
    async blockUser(userId, reason) {
        const response = await api.post('/connections/block', {
            user_id: userId,
            reason,
        });
        assertOk(response.data);
    }
    async unblockUser(userId) {
        const response = await api.delete(`/connections/block/${userId}`);
        assertOk(response.data);
    }
    async getBlockedUsers(params) {
        const response = await api.get('/connections/blocked', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d)
            throw new Error('Invalid response');
        const p = d.pagination || {};
        return {
            blocked_users: d.blocked_users || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async discoverUsers(params) {
        const response = await api.get('/connections/discover', { params });
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
    async getMutualConnections(userId, params) {
        const response = await api.get(`/connections/mutual/${userId}`, { params });
        assertOk(response.data);
        return response.data.data;
    }
    async followUser(userId) {
        const response = await api.post(`/connections/follow/${userId}`);
        assertOk(response.data);
        return response.data.data;
    }
    async unfollowUser(userId) {
        const response = await api.delete(`/connections/follow/${userId}`);
        assertOk(response.data);
        return response.data.data;
    }
    async getFollowStatus(userId) {
        const response = await api.get(`/connections/follow/status/${userId}`);
        assertOk(response.data);
        return response.data.data;
    }
    async getFollowing(params) {
        const response = await api.get('/connections/following', { params });
        assertOk(response.data);
        const d = response.data.data;
        if (!d) {
            return { users: [], total: 0, page: 1, totalPages: 1 };
        }
        const p = d.pagination || {};
        return {
            users: d.users || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getFollowers(params) {
        const response = await api.get('/connections/followers', { params });
        assertOk(response.data);
        const d = response.data.data;
        const p = d.pagination || {};
        return {
            users: d.users || [],
            total: p.total ?? 0,
            page: p.page ?? 1,
            totalPages: p.pages ?? 1,
        };
    }
    async getFollowStats() {
        const response = await api.get('/connections/follow/stats');
        assertOk(response.data);
        return response.data.data;
    }
}
export default new ConnectionService();
