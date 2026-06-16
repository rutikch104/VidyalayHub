// @ts-nocheck
import api from './api';
function normalizeNotification(raw) {
    const isRead = raw.is_read === true || raw.is_read === 'true';
    let readAt = raw.read_at || undefined;
    if (isRead && !readAt && raw.updated_at) {
        readAt = raw.updated_at;
    }
    if (!isRead)
        readAt = undefined;
    let priority = raw.priority || 'medium';
    if (priority === 'normal')
        priority = 'medium';
    return {
        ...raw,
        read_at: readAt,
        is_read: isRead,
        priority,
        body: raw.body != null ? String(raw.body) : null,
    };
}
function unwrapListPayload(data) {
    const list = data.notifications || [];
    const p = data.pagination || {};
    const total = data.total ?? p.total ?? 0;
    const page = data.page ?? p.page ?? 1;
    const totalPages = data.totalPages ??
        p.totalPages ??
        p.pages ??
        1;
    return {
        notifications: list.map((n) => normalizeNotification(n)),
        total,
        page,
        totalPages,
    };
}
class NotificationService {
    async getUserNotifications(params) {
        const apiParams = { ...(params || {}) };
        if (params?.read !== undefined) {
            apiParams.is_read = params.read;
            delete apiParams.read;
        }
        const response = await api.get('/notifications', { params: apiParams });
        const body = response.data;
        if (body?.status && body.data) {
            return unwrapListPayload(body.data);
        }
        return { notifications: [], total: 0, page: 1, totalPages: 1 };
    }
    async markAsRead(notificationId) {
        const response = await api.put(`/notifications/${notificationId}/read`);
        const body = response.data;
        if (body?.status && body.data) {
            return normalizeNotification(body.data);
        }
    }
    async markMultipleAsRead(notificationIds) {
        await api.put('/notifications/mark-multiple-read', {
            notification_ids: notificationIds,
        });
    }
    async markAllAsRead() {
        await api.put('/notifications/mark-all-read');
    }
    async deleteNotification(notificationId) {
        await api.delete(`/notifications/${notificationId}`);
    }
    async deleteMultipleNotifications(notificationIds) {
        await api.delete('/notifications/delete-multiple', {
            data: { notification_ids: notificationIds },
        });
    }
    async getNotificationStats() {
        const response = await api.get('/notifications/stats');
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    }
    async getUnreadCount() {
        const response = await api.get('/notifications/unread-count');
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    }
    async getNotificationSettings() {
        const response = await api.get('/notifications/settings');
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    }
    async updateNotificationSettings(data) {
        const response = await api.put('/notifications/settings', data);
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    }
    async bulkNotificationOperations(notificationIds, action) {
        await api.post('/notifications/bulk-operations', {
            notification_ids: notificationIds,
            action,
        });
    }
    async resolveNotificationTarget(notificationId) {
        const response = await api.get(`/notifications/${notificationId}/target`);
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return null;
    }
}
export default new NotificationService();
export { emitNotificationsChanged } from '@/utils/shellEvents';
