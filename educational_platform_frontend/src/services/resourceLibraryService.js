// @ts-nocheck
import api from './api';
// Resource Library Service
const resourceLibraryService = {
    // Get all resources with pagination and filters
    getResources: async (params) => {
        const response = await api.get('/resource-library', { params });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get a specific resource by ID
    getResource: async (id) => {
        const response = await api.get(`/resource-library/${id}`);
        const body = response.data;
        if (body?.status && body.data) {
            return body.data;
        }
        return body;
    },
    // Upload a new resource
    uploadResource: async (formData) => {
        const response = await api.post('/resource-library', formData);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Update a resource
    updateResource: async (id, updateData) => {
        const formData = new FormData();
        if (updateData.title)
            formData.append('title', updateData.title);
        if (updateData.description)
            formData.append('description', updateData.description);
        if (updateData.subject)
            formData.append('subject', updateData.subject);
        if (updateData.tags)
            formData.append('tags', JSON.stringify(updateData.tags));
        if (updateData.file)
            formData.append('file', updateData.file);
        const response = await api.put(`/resource-library/${id}`, formData);
        return response.data;
    },
    // Delete a resource
    deleteResource: async (id) => {
        await api.delete(`/resource-library/${id}`);
    },
    // Stream resource file for in-app preview (authenticated)
    getResourcePreview: async (id) => {
        const response = await api.get(`/resource-library/${id}/preview`, {
            responseType: 'blob',
        });
        return response.data;
    },
    // Download a resource (increments download count)
    downloadResource: async (id) => {
        const response = await api.get(`/resource-library/${id}/download`);
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get resources by subject
    getResourcesBySubject: async (subject, params) => {
        const response = await api.get(`/resource-library/subject/${subject}`, { params });
        return response.data;
    },
    // Get featured resources
    getFeaturedResources: async (limit) => {
        const response = await api.get('/resource-library/featured', {
            params: { limit },
        });
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    getPopularResources: async (limit) => {
        const response = await api.get('/resource-library/popular', {
            params: { limit },
        });
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    getRecentResources: async (limit) => {
        const response = await api.get('/resource-library/recent', {
            params: { limit },
        });
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    getLibraryColleges: async () => {
        const response = await api.get('/resource-library/colleges');
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    // Get all subjects
    getSubjects: async () => {
        const response = await api.get('/resource-library/subjects');
        const body = response.data;
        const list = body?.status && body.data?.subjects != null ? body.data.subjects : body?.subjects;
        return { subjects: Array.isArray(list) ? list : [] };
    },
    // Get all tags
    getTags: async () => {
        const response = await api.get('/resource-library/tags');
        const body = response.data;
        const list = body?.status && body.data?.tags != null ? body.data.tags : body?.tags;
        return { tags: Array.isArray(list) ? list : [] };
    },
    // Search resources
    searchResources: async (query, params) => {
        const response = await api.get('/resource-library/search', {
            params: { q: query, ...params }
        });
        return response.data;
    },
    // Get resource statistics
    getResourceStats: async () => {
        const response = await api.get('/resource-library/stats');
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    getUserResources: async () => {
        const response = await api.get('/resource-library/my-uploads');
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    // Bookmark a resource
    bookmarkResource: async (id) => {
        await api.post(`/resource-library/${id}/bookmark`);
    },
    // Remove bookmark from a resource
    removeBookmark: async (id) => {
        await api.delete(`/resource-library/${id}/bookmark`);
    },
    // Get bookmarked resources
    getBookmarkedResources: async () => {
        const response = await api.get('/resource-library/bookmarked');
        if (response.data.status && response.data.data) return response.data.data;
        return response.data;
    },
    reportResource: async (id, reason) => {
        const response = await api.post(`/resource-library/${id}/report`, { reason });
        return response.data;
    },
    // Get resource categories (if implemented)
    getCategories: async () => {
        const response = await api.get('/resource-library/categories');
        return response.data;
    },
    likeResource: async (id) => {
        const response = await api.post(`/resource-library/${id}/like`);
        return response.data;
    },
    unlikeResource: async (id) => {
        const response = await api.delete(`/resource-library/${id}/like`);
        return response.data;
    },
    // Add comment to a resource
    addComment: async (id, text) => {
        const response = await api.post(`/resource-library/${id}/comments`, { text });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    },
    // Get comments for a resource
    getComments: async (id, params) => {
        const response = await api.get(`/resource-library/${id}/comments`, { params });
        // Handle backend response format: { status: boolean, data: any }
        if (response.data.status && response.data.data) {
            return response.data.data;
        }
        return response.data;
    }
};
export default resourceLibraryService;
