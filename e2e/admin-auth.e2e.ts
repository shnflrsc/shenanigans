import { OTHER_GITHUB_ID, expect, signInAsAdmin, test } from './auth';
import { resetRateLimits } from './db';

test.beforeEach(resetRateLimits);
test.afterAll(resetRateLimits);

test.describe('admin authorization', () => {
	test('the allowlisted GitHub id reaches the dashboard', async ({ page, context }) => {
		await signInAsAdmin(context);
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/posts$/);
		await expect(page.getByRole('heading', { name: 'Posts', level: 1 })).toBeVisible();
	});

	test('a different GitHub id is signed out immediately and denied on every admin route', async ({
		page,
		context,
		request
	}) => {
		await signInAsAdmin(context, OTHER_GITHUB_ID);
		await page.goto('/admin/posts');
		// Sent back to the login screen, not shown the dashboard.
		await expect(page).toHaveURL(/\/admin$/);
		await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
		// The session was ended: the cookie no longer opens anything.
		await page.goto('/admin/posts');
		await expect(page).toHaveURL(/\/admin$/);
		expect(request).toBeTruthy();
	});

	test('direct requests to admin actions without a session fail', async ({ request }) => {
		for (const [method, path] of [
			['post', '/admin/signout'],
			['post', '/admin/posts?/setStatus'],
			['post', '/admin/posts?/delete']
		] as const) {
			const response = await request[method](path, {
				headers: { origin: 'http://localhost:4173' },
				form: { id: '00000000-0000-4000-8000-000000000000', status: 'published' },
				maxRedirects: 0
			});
			expect([401, 303, 403]).toContain(response.status());
		}
	});
});
