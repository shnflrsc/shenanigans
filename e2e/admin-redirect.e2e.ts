import { expect, signInAsAdmin, test } from './auth';
import { resetRateLimits } from './db';

test.describe('a signed-in admin at /admin', () => {
	test('goes straight to the posts list', async ({ page, context }) => {
		await resetRateLimits();
		await signInAsAdmin(context);
		await page.goto('/admin');
		await expect(page).toHaveURL(/\/admin\/posts$/);
		await resetRateLimits();
	});
});
