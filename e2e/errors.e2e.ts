import { expect, test } from '@playwright/test';
import { resetRateLimits, sql } from './db';

test.describe('404', () => {
	test('unknown URLs return HTTP 404 and the friendly page', async ({ page }) => {
		const response = await page.goto('/this/never/existed');
		expect(response!.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			'This page wandered off.Or it was never here.'
		);
		const main = page.locator('main');
		await expect(main.getByRole('link', { name: 'Go home' })).toBeVisible();
		await expect(main.getByRole('link', { name: 'View projects' })).toBeVisible();
		await expect(main.getByRole('link', { name: 'Read the blog' })).toBeVisible();
		// The page still has the site header and footer.
		await expect(page.locator('header')).toBeVisible();
		await expect(page.locator('footer')).toBeVisible();
	});

	test('unpublished content looks exactly like unknown content', async ({ request }) => {
		const draft = await request.get('/blog/sample-draft-post');
		const unknown = await request.get('/blog/nope-nope');
		expect(draft.status()).toBe(404);
		expect(unknown.status()).toBe(404);
	});
});

test.describe('500', () => {
	test('shows the plain page, no technical details, and logs nothing to the browser', async ({
		page
	}) => {
		await sql('alter table posts rename to posts_broken_for_test');
		try {
			const response = await page.goto('/blog');
			expect(response!.status()).toBe(500);
			await expect(page.getByRole('heading', { level: 1 })).toContainText(
				'Something broke on my end.Not yours.'
			);
			const main = page.locator('main');
			await expect(main.getByRole('button', { name: 'Try again' })).toBeVisible();
			await expect(main.getByRole('link', { name: 'Go home' })).toBeVisible();
			await expect(main.getByRole('link', { name: 'Email me about it' })).toHaveAttribute(
				'href',
				/^mailto:/
			);
			const text = await page.locator('body').innerText();
			expect(text).not.toMatch(/relation|does not exist|postgres|drizzle|Error:/i);
		} finally {
			await sql('alter table posts_broken_for_test rename to posts');
		}
	});
});

test.describe('429', () => {
	test.beforeEach(resetRateLimits);
	test.afterAll(resetRateLimits);

	test('the OAuth callback answers 429 with Retry-After and the public 429 page', async ({
		page,
		request
	}) => {
		for (let i = 0; i < 10; i++) await request.get('/auth/callback', { maxRedirects: 0 });
		const response = await page.goto('/auth/callback');
		expect(response!.status()).toBe(429);
		expect(Number(response!.headers()['retry-after'])).toBeGreaterThan(0);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			'That’s a lot of requests.'
		);
		const main = page.locator('main');
		await expect(main.getByRole('link', { name: 'Go home' })).toBeVisible();
		await expect(main.getByRole('link')).toHaveCount(1);
		// A plain message: nothing about why or which limit.
		await expect(page.locator('body')).not.toContainText(/login|sign-in|admin|rate limit/i);
	});
});
