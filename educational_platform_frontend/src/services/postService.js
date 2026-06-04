// @ts-nocheck
import api from './api';
/** API origin without trailing `/api` — for `/uploads/...` media */
export function getApiOrigin() {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030/api';
    return base.replace(/\/api\/?$/, '');
}
export function resolveMediaUrl(url) {
    if (!url)
        return '';
    if (/^https?:\/\//i.test(url))
        return url;
    const origin = getApiOrigin();
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}
function inferMediaType(url, explicit) {
    const lower = (url || '').toLowerCase();
    if (/\.(mp4|webm|ogg|mov|mpeg)(\?|$)/i.test(lower))
        return 'video';
    if (/\.(jpg|jpeg|png|gif|webp|svg|heic|heif|bmp)(\?|$)/i.test(lower))
        return 'image';
    if (explicit === 'video')
        return 'video';
    if (explicit === 'image')
        return 'image';
    if (explicit === 'file' && /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(lower))
        return 'image';
    return explicit === 'video' ? 'video' : 'image';
}
function mediaRawUrl(item) {
    if (!item || typeof item !== 'object')
        return '';
    if (item.url)
        return item.url;
    if (item.storage_key)
        return `/media/${String(item.storage_key).replace(/^\/+/, '')}`;
    return '';
}
export function normalizeMediaUrls(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((item) => {
        if (typeof item === 'string') {
            const url = resolveMediaUrl(item);
            return { url, type: inferMediaType(url) };
        }
        if (item && typeof item === 'object') {
            const o = item;
            const url = resolveMediaUrl(mediaRawUrl(o));
            const type =
                o.type && o.type !== 'file'
                    ? o.type
                    : inferMediaType(url, o.type);
            return { ...o, url, type };
        }
        return { url: '', type: 'image' };
    });
}
function mapVisibilityFromApi(v) {
    if (v === 'college')
        return 'college_only';
    if (v === 'private')
        return 'private';
    return 'public';
}
export function formatComment(c) {
    if (!c) {
        return { id: '', text: '', created_at: '', user: { id: '', name: 'User' } };
    }
    const u = c.user;
    const replies = Array.isArray(c.replies) ? c.replies.map((r) => formatComment(r)) : [];
    return {
        ...c,
        replies,
        likes_count: c.likes_count ?? 0,
        is_liked: Boolean(c.is_liked),
        updated_at: c.updated_at || c.created_at,
        user: u
            ? {
                id: u.id,
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || 'User',
                first_name: u.first_name,
                last_name: u.last_name,
                avatar_url: resolveMediaUrl(u.profile_picture || u.avatar_url),
            }
            : { id: '', name: 'User' },
    };
}
export function formatPostFromApi(postData) {
    if (!postData || typeof postData !== 'object') {
        return null;
    }
    const u = postData.user;
    const formattedUser = u
        ? {
            ...u,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User',
            avatar_url: resolveMediaUrl(u.profile_picture || u.avatar_url),
        }
        : {
            id: '',
            name: 'User',
            first_name: '',
            last_name: '',
        };
    const commentsPreview = Array.isArray(postData.comments)
        ? postData.comments.map((x) => formatComment(x))
        : undefined;
    return {
        ...postData,
        visibility: mapVisibilityFromApi(String(postData.visibility || 'public')),
        media_urls: normalizeMediaUrls(postData.media_urls),
        views_count: postData.views_count ?? 0,
        likes_count: postData.likes_count ?? 0,
        comments_count: postData.comments_count ?? 0,
        is_liked: postData.is_liked ?? false,
        is_bookmarked: postData.is_bookmarked ?? false,
        mentioned_users: postData.mentioned_users || [],
        user: formattedUser,
        ...(commentsPreview ? { comments: commentsPreview } : {}),
    };
}
class PostService {
    async createPost(data) {
        const formData = new FormData();
        formData.append('content', data.content);
        formData.append('type', data.type);
        formData.append('visibility', data.visibility);
        if (data.hashtags) {
            formData.append('hashtags', JSON.stringify(data.hashtags));
        }
        if (data.mentioned_users) {
            formData.append('mentioned_users', JSON.stringify(data.mentioned_users));
        }
        if (data.code_language) {
            formData.append('code_language', data.code_language);
        }
        if (data.media) {
            data.media.forEach((file) => {
                formData.append('media', file);
            });
        }
        const response = await api.post('/posts', formData);
        const d = response.data;
        if (d?.status === false) {
            throw new Error(d.message || 'Failed to create post');
        }
        const postData = d?.data ?? d;
        if (!postData || typeof postData !== 'object') {
            throw new Error('Invalid create post response');
        }
        const created = formatPostFromApi(postData);
        if (!created) {
            throw new Error('Invalid create post response');
        }
        return created;
    }
    async getPosts(params) {
        const response = await api.get('/posts', { params });
        let data;
        if (response.data.status && response.data.data) {
            data = response.data.data;
        }
        else {
            data = response.data;
        }
        const rawPosts = data.posts || [];
        const formattedPosts = rawPosts.map((post) => formatPostFromApi(post)).filter(Boolean);
        const pg = data.pagination || {};
        return {
            posts: formattedPosts,
            total: pg.total ?? 0,
            page: pg.page ?? 1,
            totalPages: pg.pages ?? 1,
        };
    }
    async getPost(id) {
        const response = await api.get(`/posts/${id}`);
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        const formatted = formatPostFromApi(raw);
        if (!formatted) {
            throw new Error('Invalid post payload');
        }
        return formatted;
    }
    async updatePost(id, data) {
        const formData = new FormData();
        if (data.content !== undefined) {
            formData.append('content', data.content);
        }
        if (data.type) {
            formData.append('type', data.type);
        }
        if (data.visibility) {
            formData.append('visibility', data.visibility);
        }
        if (data.hashtags) {
            formData.append('hashtags', JSON.stringify(data.hashtags));
        }
        if (data.mentioned_users) {
            formData.append('mentioned_users', JSON.stringify(data.mentioned_users));
        }
        if (data.code_language !== undefined) {
            formData.append('code_language', data.code_language);
        }
        if (data.media && data.media.length > 0) {
            data.media.forEach((file) => {
                formData.append('media', file);
            });
        }
        const response = await api.put(`/posts/${id}`, formData);
        const d = response.data;
        if (d?.status === false) {
            throw new Error(d.message || 'Failed to update post');
        }
        const postData = d?.data;
        if (!postData) {
            throw new Error('Invalid update response');
        }
        const updated = formatPostFromApi(postData);
        if (!updated) {
            throw new Error('Invalid update response');
        }
        return updated;
    }
    async deletePost(id) {
        await api.delete(`/posts/${id}`);
    }
    async toggleLike(id) {
        const response = await api.post(`/posts/${id}/like`);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async addComment(id, text, parentCommentId) {
        const payload = parentCommentId ? { text, parent_comment_id: parentCommentId } : { text };
        const response = await api.post(`/posts/${id}/comments`, payload);
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        return formatComment(raw);
    }
    async addReply(id, parentCommentId, text) {
        return this.addComment(id, text, parentCommentId);
    }
    async getComments(id, params = {}) {
        const response = await api.get(`/posts/${id}/comments`, { params });
        const payload = response.data.status && response.data.data ? response.data.data : response.data;
        const rows = payload.comments || [];
        const pg = payload.pagination || {};
        return {
            comments: rows.map((c) => formatComment(c)),
            total: pg.total ?? 0,
            page: pg.page ?? 1,
            totalPages: pg.pages ?? 1,
            sort: payload.sort ?? params.sort ?? 'latest',
        };
    }
    async updateComment(postId, commentId, text) {
        const response = await api.put(`/posts/${postId}/comments/${commentId}`, { text });
        const raw = response.data.status && response.data.data ? response.data.data : response.data;
        return formatComment(raw);
    }
    async toggleCommentLike(postId, commentId) {
        const response = await api.post(`/posts/${postId}/comments/${commentId}/like`);
        const data = response.data.status && response.data.data ? response.data.data : response.data;
        return {
            is_liked: Boolean(data.is_liked),
            likes_count: data.likes_count ?? 0,
        };
    }
    async deleteComment(postId, commentId) {
        await api.delete(`/posts/${postId}/comments/${commentId}`);
    }
    async getTrendingHashtags() {
        const response = await api.get('/posts/trending-hashtags');
        const body = response.data;
        const payload = body.status && body.data !== undefined ? body.data : body;
        if (Array.isArray(payload) && payload.length > 0 && typeof payload[0] === 'object' && 'tag' in payload[0]) {
            return payload.map((x) => x.tag);
        }
        if (Array.isArray(payload))
            return payload;
        return [];
    }
}
export default new PostService();
