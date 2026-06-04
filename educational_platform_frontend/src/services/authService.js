// @ts-nocheck
import api from './api';
import { resolveMediaUrl } from './postService';
import { getPortalAccess } from '@/lib/access';

export function normalizeAuthUser(user) {
    if (!user || typeof user !== 'object')
        return user;
    const rawAvatar = user.avatar_url || user.profile_picture;
    const avatar_url = rawAvatar ? resolveMediaUrl(rawAvatar) || rawAvatar : undefined;
    const rawCover = user.cover_image_url || user.cover_picture;
    const cover_image_url = rawCover ? resolveMediaUrl(rawCover) || rawCover : undefined;
    const inst = user.institution;
    const tenant_logo_raw =
        user.tenant_logo_url ?? inst?.logo_url ?? null;
    const tenant_logo_url = tenant_logo_raw
        ? resolveMediaUrl(tenant_logo_raw) || tenant_logo_raw
        : null;
    const tenant_name = (user.tenant_name || inst?.name || '').trim();
    const portal_access = getPortalAccess(user);
    const tenant_id =
        user.tenant_id != null && String(user.tenant_id).trim() !== ''
            ? String(user.tenant_id)
            : '';
    const tenant_slug = (user.tenant_slug || inst?.slug || '').trim().toLowerCase();
    return {
        ...user,
        avatar_url,
        cover_image_url,
        tenant_name,
        tenant_logo_url,
        tenant_id,
        tenant_slug,
        portal_access,
        is_institution_admin: Boolean(user.is_institution_admin) || portal_access === 'college',
        institution: inst
            ? {
                  ...inst,
                  logo_url: tenant_logo_url,
                  name: tenant_name || inst.name,
              }
            : tenant_name || tenant_logo_url
              ? {
                    tenant_id: user.tenant_id,
                    name: tenant_name,
                    logo_url: tenant_logo_url,
                }
              : undefined,
    };
}

class AuthService {
    async login(credentials) {
        const response = await api.post('/auth/signin', credentials);
        const { data } = response.data;
        const { token, user: rawUser } = data;
        const user = normalizeAuthUser(rawUser);
        localStorage.removeItem('superAdminSession');
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.tenant_slug) localStorage.setItem('tenantSlug', user.tenant_slug);
        return { token, user };
    }
    async register(credentials) {
        const response = await api.post('/auth/register', credentials);
        const { data } = response.data;
        if (data.pending_approval) {
            return {
                pendingApproval: true,
                message: data.message,
                user: data.user,
            };
        }
        const { token, user: rawUser } = data;
        const user = normalizeAuthUser(rawUser);
        localStorage.removeItem('superAdminSession');
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        if (user.tenant_slug) localStorage.setItem('tenantSlug', user.tenant_slug);
        return { token, user, pendingApproval: false };
    }
    async superAdminLogin(credentials) {
        const response = await api.post('/super-admin-auth/login', credentials);
        const { data } = response.data;
        const { token, user: rawUser } = data;
        const user = normalizeAuthUser(rawUser);
        localStorage.setItem('superAdminSession', 'true');
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        return { token, user };
    }
    async logout() {
        try {
            await api.post('/auth/logout');
        }
        catch {
            /* still clear session */
        }
        finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('superAdminSession');
        }
    }
    async getCurrentUser() {
        try {
            const isSuper = localStorage.getItem('superAdminSession') === 'true';
            const response = await api.get(isSuper ? '/super-admin-auth/me' : '/auth/me');
            const user = normalizeAuthUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
        catch {
            return null;
        }
    }
    getStoredUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? normalizeAuthUser(JSON.parse(userStr)) : null;
    }
    getStoredToken() {
        return localStorage.getItem('authToken');
    }
    isAuthenticated() {
        return !!this.getStoredToken();
    }
}
export default new AuthService();
