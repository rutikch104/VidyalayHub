import { test, expect } from '@playwright/test';
const API = process.env.API_BASE_URL || 'http://localhost:3030/api';
test.describe('Backend API reachability', () => {
    test('GET /auth/me without token returns 401', async ({ request }) => {
        const res = await request.get(`${API}/auth/me`).catch(() => null);
        if (!res) {
            test.skip(true, `Backend not reachable at ${API} (start educational_platform_backend)`);
            return;
        }
        expect([401, 403]).toContain(res.status());
    });
    test('POST /auth/register validation (no body)', async ({ request }) => {
        const res = await request.post(`${API}/auth/register`, { data: {} }).catch(() => null);
        if (!res) {
            test.skip(true, `Backend not reachable at ${API}`);
            return;
        }
        expect(res.status()).toBe(400);
        const j = (await res.json().catch(() => ({})));
        expect(j.status).toBe(false);
    });
    test('POST /auth/signin validation (no body)', async ({ request }) => {
        const res = await request.post(`${API}/auth/signin`, { data: {} }).catch(() => null);
        if (!res) {
            test.skip(true, `Backend not reachable at ${API}`);
            return;
        }
        expect(res.status()).toBe(400);
    });
});
