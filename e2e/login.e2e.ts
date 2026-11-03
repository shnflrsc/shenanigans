import { expect, test } from '@playwright/test';
import { resetRateLimits } from './db';

test.beforeEach(resetRateLimits);
test.afterAll(resetRateLimits);

test.describe('admin login', () => {
	test('shows the sign-in card with GitHub only', async ({ page }) => {
		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		await expect(page.getByText('Shenanigans')).toHaveCount(0);
		await expect(page.getByText('Admin', { exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeEnabled();
		await expect(page.getByRole('link')).toHaveCount(0);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
	});

	test('shows the denied and error notices', async ({ page }) => {
		await page.goto('/admin?notice=denied');
		await expect(page.getByRole('alert')).toContainText('This GitHub account doesn’t have access.');
		await page.goto('/admin?notice=error');
		await expect(page.getByRole('alert')).toContainText('Sign-in didn’t finish.');
		await page.goto('/admin?notice=<script>');
		await expect(page.getByRole('alert')).toHaveCount(0);
	});

	test('sends visitors without a session from admin pages back to the login screen', async ({
		page
	}) => {
		await page.goto('/admin/posts');
		await expect(page).toHaveURL(/\/admin$/);
	});

	test('refuses admin endpoints without a session', async ({ request }) => {
		const response = await request.post('/admin/signout', {
			headers: { origin: 'http://localhost:4173' },
			maxRedirects: 0
		});
		expect(response.status()).toBe(401);
	});

	test('rate limits the login surface: the 11th request in 10 minutes returns 429 with Retry-After', async ({
		request
	}) => {
		for (let i = 1; i <= 10; i++) {
			expect((await request.get('/admin')).status()).toBe(200);
		}
		const limited = await request.get('/admin');
		expect(limited.status()).toBe(429);
		expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
	});

	test('shows the rate-limited state on the login card', async ({ page, request }) => {
		for (let i = 0; i < 10; i++) await request.get('/admin');
		await page.goto('/admin');
		await expect(page.getByRole('alert')).toContainText('Too many attempts.');
		await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeDisabled();
	});

	test('limits unauthenticated requests to other admin routes to 30 per minute', async ({
		request
	}) => {
		for (let i = 1; i <= 30; i++) {
			expect((await request.get('/admin/posts', { maxRedirects: 0 })).status()).toBe(303);
		}
		expect((await request.get('/admin/posts', { maxRedirects: 0 })).status()).toBe(429);
	});

	test('does not let X-Forwarded-For change who is counted', async ({ request }) => {
		for (let i = 1; i <= 10; i++) {
			await request.get('/admin', { headers: { 'x-forwarded-for': `203.0.113.${i}` } });
		}
		const limited = await request.get('/admin', {
			headers: { 'x-forwarded-for': '198.51.100.99' }
		});
		expect(limited.status()).toBe(429);
	});

	test('callback without a code goes back to the login card with an error', async ({ page }) => {
		await page.goto('/auth/callback');
		await expect(page).toHaveURL(/\/admin\?notice=error/);
		await expect(page.getByRole('alert')).toContainText('Sign-in didn’t finish.');
	});

	test('Continue with GitHub sends the browser to Supabase Auth, not an error page', async ({
		request
	}) => {
		const response = await request.post('/admin?/signin', {
			headers: { 'x-sveltekit-action': 'true', origin: 'http://localhost:4173' },
			form: {}
		});
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body.type).toBe('redirect');
		expect(body.location).toMatch(
			/^http:\/\/127\.0\.0\.1:54321\/auth\/v1\/authorize\?provider=github/
		);
	});
});
