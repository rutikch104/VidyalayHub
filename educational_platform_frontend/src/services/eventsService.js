// @ts-nocheck
import api from './api';
function unwrapData(response, fallback) {
    const body = response.data;
    if (body?.status && body.data !== undefined && body.data !== null) {
        return body.data;
    }
    if (fallback !== undefined)
        return fallback;
    throw new Error(body?.message || 'Request failed');
}
const eventsService = {
    getEvents: async (filters) => {
        const params = {};
        if (filters?.tab)
            params.tab = filters.tab;
        if (filters?.category)
            params.category = filters.category;
        if (filters?.event_type)
            params.event_type = filters.event_type;
        if (filters?.date_from)
            params.date_from = filters.date_from;
        if (filters?.date_to)
            params.date_to = filters.date_to;
        if (filters?.location)
            params.location = filters.location;
        if (filters?.is_online !== undefined)
            params.is_online = String(filters.is_online);
        if (filters?.is_featured !== undefined)
            params.is_featured = String(filters.is_featured);
        if (filters?.q)
            params.q = filters.q;
        if (filters?.page)
            params.page = String(filters.page);
        if (filters?.limit)
            params.limit = String(filters.limit);
        const response = await api.get('/events', { params });
        const data = unwrapData(response);
        return {
            events: data.events || [],
            total: data.total ?? data.pagination?.total ?? 0,
            page: data.page ?? data.pagination?.page ?? 1,
            limit: data.limit ?? 20,
            pagination: data.pagination,
        };
    },
    getFeaturedEvents: async (limit = 10) => {
        const response = await api.get('/events/featured', {
            params: { limit: String(limit) },
        });
        const data = unwrapData(response);
        return { events: data.events || [] };
    },
    getUpcomingEvents: async (limit) => {
        const params = limit ? { limit: String(limit) } : undefined;
        const response = await api.get('/events/upcoming', { params });
        const data = unwrapData(response);
        return { events: data.events || [] };
    },
    getTrendingEvents: async (limit = 8) => {
        const response = await api.get('/events/trending', { params: { limit: String(limit) } });
        const data = unwrapData(response);
        return { events: data.events || [] };
    },
    getEventById: async (eventId) => {
        const response = await api.get(`/events/${eventId}`);
        return unwrapData(response);
    },
    createEvent: async (eventData) => {
        let payload = eventData;
        if (eventData.banner instanceof File) {
            const formData = new FormData();
            Object.entries(eventData).forEach(([key, val]) => {
                if (val === undefined || val === null || key === 'banner') return;
                if (key === 'tags' && Array.isArray(val)) {
                    formData.append('tags', JSON.stringify(val));
                } else if (typeof val === 'boolean') {
                    formData.append(key, String(val));
                } else {
                    formData.append(key, val);
                }
            });
            formData.append('banner', eventData.banner);
            payload = formData;
        }
        const response = await api.post('/events', payload);
        const data = unwrapData(response);
        return { event: data.event };
    },
    updateEvent: async (eventId, eventData) => {
        const response = await api.put(`/events/${eventId}`, eventData);
        const data = unwrapData(response);
        return { event: data.event };
    },
    deleteEvent: async (eventId) => {
        const response = await api.delete(`/events/${eventId}`);
        const body = response.data;
        if (body?.status) {
            return { message: body.message || 'Deleted.' };
        }
        throw new Error(body?.message || 'Delete failed');
    },
    registerForEvent: async (eventId, status) => {
        const response = await api.post(`/events/${eventId}/register`, {
            status: status || 'going',
        });
        const body = response.data;
        if (body?.status) {
            return { message: body.message || 'Registered.' };
        }
        throw new Error(body?.message || 'Registration failed');
    },
    cancelEventRegistration: async (eventId) => {
        const response = await api.delete(`/events/${eventId}/register`);
        const body = response.data;
        if (body?.status) {
            return { message: body.message || 'Cancelled.' };
        }
        throw new Error(body?.message || 'Cancel failed');
    },
    getEventRegistrations: async (eventId, filters) => {
        const params = new URLSearchParams();
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/events/${eventId}/registrations?${params.toString()}`);
        const data = unwrapData(response);
        return {
            registrations: data.registrations || [],
            total: data.total ?? 0,
            page: data.page ?? 1,
            limit: data.limit ?? 50,
        };
    },
    getUserRegisteredEvents: async (filters) => {
        const params = new URLSearchParams();
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/events/user/registered?${params.toString()}`);
        const data = unwrapData(response);
        return {
            events: data.events || [],
            total: data.total ?? 0,
            page: data.page ?? 1,
            limit: data.limit ?? 20,
        };
    },
    getUserOrganizedEvents: async (filters) => {
        const params = new URLSearchParams();
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await api.get(`/events/user/organized?${params.toString()}`);
        const data = unwrapData(response);
        return {
            events: data.events || [],
            total: data.total ?? 0,
            page: data.page ?? 1,
            limit: data.limit ?? 20,
        };
    },
    searchEvents: async (query, filters) => {
        const params = { q: query };
        if (filters?.category)
            params.category = filters.category;
        if (filters?.event_type)
            params.event_type = filters.event_type;
        if (filters?.page)
            params.page = String(filters.page);
        if (filters?.limit)
            params.limit = String(filters.limit);
        const response = await api.get('/events/search', { params });
        const data = unwrapData(response);
        return {
            events: data.events || [],
            total: data.total ?? 0,
            page: data.page ?? 1,
            limit: data.limit ?? 20,
        };
    },
    getEventCategories: async () => {
        const response = await api.get('/events/categories');
        return unwrapData(response);
    },
    getEventTypes: async () => {
        const response = await api.get('/events/types');
        return unwrapData(response);
    },
    getEventAnalytics: async (eventId) => {
        const response = await api.get(`/events/${eventId}/analytics`);
        return unwrapData(response);
    },
    updateRegistrationStatus: async (eventId, registrationId, status) => {
        const response = await api.put(`/events/${eventId}/registrations/${registrationId}`, { status });
        const body = response.data;
        if (body?.status) {
            return { message: body.message || 'Updated.' };
        }
        throw new Error(body?.message || 'Update failed');
    },
};
export default eventsService;
