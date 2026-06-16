// @ts-nocheck
import api from './api';
import { enrichSelfAuthorInPost } from '@/lib/selfIdentityCache';
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
    const collegeName =
      u?.college_name?.trim() ||
      u?.tenant_name?.trim() ||
      u?.tenant?.name?.trim() ||
      u?.tenant?.short_name?.trim() ||
      '';
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
                user_type: u.user_type,
                role: u.role,
                title: u.title,
                department: u.department,
                major: u.major,
                branch: u.branch,
                degree: u.degree,
                academic_identity: u.academic_identity,
                professional_identity: u.professional_identity,
                company: u.company,
                position: u.position,
                academic_year: u.academic_year,
                graduation_batch: u.graduation_batch,
                designation: u.designation,
                college_name: collegeName || undefined,
                tenant_name: collegeName || undefined,
            }
            : { id: '', name: 'User' },
    };
}
export function formatPostFromApi(postData) {
    if (!postData || typeof postData !== 'object') {
        return null;
    }
    const u = postData.user;
    const collegeName =
      u?.college_name?.trim() ||
      u?.tenant_name?.trim() ||
      u?.tenant?.name?.trim() ||
      u?.tenant?.short_name?.trim() ||
      postData.tenant?.name?.trim() ||
      postData.tenant?.short_name?.trim() ||
      '';
    const formattedUser = u
        ? {
            ...u,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User',
            avatar_url: resolveMediaUrl(u.profile_picture || u.avatar_url),
            ...(collegeName
              ? { college_name: collegeName, tenant_name: u.tenant_name?.trim() || collegeName }
              : {}),
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
    return enrichSelfAuthorInPost({
        ...postData,
        visibility: mapVisibilityFromApi(String(postData.visibility || 'public')),
        media_urls: normalizeMediaUrls(postData.media_urls),
        views_count: postData.views_count ?? 0,
        likes_count: postData.likes_count ?? 0,
        comments_count: postData.comments_count ?? 0,
        reposts_count: postData.reposts_count ?? 0,
        amplifies_count: postData.amplifies_count ?? postData.reposts_count ?? 0,
        is_liked: postData.is_liked ?? false,
        is_reposted: postData.is_reposted ?? false,
        is_amplified: postData.is_amplified ?? postData.is_reposted ?? false,
        feed_type: postData.feed_type || 'post',
        is_bookmarked: postData.is_bookmarked ?? false,
        mentioned_users: postData.mentioned_users || [],
        user: formattedUser,
        ...(commentsPreview ? { comments: commentsPreview } : {}),
    });
}
export function formatFeedItemFromApi(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.feed_type === 'amplify') {
        const amplifier = item.amplifier
            ? {
                ...item.amplifier,
                name: item.amplifier.name || item.amplifier.full_name || 'User',
                avatar_url: resolveMediaUrl(item.amplifier.avatar_url || item.amplifier.profile_picture),
            }
            : null;
        const originalPost = formatPostFromApi(item.original_post);
        if (!amplifier || !originalPost) return null;
        return {
            feed_type: 'amplify',
            id: item.id || `amplify-${item.amplify_id}`,
            amplify_id: item.amplify_id,
            amplify_comment: item.amplify_comment || null,
            amplified_at: item.amplified_at,
            sort_at: item.sort_at || item.amplified_at,
            amplifier,
            original_post: originalPost,
            original_post_id: item.original_post_id || originalPost.id,
        };
    }
    return formatPostFromApi(item);
}
function formatEngagementUser(u) {
    if (!u)
        return null;
    const avatar = resolveMediaUrl(u.profile_picture || u.avatar_url);
    return {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
        name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User',
        avatar_url: avatar,
        profile_picture: avatar,
        user_type: u.user_type,
        college_name: u.college_name,
        academic_identity: u.academic_identity,
        professional_identity: u.professional_identity,
        company: u.company,
        position: u.position,
        degree: u.degree,
        branch: u.branch,
        department: u.department,
        academic_year: u.academic_year,
        graduation_batch: u.graduation_batch,
        designation: u.designation,
        is_following: Boolean(u.is_following),
        reposted_at: u.reposted_at || null,
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
        if (data.code_file_name) {
            formData.append('code_file_name', data.code_file_name);
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
        const formattedPosts = rawPosts.map((post) => formatFeedItemFromApi(post)).filter(Boolean);
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
        if (data.code_file_name !== undefined) {
            formData.append('code_file_name', data.code_file_name);
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
    async getPostLikes(id, params = {}) {
        const response = await api.get(`/posts/${id}/likes`, { params });
        const payload = response.data.status && response.data.data ? response.data.data : response.data;
        const rows = payload.users || [];
        const pg = payload.pagination || {};
        return {
            users: rows.map((u) => formatEngagementUser(u)).filter(Boolean),
            total: pg.total ?? 0,
            page: pg.page ?? 1,
            totalPages: pg.pages ?? 1,
        };
    }
    async getPostReposts(id, params = {}) {
        const response = await api.get(`/posts/${id}/reposts`, { params });
        const payload = response.data.status && response.data.data ? response.data.data : response.data;
        const rows = payload.users || [];
        const pg = payload.pagination || {};
        return {
            users: rows.map((u) => formatEngagementUser(u)).filter(Boolean),
            total: pg.total ?? 0,
            page: pg.page ?? 1,
            totalPages: pg.pages ?? 1,
        };
    }
    async toggleRepost(id) {
        const response = await api.post(`/posts/${id}/repost`);
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
    async amplifyPost(id, { comment = null } = {}) {
        try {
            const response = await api.post(`/posts/${id}/repost`, {
                comment,
                amplify_comment: comment,
            });
            const data = response.data.status && response.data.data ? response.data.data : response.data;
            if (response.data.status === false) {
                const err = new Error(response.data.message || 'Could not amplify this post.');
                err.response = { status: 409, data: response.data };
                throw err;
            }
            return {
                ...data,
                is_reposted: Boolean(data.is_reposted ?? data.is_amplified),
                is_amplified: Boolean(data.is_amplified ?? data.is_reposted),
                amplifies_count: data.amplifies_count ?? data.reposts_count ?? 0,
                reposts_count: data.reposts_count ?? data.amplifies_count ?? 0,
            };
        } catch (err) {
            if (err?.response?.status === 409) {
                const body = err.response.data || {};
                const wrapped = new Error(body.message || 'You have already amplified this post.');
                wrapped.response = err.response;
                throw wrapped;
            }
            throw err;
        }
    }
    async removeAmplify(id) {
        const response = await api.post(`/posts/${id}/repost`, { remove: true });
        const data = response.data.status && response.data.data ? response.data.data : response.data;
        return {
            ...data,
            is_reposted: Boolean(data.is_reposted ?? data.is_amplified),
            is_amplified: Boolean(data.is_amplified ?? data.is_reposted),
            amplifies_count: data.amplifies_count ?? data.reposts_count ?? 0,
            reposts_count: data.reposts_count ?? data.amplifies_count ?? 0,
        };
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
