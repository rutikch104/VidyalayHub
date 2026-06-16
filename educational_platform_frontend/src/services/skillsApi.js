import api from './api';

/**
 * Skill catalog autocomplete (master skills repository).
 */
const skillsApi = {
  suggest: async (query, { limit = 8, scope = 'profile' } = {}) => {
    const q = String(query || '').trim();
    if (q.length < 1) {
      return { items: [], canCreate: false, createLabel: null };
    }
    const response = await api.get('/users/skills/suggest', {
      params: { q, limit, scope },
    });
    const body = response.data;
    if (body?.status === false) {
      throw new Error(body.message || 'Failed to load skill suggestions');
    }
    return body?.data || { items: [], canCreate: false, createLabel: null };
  },
};

export default skillsApi;
