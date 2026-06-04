import { test, expect } from '@playwright/test';
/** Sidebar → main landmark content markers (mock or real API). */
const pages = [
    { nav: /^Home$/, expectText: /Welcome back/i, description: 'home' },
    { nav: /^Profile$/, expectText: /Recent Activity|Rahul|Profile/i, description: 'profile' },
    { nav: /^Messages$/, expectText: /Messages|conversations/i, description: 'messages' },
    { nav: /^Notifications$/, expectText: /Notifications/i, description: 'notifications' },
    { nav: /^Communities$/, expectText: /Communities/i, description: 'communities' },
    { nav: /^Bookmarks$/, expectText: /My Bookmarks/i, description: 'bookmarks' },
    { nav: /^Library$/, expectText: /Library Center/i, description: 'library' },
    { nav: /^Teachers$/, expectText: /Teacher Center/i, description: 'teacher' },
    { nav: /^Jobs$/, expectText: /Job Opportunities/i, description: 'jobs' },
    { nav: /^Events$/, expectText: /Events/i, description: 'events' },
    { nav: /^Network$/, expectText: /My Network/i, description: 'network' },
    { nav: /AI Interview/, expectText: /AI Interview Practice/i, description: 'ai-interview' },
    { nav: /AI English/, expectText: /AI English Learning/i, description: 'ai-english' },
    { nav: /RCPIT ChatGPT|ChatGPT/, expectText: /RCPIT ChatGPT/i, description: 'rcpit-chatgpt' },
    { nav: /^Admin$/, expectText: /RCPIT Admin Portal/i, description: 'admin' },
    {
        nav: /Super Admin/,
        expectText: /Super Admin Portal|Access restricted/i,
        description: 'super-admin',
    },
];
test.describe('App smoke (mock API)', () => {
    test('loads home feed', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/Welcome back/i)).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
    });
    test('header logo navigates home', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: /Library/i }).first().click();
        await expect(page.getByRole('heading', { name: /Library Center/i })).toBeVisible();
        await page.getByRole('button', { name: /VidhyalayHub/i }).click();
        await expect(page.getByText(/Welcome back/i)).toBeVisible();
    });
    for (const { nav, expectText, description } of pages) {
        test(`nav: ${description}`, async ({ page }) => {
            await page.goto('/');
            await page.locator('aside').getByRole('button', { name: nav }).first().click();
            await expect(page.locator('main').getByText(expectText).first()).toBeVisible({
                timeout: 25000,
            });
        });
    }
    test('sidebar Settings', async ({ page }) => {
        await page.goto('/');
        await page.locator('aside').getByRole('button', { name: /^Settings$/ }).click();
        await expect(page.locator('main').getByRole('heading', { name: /^Settings$/ })).toBeVisible({
            timeout: 25000,
        });
        await expect(page.getByText(/Manage your account preferences/i)).toBeVisible();
    });
});
