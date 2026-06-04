import { test, expect } from '@playwright/test';
/**
 * Guest auth screens only render when VITE_USE_MOCK is not true.
 * Run: VITE_USE_MOCK=false npx vite --port 5174 --strictPort
 * Then: PLAYWRIGHT_BASE_URL=http://localhost:5174 npx playwright test e2e/login-guest.spec.ts
 */
const RUN_GUEST = process.env.PLAYWRIGHT_GUEST === '1' || process.env.PLAYWRIGHT_BASE_URL?.includes('5174');
test.describe('Login / Register (real mode, no auto-login)', () => {
    test.beforeEach((_, testInfo) => {
        if (!RUN_GUEST) {
            testInfo.skip(true, 'Set PLAYWRIGHT_GUEST=1 and serve app on 5174 with VITE_USE_MOCK=false');
        }
    });
    test('login page renders', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
    });
    test('register page renders', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
    });
});
