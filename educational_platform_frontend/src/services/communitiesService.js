// @ts-nocheck
import api from './api';
import { resolveMediaUrl } from './postService';

function resolveAuthorAvatar(entity) {
    if (!entity || typeof entity !== 'object')
        return '';
    const raw = entity.user_avatar ||
        entity.avatar_url ||
        entity.profile_picture ||
        entity.user?.avatar_url ||
        entity.user?.profile_picture ||
        entity.author?.avatar_url ||
        entity.author?.profile_picture;
    if (!raw)
        return '';
    return resolveMediaUrl(raw) || raw;
}

export function normalizeCommunityComment(comment) {
    if (!comment || typeof comment !== 'object')
        return comment;
    const user_avatar = resolveAuthorAvatar(comment);
    return {
        ...comment,
        user_avatar,
        avatar_url: user_avatar,
        replies: Array.isArray(comment.replies)
            ? comment.replies.map(normalizeCommunityComment)
            : [],
    };
}

export function normalizeCommunityPost(post) {
    if (!post || typeof post !== 'object')
        return post;
    const user_avatar = resolveAuthorAvatar(post);
    return {
        ...post,
        user_avatar,
        avatar_url: user_avatar,
    };
}

function unwrap(response) {
    const body = response.data;
    if (body?.status === true && body.data !== undefined && body.data !== null) {
        return body.data;
    }
    if (body?.status === true) {
        return { message: body.message || 'OK' };
    }
    return response.data;
}
const communitiesService = {
    getCommunities: async (filters) => {
        const params = new URLSearchParams();
        if (filters?.category)
            params.append('category', filters.category);
        if (filters?.is_private !== undefined)
            params.append('is_private', String(filters.is_private));
        if (filters?.is_featured !== undefined)
            params.append('is_featured', String(filters.is_featured));
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        if (filters?.sort)
            params.append('sort', filters.sort);
        if (filters?.trending)
            params.append('trending', 'true');
        const response = await api.get(`/communities?${params.toString()}`);
        return unwrap(response);
    },
    getFeaturedCommunities: async () => {
        const response = await api.get('/communities/featured');
        return unwrap(response);
    },
    getCommunityById: async (communityId) => {
        const response = await api.get(`/communities/${communityId}`);
        return unwrap(response);
    },
    createCommunity: async (communityData) => {
        const response = await api.post('/communities', communityData);
        const body = response.data;
        if (body?.status && body.data)
            return { community: body.data.community, message: body.message };
        return response.data;
    },
    updateCommunity: async (communityId, communityData) => {
        const response = await api.put(`/communities/${communityId}`, communityData);
        const body = response.data;
        if (body?.status && body.data)
            return { community: body.data.community, message: body.message };
        return response.data;
    },
    deleteCommunity: async (communityId) => {
        const response = await api.delete(`/communities/${communityId}`);
        return unwrap(response);
    },
    joinCommunity: async (communityId) => {
        const response = await api.post(`/communities/${communityId}/join`);
        return unwrap(response);
    },
    leaveCommunity: async (communityId) => {
        const response = await api.delete(`/communities/${communityId}/join`);
        return unwrap(response);
    },
    getCommunityPosts: async (communityId, filters) => {
        const params = new URLSearchParams();
        if (filters?.sort)
            params.append('sort', filters.sort);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/communities/${communityId}/posts?${params.toString()}`);
        const data = unwrap(response);
        if (Array.isArray(data?.posts)) {
            return { ...data, posts: data.posts.map(normalizeCommunityPost) };
        }
        return data;
    },
    createCommunityPost: async (communityId, postData) => {
        const formData = new FormData();
        if (postData.title) formData.append('title', postData.title);
        formData.append('content', postData.content);
        if (postData.image_url) formData.append('image_url', postData.image_url);
        if (postData.media) formData.append('media', postData.media);
        if (postData.tags?.length) formData.append('tags', JSON.stringify(postData.tags));
        if (postData.mentioned_users?.length) {
            formData.append('mentioned_users', JSON.stringify(postData.mentioned_users));
        }
        const response = await api.post(`/communities/${communityId}/posts`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const body = response.data;
        if (body?.status && body.data)
            return { post: normalizeCommunityPost(body.data.post), message: body.message };
        return response.data;
    },
    updateCommunityPost: async (communityId, postId, postData) => {
        const hasFile = postData?.media instanceof File;
        let response;
        if (hasFile) {
            const formData = new FormData();
            if (postData.title !== undefined) formData.append('title', postData.title);
            if (postData.content !== undefined) formData.append('content', postData.content);
            formData.append('media', postData.media);
            if (postData.tags !== undefined) formData.append('tags', JSON.stringify(postData.tags || []));
            if (postData.mentioned_users !== undefined) {
                formData.append('mentioned_users', JSON.stringify(postData.mentioned_users || []));
            }
            response = await api.put(`/communities/${communityId}/posts/${postId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } else {
            response = await api.put(`/communities/${communityId}/posts/${postId}`, postData);
        }
        const body = response.data;
        if (body?.status && body.data)
            return { post: normalizeCommunityPost(body.data.post), message: body.message };
        return response.data;
    },
    deleteCommunityPost: async (communityId, postId) => {
        const response = await api.delete(`/communities/${communityId}/posts/${postId}`);
        return unwrap(response);
    },
    getPostComments: async (communityId, postId, filters) => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        const response = await api.get(
            `/communities/${communityId}/posts/${postId}/comments?${params.toString()}`,
        );
        const data = unwrap(response);
        if (Array.isArray(data?.comments)) {
            return { ...data, comments: data.comments.map(normalizeCommunityComment) };
        }
        return data;
    },
    createPostComment: async (communityId, postId, data) => {
        const response = await api.post(`/communities/${communityId}/posts/${postId}/comments`, data);
        const body = response.data;
        if (body?.status && body.data) {
            return {
                comment: normalizeCommunityComment(body.data.comment),
                message: body.message,
            };
        }
        return response.data;
    },
    deletePostComment: async (communityId, postId, commentId) => {
        const response = await api.delete(
            `/communities/${communityId}/posts/${postId}/comments/${commentId}`,
        );
        return unwrap(response);
    },
    uploadCommunityAvatar: async (communityId, file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.post(`/communities/${communityId}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap(response);
    },
    uploadCommunityCover: async (communityId, file) => {
        const formData = new FormData();
        formData.append('cover', file);
        const response = await api.post(`/communities/${communityId}/cover`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return unwrap(response);
    },
    togglePostLike: async (communityId, postId) => {
        const response = await api.post(`/communities/${communityId}/posts/${postId}/like`);
        const body = response.data;
        if (body?.status) {
            return { message: body.message || '', is_liked: !!body.data?.is_liked };
        }
        return { message: '', is_liked: false };
    },
    getCommunityMembers: async (communityId, filters) => {
        const params = new URLSearchParams();
        if (filters?.role)
            params.append('role', filters.role);
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/communities/${communityId}/members?${params.toString()}`);
        return unwrap(response);
    },
    getUserCommunities: async (filters) => {
        const params = new URLSearchParams();
        if (filters?.role)
            params.append('role', filters.role);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/communities/user?${params.toString()}`);
        return unwrap(response);
    },
    getMyCommunitiesFeed: async (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page)
            searchParams.append('page', String(params.page));
        if (params?.limit)
            searchParams.append('limit', String(params.limit));
        const response = await api.get(`/communities/feed/posts?${searchParams.toString()}`);
        return unwrap(response);
    },
    searchCommunities: async (query, filters) => {
        const params = new URLSearchParams({ q: query });
        if (filters?.category)
            params.append('category', filters.category);
        if (filters?.is_private !== undefined)
            params.append('is_private', String(filters.is_private));
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/communities/search?${params.toString()}`);
        return unwrap(response);
    },
    getCommunityCategories: async () => {
        const response = await api.get('/communities/categories');
        return unwrap(response);
    },
    inviteToCommunity: async (communityId, userId) => {
        const response = await api.post(`/communities/${communityId}/invite`, { user_id: userId });
        return unwrap(response);
    },
    removeMember: async (communityId, userId) => {
        const response = await api.delete(`/communities/${communityId}/members/${userId}`);
        return unwrap(response);
    },
    updateMemberRole: async (communityId, userId, role) => {
        const response = await api.put(`/communities/${communityId}/members/${userId}`, { role });
        return unwrap(response);
    },
    togglePostPin: async (communityId, postId) => {
        const response = await api.post(`/communities/${communityId}/posts/${postId}/pin`);
        return unwrap(response);
    },
    togglePostAnnouncement: async (communityId, postId) => {
        const response = await api.post(`/communities/${communityId}/posts/${postId}/announcement`);
        return unwrap(response);
    },
    getCommunityAnalytics: async (communityId) => {
        const response = await api.get(`/communities/${communityId}/analytics`);
        return unwrap(response);
    },
    getCommunityRules: async (communityId) => {
        const response = await api.get(`/communities/${communityId}/rules`);
        return unwrap(response);
    },
    updateCommunityRules: async (communityId, rules) => {
        const response = await api.put(`/communities/${communityId}/rules`, { rules });
        return unwrap(response);
    },
    reportCommunity: async (communityId, reason) => {
        const response = await api.post(`/communities/${communityId}/report`, { reason });
        return unwrap(response);
    },
    reportPost: async (communityId, postId, reason) => {
        const response = await api.post(`/communities/${communityId}/posts/${postId}/report`, { reason });
        return unwrap(response);
    },
};
export default communitiesService;
