import { defineConfig, devices } from '@playwright/test';
/**
 * E2E smoke tests. Default web server uses mock API so navigation works without Postgres.
 * API health checks (e2e/api-health.spec.js) probe localhost:3030 if reachable.
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['list']],
    timeout: 60000,
    expect: { timeout: 15000 },
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5175',
        trace: 'on-first-retry',
        viewport: { width: 1440, height: 900 },
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Use installed Google Chrome (works on Apple Silicon); avoids wrong bundled arch.
                // For pure Chromium instead: unset and run `npx playwright install chromium`
                ...(process.env.PW_USE_BUNDLED_CHROMIUM === '1'
                    ? {}
                    : { channel: 'chrome' }),
            },
        },
    ],
    webServer: {
        command: 'VITE_USE_MOCK=true vite --port 5175 --strictPort',
        url: 'http://localhost:5175',
        reuseExistingServer: true,
        timeout: 120000,
    },
});
