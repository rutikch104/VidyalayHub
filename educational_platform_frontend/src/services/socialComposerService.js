// @ts-nocheck
import api from './api';
import userService from './userService';
import globalQuestionService from './globalQuestionService';

const FALLBACK_HASHTAGS = [
  'javascript',
  'react',
  'python',
  'teaching',
  'exam',
  'career',
  'research',
  'algorithms',
];

const socialComposerService = {
  /** Platform-wide hashtag search (posts, questions, answers). */
  searchHashtags: async (query, limit = 12) => {
    const q = String(query || '').trim().replace(/^#/, '');
    try {
      const response = await api.get('/social/hashtags', {
        params: q ? { q, limit } : { limit },
      });
      const body = response.data;
      const raw = body?.status && body.data !== undefined ? body.data : body;
      if (!Array.isArray(raw)) return [];
      return raw
        .map((x) => ({
          tag: typeof x === 'string' ? x : x.tag || '',
          count: typeof x === 'object' && x != null ? x.count ?? 0 : 0,
        }))
        .filter((x) => x.tag);
    } catch {
      if (!q) {
        try {
          const tags = await globalQuestionService.getPopularTags();
          return (tags || []).slice(0, limit).map((tag) => ({
            tag: typeof tag === 'string' ? tag : tag.tag || tag,
            count: 0,
          }));
        } catch {
          return FALLBACK_HASHTAGS.slice(0, limit).map((tag) => ({ tag, count: 0 }));
        }
      }
      return globalQuestionService.searchHashtags(q, limit);
    }
  },

  getPopularHashtags: async (limit = 20) => {
    try {
      const response = await api.get('/social/hashtags', { params: { limit } });
      const body = response.data;
      const raw = body?.status && body.data !== undefined ? body.data : body;
      if (Array.isArray(raw)) {
        return raw.map((x) => (typeof x === 'string' ? x : x.tag || '')).filter(Boolean);
      }
    } catch {
      /* fallback */
    }
    return globalQuestionService.getPopularTags();
  },

  /** Search users for @mentions (all platform users). */
  searchMentionUsers: async (query, limit = 8) => {
    const q = String(query || '').trim();
    if (!q) return [];
    const { users } = await userService.searchUsers(q, { limit, page: 1 });
    return Array.isArray(users) ? users : [];
  },

  /** Teacher Center: global teacher search. */
  searchTeacherMentionUsers: async (query, limit = 8) => {
    const q = String(query || '').trim();
    if (!q) return [];
    const { teachers } = await globalQuestionService.searchTeachers(q);
    return (teachers || []).slice(0, limit);
  },

  fallbackHashtags: () => [...FALLBACK_HASHTAGS],
};

export default socialComposerService;
