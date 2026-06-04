import axios from 'axios';
import { API_BASE_URL, USE_MOCK, DEFAULT_TENANT_SLUG } from '@/config/env';
import { isRetryableError } from '@/lib/apiError';
import { MOCK_MODE, mockApi } from './mockApi';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

const realApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

realApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    let tenantSlug = localStorage.getItem('tenantSlug') || '';
    if (!tenantSlug) {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        tenantSlug = u.tenant_slug || '';
      } catch {
        tenantSlug = '';
      }
    }
    if (!tenantSlug) tenantSlug = DEFAULT_TENANT_SLUG;
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

realApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (config && !config.__skipRetry && isRetryableError(error)) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * config.__retryCount));
        return realApi(config);
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-logout'));
    }

    return Promise.reject(error);
  }
);

const mockMode = MOCK_MODE || USE_MOCK;
const api = mockMode ? mockApi : realApi;

export default api;
