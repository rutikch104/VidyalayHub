// @ts-nocheck
import api from './api';
let bookmarksEmitTimer = null;
function emitBookmarksChanged() {
    if (typeof window === 'undefined')
        return;
    if (bookmarksEmitTimer)
        clearTimeout(bookmarksEmitTimer);
    bookmarksEmitTimer = setTimeout(() => {
        bookmarksEmitTimer = null;
        window.dispatchEvent(new CustomEvent('app:bookmarks-changed'));
    }, 100);
}
function normalizeListPayload(raw) {
    if (!raw || typeof raw !== 'object') {
        return { bookmarks: [], total: 0, page: 1, totalPages: 0 };
    }
    const o = raw;
    const p = o.pagination || {};
    return {
        bookmarks: Array.isArray(o.bookmarks) ? o.bookmarks : [],
        total: p.total ?? o.total ?? 0,
        page: p.page ?? o.page ?? 1,
        totalPages: p.pages ?? p.totalPages ?? o.totalPages ?? 0,
    };
}
class BookmarkService {
    async createBookmark(type, typeId) {
        const response = await api.post('/bookmarks', {
            type,
            type_id: String(typeId),
        });
        const body = response.data;
        if (body?.status && body.data) {
            emitBookmarksChanged();
            return body.data;
        }
        throw new Error(body?.message || 'Failed to create bookmark');
    }
    async getUserBookmarks(params) {
        const response = await api.get('/bookmarks', { params });
        const body = response.data;
        if (body?.status && body.data) {
            return normalizeListPayload(body.data);
        }
        return normalizeListPayload(body);
    }
    async getUserBookmarksByType(type, params) {
        const response = await api.get(`/bookmarks/type/${type}`, { params });
        const body = response.data;
        if (body?.status && body.data) {
            return normalizeListPayload(body.data);
        }
        return normalizeListPayload(body);
    }
    async getBookmarkStats() {
        const response = await api.get('/bookmarks/stats');
        const body = response.data;
        const empty = {
            total: 0,
            by_type: { post: 0, question: 0, answer: 0, resource: 0, course: 0, event: 0 },
        };
        if (body?.status && body.data && typeof body.data === 'object') {
            const d = body.data;
            if ('total' in d && d.by_type && typeof d.by_type === 'object') {
                return {
                    total: Number(d.total) || 0,
                    by_type: {
                        post: Number(d.by_type.post) || 0,
                        question: Number(d.by_type.question) || 0,
                        answer: Number(d.by_type.answer) || 0,
                        resource: Number(d.by_type.resource) || 0,
                        course: Number(d.by_type.course) || 0,
                        event: Number(d.by_type.event) || 0,
                    },
                };
            }
            const legacy = d;
            const by_type = {
                post: legacy.post || 0,
                question: legacy.question || 0,
                answer: legacy.answer || 0,
                resource: legacy.resource || 0,
                course: legacy.course || 0,
                event: legacy.event || 0,
            };
            const total = Object.values(by_type).reduce((a, b) => a + b, 0);
            return { total, by_type };
        }
        return empty;
    }
    async checkBookmark(type, typeId) {
        const response = await api.get('/bookmarks/check', {
            params: { type, type_id: String(typeId) },
        });
        const body = response.data;
        if (!body?.status) {
            return { is_bookmarked: false };
        }
        const d = body.data;
        if (d && typeof d === 'object' && 'is_bookmarked' in d) {
            return {
                is_bookmarked: !!d.is_bookmarked,
                bookmark_id: d.bookmark_id ? String(d.bookmark_id) : undefined,
            };
        }
        if (d && typeof d === 'object' && 'id' in d && d.id) {
            return { is_bookmarked: true, bookmark_id: String(d.id) };
        }
        if (body.isBookmarked === true) {
            return { is_bookmarked: true, bookmark_id: undefined };
        }
        return { is_bookmarked: false };
    }
    async deleteBookmark(id) {
        try {
            await api.delete(`/bookmarks/${id}`);
            emitBookmarksChanged();
        }
        catch (err) {
            const status = err && typeof err === 'object' && 'response' in err
                ? err.response?.status
                : undefined;
            if (status === 404) {
                emitBookmarksChanged();
                return;
            }
            throw err;
        }
    }
}
export default new BookmarkService();
