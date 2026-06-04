// @ts-nocheck
import api from './api';
class FeedService {
    async getHomeFeed(params) {
        const response = await api.get('/feed/home', { params });
        const body = response.data;
        if (body?.status && body.data) {
            const d = body.data;
            const feed = d.feed || d.feed_items || [];
            const p = d.pagination || {};
            return {
                feed_items: feed,
                total: p.total ?? feed.length,
                page: p.page ?? 1,
                totalPages: p.pages ?? 1,
            };
        }
        return { feed_items: [], total: 0, page: 1, totalPages: 1 };
    }
    async getTrendingTopics() {
        try {
            const response = await api.get('/feed/trending-topics');
            const body = response.data;
            if (body?.status && body.data) {
                const d = body.data;
                const hashtagNames = (d.hashtags || []).map((h) => h.tag).filter(Boolean);
                const skillNames = (d.skills || []).map((s) => s.skill).filter(Boolean);
                const qTags = (d.question_tags || []).map((t) => t.tag).filter(Boolean);
                return { hashtags: hashtagNames, skills: skillNames, tags: qTags };
            }
        } catch {
            /* non-blocking sidebar data */
        }
        return { hashtags: [], skills: [], tags: [] };
    }
    /** Trending rows with scores for sidebar UI */
    async getTrendingTopicsDetailed() {
        try {
            const response = await api.get('/feed/trending-topics');
            const body = response.data;
            if (body?.status && body.data) {
                const d = body.data;
                return {
                    hashtags: (d.hashtags || [])
                        .map((h) => ({ tag: String(h.tag || ''), count: Number(h.count) || 0 }))
                        .filter((h) => h.tag),
                    skills: (d.skills || [])
                        .map((s) => ({ skill: String(s.skill || ''), count: Number(s.count) || 0 }))
                        .filter((s) => s.skill),
                    question_tags: (d.question_tags || [])
                        .map((t) => ({ tag: String(t.tag || ''), count: Number(t.count) || 0 }))
                        .filter((t) => t.tag),
                };
            }
        } catch {
            /* non-blocking sidebar data */
        }
        return { hashtags: [], skills: [], question_tags: [] };
    }
    async getSidebarNotices(limit = 5) {
        const response = await api.get('/feed/sidebar/notices', { params: { limit } });
        const body = response.data;
        if (body?.status && body.data?.notices)
            return body.data.notices;
        return [];
    }
    /** Full active college notices (same tenant as user) for notice board modal */
    async getTenantNoticesFull(limit = 50) {
        const response = await api.get('/feed/tenant-notices', { params: { limit } });
        const body = response.data;
        if (body?.status && body.data?.notices)
            return body.data.notices;
        return [];
    }
    async getFeedRecommendations(params) {
        const response = await api.get('/feed/recommendations', { params });
        const body = response.data;
        const raw = body?.status && body.data !== undefined ? body.data : body;
        const list = Array.isArray(raw) ? raw : raw?.recommendations || [];
        return {
            recommendations: list,
            total: list.length,
            page: 1,
            totalPages: 1,
        };
    }
}
export default new FeedService();
