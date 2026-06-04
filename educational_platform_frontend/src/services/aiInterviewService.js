// @ts-nocheck
import api from './api';
function unwrap(response) {
    const b = response.data;
    if (b && typeof b === 'object' && 'status' in b && b.data !== undefined) {
        return b.data;
    }
    return b;
}
const aiInterviewService = {
    // Get available interview types
    getInterviewTypes: async () => {
        const response = await api.get('/ai-interview/types');
        return unwrap(response);
    },
    // Start a new interview session
    startInterview: async (typeId) => {
        const response = await api.post('/ai-interview/start', { type_id: typeId });
        return unwrap(response);
    },
    // Get recent interview sessions for the user
    getRecentSessions: async () => {
        const response = await api.get('/ai-interview/sessions/recent');
        return unwrap(response);
    },
    // Get interview statistics for the user
    getInterviewStats: async () => {
        const response = await api.get('/ai-interview/stats');
        return unwrap(response);
    },
    // Get questions for a specific session
    getSessionQuestions: async (sessionId) => {
        const response = await api.get(`/ai-interview/sessions/${sessionId}/questions`);
        return unwrap(response);
    },
    // Submit answer for a question
    submitAnswer: async (sessionId, questionId, answer) => {
        const response = await api.post(`/ai-interview/sessions/${sessionId}/questions/${questionId}/answer`, { answer });
        return unwrap(response);
    },
    // Complete an interview session
    completeSession: async (sessionId) => {
        const response = await api.post(`/ai-interview/sessions/${sessionId}/complete`);
        return unwrap(response);
    },
    // Get detailed session report
    getSessionReport: async (sessionId) => {
        const response = await api.get(`/ai-interview/sessions/${sessionId}/report`);
        return unwrap(response);
    },
    // Get interview history with filters
    getInterviewHistory: async (filters) => {
        const params = new URLSearchParams();
        if (filters?.type)
            params.append('type', filters.type);
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.date_from)
            params.append('date_from', filters.date_from);
        if (filters?.date_to)
            params.append('date_to', filters.date_to);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/ai-interview/sessions/history?${params.toString()}`);
        return unwrap(response);
    },
    // Get practice questions by category
    getPracticeQuestions: async (category, difficulty) => {
        const params = new URLSearchParams({ category });
        if (difficulty)
            params.append('difficulty', difficulty);
        const response = await api.get(`/ai-interview/practice-questions?${params.toString()}`);
        return unwrap(response);
    },
    // Get AI coaching tips
    getCoachingTips: async (category) => {
        const params = category ? `?category=${category}` : '';
        const response = await api.get(`/ai-interview/coaching-tips${params}`);
        return unwrap(response);
    },
    // Update interview preferences
    updatePreferences: async (preferences) => {
        const response = await api.put('/ai-interview/preferences', preferences);
        return unwrap(response);
    },
    // Get user preferences
    getPreferences: async () => {
        const response = await api.get('/ai-interview/preferences');
        return unwrap(response);
    }
};
export default aiInterviewService;
