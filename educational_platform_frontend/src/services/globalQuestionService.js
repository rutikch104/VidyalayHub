// @ts-nocheck
import api from './api';
// Global Question Service
const globalQuestionService = {
    // Get all questions with filters
    getQuestions: async (params) => {
        const response = await api.get('/global-questions', { params });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get a specific question by ID
    getQuestion: async (id) => {
        const response = await api.get(`/global-questions/${id}`);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Create a new question
    createQuestion: async (questionData) => {
        const formData = new FormData();
        formData.append('title', questionData.title);
        formData.append('description', questionData.description);
        if (questionData.tags) {
            formData.append('tags', JSON.stringify(questionData.tags));
        }
        if (questionData.is_anonymous !== undefined) {
            formData.append('is_anonymous', questionData.is_anonymous.toString());
        }
        if (questionData.mentioned_users) {
            formData.append('mentioned_users', JSON.stringify(questionData.mentioned_users));
        }
        if (questionData.attachments) {
            questionData.attachments.forEach((file, index) => {
                formData.append('attachments', file);
            });
        }
        const response = await api.post('/global-questions', formData);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Add an answer to a question
    addAnswer: async (questionId, answerData) => {
        const formData = new FormData();
        formData.append('content', answerData.content);
        if (answerData.tags?.length) {
            formData.append('tags', JSON.stringify(answerData.tags));
        }
        if (answerData.mentioned_users?.length) {
            formData.append('mentioned_users', JSON.stringify(answerData.mentioned_users));
        }
        if (answerData.attachments) {
            answerData.attachments.forEach((file, index) => {
                formData.append('attachments', file);
            });
        }
        const response = await api.post(`/global-questions/${questionId}/answers`, formData);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Toggle like on a question (idempotent)
    toggleQuestionLike: async (questionId) => {
        const response = await api.post(`/global-questions/${questionId}/like`);
        const body = response.data;
        if (body?.status && body.data && typeof body.data.is_liked === 'boolean') {
            return {
                is_liked: body.data.is_liked,
                likes_count: body.data.likes_count,
            };
        }
        return { is_liked: false, likes_count: 0 };
    },
    toggleAnswerLike: async (questionId, answerId) => {
        const response = await api.post(
            `/global-questions/${questionId}/answers/${answerId}/like`,
        );
        const body = response.data;
        if (body?.status && body.data) {
            return {
                is_liked: body.data.is_liked,
                likes_count: body.data.likes_count,
            };
        }
        return { is_liked: false, likes_count: 0 };
    },
    addAnswerComment: async (questionId, answerId, text, parentId = null, mentionedUsers = null) => {
        const payload = typeof text === 'object' && text !== null
            ? { ...text }
            : { text };
        if (parentId && !payload.parent_id) payload.parent_id = parentId;
        if (mentionedUsers?.length && !payload.mentioned_users) {
            payload.mentioned_users = mentionedUsers;
        }
        const response = await api.post(
            `/global-questions/${questionId}/answers/${answerId}/comments`,
            payload,
        );
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    },
    searchTeachers: async (query, params = {}) => {
        const response = await api.get('/global-questions/teachers/search', {
            params: { q: query, ...params },
        });
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return { teachers: [], pagination: {} };
    },
    updateQuestion: async (questionId, payload) => {
        const response = await api.patch(`/global-questions/${questionId}`, payload);
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        throw new Error(body?.message || 'Failed to update question');
    },
    // Add comment to a question
    addQuestionComment: async (questionId, text) => {
        const response = await api.post(`/global-questions/${questionId}/comments`, { text });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get popular / search hashtags from questions + answers
    getPopularTags: async (params = {}) => {
        try {
            const response = await api.get('/global-questions/tags/popular', { params });
            const body = response.data;
            const raw = body?.status && body.data !== undefined ? body.data : body;
            if (Array.isArray(raw)) {
                return raw.map((x) => (typeof x === 'string' ? x : x.tag || '')).filter(Boolean);
            }
            return [];
        }
        catch (error) {
            return ['javascript', 'react', 'nodejs', 'python', 'web-development', 'programming', 'css', 'html'];
        }
    },
    searchHashtags: async (query, limit = 12) => {
        const q = String(query || '').trim().replace(/^#/, '');
        if (!q) return [];
        try {
            const response = await api.get('/global-questions/tags/popular', {
                params: { q, limit },
            });
            const body = response.data;
            const raw = body?.status && body.data !== undefined ? body.data : body;
            if (!Array.isArray(raw)) return [];
            return raw.map((x) => ({
                tag: typeof x === 'string' ? x : x.tag || '',
                count: typeof x === 'object' && x != null ? x.count ?? 0 : 0,
            })).filter((x) => x.tag);
        } catch {
            return [];
        }
    },
    // Search questions
    searchQuestions: async (query, params) => {
        const response = await api.get('/global-questions', {
            params: { search: query, ...params }
        });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
};
export default globalQuestionService;
