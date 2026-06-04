// @ts-nocheck
import api from './api';
import { resolveMediaUrl } from './postService';
function normalizeUser(u) {
    if (!u)
        return { id: '', name: 'User' };
    const name = (typeof u.name === 'string' && u.name) ||
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
        (typeof u.email === 'string' ? u.email : '') ||
        'User';
    const rawPic = u.avatar_url || u.profile_picture || '';
    const avatar_url = rawPic ? resolveMediaUrl(rawPic) || rawPic : undefined;
    return {
        id: String(u.id ?? ''),
        name,
        avatar_url,
    };
}
function normalizeMessage(m) {
    const sender = m.sender;
    const rawMedia = m.media_url;
    const replyRaw = m.reply_to_message;
    const text = m.message != null && m.message !== '' ? m.message : (m.content != null ? String(m.content) : '');
    return {
        ...m,
        message: text,
        sender_id: String(m.sender_id),
        sender: normalizeUser(sender),
        media_url: rawMedia ? resolveMediaUrl(rawMedia) || rawMedia : undefined,
        reply_to_message: replyRaw && typeof replyRaw === 'object'
            ? normalizeMessage(replyRaw)
            : undefined,
    };
}
function normalizeThread(t) {
    if (!t || typeof t !== 'object') {
        return t;
    }
    const parts = t.participants || [];
    const last = t.last_message;
    const av = t.avatar_url;
    return {
        ...t,
        participants: parts.map((p) => ({
            ...p,
            user_id: String(p.user_id),
            user: normalizeUser(p.user),
        })),
        last_message: last ? normalizeMessage(last) : undefined,
        avatar_url: av ? resolveMediaUrl(av) || av : undefined,
    };
}
function unwrapPagination(data) {
    const p = data.pagination || {};
    const total = data.total ?? p.total ?? 0;
    const page = data.page ?? p.page ?? 1;
    const totalPages = data.totalPages ?? p.totalPages ?? p.pages ?? 1;
    return { total, page, totalPages };
}
class MessageService {
    async getOrCreateDirectThread(userId) {
        const response = await api.post('/messages/threads/direct', {
            user2_id: userId,
        });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return normalizeThread(response.data.data);
        }
        return normalizeThread(response.data);
    }
    async createGroupThread(data) {
        const response = await api.post('/messages/threads/group', data);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return normalizeThread(response.data.data);
        }
        return normalizeThread(response.data);
    }
    async getUserThreads(params) {
        const response = await api.get('/messages/threads', { params });
        // Handle backend response format: { status: boolean, data: any }
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const threads = (raw.threads || []).map((t) => normalizeThread(t));
        const { total, page, totalPages } = unwrapPagination(raw);
        return { threads, total, page, totalPages };
    }
    async getConversations(params) {
        const response = await api.get('/messages/conversations', { params });
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const list = raw.conversations || raw.threads || [];
        const threads = list.map((t) => normalizeThread(t));
        const { total, page, totalPages } = unwrapPagination(raw);
        return { threads, total, page, totalPages };
    }
    async getConversationWithUser(userId, params) {
        const response = await api.get(`/messages/${userId}`, { params });
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const messages = (raw.messages || []).map((m) => normalizeMessage(m));
        const { total, page, totalPages } = unwrapPagination(raw);
        return {
            messages,
            total,
            page,
            totalPages,
            thread: raw.thread ? normalizeThread(raw.thread) : null,
            other_user_id: raw.other_user_id,
        };
    }
    async sendDirectTextMessage({ recipient_id, content }) {
        const response = await api.post('/messages', { recipient_id, content });
        const body = response.data;
        if (body?.status === false) {
            throw new Error(body.message || 'Failed to send');
        }
        if (body?.status && body.data) {
            return { message: normalizeMessage(body.data), thread_id: body.thread_id };
        }
        return { message: normalizeMessage(body), thread_id: body.thread_id };
    }
    async getThreadMessages(threadId, params) {
        const response = await api.get(`/messages/threads/${threadId}/messages`, { params });
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const messages = (raw.messages || []).map((m) => normalizeMessage(m));
        const { total, page, totalPages } = unwrapPagination(raw);
        return { messages, total, page, totalPages };
    }
    async sendMessage(threadId, data) {
        if (!data?.media && data?.recipient_id && data?.message != null) {
            const response = await api.post('/messages', {
                recipient_id: data.recipient_id,
                content: String(data.message),
            });
            const body = response.data;
            if (body?.status === false) {
                throw new Error(body.message || 'Failed to send');
            }
            if (body?.status && body.data) {
                return normalizeMessage(body.data);
            }
            return normalizeMessage(body);
        }
        const formData = new FormData();
        formData.append('message', data.message ?? '');
        formData.append('thread_id', threadId);
        if (data.message_type) {
            formData.append('message_type', data.message_type);
        }
        if (data.media) {
            formData.append('media', data.media);
        }
        if (data.reply_to_message_id) {
            formData.append('reply_to_message_id', data.reply_to_message_id);
        }
        const response = await api.post(`/messages/threads/${threadId}/messages`, formData);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return normalizeMessage(response.data.data);
        }
        return normalizeMessage(response.data);
    }
    async markAsRead(threadId) {
        await api.put(`/messages/threads/${threadId}/read`);
    }
    async getUnreadCount() {
        const response = await api.get('/messages/unread-count');
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const list = (raw.threads || raw.thread_counts || []);
        return {
            total_unread: Number(raw.total_unread) || 0,
            threads: list.map((x) => ({
                thread_id: String(x.thread_id),
                unread_count: Number(x.unread_count) || 0,
            })),
        };
    }
    async deleteMessage(messageId) {
        await api.delete(`/messages/${messageId}`);
    }
    async addParticipant(threadId, userId, role = 'member') {
        await api.post(`/messages/threads/${threadId}/participants`, {
            user_id: userId,
            role,
        });
    }
    async removeParticipant(threadId, userId) {
        await api.delete(`/messages/threads/${threadId}/participants/${userId}`);
    }
}
export default new MessageService();
export { emitMessagesChanged } from '@/utils/shellEvents';
